/**
 * Crypto Payment Flow - Comprehensive Tests
 *
 * Tests covering:
 * - State machine transitions (all valid paths, all invalid transition attempts)
 * - Address generation (uniqueness, determinism, multi-chain)
 * - Confirmation tracking (threshold met, threshold not met, reorg handling)
 * - Expiry (before expiry, at expiry, after expiry, race conditions)
 * - Reconciliation (balanced, overpayment, underpayment, orphan)
 * - Multi-chain (ETH, BTC, Polygon specific behaviors)
 * - Integration with payment-security (double-spend, blacklist)
 *
 * @module @/lib/billing/__tests__/crypto-payment-flow.test
 */

import {
  CryptoPaymentFlowMachine,
  PaymentFlowState,
  ChainNetwork,
  HDAddressGenerator,
  ConfirmationTracker,
  DEFAULT_CHAIN_CONFIGS,
  DEFAULT_PAYMENT_FLOW_CONFIG,
  createPaymentFlowMachine,
  getPaymentFlowMachine,
  resetPaymentFlowMachine,
  type CryptoPaymentRecord,
  type PaymentFlowConfig,
  type ChainConfig,
} from "../crypto-payment-flow";

// Suppress logger output during tests
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
    scope: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      security: jest.fn(),
    })),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
  })),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_SEED = "a".repeat(64);
const NOW = 1700000000000;

function createTestConfig(
  overrides?: Partial<Omit<PaymentFlowConfig, "masterSeed">>,
): PaymentFlowConfig {
  return {
    paymentWindowMs: overrides?.paymentWindowMs ?? 30 * 60 * 1000,
    pollIntervalMs: overrides?.pollIntervalMs ?? 15_000,
    underpaymentTolerance: overrides?.underpaymentTolerance ?? 0.02,
    underpaymentGracePeriodMs:
      overrides?.underpaymentGracePeriodMs ?? 15 * 60 * 1000,
    overpaymentThreshold: overrides?.overpaymentThreshold ?? 0.001,
    chains: overrides?.chains ?? DEFAULT_PAYMENT_FLOW_CONFIG.chains,
    masterSeed: TEST_SEED,
  };
}

function createTestMachine(
  overrides?: Partial<Omit<PaymentFlowConfig, "masterSeed">>,
): CryptoPaymentFlowMachine {
  return new CryptoPaymentFlowMachine(createTestConfig(overrides));
}

function createPaymentHelper(
  machine: CryptoPaymentFlowMachine,
  overrides?: Partial<{
    id: string;
    network: ChainNetwork;
    currency: string;
    expectedAmount: string;
    now: number;
    workspaceId: string;
    userId: string;
    subscriptionId: string;
    invoiceId: string;
  }>,
): CryptoPaymentRecord {
  return machine.createPayment({
    id: overrides?.id ?? `pay_${Math.random().toString(36).substring(7)}`,
    workspaceId: overrides?.workspaceId ?? "ws_test",
    userId: overrides?.userId ?? "user_test",
    network: overrides?.network ?? ChainNetwork.ETHEREUM,
    currency: (overrides?.currency ?? "ETH") as any,
    expectedAmount: overrides?.expectedAmount ?? "1.00000000",
    fiatAmount: 250000,
    fiatCurrency: "USD",
    exchangeRate: "2500",
    subscriptionId: overrides?.subscriptionId ?? "sub_test",
    invoiceId: overrides?.invoiceId ?? "inv_test",
    now: overrides?.now ?? NOW,
  });
}

// ============================================================================
// 1. State Machine Transitions
// ============================================================================

