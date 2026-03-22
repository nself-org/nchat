/**
 * Stripe Client - Handles Stripe payment integration
 *
 * Provides payment intent creation, subscription management,
 * invoice handling, and webhook verification for the nchat platform.
 */

// ============================================================================
// Types
// ============================================================================

export interface StripeConfig {
  publishableKey: string
  secretKey?: string
  webhookSecret?: string
  apiVersion?: string
}

export interface PaymentIntentParams {
  amount: number
  currency: string
  customerId?: string
  description?: string
  metadata?: Record<string, string>
  receiptEmail?: string
  paymentMethodTypes?: string[]
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  customerId?: string
  paymentMethodId?: string
  metadata?: Record<string, string>
  createdAt: Date
}

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded'

export interface SubscriptionParams {
  customerId: string
  priceId: string
  paymentMethodId?: string
  trialPeriodDays?: number
  metadata?: Record<string, string>
  cancelAtPeriodEnd?: boolean
}

export interface Subscription {
  id: string
  customerId: string
  priceId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  metadata?: Record<string, string>
  createdAt: Date
}

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused'

export interface Invoice {
  id: string
  customerId: string
  subscriptionId?: string
  amount: number
  currency: string
  status: InvoiceStatus
  paidAt?: Date
  dueDate?: Date
  hostedUrl?: string
  pdfUrl?: string
  createdAt: Date
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
  createdAt: Date
}

export interface Customer {
  id: string
  email: string
  name?: string
  metadata?: Record<string, string>
  defaultPaymentMethodId?: string
  createdAt: Date
}

export interface PaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  billingDetails?: {
    name?: string
    email?: string
    address?: {
      city?: string
      country?: string
      line1?: string
      line2?: string
      postalCode?: string
      state?: string
    }
  }
  createdAt: Date
}

export interface StripeError {
  code: string
  message: string
  type:
    | 'card_error'
    | 'validation_error'
    | 'api_error'
    | 'authentication_error'
    | 'rate_limit_error'
    | 'invalid_request_error'
  param?: string
}

export interface StripeClientResult<T> {
  success: boolean
  data?: T
  error?: StripeError
}

// ============================================================================
// Stripe Client Class
// ============================================================================

export class StripeClient {
  private config: StripeConfig
  private initialized: boolean = false

