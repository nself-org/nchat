/**
 * Tests for payment-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  PaymentStore,
  Subscription,
  PaymentMethod,
  Invoice,
} from "../payment-store";
import {
  selectSubscription,
  selectIsSubscribed,
  selectPaymentMethods,
  selectDefaultPaymentMethod,
  selectInvoices,
  selectIsCheckoutInProgress,
} from "../payment-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): PaymentStore {
  const defaultState = {
    subscription: null,
    isLoadingSubscription: false,
    paymentMethods: [] as PaymentMethod[],
    defaultPaymentMethodId: null,
    isLoadingPaymentMethods: false,
    invoices: [] as Invoice[],
    isLoadingInvoices: false,
    isCheckoutInProgress: false,
    checkoutError: null,
    customerId: null,
  };
  return { ...defaultState, ...overrides } as unknown as PaymentStore;
}

function makeSubscription(overrides?: Partial<Subscription>): Subscription {
  return {
    id: "sub_1",
    planId: "plan_basic",
    planName: "Basic",
    status: "active",
    currentPeriodStart: new Date("2024-01-01"),
    currentPeriodEnd: new Date("2024-02-01"),
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function makePaymentMethod(overrides?: Partial<PaymentMethod>): PaymentMethod {
  return {
    id: "pm_1",
    type: "card",
    isDefault: false,
    card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2026 },
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// selectSubscription
// ---------------------------------------------------------------------------

describe("selectSubscription", () => {
  it("returns null by default", () => {
    expect(selectSubscription(makeState())).toBeNull();
  });

  it("returns the subscription object when set", () => {
    const subscription = makeSubscription();
    expect(selectSubscription(makeState({ subscription }))).toBe(subscription);
  });
});

// ---------------------------------------------------------------------------
// selectIsSubscribed
// ---------------------------------------------------------------------------

describe("selectIsSubscribed", () => {
  it("returns false when subscription is null", () => {
    expect(selectIsSubscribed(makeState())).toBe(false);
  });

  it("returns true when subscription status is active", () => {
    const subscription = makeSubscription({ status: "active" });
    expect(selectIsSubscribed(makeState({ subscription }))).toBe(true);
  });

  it("returns true when subscription status is trialing", () => {
    const subscription = makeSubscription({ status: "trialing" });
    expect(selectIsSubscribed(makeState({ subscription }))).toBe(true);
  });

  it("returns false when subscription status is past_due", () => {
    const subscription = makeSubscription({ status: "past_due" });
    expect(selectIsSubscribed(makeState({ subscription }))).toBe(false);
  });

  it("returns false when subscription status is canceled", () => {
    const subscription = makeSubscription({ status: "canceled" });
    expect(selectIsSubscribed(makeState({ subscription }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectPaymentMethods
// ---------------------------------------------------------------------------

describe("selectPaymentMethods", () => {
  it("returns empty array by default", () => {
    expect(selectPaymentMethods(makeState())).toEqual([]);
  });

  it("returns the paymentMethods array", () => {
    const paymentMethods = [makePaymentMethod()];
    expect(selectPaymentMethods(makeState({ paymentMethods }))).toBe(
      paymentMethods,
    );
  });
});

// ---------------------------------------------------------------------------
// selectDefaultPaymentMethod
// ---------------------------------------------------------------------------

describe("selectDefaultPaymentMethod", () => {
  it("returns undefined when paymentMethods is empty", () => {
    expect(selectDefaultPaymentMethod(makeState())).toBeUndefined();
  });

  it("returns undefined when defaultPaymentMethodId does not match any method", () => {
    const paymentMethods = [makePaymentMethod({ id: "pm_1" })];
    expect(
      selectDefaultPaymentMethod(
        makeState({ paymentMethods, defaultPaymentMethodId: "pm_999" }),
      ),
    ).toBeUndefined();
  });

  it("returns the matching payment method when defaultPaymentMethodId matches", () => {
    const pm = makePaymentMethod({ id: "pm_1" });
    const paymentMethods = [pm, makePaymentMethod({ id: "pm_2" })];
    expect(
      selectDefaultPaymentMethod(
        makeState({ paymentMethods, defaultPaymentMethodId: "pm_1" }),
      ),
    ).toBe(pm);
  });
});

// ---------------------------------------------------------------------------
// selectInvoices
// ---------------------------------------------------------------------------

describe("selectInvoices", () => {
  it("returns empty array by default", () => {
    expect(selectInvoices(makeState())).toEqual([]);
  });

  it("returns the invoices array", () => {
    const invoices = [
      {
        id: "inv_1",
        amount: 999,
        currency: "usd",
        status: "paid",
        createdAt: new Date(),
      } as never,
    ];
    expect(selectInvoices(makeState({ invoices }))).toBe(invoices);
  });
});

// ---------------------------------------------------------------------------
// selectIsCheckoutInProgress
// ---------------------------------------------------------------------------

describe("selectIsCheckoutInProgress", () => {
  it("returns false by default", () => {
    expect(selectIsCheckoutInProgress(makeState())).toBe(false);
  });

  it("returns true when checkout is in progress", () => {
    expect(
      selectIsCheckoutInProgress(makeState({ isCheckoutInProgress: true })),
    ).toBe(true);
  });
});