describe("CryptoPaymentFlowMachine - State Transitions", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  // --- Valid transitions ---

  test("CREATED -> PENDING via transaction detection", () => {
    const payment = createPaymentHelper(machine);
    const result = machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    expect(result.success).toBe(true);
    expect(result.previousState).toBe(PaymentFlowState.CREATED);
    expect(result.newState).toBe(PaymentFlowState.PENDING);
  });

  test("CREATED -> EXPIRED when payment window passes", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    const expiryTime = NOW + 31 * 60 * 1000; // 31 minutes later
    const result = machine.expirePayment(payment.id, expiryTime);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.EXPIRED);
  });

  test("CREATED -> FAILED via manual failure", () => {
    const payment = createPaymentHelper(machine);
    const result = machine.failPayment(payment.id, "Security rejection");
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.FAILED);
  });

  test("PENDING -> CONFIRMING when confirmations > 0", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    const result = machine.updateConfirmations(payment.id, 3);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.CONFIRMING);
  });

  test("PENDING -> EXPIRED", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    const result = machine.expirePayment(payment.id, NOW + 31 * 60 * 1000);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.EXPIRED);
  });

  test("PENDING -> FAILED", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    const result = machine.failPayment(payment.id, "double spend");
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.FAILED);
  });

  test("CONFIRMING -> CONFIRMED when threshold met", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    // ETH requires 12 confirmations
    const result = machine.updateConfirmations(payment.id, 12);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.CONFIRMED);
  });

  test("CONFIRMING -> EXPIRED", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    machine.updateConfirmations(payment.id, 3, undefined, NOW + 2000);
    const result = machine.expirePayment(payment.id, NOW + 31 * 60 * 1000);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.EXPIRED);
  });

  test("CONFIRMING -> FAILED", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    const result = machine.failPayment(payment.id, "reorg detected");
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.FAILED);
  });

  test("CONFIRMED -> COMPLETED", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    machine.updateConfirmations(payment.id, 12);
    const result = machine.completePayment(payment.id);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.COMPLETED);
  });

  test("CONFIRMED -> FAILED (e.g. late reorg)", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    machine.updateConfirmations(payment.id, 12);
    const result = machine.failPayment(payment.id, "late reorg");
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.FAILED);
  });

  // --- Invalid transitions ---

  test("CREATED -> CONFIRMED is invalid (must go through PENDING/CONFIRMING)", () => {
    const payment = createPaymentHelper(machine);
    const result = machine.transition(
      payment.id,
      PaymentFlowState.CONFIRMED,
      "skip",
      payment.version,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid transition");
  });

  test("CREATED -> COMPLETED is invalid", () => {
    const payment = createPaymentHelper(machine);
    const result = machine.transition(
      payment.id,
      PaymentFlowState.COMPLETED,
      "skip",
      payment.version,
    );
    expect(result.success).toBe(false);
  });

  test("EXPIRED -> any state is invalid (terminal)", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.expirePayment(payment.id, NOW + 31 * 60 * 1000);
    const updated = machine.getPayment(payment.id)!;

    for (const state of Object.values(PaymentFlowState)) {
      if (state === PaymentFlowState.EXPIRED) continue;
      const result = machine.transition(
        payment.id,
        state,
        "attempt",
        updated.version,
      );
      expect(result.success).toBe(false);
    }
  });

  test("FAILED -> any state is invalid (terminal)", () => {
    const payment = createPaymentHelper(machine);
    machine.failPayment(payment.id, "test");
    const updated = machine.getPayment(payment.id)!;

    for (const state of Object.values(PaymentFlowState)) {
      if (state === PaymentFlowState.FAILED) continue;
      const result = machine.transition(
        payment.id,
        state,
        "attempt",
        updated.version,
      );
      expect(result.success).toBe(false);
    }
  });

  test("COMPLETED -> CREATED is invalid", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    machine.updateConfirmations(payment.id, 12);
    machine.completePayment(payment.id);
    const updated = machine.getPayment(payment.id)!;
    const result = machine.transition(
      payment.id,
      PaymentFlowState.CREATED,
      "reset",
      updated.version,
    );
    expect(result.success).toBe(false);
  });

  test("PENDING -> COMPLETED is invalid (must go through CONFIRMING)", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    const updated = machine.getPayment(payment.id)!;
    const result = machine.transition(
      payment.id,
      PaymentFlowState.COMPLETED,
      "skip",
      updated.version,
    );
    expect(result.success).toBe(false);
  });

  test("CONFIRMING -> PENDING is invalid (cannot go backwards)", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    const updated = machine.getPayment(payment.id)!;
    const result = machine.transition(
      payment.id,
      PaymentFlowState.PENDING,
      "revert",
      updated.version,
    );
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// 2. Version-based Compare-and-Swap (Race Condition Prevention)
// ============================================================================

describe("CryptoPaymentFlowMachine - Version CAS", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("transition succeeds with correct version", () => {
    const payment = createPaymentHelper(machine);
    const result = machine.transition(
      payment.id,
      PaymentFlowState.EXPIRED,
      "test",
      0, // version 0 = initial
      undefined,
      NOW + 31 * 60 * 1000,
    );
    expect(result.success).toBe(true);
  });

  test("transition fails with stale version", () => {
    const payment = createPaymentHelper(machine);
    // First transition increments version to 1
    machine.transition(payment.id, PaymentFlowState.FAILED, "test", 0);
    // Attempt with stale version 0
    const result = machine.transition(
      payment.id,
      PaymentFlowState.EXPIRED,
      "test",
      0,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Version mismatch");
  });

  test("version increments with each successful transition", () => {
    const payment = createPaymentHelper(machine);
    expect(machine.getPayment(payment.id)!.version).toBe(0);

    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    expect(machine.getPayment(payment.id)!.version).toBe(1);

    machine.updateConfirmations(payment.id, 3);
    expect(machine.getPayment(payment.id)!.version).toBe(2);

    machine.updateConfirmations(payment.id, 12);
    expect(machine.getPayment(payment.id)!.version).toBe(3);

    machine.completePayment(payment.id);
    expect(machine.getPayment(payment.id)!.version).toBe(4);
  });

  test("concurrent modification is detected", () => {
    const payment = createPaymentHelper(machine);
    const staleVersion = payment.version;

    // Simulate another process modifying the payment first
    machine.transition(
      payment.id,
      PaymentFlowState.FAILED,
      "process_A",
      staleVersion,
    );

    // This process tries the same stale version
    const result = machine.transition(
      payment.id,
      PaymentFlowState.EXPIRED,
      "process_B",
      staleVersion,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Concurrent modification");
  });
});

// ============================================================================
// 3. State History / Audit Trail
// ============================================================================

describe("CryptoPaymentFlowMachine - State History", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("state history records all transitions", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    machine.updateConfirmations(payment.id, 3, 100, NOW + 2000);
    machine.updateConfirmations(payment.id, 12, 109, NOW + 3000);
    machine.completePayment(payment.id, NOW + 4000);

    const final = machine.getPayment(payment.id)!;
    expect(final.stateHistory.length).toBe(4); // pending, confirming, confirmed, completed
    expect(final.stateHistory[0].fromState).toBe(PaymentFlowState.CREATED);
    expect(final.stateHistory[0].toState).toBe(PaymentFlowState.PENDING);
    expect(final.stateHistory[3].toState).toBe(PaymentFlowState.COMPLETED);
  });

  test("state history entries have timestamps", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 5000,
    );

    const updated = machine.getPayment(payment.id)!;
    expect(updated.stateHistory[0].timestamp).toBe(NOW + 5000);
  });

  test("state history entries have metadata", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.50000000",
    );

    const updated = machine.getPayment(payment.id)!;
    expect(updated.stateHistory[0].metadata).toBeDefined();
    expect(updated.stateHistory[0].metadata!.txHash).toBe(
      "0x" + "a".repeat(64),
    );
  });

  test("failed transitions do not add to history", () => {
    const payment = createPaymentHelper(machine);
    machine.transition(payment.id, PaymentFlowState.COMPLETED, "invalid", 0); // should fail
    const updated = machine.getPayment(payment.id)!;
    expect(updated.stateHistory.length).toBe(0);
  });
});

// ============================================================================
// 4. Address Generation
// ============================================================================

