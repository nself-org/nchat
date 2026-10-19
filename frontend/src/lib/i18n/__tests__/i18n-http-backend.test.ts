/**
 * @fileoverview Loads a translation through i18next-http-backend (4.x).
 *
 * Guards the 3.x -> 4.x major bump (P7-HYG-56): a fresh i18next instance with
 * the app's loadPath must fetch the shipped namespace file over HTTP and
 * resolve keys from it. Fetch is stubbed to serve public/locales; no network.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createInstance } from "i18next";
import HttpBackend from "i18next-http-backend";
import { i18nConfig } from "../config";

const LOCALES_DIR = join(process.cwd(), "public", "locales");

describe("i18next-http-backend", () => {
  const originalFetch = global.fetch;
  const requested: string[] = [];

  beforeEach(() => {
    requested.length = 0;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      const body = readFileSync(
        join(LOCALES_DIR, url.replace("/locales/", "")),
        "utf8",
      );
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        text: async () => body,
        json: async () => JSON.parse(body),
      } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads the common namespace from loadPath and resolves keys", async () => {
    const instance = createInstance();
    await instance.use(HttpBackend).init({
      lng: "en",
      fallbackLng: false,
      ns: ["common"],
      defaultNS: "common",
      backend: { loadPath: i18nConfig.backend.loadPath },
    });

    expect(requested).toEqual(["/locales/en/common.json"]);
    expect(instance.t("nav.home")).toBe("Home");
    expect(instance.t("auth.signInWith", { provider: "X" })).toBe(
      "Sign in with X",
    );
  });
});
