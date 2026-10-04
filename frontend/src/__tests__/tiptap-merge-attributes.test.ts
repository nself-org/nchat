/**
 * Regression test for GHSA-cp6q-959q-f8rh (prototype pollution in
 * @tiptap/core mergeAttributes). The fix is the `__proto__` guard of
 * ueberdosis/tiptap#8309, released on the v2 line in @tiptap/core 2.27.3.
 * This test fails on 2.27.2 and passes on >= 2.27.3.
 */
import { mergeAttributes } from "@tiptap/core";

describe("@tiptap/core mergeAttributes prototype pollution guard", () => {
  it("ignores a __proto__ key in the merged attributes", () => {
    const hostile = JSON.parse('{"__proto__":{"onclick":"x"}}');
    const result = mergeAttributes({}, hostile);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(
      Object.prototype.hasOwnProperty.call(
        Object.getPrototypeOf(result),
        "onclick",
      ),
    ).toBe(false);
    expect((result as Record<string, unknown>).onclick).toBeUndefined();
  });

  it("does not pollute Object.prototype for unrelated objects", () => {
    mergeAttributes({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'));

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("still merges ordinary attributes and joins class values", () => {
    const result = mergeAttributes(
      { class: "a", id: "x" },
      { class: "b", title: "t" },
    );

    expect(result).toEqual({ class: "a b", id: "x", title: "t" });
  });
});