describe("HDAddressGenerator", () => {
  let generator: HDAddressGenerator;

  beforeEach(() => {
    generator = new HDAddressGenerator(TEST_SEED);
  });

  test("generates valid Ethereum addresses", () => {
    const result = generator.deriveAddress("pay_1", ChainNetwork.ETHEREUM);
    expect(result.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(result.network).toBe(ChainNetwork.ETHEREUM);
  });

  test("generates valid Bitcoin addresses", () => {
    const result = generator.deriveAddress("pay_1", ChainNetwork.BITCOIN);
    expect(result.address).toMatch(/^bc1q[0-9a-f]{40}$/);
    expect(result.network).toBe(ChainNetwork.BITCOIN);
  });

  test("generates valid Polygon addresses (EVM format)", () => {
    const result = generator.deriveAddress("pay_1", ChainNetwork.POLYGON);
    expect(result.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(result.network).toBe(ChainNetwork.POLYGON);
  });

  test("same payment ID always produces same address (deterministic)", () => {
    const gen1 = new HDAddressGenerator(TEST_SEED);
    const gen2 = new HDAddressGenerator(TEST_SEED);

    const addr1 = gen1.deriveAddress(
      "pay_deterministic",
      ChainNetwork.ETHEREUM,
    );
    const addr2 = gen2.deriveAddress(
      "pay_deterministic",
      ChainNetwork.ETHEREUM,
    );

    expect(addr1.address).toBe(addr2.address);
    expect(addr1.derivationIndex).toBe(addr2.derivationIndex);
  });

  test("different payment IDs produce different addresses", () => {
    const addr1 = generator.deriveAddress("pay_1", ChainNetwork.ETHEREUM);
    const addr2 = generator.deriveAddress("pay_2", ChainNetwork.ETHEREUM);
    expect(addr1.address).not.toBe(addr2.address);
  });

  test("different networks produce different addresses for same payment", () => {
    const eth = generator.deriveAddress("pay_cross", ChainNetwork.ETHEREUM);
    const btc = generator.deriveAddress("pay_cross", ChainNetwork.BITCOIN);
    const poly = generator.deriveAddress("pay_cross", ChainNetwork.POLYGON);

    expect(eth.address).not.toBe(btc.address);
    expect(eth.address).not.toBe(poly.address);
    expect(btc.address).not.toBe(poly.address);
  });

  test("different seeds produce different addresses", () => {
    const gen1 = new HDAddressGenerator("seed_a".repeat(10));
    const gen2 = new HDAddressGenerator("seed_b".repeat(10));

    const addr1 = gen1.deriveAddress("pay_1", ChainNetwork.ETHEREUM);
    const addr2 = gen2.deriveAddress("pay_1", ChainNetwork.ETHEREUM);

    expect(addr1.address).not.toBe(addr2.address);
  });

  test("tracks used indices per network", () => {
    generator.deriveAddress("pay_1", ChainNetwork.ETHEREUM);
    generator.deriveAddress("pay_2", ChainNetwork.ETHEREUM);
    generator.deriveAddress("pay_3", ChainNetwork.BITCOIN);

    const ethIndices = generator.getUsedIndices(ChainNetwork.ETHEREUM);
    const btcIndices = generator.getUsedIndices(ChainNetwork.BITCOIN);

    expect(ethIndices.length).toBe(2);
    expect(btcIndices.length).toBe(1);
  });

  test("isOurAddress returns true for generated addresses", () => {
    const result = generator.deriveAddress("pay_check", ChainNetwork.ETHEREUM);
    expect(generator.isOurAddress(result.address)).toBe(true);
    expect(generator.isOurAddress("0x" + "0".repeat(40))).toBe(false);
  });

  test("getPaymentIdForAddress returns correct ID", () => {
    const result = generator.deriveAddress("pay_lookup", ChainNetwork.ETHEREUM);
    expect(generator.getPaymentIdForAddress(result.address)).toBe("pay_lookup");
  });

  test("allocateNextIndex returns monotonically increasing indices", () => {
    const idx1 = generator.allocateNextIndex(ChainNetwork.ETHEREUM);
    const idx2 = generator.allocateNextIndex(ChainNetwork.ETHEREUM);
    const idx3 = generator.allocateNextIndex(ChainNetwork.ETHEREUM);

    expect(idx2).toBeGreaterThan(idx1);
    expect(idx3).toBeGreaterThan(idx2);
  });

  test("clear resets all state", () => {
    generator.deriveAddress("pay_1", ChainNetwork.ETHEREUM);
    generator.clear();

    expect(generator.getUsedIndices(ChainNetwork.ETHEREUM).length).toBe(0);
    expect(generator.isOurAddress("0x" + "0".repeat(40))).toBe(false);
  });
});

// ============================================================================
// 5. Address Generation via Machine (uniqueness enforcement)
// ============================================================================

describe("CryptoPaymentFlowMachine - Address Generation", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("each payment gets a unique address", () => {
    const addresses = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const payment = createPaymentHelper(machine, { id: `pay_${i}` });
      expect(addresses.has(payment.paymentAddress)).toBe(false);
      addresses.add(payment.paymentAddress);
    }
    expect(addresses.size).toBe(50);
  });

  test("duplicate payment ID throws", () => {
    createPaymentHelper(machine, { id: "pay_dup" });
    expect(() => createPaymentHelper(machine, { id: "pay_dup" })).toThrow(
      "Payment pay_dup already exists",
    );
  });

  test("payment can be looked up by address", () => {
    const payment = createPaymentHelper(machine, { id: "pay_addr_lookup" });
    const found = machine.getPaymentByAddress(payment.paymentAddress);
    expect(found).toBeDefined();
    expect(found!.id).toBe("pay_addr_lookup");
  });

  test("address lookup is case-insensitive", () => {
    const payment = createPaymentHelper(machine, {
      id: "pay_case",
      network: ChainNetwork.ETHEREUM,
    });
    const upper = payment.paymentAddress.toUpperCase();
    const found = machine.getPaymentByAddress(upper);
    expect(found).toBeDefined();
    expect(found!.id).toBe("pay_case");
  });

  test("idempotent address for same payment ID across machine instances", () => {
    const m1 = createTestMachine();
    const m2 = createTestMachine();

    const p1 = createPaymentHelper(m1, { id: "pay_idempotent" });
    const p2 = createPaymentHelper(m2, { id: "pay_idempotent" });

    expect(p1.paymentAddress).toBe(p2.paymentAddress);
  });
});

// ============================================================================
// 6. Confirmation Tracking
// ============================================================================

describe("ConfirmationTracker", () => {
  let tracker: ConfirmationTracker;

  beforeEach(() => {
    tracker = new ConfirmationTracker();
  });

  test("ETH requires 12 confirmations", () => {
    expect(tracker.getRequiredConfirmations(ChainNetwork.ETHEREUM)).toBe(12);
  });

  test("BTC requires 6 confirmations", () => {
    expect(tracker.getRequiredConfirmations(ChainNetwork.BITCOIN)).toBe(6);
  });

  test("Polygon requires 30 confirmations", () => {
    expect(tracker.getRequiredConfirmations(ChainNetwork.POLYGON)).toBe(30);
  });

  test("isConfirmed returns false below threshold", () => {
    expect(tracker.isConfirmed(ChainNetwork.ETHEREUM, 11)).toBe(false);
    expect(tracker.isConfirmed(ChainNetwork.BITCOIN, 5)).toBe(false);
    expect(tracker.isConfirmed(ChainNetwork.POLYGON, 29)).toBe(false);
  });

  test("isConfirmed returns true at threshold", () => {
    expect(tracker.isConfirmed(ChainNetwork.ETHEREUM, 12)).toBe(true);
    expect(tracker.isConfirmed(ChainNetwork.BITCOIN, 6)).toBe(true);
    expect(tracker.isConfirmed(ChainNetwork.POLYGON, 30)).toBe(true);
  });

  test("isConfirmed returns true above threshold", () => {
    expect(tracker.isConfirmed(ChainNetwork.ETHEREUM, 100)).toBe(true);
    expect(tracker.isConfirmed(ChainNetwork.BITCOIN, 50)).toBe(true);
    expect(tracker.isConfirmed(ChainNetwork.POLYGON, 500)).toBe(true);
  });

  test("getProgress returns correct percentage", () => {
    expect(tracker.getProgress(ChainNetwork.ETHEREUM, 6)).toBe(50);
    expect(tracker.getProgress(ChainNetwork.ETHEREUM, 12)).toBe(100);
    expect(tracker.getProgress(ChainNetwork.ETHEREUM, 0)).toBe(0);
    expect(tracker.getProgress(ChainNetwork.BITCOIN, 3)).toBe(50);
  });

  test("getProgress clamps to 100", () => {
    expect(tracker.getProgress(ChainNetwork.ETHEREUM, 1000)).toBe(100);
  });

  test("detectReorg returns true when confirmations decrease", () => {
    expect(tracker.detectReorg(10, 5)).toBe(true);
    expect(tracker.detectReorg(10, 10)).toBe(false);
    expect(tracker.detectReorg(10, 15)).toBe(false);
  });

  test("estimateTimeToConfirmation returns correct estimate", () => {
    const config = tracker.getChainConfig(ChainNetwork.ETHEREUM)!;
    const remaining = 12 - 6;
    expect(tracker.estimateTimeToConfirmation(ChainNetwork.ETHEREUM, 6)).toBe(
      remaining * config.avgBlockTimeMs,
    );
  });

  test("estimateTimeToConfirmation returns 0 when already confirmed", () => {
    expect(tracker.estimateTimeToConfirmation(ChainNetwork.ETHEREUM, 15)).toBe(
      0,
    );
  });

  test("validates transaction hashes for EVM chains", () => {
    expect(
      tracker.isValidTxHash(ChainNetwork.ETHEREUM, "0x" + "a".repeat(64)),
    ).toBe(true);
    expect(tracker.isValidTxHash(ChainNetwork.ETHEREUM, "invalid")).toBe(false);
    expect(
      tracker.isValidTxHash(ChainNetwork.POLYGON, "0x" + "b".repeat(64)),
    ).toBe(true);
  });

  test("validates transaction hashes for Bitcoin", () => {
    expect(tracker.isValidTxHash(ChainNetwork.BITCOIN, "a".repeat(64))).toBe(
      true,
    );
    expect(
      tracker.isValidTxHash(ChainNetwork.BITCOIN, "0x" + "a".repeat(64)),
    ).toBe(false);
  });

  test("validates addresses for EVM chains", () => {
    expect(
      tracker.isValidAddress(ChainNetwork.ETHEREUM, "0x" + "a".repeat(40)),
    ).toBe(true);
    expect(tracker.isValidAddress(ChainNetwork.ETHEREUM, "invalid")).toBe(
      false,
    );
  });

  test("throws for unsupported network", () => {
    expect(() => tracker.getRequiredConfirmations("solana" as any)).toThrow();
  });
});

