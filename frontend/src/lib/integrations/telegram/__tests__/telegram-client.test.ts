/**
 * Telegram integration — behavior tests for the API client + provider.
 */

import {
  TelegramApiClient,
  TelegramApiError,
  TelegramIntegrationProvider,
  createTelegramProvider,
  verifyTelegramWebhook,
  TELEGRAM_API_BASE,
} from "../telegram-client";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

describe("telegram-client", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("TelegramApiClient", () => {
    const bot = "123:abc";

    function mockFetch(body: any, ok = true) {
      return fetchMock.mockResolvedValueOnce({
        ok,
        json: async () => body,
      } as Response);
    }

    it("getMe posts to the correct URL", async () => {
      const spy = mockFetch({
        ok: true,
        result: { id: 1, is_bot: true, first_name: "B", username: "b" },
      });
      const c = new TelegramApiClient(bot);
      const me = await c.getMe();
      expect(me.id).toBe(1);
      const url = spy.mock.calls[0][0] as string;
      expect(url).toBe(`${TELEGRAM_API_BASE}/bot${bot}/getMe`);
      expect((spy.mock.calls[0][1] as RequestInit).method).toBe("POST");
    });

    it("throws TelegramApiError on ok=false with description + code", async () => {
      mockFetch({ ok: false, description: "bad token", error_code: 401 });
      const c = new TelegramApiClient(bot);
      await expect(c.getMe()).rejects.toBeInstanceOf(TelegramApiError);
    });

    it("TelegramApiError surfaces code and method", async () => {
      mockFetch({ ok: false, description: "bad", error_code: 400 });
      const c = new TelegramApiClient(bot);
      try {
        await c.getMe();
      } catch (e) {
        const err = e as TelegramApiError;
        expect(err.code).toBe(400);
        expect(err.method).toBe("getMe");
        expect(err.name).toBe("TelegramApiError");
        expect(err.message).toMatch(/bad/);
      }
    });

    it("setWebhook passes url and optional secret_token in body", async () => {
      const spy = mockFetch({ ok: true, result: true });
      const c = new TelegramApiClient(bot);
      await c.setWebhook("https://x/hook", { secret_token: "sec" });
      const body = JSON.parse(
        (spy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.url).toBe("https://x/hook");
      expect(body.secret_token).toBe("sec");
    });

    it("deleteWebhook and getWebhookInfo POST to right methods", async () => {
      mockFetch({ ok: true, result: true });
      mockFetch({
        ok: true,
        result: {
          url: "u",
          has_custom_certificate: false,
          pending_update_count: 0,
        },
      });
      const c = new TelegramApiClient(bot);
      await c.deleteWebhook();
      const info = await c.getWebhookInfo();
      expect(info.url).toBe("u");
      expect(fetchMock.mock.calls[0][0]).toContain("/deleteWebhook");
      expect(fetchMock.mock.calls[1][0]).toContain("/getWebhookInfo");
    });

    it("getChat / getChatAdministrators / getChatMemberCount send chat_id", async () => {
      const c = new TelegramApiClient(bot);
      const spy = mockFetch({ ok: true, result: { id: 5, type: "group" } });
      await c.getChat(5);
      expect(
        JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
          .chat_id,
      ).toBe(5);

      mockFetch({ ok: true, result: [] });
      await c.getChatAdministrators("@chan");
      mockFetch({ ok: true, result: 42 });
      const cnt = await c.getChatMemberCount(5);
      expect(cnt).toBe(42);
    });

    it("sendMessage includes text and options in the body", async () => {
      const spy = mockFetch({ ok: true, result: { message_id: 99 } });
      const c = new TelegramApiClient(bot);
      await c.sendMessage(5, "hi", {
        parse_mode: "Markdown",
        disable_notification: true,
      });
      const body = JSON.parse(
        (spy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.text).toBe("hi");
      expect(body.chat_id).toBe(5);
      expect(body.parse_mode).toBe("Markdown");
      expect(body.disable_notification).toBe(true);
    });

    it("forwardMessage and sendPhoto send expected body keys", async () => {
      const c = new TelegramApiClient(bot);
      mockFetch({ ok: true, result: { message_id: 1 } });
      mockFetch({ ok: true, result: { message_id: 2 } });
      await c.forwardMessage(2, 3, 4);
      const b1 = JSON.parse(
        (fetchMock.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(b1).toEqual({ chat_id: 2, from_chat_id: 3, message_id: 4 });

      await c.sendPhoto(5, "https://photo", { caption: "cap" });
      const b2 = JSON.parse(
        (fetchMock.mock.calls[1][1] as RequestInit).body as string,
      );
      expect(b2.photo).toBe("https://photo");
      expect(b2.caption).toBe("cap");
    });

    it("getUpdates and getFile pass through", async () => {
      const c = new TelegramApiClient(bot);
      mockFetch({ ok: true, result: [] });
      const updates = await c.getUpdates({ offset: 1, limit: 10 });
      expect(updates).toEqual([]);

      mockFetch({
        ok: true,
        result: {
          file_id: "f",
          file_unique_id: "u",
          file_path: "photos/x.jpg",
        },
      });
      const file = await c.getFile("f");
      expect(file.file_path).toBe("photos/x.jpg");
    });

    it("getFileUrl builds the download URL", () => {
      const c = new TelegramApiClient(bot);
      expect(c.getFileUrl("photos/x.jpg")).toBe(
        `${TELEGRAM_API_BASE}/file/bot${bot}/photos/x.jpg`,
      );
    });
  });

  describe("TelegramIntegrationProvider", () => {
    it("identifies as telegram", () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      expect(p.id).toBe("telegram");
      expect(p.name).toBe("Telegram");
      expect(p.category).toBe("communication");
    });

    it("OAuth methods throw since Telegram uses bot tokens", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      expect(() => p.getAuthUrl()).toThrow();
      await expect(p.authorize()).rejects.toThrow();
      await expect(p.handleCallback()).rejects.toThrow();
    });

    it("refreshToken is a no-op (bot tokens do not expire)", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      const creds = { accessToken: "x" } as any;
      await expect(p.refreshToken(creds)).resolves.toBe(creds);
    });

    it("validateCredentials returns true/false based on getMe result", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { id: 1 } }),
      } as Response);
      await expect(
        p.validateCredentials({ accessToken: "ok" } as any),
      ).resolves.toBe(true);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "x", error_code: 401 }),
      } as Response);
      await expect(
        p.validateCredentials({ accessToken: "bad" } as any),
      ).resolves.toBe(false);
    });

    it("getStatus returns connected when bot token is valid", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          result: { id: 7, username: "bot", first_name: "B" },
        }),
      } as Response);
      const s = await p.getStatus();
      expect(s.status).toBe("connected");
      expect(s.config?.botUsername).toBe("bot");
    });

    it("getStatus returns error on bad token", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "bad", error_code: 401 }),
      } as Response);
      const s = await p.getStatus();
      expect(s.status).toBe("error");
      expect(s.error).toBeTruthy();
    });

    it("setupWebhook delegates to client", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      const spy = fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true }),
      } as Response);
      const ok = await p.setupWebhook("https://hook", "sec");
      expect(ok).toBe(true);
      const body = JSON.parse(
        (spy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.url).toBe("https://hook");
      expect(body.secret_token).toBe("sec");
    });

    it("importHistory reports error when no chatIds supplied", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      const r = await p.importHistory({ accessToken: "t" } as any);
      expect(r.success).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it("importHistory counts chats and notes Bot API limitation", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          result: { id: 1, type: "group", title: "T" },
        }),
      } as Response);
      const r = await p.importHistory({ accessToken: "t" } as any, {
        chatIds: [1],
      });
      expect(r.chatsSynced).toBe(1);
      expect(r.errors.some((e) => /historical/.test(e))).toBe(true);
      expect(r.success).toBe(true);
    });

    it("forwardMessage calls sendMessage under the hood", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      } as Response);
      const m = await p.forwardMessage({ accessToken: "t" } as any, 10, "hi");
      expect(m.message_id).toBe(1);
    });

    it("sendPhoto uses the bot client", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 2 } }),
      } as Response);
      const m = await p.sendPhoto(
        { accessToken: "t" } as any,
        10,
        "https://p",
        "cap",
      );
      expect(m.message_id).toBe(2);
    });

    it("getClient throws when client not initialized (after disconnect)", async () => {
      const p = new TelegramIntegrationProvider({ botToken: "t" });
      // mock deleteWebhook for disconnect
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: true }),
      } as Response);
      await p.disconnect();
      expect(() => p.getClient()).toThrow(/not initialized/i);
    });
  });

  describe("createTelegramProvider + verifyTelegramWebhook", () => {
    it("factory returns a provider instance", () => {
      const p = createTelegramProvider({ botToken: "t" });
      expect(p).toBeInstanceOf(TelegramIntegrationProvider);
    });

    it("verifyTelegramWebhook is exact-match comparison", () => {
      expect(verifyTelegramWebhook("abc", "abc")).toBe(true);
      expect(verifyTelegramWebhook("abc", "abcd")).toBe(false);
      expect(verifyTelegramWebhook("", "")).toBe(true);
    });
  });
});