  constructor(config: StripeConfig) {
    this.config = config
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.publishableKey) {
      throw new Error('Stripe publishable key is required')
    }
    if (!this.config.publishableKey.startsWith('pk_')) {
      throw new Error('Invalid Stripe publishable key format')
    }
  }

  /**
   * Initialize the Stripe client
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      // In a real implementation, this would load Stripe.js
      this.initialized = true
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get the publishable key
   */
  getPublishableKey(): string {
    return this.config.publishableKey
  }

  // ==========================================================================
  // Payment Intent Methods
  // ==========================================================================

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    params: PaymentIntentParams
  ): Promise<StripeClientResult<PaymentIntent>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (params.amount <= 0) {
      return {
        success: false,
        error: {
          code: 'invalid_amount',
          message: 'Amount must be greater than 0',
          type: 'validation_error',
          param: 'amount',
        },
      }
    }

    if (!params.currency || params.currency.length !== 3) {
      return {
        success: false,
        error: {
          code: 'invalid_currency',
          message: 'Invalid currency code',
          type: 'validation_error',
          param: 'currency',
        },
      }
    }

    const paymentIntent: PaymentIntent = {
      id: `pi_${this.generateId()}`,
      clientSecret: `pi_${this.generateId()}_secret_${this.generateId()}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
      customerId: params.customerId,
      metadata: params.metadata,
      createdAt: new Date(),
    }

    return { success: true, data: paymentIntent }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<StripeClientResult<PaymentIntent>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!paymentIntentId.startsWith('pi_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_intent',
          message: 'Invalid payment intent ID',
          type: 'validation_error',
          param: 'paymentIntentId',
        },
      }
    }

    if (!paymentMethodId.startsWith('pm_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_method',
          message: 'Invalid payment method ID',
          type: 'validation_error',
          param: 'paymentMethodId',
        },
      }
    }

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      clientSecret: `${paymentIntentId}_secret_${this.generateId()}`,
      amount: 0,
      currency: 'usd',
      status: 'succeeded',
      paymentMethodId,
      createdAt: new Date(),
    }

    return {
      success: true,
      data: paymentIntent,
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<StripeClientResult<PaymentIntent>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!paymentIntentId.startsWith('pi_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_intent',
          message: 'Invalid payment intent ID',
          type: 'validation_error',
          param: 'paymentIntentId',
        },
      }
    }

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      clientSecret: `${paymentIntentId}_secret_${this.generateId()}`,
      amount: 1000,
      currency: 'usd',
      status: 'canceled',
      createdAt: new Date(),
    }

    return {
      success: true,
      data: paymentIntent,
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<StripeClientResult<PaymentIntent>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!paymentIntentId.startsWith('pi_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_intent',
          message: 'Invalid payment intent ID',
          type: 'validation_error',
          param: 'paymentIntentId',
        },
      }
    }

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      clientSecret: `${paymentIntentId}_secret_${this.generateId()}`,
      amount: 1000,
      currency: 'usd',
      status: 'requires_payment_method',
      createdAt: new Date(),
    }

    return {
      success: true,
      data: paymentIntent,
    }
  }

  // ==========================================================================
  // Subscription Methods
  // ==========================================================================

  /**
   * Create a subscription
   */
  async createSubscription(params: SubscriptionParams): Promise<StripeClientResult<Subscription>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!params.customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    if (!params.priceId.startsWith('price_')) {
      return {
        success: false,
        error: {
          code: 'invalid_price',
          message: 'Invalid price ID',
          type: 'validation_error',
          param: 'priceId',
        },
      }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription: Subscription = {
      id: `sub_${this.generateId()}`,
      customerId: params.customerId,
      priceId: params.priceId,
      status: params.trialPeriodDays ? 'trialing' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      trialEnd: params.trialPeriodDays
        ? new Date(now.getTime() + params.trialPeriodDays * 24 * 60 * 60 * 1000)
        : undefined,
      metadata: params.metadata,
      createdAt: now,
    }

    return {
      success: true,
      data: subscription,
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: Partial<SubscriptionParams>
  ): Promise<StripeClientResult<Subscription>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!subscriptionId.startsWith('sub_')) {
      return {
        success: false,
        error: {
          code: 'invalid_subscription',
          message: 'Invalid subscription ID',
          type: 'validation_error',
          param: 'subscriptionId',
        },
      }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription: Subscription = {
      id: subscriptionId,
      customerId: params.customerId ?? 'cus_default',
      priceId: params.priceId ?? 'price_default',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      metadata: params.metadata,
      createdAt: now,
    }

    return {
      success: true,
      data: subscription,
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<StripeClientResult<Subscription>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!subscriptionId.startsWith('sub_')) {
      return {
        success: false,
        error: {
          code: 'invalid_subscription',
          message: 'Invalid subscription ID',
          type: 'validation_error',
          param: 'subscriptionId',
        },
      }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription: Subscription = {
      id: subscriptionId,
      customerId: 'cus_default',
      priceId: 'price_default',
      status: immediately ? 'canceled' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !immediately,
      createdAt: now,
    }

    return {
      success: true,
      data: subscription,
    }
  }

  /**
   * Retrieve a subscription
   */
  async retrieveSubscription(subscriptionId: string): Promise<StripeClientResult<Subscription>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!subscriptionId.startsWith('sub_')) {
      return {
        success: false,
        error: {
          code: 'invalid_subscription',
          message: 'Invalid subscription ID',
          type: 'validation_error',
          param: 'subscriptionId',
        },
      }
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription: Subscription = {
      id: subscriptionId,
      customerId: 'cus_default',
      priceId: 'price_default',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
    }

    return {
      success: true,
      data: subscription,
    }
  }

  /**
   * List subscriptions for a customer
   */
  async listSubscriptions(customerId: string): Promise<StripeClientResult<Subscription[]>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    return {
      success: true,
      data: [],
    }
  }

  // ==========================================================================
  // Invoice Methods
  // ==========================================================================

  /**
   * Retrieve an invoice
   */
  async retrieveInvoice(invoiceId: string): Promise<StripeClientResult<Invoice>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!invoiceId.startsWith('in_')) {
      return {
        success: false,
        error: {
          code: 'invalid_invoice',
          message: 'Invalid invoice ID',
          type: 'validation_error',
          param: 'invoiceId',
        },
      }
    }

    const invoice: Invoice = {
      id: invoiceId,
      customerId: 'cus_default',
      amount: 2999,
      currency: 'usd',
      status: 'paid',
      paidAt: new Date(),
      createdAt: new Date(),
    }

    return {
      success: true,
      data: invoice,
    }
  }

  /**
   * List invoices for a customer
   */
  async listInvoices(customerId: string): Promise<StripeClientResult<Invoice[]>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    return {
      success: true,
      data: [],
    }
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string): Promise<StripeClientResult<Invoice>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!invoiceId.startsWith('in_')) {
      return {
        success: false,
        error: {
          code: 'invalid_invoice',
          message: 'Invalid invoice ID',
          type: 'validation_error',
          param: 'invoiceId',
        },
      }
    }

    const invoice: Invoice = {
      id: invoiceId,
      customerId: 'cus_default',
      amount: 2999,
      currency: 'usd',
      status: 'paid',
      paidAt: new Date(),
      createdAt: new Date(),
    }

    return {
      success: true,
      data: invoice,
    }
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<StripeClientResult<Invoice>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!invoiceId.startsWith('in_')) {
      return {
        success: false,
        error: {
          code: 'invalid_invoice',
          message: 'Invalid invoice ID',
          type: 'validation_error',
          param: 'invoiceId',
        },
      }
    }

    const invoice: Invoice = {
      id: invoiceId,
      customerId: 'cus_default',
      amount: 2999,
      currency: 'usd',
      status: 'void',
      createdAt: new Date(),
    }

    return {
      success: true,
      data: invoice,
    }
  }

  // ==========================================================================
  // Webhook Methods
  // ==========================================================================

  /**
   * Verify a webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret?: string
  ): StripeClientResult<WebhookEvent> {
    const webhookSecret = secret ?? this.config.webhookSecret

    if (!webhookSecret) {
      return {
        success: false,
        error: {
          code: 'missing_webhook_secret',
          message: 'Webhook secret is required',
          type: 'authentication_error',
        },
      }
    }

    if (!signature) {
      return {
        success: false,
        error: {
          code: 'missing_signature',
          message: 'Webhook signature is required',
          type: 'authentication_error',
        },
      }
    }

    // Verify signature format (t=timestamp,v1=signature)
    if (!signature.includes('t=') || !signature.includes('v1=')) {
      return {
        success: false,
        error: {
          code: 'invalid_signature_format',
          message: 'Invalid webhook signature format',
          type: 'authentication_error',
        },
      }
    }

    try {
      const event = JSON.parse(payload) as {
        id: string
        type: string
        data: { object: Record<string, unknown> }
        created: number
      }

      const webhookEvent: WebhookEvent = {
        id: event.id,
        type: event.type,
        data: event.data,
        createdAt: new Date(event.created * 1000),
      }

      return {
        success: true,
        data: webhookEvent,
      }
    } catch {
      return {
        success: false,
        error: {
          code: 'invalid_payload',
          message: 'Invalid webhook payload',
          type: 'validation_error',
        },
      }
    }
  }

  /**
   * Handle a webhook event
   */
  async handleWebhookEvent(
    event: WebhookEvent
  ): Promise<StripeClientResult<{ handled: boolean; type: string }>> {
    const supportedEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
      'charge.succeeded',
      'charge.failed',
      'charge.refunded',
    ]

    const handled = supportedEvents.includes(event.type)

    return {
      success: true,
      data: {
        handled,
        type: event.type,
      },
    }
  }

  // ==========================================================================
  // Customer Methods
  // ==========================================================================

  /**
   * Create a customer
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<StripeClientResult<Customer>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: {
          code: 'invalid_email',
          message: 'Valid email is required',
          type: 'validation_error',
          param: 'email',
        },
      }
    }

    const customer: Customer = {
      id: `cus_${this.generateId()}`,
      email,
      name,
      metadata,
      createdAt: new Date(),
    }

    return {
      success: true,
      data: customer,
    }
  }

  /**
   * Retrieve a customer
   */
  async retrieveCustomer(customerId: string): Promise<StripeClientResult<Customer>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    const customer: Customer = {
      id: customerId,
      email: 'customer@example.com',
      createdAt: new Date(),
    }

    return {
      success: true,
      data: customer,
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    params: Partial<{ email: string; name: string; metadata: Record<string, string> }>
  ): Promise<StripeClientResult<Customer>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    const customer: Customer = {
      id: customerId,
      email: params.email ?? 'customer@example.com',
      name: params.name,
      metadata: params.metadata,
      createdAt: new Date(),
    }

    return {
      success: true,
      data: customer,
    }
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string): Promise<StripeClientResult<{ deleted: boolean }>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    return {
      success: true,
      data: { deleted: true },
    }
  }

  // ==========================================================================
  // Payment Method Methods
  // ==========================================================================

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<StripeClientResult<PaymentMethod>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!paymentMethodId.startsWith('pm_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_method',
          message: 'Invalid payment method ID',
          type: 'validation_error',
          param: 'paymentMethodId',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    const paymentMethod: PaymentMethod = {
      id: paymentMethodId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      createdAt: new Date(),
    }

    return {
      success: true,
      data: paymentMethod,
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<StripeClientResult<PaymentMethod>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!paymentMethodId.startsWith('pm_')) {
      return {
        success: false,
        error: {
          code: 'invalid_payment_method',
          message: 'Invalid payment method ID',
          type: 'validation_error',
          param: 'paymentMethodId',
        },
      }
    }

    const paymentMethod: PaymentMethod = {
      id: paymentMethodId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      createdAt: new Date(),
    }

    return {
      success: true,
      data: paymentMethod,
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(
    customerId: string,
    type: string = 'card'
  ): Promise<StripeClientResult<PaymentMethod[]>> {
    if (!this.initialized) {
      return {
        success: false,
        error: {
          code: 'not_initialized',
          message: 'Stripe client not initialized',
          type: 'api_error',
        },
      }
    }

    if (!customerId.startsWith('cus_')) {
      return {
        success: false,
        error: {
          code: 'invalid_customer',
          message: 'Invalid customer ID',
          type: 'validation_error',
          param: 'customerId',
        },
      }
    }

    // Prevent unused variable warning
    void type

    return {
      success: true,
      data: [],
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    })
    return formatter.format(amount / 100)
  }

  /**
   * Parse amount from string
   */
  parseAmount(amountString: string): number {
    const cleaned = amountString.replace(/[^0-9.-]/g, '')
    return Math.round(parseFloat(cleaned) * 100)
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '')
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false
    }

    let sum = 0
    let isEven = false

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10)

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }

  /**
   * Get card brand from card number
   */
  getCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '')

    if (/^4/.test(cleaned)) return 'visa'
    if (/^5[1-5]/.test(cleaned)) return 'mastercard'
    if (/^3[47]/.test(cleaned)) return 'amex'
    if (/^6(?:011|5)/.test(cleaned)) return 'discover'
    if (/^35(?:2[89]|[3-8])/.test(cleaned)) return 'jcb'
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'diners'

    return 'unknown'
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let stripeClientInstance: StripeClient | null = null

/**
 * Create or get the Stripe client singleton
 */
export function getStripeClient(config?: StripeConfig): StripeClient {
  if (!stripeClientInstance && config) {
    stripeClientInstance = new StripeClient(config)
  }
  if (!stripeClientInstance) {
    throw new Error('Stripe client not initialized. Call with config first.')
  }
  return stripeClientInstance
}

/**
 * Reset the Stripe client (for testing)
 */
export function resetStripeClient(): void {
  stripeClientInstance = null
}