// ============================================================================
// 7. Confirmation Updates on Payments
// ============================================================================

describe("CryptoPaymentFlowMachine - Confirmation Updates", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("ETH payment confirms at 12 confirmations", () => {
    const payment = createPaymentHelper(machine, {
      network: ChainNetwork.ETHEREUM,
    });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );

    for (let i = 1; i < 12; i++) {
      machine.updateConfirmations(payment.id, i);
      const p = machine.getPayment(payment.id)!;
      expect(p.state).toBe(PaymentFlowState.CONFIRMING);
    }

    machine.updateConfirmations(payment.id, 12);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMED,
    );
  });

  test("BTC payment confirms at 6 confirmations", () => {
    const payment = createPaymentHelper(machine, {
      network: ChainNetwork.BITCOIN,
      currency: "BTC",
    });
    machine.recordTransactionDetected(
      payment.id,
      "a".repeat(64),
      "bc1q" + "b".repeat(40),
      "0.01000000",
    );

    machine.updateConfirmations(payment.id, 3);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMING,
    );

    machine.updateConfirmations(payment.id, 6);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMED,
    );
  });

  test("Polygon payment confirms at 30 confirmations", () => {
    const payment = createPaymentHelper(machine, {
      network: ChainNetwork.POLYGON,
      currency: "MATIC",
    });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "500.00000000",
    );

    machine.updateConfirmations(payment.id, 15);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMING,
    );

    machine.updateConfirmations(payment.id, 29);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMING,
    );

    machine.updateConfirmations(payment.id, 30);
    expect(machine.getPayment(payment.id)!.state).toBe(
      PaymentFlowState.CONFIRMED,
    );
  });

  test("block number is tracked", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3, 1000000);

    const updated = machine.getPayment(payment.id)!;
    expect(updated.blockNumber).toBe(1000000);
  });

  test("reorg detection triggers FAILED state from CONFIRMED", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    machine.updateConfirmations(payment.id, 12); // CONFIRMED

    // Reorg: confirmations drop
    const result = machine.updateConfirmations(payment.id, 2);
    expect(result.newState).toBe(PaymentFlowState.FAILED);
  });

  test("reorg in CONFIRMING state updates count but stays in state", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 8); // CONFIRMING

    const result = machine.updateConfirmations(payment.id, 5); // Reorg
    expect(result.newState).toBe(PaymentFlowState.CONFIRMING);
    expect(machine.getPayment(payment.id)!.confirmations).toBe(5);
  });

  test("no state change when confirmations increase but below threshold", () => {
    const payment = createPaymentHelper(machine);
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3); // -> CONFIRMING

    const result = machine.updateConfirmations(payment.id, 8); // Still confirming
    expect(result.newState).toBe(PaymentFlowState.CONFIRMING);
  });
});

// ============================================================================
// 8. Payment Expiry
// ============================================================================

describe("CryptoPaymentFlowMachine - Expiry", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine({ paymentWindowMs: 30 * 60 * 1000 }); // 30 min
  });

  test("payment is not expired before deadline", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    expect(machine.isExpired(payment.id, NOW + 29 * 60 * 1000)).toBe(false);
  });

  test("payment is expired at deadline", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    expect(machine.isExpired(payment.id, NOW + 30 * 60 * 1000)).toBe(true);
  });

  test("payment is expired after deadline", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    expect(machine.isExpired(payment.id, NOW + 60 * 60 * 1000)).toBe(true);
  });

  test("expire before deadline fails", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    const result = machine.expirePayment(payment.id, NOW + 10 * 60 * 1000);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not yet expired");
  });

  test("expire at deadline succeeds for CREATED", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PaymentFlowState.EXPIRED);
  });

  test("expire at deadline succeeds for PENDING", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(true);
  });

  test("expire at deadline succeeds for CONFIRMING", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    machine.updateConfirmations(payment.id, 3, undefined, NOW + 2000);
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(true);
  });

  test("cannot expire CONFIRMED payment", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    machine.updateConfirmations(payment.id, 3, undefined, NOW + 2000);
    machine.updateConfirmations(payment.id, 12, undefined, NOW + 3000);
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot expire");
  });

  test("cannot expire COMPLETED payment", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      payment.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(payment.id, 3);
    machine.updateConfirmations(payment.id, 12);
    machine.completePayment(payment.id);
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(false);
  });

  test("cannot expire already FAILED payment", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.failPayment(payment.id, "test");
    const result = machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    expect(result.success).toBe(false);
  });

  test("cannot expire already EXPIRED payment", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    machine.expirePayment(payment.id, NOW + 30 * 60 * 1000);
    const updated = machine.getPayment(payment.id)!;
    expect(updated.state).toBe(PaymentFlowState.EXPIRED);
    // Second expire attempt
    const result = machine.expirePayment(payment.id, NOW + 31 * 60 * 1000);
    expect(result.success).toBe(false);
  });

  test("expiredAt timestamp is set", () => {
    const payment = createPaymentHelper(machine, { now: NOW });
    const expireTime = NOW + 30 * 60 * 1000;
    machine.expirePayment(payment.id, expireTime);
    const updated = machine.getPayment(payment.id)!;
    expect(updated.expiredAt).toBe(expireTime);
  });

  test("processExpiredPayments expires all eligible", () => {
    const p1 = createPaymentHelper(machine, { id: "exp_1", now: NOW });
    const p2 = createPaymentHelper(machine, { id: "exp_2", now: NOW });
    const p3 = createPaymentHelper(machine, { id: "exp_3", now: NOW });

    // p3 already completed, should not be expired
    machine.recordTransactionDetected(
      "exp_3",
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations("exp_3", 3);
    machine.updateConfirmations("exp_3", 12);
    machine.completePayment("exp_3");

    const expired = machine.processExpiredPayments(NOW + 31 * 60 * 1000);
    expect(expired.length).toBe(2);
    expect(expired.map((p) => p.id).sort()).toEqual(["exp_1", "exp_2"]);
  });

  test("custom payment window is respected", () => {
    const shortMachine = createTestMachine({ paymentWindowMs: 5 * 60 * 1000 }); // 5 min
    const payment = createPaymentHelper(shortMachine, { now: NOW });
    expect(payment.expiresAt).toBe(NOW + 5 * 60 * 1000);
    expect(shortMachine.isExpired(payment.id, NOW + 6 * 60 * 1000)).toBe(true);
  });
});

