# ɳChat Stripe Plugin

**Plugin Name**: `stripe`
**Version**: 1.0.0
**Category**: Billing
**Status**: Production Ready
**Priority**: LOW (Future Monetization)

---

## Overview

The Stripe Plugin enables payment processing, subscription management, and billing for ɳChat. It provides a complete monetization solution with checkout, customer portal, invoicing, and webhook handling.

---

## Features

### Core Features

- ✅ **Payment Processing** - One-time and recurring payments
- ✅ **Subscription Management** - Plans, trials, metering
- ✅ **Customer Portal** - Self-service billing management
- ✅ **Invoice Generation** - Automatic invoicing
- ✅ **Webhook Handling** - Real-time event processing
- ✅ **Payment Methods** - Cards, ACH, wallets
- ✅ **Tax Calculation** - Automatic tax handling
- ✅ **Dunning Management** - Failed payment retry

### Advanced Features

- ✅ **Usage-Based Billing** - Metered subscriptions
- ✅ **Discounts & Coupons** - Promotional pricing
- ✅ **Multi-Currency** - 135+ currencies supported
- ✅ **SCA Compliance** - 3D Secure authentication
- ✅ **Recurring Billing** - Flexible intervals
- ✅ **Refunds** - Full and partial refunds

---

## Installation

### Prerequisites

- Stripe account (https://dashboard.stripe.com)
- API keys (publishable and secret)
- Webhook endpoint configured
- HTTPS enabled

### Setup Stripe Account

1. **Create Stripe Account**:
   - Visit https://dashboard.stripe.com/register
   - Complete account verification

2. **Get API Keys**:
   - Go to Developers > API keys
   - Copy publishable key (pk\_...)
   - Copy secret key (sk\_...)

3. **Create Products**:

   ```bash
   # Example: Team plan
   Name: Team Plan
   Price: $29/month
   Billing: Recurring
   ```

4. **Setup Webhook**:
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/billing/webhook`
   - Select events: All events
   - Copy webhook secret

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install stripe
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# Stripe Plugin
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_...  # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Currency
STRIPE_CURRENCY=usd

# Subscription Defaults
STRIPE_TRIAL_DAYS=14
STRIPE_BILLING_INTERVAL=month

# Customer Portal
STRIPE_PORTAL_ENABLED=true
STRIPE_PORTAL_FEATURES=subscription_update,subscription_cancel,payment_method_update,invoice_history

# Tax
STRIPE_TAX_ENABLED=true
STRIPE_TAX_BEHAVIOR=exclusive
```

Add to frontend `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_ENABLED=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## API Endpoints

### Customers

#### Create Customer

```bash
POST /api/billing/customers
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "John Doe",
  "metadata": {
    "userId": "user-123"
  }
}
```

**Response:**

```json
{
  "customerId": "cus_...",
  "email": "customer@example.com",
  "name": "John Doe"
}
```

#### Get Customer

```bash
GET /api/billing/customers/:customerId
```

#### Update Customer

```bash
PUT /api/billing/customers/:customerId
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### Payment Methods

#### Attach Payment Method

```bash
POST /api/billing/payment-methods
Content-Type: application/json

{
  "customerId": "cus_...",
  "paymentMethodId": "pm_..."
}
```

#### List Payment Methods

```bash
GET /api/billing/payment-methods?customerId=cus_...
```

#### Set Default

```bash
PUT /api/billing/payment-methods/default
Content-Type: application/json

{
  "customerId": "cus_...",
  "paymentMethodId": "pm_..."
}
```

### Subscriptions

#### Create Subscription

```bash
POST /api/billing/subscriptions
Content-Type: application/json

{
  "customerId": "cus_...",
  "priceId": "price_...",
  "trialDays": 14,
  "metadata": {
    "userId": "user-123"
  }
}
```

**Response:**

```json
{
  "subscriptionId": "sub_...",
  "status": "active",
  "currentPeriodEnd": "2026-03-03T12:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### List Subscriptions

```bash
GET /api/billing/subscriptions?customerId=cus_...
```

#### Update Subscription

```bash
PUT /api/billing/subscriptions/:subscriptionId
Content-Type: application/json

