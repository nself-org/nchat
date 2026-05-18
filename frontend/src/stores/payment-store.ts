/**
 * Payment Store - Zustand store for payment state management
 *
 * Manages current subscription, payment methods, and invoice history.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: "card" | "bank_account";
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
  createdAt: Date;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  description?: string;
  pdfUrl?: string;
  hostedUrl?: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "paused";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
}

export interface PaymentState {
  // Subscription
  subscription: Subscription | null;
  isLoadingSubscription: boolean;

  // Payment Methods
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
  isLoadingPaymentMethods: boolean;

  // Invoices
  invoices: Invoice[];
  isLoadingInvoices: boolean;

  // Checkout
  isCheckoutInProgress: boolean;
  checkoutError: string | null;

  // Customer
  customerId: string | null;
}

export interface PaymentActions {
  // Subscription Actions
  setSubscription: (subscription: Subscription | null) => void;
  setLoadingSubscription: (loading: boolean) => void;
  updateSubscriptionStatus: (status: Subscription["status"]) => void;
  cancelSubscription: (immediately?: boolean) => void;

  // Payment Method Actions
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  addPaymentMethod: (method: PaymentMethod) => void;
  removePaymentMethod: (methodId: string) => void;
  setDefaultPaymentMethod: (methodId: string) => void;
  setLoadingPaymentMethods: (loading: boolean) => void;

  // Invoice Actions
  setInvoices: (invoices: Invoice[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (invoiceId: string, status: Invoice["status"]) => void;
  setLoadingInvoices: (loading: boolean) => void;

  // Checkout Actions
  startCheckout: () => void;
  completeCheckout: () => void;
  failCheckout: (error: string) => void;
  clearCheckoutError: () => void;

  // Customer Actions
  setCustomerId: (customerId: string | null) => void;

  // Utility Actions
  reset: () => void;
}

export type PaymentStore = PaymentState & PaymentActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: PaymentState = {
  subscription: null,
  isLoadingSubscription: false,
  paymentMethods: [],
  defaultPaymentMethodId: null,
  isLoadingPaymentMethods: false,
  invoices: [],
  isLoadingInvoices: false,
  isCheckoutInProgress: false,
  checkoutError: null,
  customerId: null,
};

// ============================================================================
// Store
// ============================================================================

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Subscription Actions
      setSubscription: (subscription) =>
        set(
          (state) => {
            state.subscription = subscription;
          },
          false,
          "payment/setSubscription",
        ),

      setLoadingSubscription: (loading) =>
        set(
          (state) => {
            state.isLoadingSubscription = loading;
          },
          false,
          "payment/setLoadingSubscription",
        ),

      updateSubscriptionStatus: (status) =>
        set(
          (state) => {
            if (state.subscription) {
              state.subscription.status = status;
            }
          },
          false,
          "payment/updateSubscriptionStatus",
        ),

      cancelSubscription: (immediately = false) =>
        set(
          (state) => {
            if (state.subscription) {
              if (immediately) {
                state.subscription.status = "canceled";
              } else {
                state.subscription.cancelAtPeriodEnd = true;
              }
            }
          },
          false,
          "payment/cancelSubscription",
        ),

      // Payment Method Actions
      setPaymentMethods: (methods) =>
        set(
          (state) => {
            state.paymentMethods = methods;
            const defaultMethod = methods.find((m) => m.isDefault);
            state.defaultPaymentMethodId = defaultMethod?.id ?? null;
          },
          false,
          "payment/setPaymentMethods",
        ),

      addPaymentMethod: (method) =>
        set(
          (state) => {
            state.paymentMethods.push(method);
            if (method.isDefault) {
              state.defaultPaymentMethodId = method.id;
              // Unset previous default
              state.paymentMethods.forEach((m) => {
                if (m.id !== method.id) {
                  m.isDefault = false;
                }
              });
            }
          },
          false,
          "payment/addPaymentMethod",
        ),

      removePaymentMethod: (methodId) =>
        set(
          (state) => {
            const index = state.paymentMethods.findIndex(
              (m) => m.id === methodId,
            );
            if (index !== -1) {
              state.paymentMethods.splice(index, 1);
              if (state.defaultPaymentMethodId === methodId) {
                state.defaultPaymentMethodId =
                  state.paymentMethods[0]?.id ?? null;
                if (state.paymentMethods[0]) {
                  state.paymentMethods[0].isDefault = true;
                }
              }
            }
          },
          false,
          "payment/removePaymentMethod",
        ),

      setDefaultPaymentMethod: (methodId) =>
        set(
          (state) => {
            state.defaultPaymentMethodId = methodId;
            state.paymentMethods.forEach((m) => {
              m.isDefault = m.id === methodId;
            });
          },
          false,
          "payment/setDefaultPaymentMethod",
        ),

      setLoadingPaymentMethods: (loading) =>
        set(
          (state) => {
            state.isLoadingPaymentMethods = loading;
          },
          false,
          "payment/setLoadingPaymentMethods",
        ),

      // Invoice Actions
      setInvoices: (invoices) =>
        set(
          (state) => {
            state.invoices = invoices;
          },
          false,
          "payment/setInvoices",
        ),

      addInvoice: (invoice) =>
        set(
          (state) => {
            state.invoices.unshift(invoice);
          },
          false,
          "payment/addInvoice",
        ),

      updateInvoiceStatus: (invoiceId, status) =>
        set(
          (state) => {
            const invoice = state.invoices.find((i) => i.id === invoiceId);
            if (invoice) {
              invoice.status = status;
              if (status === "paid") {
                invoice.paidAt = new Date();
              }
            }
          },
          false,
          "payment/updateInvoiceStatus",
        ),

      setLoadingInvoices: (loading) =>
        set(
          (state) => {
            state.isLoadingInvoices = loading;
          },
          false,
          "payment/setLoadingInvoices",
        ),

      // Checkout Actions
      startCheckout: () =>
        set(
          (state) => {
            state.isCheckoutInProgress = true;
            state.checkoutError = null;
          },
          false,
          "payment/startCheckout",
        ),

      completeCheckout: () =>
        set(
          (state) => {
            state.isCheckoutInProgress = false;
            state.checkoutError = null;
          },
          false,
          "payment/completeCheckout",
        ),

      failCheckout: (error) =>
        set(
          (state) => {
            state.isCheckoutInProgress = false;
            state.checkoutError = error;
          },
          false,
          "payment/failCheckout",
        ),

      clearCheckoutError: () =>
        set(
          (state) => {
            state.checkoutError = null;
          },
          false,
          "payment/clearCheckoutError",
        ),

      // Customer Actions
      setCustomerId: (customerId) =>
        set(
          (state) => {
            state.customerId = customerId;
          },
          false,
          "payment/setCustomerId",
        ),

      // Utility Actions
      reset: () => set(() => initialState, false, "payment/reset"),
    })),
    { name: "payment-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSubscription = (state: PaymentStore) => state.subscription;
export const selectIsSubscribed = (state: PaymentStore) =>
  state.subscription?.status === "active" ||
  state.subscription?.status === "trialing";
export const selectPaymentMethods = (state: PaymentStore) =>
  state.paymentMethods;
export const selectDefaultPaymentMethod = (state: PaymentStore) =>
  state.paymentMethods.find((m) => m.id === state.defaultPaymentMethodId);
export const selectInvoices = (state: PaymentStore) => state.invoices;
export const selectIsCheckoutInProgress = (state: PaymentStore) =>
  state.isCheckoutInProgress;