// ============================================================================
// 9. Reconciliation
// ============================================================================

describe("CryptoPaymentFlowMachine - Reconciliation", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("reconcile with all balanced payments", () => {
    // Create and complete a few payments
    for (let i = 0; i < 3; i++) {
      const p = createPaymentHelper(machine, { id: `bal_${i}` });
      machine.recordTransactionDetected(
        p.id,
        "0x" + `${i}`.padStart(64, "a"),
        "0x" + "b".repeat(40),
        "1.00000000",
      );
      machine.updateConfirmations(p.id, 3);
      machine.updateConfirmations(p.id, 12);
      machine.completePayment(p.id);
    }

    const result = machine.reconcile(NOW + 60000);
    expect(result.balanced).toBe(3);
    expect(result.overpayments.length).toBe(0);
    expect(result.underpayments.length).toBe(0);
    expect(result.orphans.length).toBe(0);
  });

  test("reconcile detects overpayment", () => {
    const p = createPaymentHelper(machine, {
      id: "overpay",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.50000000", // 50% over
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12);
    machine.completePayment(p.id);

    const result = machine.reconcile(NOW + 60000);
    expect(result.overpayments.length).toBe(1);
    expect(result.overpayments[0].id).toBe("overpay");
  });

  test("reconcile detects underpayment", () => {
    const p = createPaymentHelper(machine, {
      id: "underpay",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.50000000", // 50% under, well beyond 2% tolerance
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12);
    machine.completePayment(p.id);

    const result = machine.reconcile(NOW + 60000);
    expect(result.underpayments.length).toBe(1);
    expect(result.underpayments[0].id).toBe("underpay");
  });

  test("reconcile detects orphan payments (no subscription)", () => {
    const p = machine.createPayment({
      id: "orphan_1",
      workspaceId: "ws_test",
      userId: "user_test",
      network: ChainNetwork.ETHEREUM,
      currency: "ETH",
      expectedAmount: "1.00000000",
      fiatAmount: 250000,
      fiatCurrency: "USD",
      exchangeRate: "2500",
      // No subscriptionId or invoiceId
      now: NOW,
    });

    const result = machine.reconcile(NOW + 60000);
    expect(result.orphans.length).toBe(1);
    expect(result.orphans[0].id).toBe("orphan_1");
  });

  test("reconcile detects expired unprocessed payments", () => {
    createPaymentHelper(machine, { id: "stale_1", now: NOW });
    createPaymentHelper(machine, { id: "stale_2", now: NOW });

    const result = machine.reconcile(NOW + 31 * 60 * 1000);
    expect(result.expired.length).toBe(2);
  });

  test("reconcile marks completed payments as reconciled", () => {
    const p = createPaymentHelper(machine, { id: "rec_mark" });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12);
    machine.completePayment(p.id);

    machine.reconcile(NOW + 60000);
    const updated = machine.getPayment(p.id)!;
    expect(updated.reconciled).toBe(true);
    expect(updated.reconciledAt).toBe(NOW + 60000);
  });

  test("small amount discrepancy within tolerance is not flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "within_tol",
      expectedAmount: "1.00000000",
    });
    // 1% under, within 2% tolerance
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.99000000",
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12);
    machine.completePayment(p.id);

    const result = machine.reconcile(NOW + 60000);
    expect(result.balanced).toBe(1);
    expect(result.underpayments.length).toBe(0);
  });

  test("underpayment with expired grace period generates issue", () => {
    const p = createPaymentHelper(machine, {
      id: "underpay_grace",
      expectedAmount: "1.00000000",
      now: NOW,
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.50000000",
      NOW + 1000,
    );
    machine.updateConfirmations(p.id, 3, undefined, NOW + 2000);
    machine.updateConfirmations(p.id, 12, undefined, NOW + 3000);
    machine.completePayment(p.id, NOW + 4000);

    // Run reconciliation well after grace period (15 min default)
    const result = machine.reconcile(NOW + 20 * 60 * 1000);
    expect(result.underpayments.length).toBe(1);
    expect(result.issues.some((i) => i.includes("Underpayment expired"))).toBe(
      true,
    );
  });
});

// ============================================================================
// 10. Multi-Chain Support
// ============================================================================

describe("CryptoPaymentFlowMachine - Multi-Chain", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("supports Ethereum (ETH)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.ETHEREUM,
      currency: "ETH",
    });
    expect(p.network).toBe(ChainNetwork.ETHEREUM);
    expect(p.requiredConfirmations).toBe(12);
    expect(p.paymentAddress).toMatch(/^0x/);
  });

  test("supports Ethereum (USDC)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.ETHEREUM,
      currency: "USDC",
    });
    expect(p.currency).toBe("USDC");
  });

  test("supports Ethereum (USDT)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.ETHEREUM,
      currency: "USDT",
    });
    expect(p.currency).toBe("USDT");
  });

  test("supports Ethereum (DAI)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.ETHEREUM,
      currency: "DAI",
    });
    expect(p.currency).toBe("DAI");
  });

  test("supports Bitcoin (BTC)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.BITCOIN,
      currency: "BTC",
    });
    expect(p.network).toBe(ChainNetwork.BITCOIN);
    expect(p.requiredConfirmations).toBe(6);
    expect(p.paymentAddress).toMatch(/^bc1q/);
  });

  test("supports Polygon (MATIC)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.POLYGON,
      currency: "MATIC",
    });
    expect(p.network).toBe(ChainNetwork.POLYGON);
    expect(p.requiredConfirmations).toBe(30);
    expect(p.paymentAddress).toMatch(/^0x/);
  });

  test("supports Polygon (USDC)", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.POLYGON,
      currency: "USDC",
    });
    expect(p.currency).toBe("USDC");
    expect(p.network).toBe(ChainNetwork.POLYGON);
  });

  test("rejects unsupported network", () => {
    expect(() =>
      machine.createPayment({
        id: "unsupported",
        workspaceId: "ws",
        userId: "user",
        network: "solana" as any,
        currency: "SOL" as any,
        expectedAmount: "1",
        fiatAmount: 10000,
        fiatCurrency: "USD",
        exchangeRate: "100",
      }),
    ).toThrow("Unsupported network");
  });

  test("rejects unsupported currency on network", () => {
    expect(() =>
      machine.createPayment({
        id: "bad_currency",
        workspaceId: "ws",
        userId: "user",
        network: ChainNetwork.BITCOIN,
        currency: "USDC" as any, // USDC not supported on BTC
        expectedAmount: "1",
        fiatAmount: 10000,
        fiatCurrency: "USD",
        exchangeRate: "100",
      }),
    ).toThrow("not supported on bitcoin");
  });

  test("different chains have independent confirmation thresholds", () => {
    const ethPayment = createPaymentHelper(machine, {
      id: "chain_eth",
      network: ChainNetwork.ETHEREUM,
    });
    const btcPayment = createPaymentHelper(machine, {
      id: "chain_btc",
      network: ChainNetwork.BITCOIN,
      currency: "BTC",
    });

    expect(ethPayment.requiredConfirmations).toBe(12);
    expect(btcPayment.requiredConfirmations).toBe(6);
  });

  test("full flow works for each chain", () => {
    const chains = [
      {
        network: ChainNetwork.ETHEREUM,
        currency: "ETH",
        confirmations: 12,
        txPrefix: "0x",
        addrPrefix: "0x",
      },
      {
        network: ChainNetwork.BITCOIN,
        currency: "BTC",
        confirmations: 6,
        txPrefix: "",
        addrPrefix: "bc1q",
      },
      {
        network: ChainNetwork.POLYGON,
        currency: "MATIC",
        confirmations: 30,
        txPrefix: "0x",
        addrPrefix: "0x",
      },
    ];

    for (const chain of chains) {
      const id = `flow_${chain.network}`;
      const p = createPaymentHelper(machine, {
        id,
        network: chain.network,
        currency: chain.currency,
      });

      const txHash = chain.txPrefix + "f".repeat(64);
      const fromAddr = chain.addrPrefix + "c".repeat(40);

      machine.recordTransactionDetected(id, txHash, fromAddr, "1.00000000");
      expect(machine.getPayment(id)!.state).toBe(PaymentFlowState.PENDING);

      machine.updateConfirmations(id, 1);
      expect(machine.getPayment(id)!.state).toBe(PaymentFlowState.CONFIRMING);

      machine.updateConfirmations(id, chain.confirmations);
      expect(machine.getPayment(id)!.state).toBe(PaymentFlowState.CONFIRMED);

      machine.completePayment(id);
      expect(machine.getPayment(id)!.state).toBe(PaymentFlowState.COMPLETED);
    }
  });
});