{
  "priceId": "price_new_...",
  "prorationBehavior": "create_prorations"
}
```

#### Cancel Subscription

```bash
DELETE /api/billing/subscriptions/:subscriptionId
```

### Checkout

#### Create Checkout Session

```bash
POST /api/billing/checkout
Content-Type: application/json

{
  "priceId": "price_...",
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/cancel",
  "customerId": "cus_...",  # optional
  "trialDays": 14,  # optional
  "allowPromotionCodes": true
}
```

**Response:**

```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/c/pay/cs_..."
}
```

#### Customer Portal

```bash
POST /api/billing/portal
Content-Type: application/json

{
  "customerId": "cus_...",
  "returnUrl": "https://yourdomain.com/settings/billing"
}
```

**Response:**

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### Invoices

#### List Invoices

```bash
GET /api/billing/invoices?customerId=cus_...
```

#### Get Invoice

```bash
GET /api/billing/invoices/:invoiceId
```

#### Download Invoice PDF

```bash
GET /api/billing/invoices/:invoiceId/pdf
```

### Webhooks

```bash
POST /api/billing/webhook
Stripe-Signature: t=...,v1=...

{
  "type": "customer.subscription.created",
  "data": {
    "object": { ... }
  }
}
```

---

## Frontend Integration

### Stripe Elements

```typescript
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })

    if (error) {
      console.error(error)
    } else {
      // Send paymentMethod.id to backend
      await attachPaymentMethod(paymentMethod.id)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Subscribe
      </button>
    </form>
  )
}

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}
```

### Checkout Session

```typescript
import { useRouter } from 'next/router'

function UpgradeButton() {
  const router = useRouter()

  const handleUpgrade = async () => {
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_team_monthly',
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/pricing`,
      }),
    })

    const { url } = await response.json()
    router.push(url)
  }

  return (
    <button onClick={handleUpgrade}>
      Upgrade to Team Plan
    </button>
  )
}
```

### Customer Portal

```typescript
function BillingSettings() {
  const handleManageBilling = async () => {
    const response = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnUrl: window.location.href,
      }),
    })

    const { url } = await response.json()
    window.location.href = url
  }

  return (
    <button onClick={handleManageBilling}>
      Manage Subscription
    </button>
  )
}
```

---

## Pricing Plans

### Example Plans

```typescript
export const PRICING_PLANS = [
  {
    name: 'Free',
    price: 0,
    interval: 'month',
    features: ['10 users', '1 GB storage', 'Basic support'],
  },
  {
    name: 'Team',
    price: 29,
    priceId: 'price_team_monthly',
    interval: 'month',
    features: ['50 users', '50 GB storage', 'Priority support', 'Advanced features'],
  },
  {
    name: 'Business',
    price: 99,
    priceId: 'price_business_monthly',
    interval: 'month',
    features: [
      'Unlimited users',
      '500 GB storage',
      '24/7 support',
      'All features',
      'Custom integrations',
    ],
  },
]
```

---

## Webhook Events

### Subscription Events

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

### Payment Events

- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Customer Events

- `customer.created`
- `customer.updated`
- `customer.deleted`

### Webhook Handler

```typescript
// app/api/billing/webhook/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
}
```

---

## Testing

### Test Cards

```bash
# Success
4242 4242 4242 4242

# Decline
4000 0000 0000 0002

# Requires authentication
4000 0025 0000 3155

# Insufficient funds
4000 0000 0000 9995
```

### Test Mode

```bash
# Use test keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Test webhook
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

## Security

### Best Practices

1. **Never expose secret key** - Keep server-side only
2. **Verify webhook signatures** - Always validate
3. **Use HTTPS** - Required for production
4. **Implement idempotency** - Use idempotency keys
5. **Log all transactions** - Audit trail

---

## Monitoring

### Track Revenue

```typescript
import { captureEvent } from '@/lib/analytics'

captureEvent('subscription_created', {
  plan: 'team',
  amount: 29,
  currency: 'usd',
  customerId: customer.id,
})
```

### Failed Payments

```typescript
captureEvent('payment_failed', {
  customerId: customer.id,
  amount: invoice.amount_due,
  attemptCount: invoice.attempt_count,
})
```

---

## Support

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com

---

## Related Documentation

- [Installation Guide](./INSTALLATION-GUIDE.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
- [Plugin System Overview](./README.md)
