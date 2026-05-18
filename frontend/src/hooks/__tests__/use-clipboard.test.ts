/**
 * Tests for use-clipboard hooks
 */

import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard, useClipboard } from "../use-clipboard";

describe("useCopyToClipboard", () => {
  const originalClipboard = (navigator as any).clipboard;

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  it("initial state has no copied text or error", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copiedText).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("copy via navigator.clipboard writes text and returns true", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("hello");
    });
    expect(ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copiedText).toBe("hello");
    expect(result.current.error).toBeNull();
  });

  it("sets error when clipboard write rejects", async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
      new Error("denied"),
    );
    const { result } = renderHook(() => useCopyToClipboard());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("text");
    });
    expect(ok).toBe(false);
    expect(result.current.error?.message).toBe("denied");
    expect(result.current.copiedText).toBeNull();
  });

  it("reset clears copiedText and error", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("x");
    });
    expect(result.current.copiedText).toBe("x");
    act(() => {
      result.current.reset();
    });
    expect(result.current.copiedText).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("falls back to execCommand when navigator.clipboard absent", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommandMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      value: execCommandMock,
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useCopyToClipboard());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("fallback");
    });
    expect(ok).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(result.current.copiedText).toBe("fallback");
  });

  it("fallback sets error when execCommand returns false", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, "execCommand", {
      value: jest.fn().mockReturnValue(false),
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useCopyToClipboard());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("x");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("useClipboard tuple helper", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it("returns [copiedText, copy] tuple", async () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current[0]).toBeNull();
    await act(async () => {
      await result.current[1]("abc");
    });
    expect(result.current[0]).toBe("abc");
  });
});