// ============================================================================
// 11. Payment Queries
// ============================================================================

describe("CryptoPaymentFlowMachine - Queries", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("getPayment returns undefined for nonexistent ID", () => {
    expect(machine.getPayment("nonexistent")).toBeUndefined();
  });

  test("getPayment returns immutable copy", () => {
    const payment = createPaymentHelper(machine, { id: "immutable_test" });
    const copy = machine.getPayment("immutable_test")!;
    copy.state = PaymentFlowState.COMPLETED; // Mutate copy
    // Original should be unchanged
    expect(machine.getPayment("immutable_test")!.state).toBe(
      PaymentFlowState.CREATED,
    );
  });

  test("getPaymentsByState returns matching payments", () => {
    createPaymentHelper(machine, { id: "q_1" });
    createPaymentHelper(machine, { id: "q_2" });
    const p3 = createPaymentHelper(machine, { id: "q_3" });
    machine.failPayment(p3.id, "test");

    const created = machine.getPaymentsByState(PaymentFlowState.CREATED);
    expect(created.length).toBe(2);

    const failed = machine.getPaymentsByState(PaymentFlowState.FAILED);
    expect(failed.length).toBe(1);
  });

  test("getPaymentsByWorkspace returns matching payments", () => {
    createPaymentHelper(machine, { id: "ws_a_1", workspaceId: "ws_a" });
    createPaymentHelper(machine, { id: "ws_a_2", workspaceId: "ws_a" });
    createPaymentHelper(machine, { id: "ws_b_1", workspaceId: "ws_b" });

    expect(machine.getPaymentsByWorkspace("ws_a").length).toBe(2);
    expect(machine.getPaymentsByWorkspace("ws_b").length).toBe(1);
    expect(machine.getPaymentsByWorkspace("ws_c").length).toBe(0);
  });

  test("getStateDistribution returns accurate counts", () => {
    createPaymentHelper(machine, { id: "dist_1" });
    createPaymentHelper(machine, { id: "dist_2" });
    const p3 = createPaymentHelper(machine, { id: "dist_3" });
    machine.failPayment(p3.id, "test");

    const dist = machine.getStateDistribution();
    expect(dist[PaymentFlowState.CREATED]).toBe(2);
    expect(dist[PaymentFlowState.FAILED]).toBe(1);
    expect(dist[PaymentFlowState.COMPLETED]).toBe(0);
  });

  test("totalPayments returns correct count", () => {
    expect(machine.totalPayments).toBe(0);
    createPaymentHelper(machine, { id: "total_1" });
    createPaymentHelper(machine, { id: "total_2" });
    expect(machine.totalPayments).toBe(2);
  });

  test("getPaymentByAddress returns undefined for unknown address", () => {
    expect(machine.getPaymentByAddress("0x" + "0".repeat(40))).toBeUndefined();
  });
});

// ============================================================================
// 12. State Timestamps
// ============================================================================

describe("CryptoPaymentFlowMachine - Timestamps", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("createdAt is set on creation", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    expect(p.createdAt).toBe(NOW);
  });

  test("expiresAt is set based on payment window", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    expect(p.expiresAt).toBe(NOW + 30 * 60 * 1000);
  });

  test("pendingAt is set on PENDING transition", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    expect(machine.getPayment(p.id)!.pendingAt).toBe(NOW + 1000);
  });

  test("confirmingAt is set on CONFIRMING transition", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    machine.updateConfirmations(p.id, 3, undefined, NOW + 2000);
    expect(machine.getPayment(p.id)!.confirmingAt).toBe(NOW + 2000);
  });

  test("confirmedAt is set on CONFIRMED transition", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12, undefined, NOW + 3000);
    expect(machine.getPayment(p.id)!.confirmedAt).toBe(NOW + 3000);
  });

  test("completedAt is set on COMPLETED transition", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(p.id, 3);
    machine.updateConfirmations(p.id, 12);
    machine.completePayment(p.id, NOW + 4000);
    expect(machine.getPayment(p.id)!.completedAt).toBe(NOW + 4000);
  });

  test("failedAt and failureReason are set on FAILED transition", () => {
    const p = createPaymentHelper(machine, { now: NOW });
    machine.failPayment(p.id, "test reason", NOW + 5000);
    const updated = machine.getPayment(p.id)!;
    expect(updated.failedAt).toBe(NOW + 5000);
    expect(updated.failureReason).toBe("test reason");
  });
});

// ============================================================================
// 13. isValidTransition / getValidTransitions
// ============================================================================

