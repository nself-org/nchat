/**
 * POST /api/billing/payment-intent
 *
 * Create a Stripe payment intent for one-off charges (e.g. wallet top-ups,
 * add-on purchases). Subscription billing goes through /api/billing/subscribe.
 *
 * Returns the client secret so the browser can confirm the intent with
 * Stripe.js without the secret key ever reaching the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const paymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  customerId: z.string().optional(),
  description: z.string().optional(),
  receiptEmail: z.string().email().optional(),
  paymentMethodTypes: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
})

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key, {
    // @ts-expect-error — Stripe version mismatch, using latest stable
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = paymentIntentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      )
    }

    const { amount, currency, customerId, description, receiptEmail, paymentMethodTypes, metadata } =
      result.data

    const stripe = getStripe()

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: customerId,
      description,
      receipt_email: receiptEmail,
      payment_method_types: paymentMethodTypes ?? ['card'],
      metadata: metadata ?? {},
    })

    logger.info('Payment intent created', { id: intent.id, amount, currency })

    return NextResponse.json({
      id: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      customerId: typeof intent.customer === 'string' ? intent.customer : intent.customer?.id,
      createdAt: new Date(intent.created * 1000).toISOString(),
    })
  } catch (error) {
    logger.error('POST /api/billing/payment-intent - Error', error as Error)
    return NextResponse.json(
      {
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
