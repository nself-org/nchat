/**
 * GET /api/billing/treasury - Get treasury account status
 * POST /api/billing/treasury - Treasury operations (deposit, withdraw, freeze, unfreeze)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayoutService } from "@/services/billing/payout.service";
import type { PayoutCurrency } from "@/lib/billing/payout-types";
import { logger } from "@/lib/logger";

const treasuryOperationSchema = z.object({
  operation: z.enum([
    "deposit",
    "withdraw",
    "freeze",
    "unfreeze",
    "create_account",
    "reconcile",
    "snapshot",
  ]),
  accountId: z.string().optional(),
  workspaceId: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["USD", "EUR", "GBP", "BTC", "ETH", "USDC"]).optional(),
  description: z.string().optional(),
  actorId: z.string().min(1),
  name: z.string().optional(),
  initialBalance: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const accountId = searchParams.get("accountId");

    const service = getPayoutService();
    const treasury = service.getTreasuryManager();

    if (accountId) {
      const account = treasury.getAccount(accountId);
      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, account });
    }

    if (workspaceId) {
      const account = treasury.getAccountByWorkspace(workspaceId);
      if (!account) {
        return NextResponse.json(
          { error: "No treasury account found for workspace" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, account });
    }

    return NextResponse.json(
      { error: "Either accountId or workspaceId is required" },
      { status: 400 },
    );
  } catch (error) {
    logger.error(
      "Error getting treasury status:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = treasuryOperationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      operation,
      accountId,
      workspaceId,
      amount,
      currency,
      description,
      actorId,
      name,
      initialBalance,
    } = validation.data;
    const service = getPayoutService();
    const treasury = service.getTreasuryManager();

    switch (operation) {
      case "create_account": {
        if (!workspaceId || !currency || !name) {
          return NextResponse.json(
            {
              error:
                "workspaceId, currency, and name are required for create_account",
            },
            { status: 400 },
          );
        }
        const account = treasury.createAccount({
          id: accountId || `treasury_${workspaceId}`,
          workspaceId,
          name,
          currency: currency as PayoutCurrency,
          initialBalance,
        });
        return NextResponse.json({ success: true, account }, { status: 201 });
      }

      case "deposit": {
        if (!accountId || !amount || !description) {
          return NextResponse.json(
            {
              error:
                "accountId, amount, and description are required for deposit",
            },
            { status: 400 },
          );
        }
        const tx = treasury.deposit(accountId, amount, description, actorId);
        const account = treasury.getAccount(accountId);
        return NextResponse.json({ success: true, transaction: tx, account });
      }

      case "withdraw": {
        if (!accountId || !amount || !description) {
          return NextResponse.json(
            {
              error:
                "accountId, amount, and description are required for withdraw",
            },
            { status: 400 },
          );
        }
        const tx = treasury.withdraw(accountId, amount, description, actorId);
        const account = treasury.getAccount(accountId);
        return NextResponse.json({ success: true, transaction: tx, account });
      }

      case "freeze": {
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for freeze" },
            { status: 400 },
          );
        }
        const account = treasury.freezeAccount(accountId);
        return NextResponse.json({ success: true, account });
      }

      case "unfreeze": {
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for unfreeze" },
            { status: 400 },
          );
        }
        const account = treasury.unfreezeAccount(accountId);
        return NextResponse.json({ success: true, account });
      }

      case "reconcile": {
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for reconcile" },
            { status: 400 },
          );
        }
        const result = treasury.reconcile(accountId);
        return NextResponse.json({ success: true, reconciliation: result });
      }

      case "snapshot": {
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for snapshot" },
            { status: 400 },
          );
        }
        const snap = treasury.snapshot(accountId);
        return NextResponse.json({ success: true, snapshot: snap });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const statusCode =
      error instanceof Error && error.name === "PayoutError" ? 400 : 500;
    logger.error(
      "Error in treasury operation:",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Internal server error",
      },
      { status: statusCode },
    );
  }
}