describe("CryptoPaymentFlowMachine - Transition Validation", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("isValidTransition for all CREATED transitions", () => {
    expect(
      machine.isValidTransition(
        PaymentFlowState.CREATED,
        PaymentFlowState.PENDING,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CREATED,
        PaymentFlowState.EXPIRED,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CREATED,
        PaymentFlowState.FAILED,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CREATED,
        PaymentFlowState.CONFIRMED,
      ),
    ).toBe(false);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CREATED,
        PaymentFlowState.COMPLETED,
      ),
    ).toBe(false);
  });

  test("isValidTransition for CONFIRMED transitions", () => {
    expect(
      machine.isValidTransition(
        PaymentFlowState.CONFIRMED,
        PaymentFlowState.COMPLETED,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CONFIRMED,
        PaymentFlowState.REFUNDING,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CONFIRMED,
        PaymentFlowState.FAILED,
      ),
    ).toBe(true);
    expect(
      machine.isValidTransition(
        PaymentFlowState.CONFIRMED,
        PaymentFlowState.PENDING,
      ),
    ).toBe(false);
  });

  test("no valid transitions from terminal states", () => {
    expect(machine.getValidTransitions(PaymentFlowState.EXPIRED)).toEqual([]);
    expect(machine.getValidTransitions(PaymentFlowState.FAILED)).toEqual([]);
  });

  test("getValidTransitions returns correct states for CREATED", () => {
    const valid = machine.getValidTransitions(PaymentFlowState.CREATED);
    expect(valid).toContain(PaymentFlowState.PENDING);
    expect(valid).toContain(PaymentFlowState.EXPIRED);
    expect(valid).toContain(PaymentFlowState.FAILED);
    expect(valid.length).toBe(3);
  });

  test("getValidTransitions returns correct states for COMPLETED", () => {
    const valid = machine.getValidTransitions(PaymentFlowState.COMPLETED);
    expect(valid).toContain(PaymentFlowState.REFUNDING);
    expect(valid.length).toBe(1);
  });
});

// ============================================================================
// 14. Invalid Transaction Hash Rejection
// ============================================================================

describe("CryptoPaymentFlowMachine - TX Hash Validation", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("rejects invalid ETH transaction hash", () => {
    const p = createPaymentHelper(machine, { network: ChainNetwork.ETHEREUM });
    const result = machine.recordTransactionDetected(
      p.id,
      "invalid_hash",
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid transaction hash");
  });

  test("rejects invalid BTC transaction hash", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.BITCOIN,
      currency: "BTC",
    });
    const result = machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "bc1q" + "b".repeat(40),
      "0.01",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid transaction hash");
  });

  test("accepts valid ETH transaction hash", () => {
    const p = createPaymentHelper(machine, { network: ChainNetwork.ETHEREUM });
    const result = machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    expect(result.success).toBe(true);
  });

  test("accepts valid BTC transaction hash", () => {
    const p = createPaymentHelper(machine, {
      network: ChainNetwork.BITCOIN,
      currency: "BTC",
    });
    const result = machine.recordTransactionDetected(
      p.id,
      "a".repeat(64),
      "bc1q" + "b".repeat(40),
      "0.01",
    );
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 15. Factory Functions & Singleton
// ============================================================================

describe("Factory Functions", () => {
  afterEach(() => {
    resetPaymentFlowMachine();
  });

  test("createPaymentFlowMachine with custom seed", () => {
    const machine = createPaymentFlowMachine("custom_seed_" + "x".repeat(50));
    expect(machine).toBeInstanceOf(CryptoPaymentFlowMachine);
  });

  test("createPaymentFlowMachine with overrides", () => {
    const machine = createPaymentFlowMachine(TEST_SEED, {
      paymentWindowMs: 60000,
      underpaymentTolerance: 0.05,
    });
    const payment = machine.createPayment({
      id: "factory_test",
      workspaceId: "ws",
      userId: "user",
      network: ChainNetwork.ETHEREUM,
      currency: "ETH",
      expectedAmount: "1",
      fiatAmount: 250000,
      fiatCurrency: "USD",
      exchangeRate: "2500",
      now: NOW,
    });
    expect(payment.expiresAt).toBe(NOW + 60000);
  });

  test("getPaymentFlowMachine returns singleton", () => {
    const m1 = getPaymentFlowMachine();
    const m2 = getPaymentFlowMachine();
    expect(m1).toBe(m2);
  });

  test("resetPaymentFlowMachine clears singleton", () => {
    const m1 = getPaymentFlowMachine();
    resetPaymentFlowMachine();
    const m2 = getPaymentFlowMachine();
    expect(m1).not.toBe(m2);
  });
});

// ============================================================================
// 16. Default Chain Configs
// ============================================================================

describe("Default Chain Configs", () => {
  test("all three chains are configured", () => {
    expect(DEFAULT_CHAIN_CONFIGS[ChainNetwork.ETHEREUM]).toBeDefined();
    expect(DEFAULT_CHAIN_CONFIGS[ChainNetwork.BITCOIN]).toBeDefined();
    expect(DEFAULT_CHAIN_CONFIGS[ChainNetwork.POLYGON]).toBeDefined();
  });

  test("Ethereum config has correct properties", () => {
    const config = DEFAULT_CHAIN_CONFIGS[ChainNetwork.ETHEREUM];
    expect(config.requiredConfirmations).toBe(12);
    expect(config.nativeCurrency).toBe("ETH");
    expect(config.supportedTokens).toContain("ETH");
    expect(config.supportedTokens).toContain("USDC");
  });

  test("Bitcoin config has correct properties", () => {
    const config = DEFAULT_CHAIN_CONFIGS[ChainNetwork.BITCOIN];
    expect(config.requiredConfirmations).toBe(6);
    expect(config.nativeCurrency).toBe("BTC");
    expect(config.supportedTokens).toEqual(["BTC"]);
  });

  test("Polygon config has correct properties", () => {
    const config = DEFAULT_CHAIN_CONFIGS[ChainNetwork.POLYGON];
    expect(config.requiredConfirmations).toBe(30);
    expect(config.nativeCurrency).toBe("MATIC");
    expect(config.supportedTokens).toContain("MATIC");
    expect(config.supportedTokens).toContain("USDC");
  });

  test("address validators work correctly", () => {
    const ethConfig = DEFAULT_CHAIN_CONFIGS[ChainNetwork.ETHEREUM];
    expect(ethConfig.addressValidator("0x" + "a".repeat(40))).toBe(true);
    expect(ethConfig.addressValidator("invalid")).toBe(false);

    const btcConfig = DEFAULT_CHAIN_CONFIGS[ChainNetwork.BITCOIN];
    expect(btcConfig.addressValidator("bc1q" + "a".repeat(38))).toBe(true);
  });
});

// ============================================================================
// 17. Custom Chain Configuration
// ============================================================================

describe("Custom Chain Configuration", () => {
  test("custom confirmation threshold", () => {
    const customChains = new Map(DEFAULT_PAYMENT_FLOW_CONFIG.chains);
    customChains.set(ChainNetwork.ETHEREUM, {
      ...DEFAULT_CHAIN_CONFIGS[ChainNetwork.ETHEREUM],
      requiredConfirmations: 20,
    });

    const machine = createTestMachine({ chains: customChains });
    const p = createPaymentHelper(machine, { network: ChainNetwork.ETHEREUM });

    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    machine.updateConfirmations(p.id, 12); // Would normally confirm, but custom threshold is 20
    expect(machine.getPayment(p.id)!.state).toBe(PaymentFlowState.CONFIRMING);

    machine.updateConfirmations(p.id, 20);
    expect(machine.getPayment(p.id)!.state).toBe(PaymentFlowState.CONFIRMED);
  });
});

// ============================================================================
// 18. Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine();
  });

  test("nonexistent payment ID returns error for all operations", () => {
    expect(
      machine.recordTransactionDetected(
        "fake",
        "0x" + "a".repeat(64),
        "0x" + "b".repeat(40),
        "1",
      ).success,
    ).toBe(false);
    expect(machine.updateConfirmations("fake", 12).success).toBe(false);
    expect(machine.completePayment("fake").success).toBe(false);
    expect(machine.failPayment("fake", "test").success).toBe(false);
    expect(machine.expirePayment("fake", Date.now()).success).toBe(false);
    expect(machine.isExpired("fake", Date.now())).toBe(false);
  });

  test("zero expected amount payment", () => {
    const p = createPaymentHelper(machine, { id: "zero", expectedAmount: "0" });
    expect(p.expectedAmount).toBe("0");
  });

  test("very large amount", () => {
    const p = createPaymentHelper(machine, {
      id: "large",
      expectedAmount: "999999999.99999999",
    });
    expect(p.expectedAmount).toBe("999999999.99999999");
  });

  test("clear removes all payments", () => {
    createPaymentHelper(machine, { id: "clear_1" });
    createPaymentHelper(machine, { id: "clear_2" });
    expect(machine.totalPayments).toBe(2);

    machine.clear();
    expect(machine.totalPayments).toBe(0);
    expect(machine.getPayment("clear_1")).toBeUndefined();
  });

  test("payment with all optional fields", () => {
    const p = createPaymentHelper(machine, {
      id: "full_opts",
      subscriptionId: "sub_123",
      invoiceId: "inv_456",
    });
    expect(p.subscriptionId).toBe("sub_123");
    expect(p.invoiceId).toBe("inv_456");
  });

  test("payment without optional fields", () => {
    const p = machine.createPayment({
      id: "no_opts",
      workspaceId: "ws",
      userId: "user",
      network: ChainNetwork.ETHEREUM,
      currency: "ETH",
      expectedAmount: "1",
      fiatAmount: 250000,
      fiatCurrency: "USD",
      exchangeRate: "2500",
    });
    expect(p.subscriptionId).toBeUndefined();
    expect(p.invoiceId).toBeUndefined();
  });
});

