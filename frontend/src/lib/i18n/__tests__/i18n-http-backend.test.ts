/**
 * @fileoverview Loads a translation through i18next-http-backend (4.x).
 *
 * Guards the 3.x -> 4.x major bump (P7-HYG-56): a fresh i18next instance with
 * the app's loadPath must fetch the namespace file over HTTP and resolve a key
 * from it. Fetch is stubbed; no network is used.
 */

import { createInstance } from "i18next";
import HttpBackend from "i18next-http-backend";
import { i18nConfig } from "../config";

describe("i18next-http-backend", () => {
  const originalFetch = global.fetch;
  const requested: string[] = [];

  beforeEach(() => {
    requested.length = 0;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      return new Response(JSON.stringify({ greeting: "Hello from backend" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads a namespace file from loadPath and resolves a key", async () => {
    const instance = createInstance();
    await instance.use(HttpBackend).init({
      lng: "en",
      fallbackLng: false,
      ns: ["common"],
      defaultNS: "common",
      initImmediate: false,
      backend: {
        loadPath: i18nConfig.backend.loadPath,
      },
    });

    expect(requested.some((u) => u.endsWith("/locales/en/common.json"))).toBe(
      true,
    );
    expect(instance.t("greeting")).toBe("Hello from backend");
  });
});
