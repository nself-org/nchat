/**
 * POST /api/billing/crypto/webhook
 *
 * Coinbase Commerce webhook endpoint for crypto payment events.
 * Handles payment confirmations, expirations, and failures.
 *
 * Enhanced with:
 * - Payment flow state machine integration
 * - Anti-replay protection
 * - Blockchain event routing to CryptoFlowService
 */

import { NextRequest, NextResponse } from "next/server";
import { getCryptoPaymentService } from "@/lib/billing/crypto-payment.service";
import { getCryptoFlowService } from "@/services/billing/crypto-flow.service";
import { ChainNetwork } from "@/lib/billing/crypto-payment-flow";
import { getPaymentSecurityService } from "@/services/billing/payment-security.service";
import { createHmac, timingSafeEqual } from "crypto";

import { logger } from "@/lib/logger";

/**
 * Verify Coinbase Commerce webhook signature using HMAC-SHA256.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string,
): boolean {
  // Validate signature is present
  if (!signature) {
    return false;
  }

  // Compute expected signature
  const hmac = createHmac("sha256", webhookSecret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Map Coinbase Commerce network names to our ChainNetwork enum.
 */
function mapCoinbaseNetwork(network?: string): ChainNetwork | undefined {
  if (!network) return undefined;
  const mapping: Record<string, ChainNetwork> = {
    ethereum: ChainNetwork.ETHEREUM,
    bitcoin: ChainNetwork.BITCOIN,
    polygon: ChainNetwork.POLYGON,
  };
  return mapping[network.toLowerCase()];
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("COINBASE_COMMERCE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      );
    }

    // Get signature from header
    const signature = request.headers.get("x-cc-webhook-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 },
      );
    }

    // Get raw body
    const rawBody = await request.text();

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.error("Invalid Coinbase Commerce webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Anti-replay check
    const securityService = getPaymentSecurityService();
    const eventId = `webhook:coinbase:${signature}`;
    if (securityService.isEventProcessed(eventId)) {
      logger.warn("Duplicate webhook event detected", { signature });
      return NextResponse.json({ received: true, duplicate: true });
    }
    securityService.recordProcessedEvent(eventId);

    // Parse event
    const event = JSON.parse(rawBody);

    logger.info(`Received Coinbase Commerce webhook: ${event.type}`);

    // Route to crypto flow service for state machine processing
    const flowService = getCryptoFlowService();
    const charge = event.data;

    if (charge && event.type) {
      const network = mapCoinbaseNetwork(
        charge.payments?.[0]?.network || charge.metadata?.cryptoNetwork,
      );
      const paymentId = charge.metadata?.paymentId;

      // Process confirmed/resolved events through the flow state machine
      if (
        (event.type === "charge:confirmed" ||
          event.type === "charge:resolved") &&
        network &&
        paymentId
      ) {
        const flowResult = flowService.processBlockchainEvent({
          paymentId,
          txHash: charge.payments?.[0]?.transaction_id || "",
          fromAddress: charge.payments?.[0]?.payer_addresses?.[0] || "",
          toAddress: charge.addresses?.[network] || "",
          amount: charge.payments?.[0]?.value?.crypto?.amount || "0",
          network,
          currency: (charge.payments?.[0]?.value?.crypto?.currency ||
            "ETH") as any,
          blockNumber: undefined,
          confirmations: 999, // Coinbase Commerce confirms internally
          timestamp: Date.now(),
        });

        if (!flowResult.success) {
          logger.warn("Flow service rejected event", {
            paymentId,
            error: flowResult.error,
            securityBlocked: flowResult.securityBlocked,
          });
        }
      }

      // Process expired/failed events
      if (
        (event.type === "charge:failed" || event.type === "charge:expired") &&
        paymentId
      ) {
        const reason =
          event.type === "charge:expired"
            ? "Payment expired"
            : "Payment failed";
        flowService.manuallyFailPayment(paymentId, reason);
      }
    }

    // Also route to the legacy crypto payment service for backward compatibility
    const cryptoPaymentService = getCryptoPaymentService();
    await cryptoPaymentService.processWebhook("coinbase_commerce", event);

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Coinbase Commerce webhook:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