// ============================================================================
// 19. Integration with CryptoFlowService
// ============================================================================

describe("CryptoFlowService Integration", () => {
  // We test the service module separately but verify the machine
  // exposes the right interface for service consumption

  test("machine exposes getAddressGenerator", () => {
    const machine = createTestMachine();
    expect(machine.getAddressGenerator()).toBeInstanceOf(HDAddressGenerator);
  });

  test("machine exposes getConfirmationTracker", () => {
    const machine = createTestMachine();
    expect(machine.getConfirmationTracker()).toBeInstanceOf(
      ConfirmationTracker,
    );
  });

  test("full payment lifecycle produces correct final state", () => {
    const machine = createTestMachine();
    const payment = createPaymentHelper(machine, { id: "lifecycle", now: NOW });

    // 1. Created
    expect(machine.getPayment("lifecycle")!.state).toBe(
      PaymentFlowState.CREATED,
    );

    // 2. TX detected
    machine.recordTransactionDetected(
      "lifecycle",
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
      NOW + 1000,
    );
    expect(machine.getPayment("lifecycle")!.state).toBe(
      PaymentFlowState.PENDING,
    );

    // 3. Confirmations start
    machine.updateConfirmations("lifecycle", 1, 1000000, NOW + 2000);
    expect(machine.getPayment("lifecycle")!.state).toBe(
      PaymentFlowState.CONFIRMING,
    );

    // 4. Confirmations reach threshold
    machine.updateConfirmations("lifecycle", 12, 1000011, NOW + 3000);
    expect(machine.getPayment("lifecycle")!.state).toBe(
      PaymentFlowState.CONFIRMED,
    );

    // 5. Complete
    machine.completePayment("lifecycle", NOW + 4000);
    const final = machine.getPayment("lifecycle")!;
    expect(final.state).toBe(PaymentFlowState.COMPLETED);
    expect(final.stateHistory.length).toBe(4);
    expect(final.version).toBe(4);
    expect(final.pendingAt).toBe(NOW + 1000);
    expect(final.confirmingAt).toBe(NOW + 2000);
    expect(final.confirmedAt).toBe(NOW + 3000);
    expect(final.completedAt).toBe(NOW + 4000);
  });
});

// ============================================================================
// 20. Overpayment / Underpayment Detection
// ============================================================================

describe("Amount Discrepancy Detection", () => {
  let machine: CryptoPaymentFlowMachine;

  beforeEach(() => {
    machine = createTestMachine({
      underpaymentTolerance: 0.02, // 2%
      overpaymentThreshold: 0.001, // 0.1%
    });
  });

  test("exact amount is not flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "exact",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00000000",
    );
    const updated = machine.getPayment(p.id)!;
    expect(updated.isOverpayment).toBe(false);
    expect(updated.isUnderpayment).toBe(false);
  });

  test("small overpayment within threshold is not flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "small_over",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.00050000",
    ); // 0.05% over
    const updated = machine.getPayment(p.id)!;
    expect(updated.isOverpayment).toBe(false);
  });

  test("significant overpayment is flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "big_over",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "1.50000000",
    ); // 50% over
    const updated = machine.getPayment(p.id)!;
    expect(updated.isOverpayment).toBe(true);
    expect(parseFloat(updated.overpaymentAmount)).toBeCloseTo(0.5, 6);
  });

  test("small underpayment within tolerance is not flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "small_under",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.99000000",
    ); // 1% under
    const updated = machine.getPayment(p.id)!;
    expect(updated.isUnderpayment).toBe(false);
  });

  test("significant underpayment is flagged", () => {
    const p = createPaymentHelper(machine, {
      id: "big_under",
      expectedAmount: "1.00000000",
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.90000000",
    ); // 10% under
    const updated = machine.getPayment(p.id)!;
    expect(updated.isUnderpayment).toBe(true);
    expect(parseFloat(updated.underpaymentAmount)).toBeCloseTo(0.1, 6);
  });

  test("underpayment sets grace period deadline", () => {
    const p = createPaymentHelper(machine, {
      id: "under_grace",
      expectedAmount: "1.00000000",
      now: NOW,
    });
    machine.recordTransactionDetected(
      p.id,
      "0x" + "a".repeat(64),
      "0x" + "b".repeat(40),
      "0.50000000",
      NOW + 1000,
    );
    const updated = machine.getPayment(p.id)!;
    expect(updated.isUnderpayment).toBe(true);
    expect(updated.underpaymentDeadline).toBeDefined();
    // Grace period is 15 minutes from pendingAt or createdAt
    // pendingAt is set during transition, but amount check runs before transition,
    // so it falls back to createdAt (NOW) for the deadline calculation
    expect(updated.underpaymentDeadline).toBe(NOW + 15 * 60 * 1000);
  });
});
