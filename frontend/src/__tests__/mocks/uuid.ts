/**
 * UUID Mock for Jest Tests
 *
 * Mocks the uuid package to avoid ESM compatibility issues with pnpm
 */

let counter = 0;

export const v4 = jest.fn(() => {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const v1 = jest.fn(() => {
  counter++;
  return `10000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const v3 = jest.fn(() => {
  counter++;
  return `30000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const v5 = jest.fn(() => {
  counter++;
  return `50000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const v6 = jest.fn(() => {
  counter++;
  return `60000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const v7 = jest.fn(() => {
  counter++;
  return `70000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
});

export const NIL = "00000000-0000-0000-0000-000000000000";
export const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

export const validate = jest.fn((uuid: string) => {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
});

export const version = jest.fn((uuid: string) => {
  if (!validate(uuid)) return 0;
  return parseInt(uuid.charAt(14), 16);
});

export const parse = jest.fn((uuid: string) => {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
});

export const stringify = jest.fn((arr: Uint8Array) => {
  const hex = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
});

// Reset function for tests
export const __resetCounter = () => {
  counter = 0;
};

export default {
  v4,
  v1,
  v3,
  v5,
  v6,
  v7,
  NIL,
  MAX,
  validate,
  version,
  parse,
  stringify,
};
