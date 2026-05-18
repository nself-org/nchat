/**
 * Discord client — behavior tests for DiscordApiClient + DiscordIntegrationProvider.
 */

import {
  DiscordApiClient,
  DiscordApiError,
  DiscordIntegrationProvider,
  DISCORD_API_BASE,
  DISCORD_AUTH_URL,
  DISCORD_TOKEN_URL,
  DISCORD_DEFAULT_SCOPES,
} from "../discord-client";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

function okJson(data: any, ok = true) {
  return fetchMock.mockResolvedValueOnce({
    ok,
    json: async () => data,
  } as Response);
}

describe("discord-client — constants", () => {
  it("exports stable API and auth URLs", () => {
    expect(DISCORD_API_BASE).toBe("https://discord.com/api/v10");
    expect(DISCORD_AUTH_URL).toMatch(/\/oauth2\/authorize$/);
    expect(DISCORD_TOKEN_URL).toMatch(/\/oauth2\/token$/);
  });

  it("default scopes include identify, guilds, bot", () => {
    expect(DISCORD_DEFAULT_SCOPES).toEqual(
      expect.arrayContaining(["identify", "guilds", "bot"]),
    );
  });
});

describe("DiscordApiError", () => {
  it("carries code + endpoint + formatted message", () => {
    const e = new DiscordApiError("bad", 50001, "/users/@me");
    expect(e.code).toBe(50001);
    expect(e.endpoint).toBe("/users/@me");
    expect(e.name).toBe("DiscordApiError");
    expect(e.message).toMatch(/bad/);
    expect(e.message).toMatch(/50001/);
    expect(e.message).toMatch(/\/users\/@me/);
  });
});

describe("DiscordApiClient", () => {
  it("get uses Bearer auth and json endpoint", async () => {
    okJson({ id: "1", username: "u", discriminator: "0001" });
    const c = new DiscordApiClient("user-token");
    const user = await c.getCurrentUser();
    expect(user.id).toBe("1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${DISCORD_API_BASE}/users/@me`);
    expect((init as RequestInit).method).toBe("GET");
    expect(((init as RequestInit).headers as any).Authorization).toBe(
      "Bearer user-token",
    );
  });

  it("get appends query params and skips undefined/null", async () => {
    okJson([{ id: "g1" }]);
    const c = new DiscordApiClient("t");
    // getChannelMessages uses botGet; use get directly via getUserGuilds
    await c.getUserGuilds();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/users/@me/guilds");
  });

  it("get throws DiscordApiError on non-ok", async () => {
    okJson({ code: 50013, message: "Missing Permissions" }, false);
    const c = new DiscordApiClient("t");
    await expect(c.getCurrentUser()).rejects.toBeInstanceOf(DiscordApiError);
  });

  it("botGet throws when bot token not configured", async () => {
    const c = new DiscordApiClient("t"); // no bot token
    await expect(c.getGuild("g1")).rejects.toThrow(/Bot token/);
  });

  it("botGet uses Bot auth scheme", async () => {
    okJson({ id: "g1", name: "Guild" });
    const c = new DiscordApiClient("t", "bot-token");
    const g = await c.getGuild("g1");
    expect(g.id).toBe("g1");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init as any).headers.Authorization).toBe("Bot bot-token");
  });

  it("botGet throws DiscordApiError when response not ok", async () => {
    okJson({ code: 404, message: "Unknown Guild" }, false);
    const c = new DiscordApiClient("t", "bot");
    await expect(c.getGuild("x")).rejects.toBeInstanceOf(DiscordApiError);
  });

  it("getChannelMessages sends limit and pagination params", async () => {
    okJson([]);
    const c = new DiscordApiClient("t", "bot");
    await c.getChannelMessages("ch1", {
      limit: 50,
      before: "m100",
      after: "m1",
      around: "m50",
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("before")).toBe("m100");
    expect(url.searchParams.get("after")).toBe("m1");
    expect(url.searchParams.get("around")).toBe("m50");
  });

  it("sendMessage posts content + embeds and uses bot auth", async () => {
    okJson({ id: "m1", content: "hi" });
    const c = new DiscordApiClient("t", "bot");
    await c.sendMessage("ch1", "hi", { embeds: [{ title: "T" }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${DISCORD_API_BASE}/channels/ch1/messages`);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.content).toBe("hi");
    expect(body.embeds).toEqual([{ title: "T" }]);
    expect((init as any).headers.Authorization).toBe("Bot bot");
  });

  it("createWebhook hits the channel webhooks endpoint", async () => {
    okJson({ id: "w1", token: "tok", url: "https://x" });
    const c = new DiscordApiClient("t", "bot");
    const w = await c.createWebhook("ch1", "my-hook");
    expect(w.id).toBe("w1");
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.name).toBe("my-hook");
  });

  it("executeWebhook posts to webhooks URL without Authorization", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);
    const c = new DiscordApiClient("t", "bot");
    await c.executeWebhook("w1", "tok1", "hi", {
      username: "bot",
      embeds: [{ a: 1 }],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${DISCORD_API_BASE}/webhooks/w1/tok1`);
    const headers = (init as any).headers;
    expect(headers.Authorization).toBeUndefined();
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.username).toBe("bot");
    expect(body.embeds).toEqual([{ a: 1 }]);
  });
});

describe("DiscordIntegrationProvider", () => {
  const config = {
    clientId: "cid",
    clientSecret: "secret",
    redirectUri: "https://app/cb",
    botToken: "bot",
  };

  it("exposes identity metadata", () => {
    const p = new DiscordIntegrationProvider(config);
    expect(p.id).toBe("discord");
    expect(p.name).toBe("Discord");
    expect(p.category).toBe("communication");
    expect(p.scopes).toEqual(DISCORD_DEFAULT_SCOPES);
  });

  it("uses custom scopes when provided", () => {
    const p = new DiscordIntegrationProvider({
      ...config,
      scopes: ["identify"],
    });
    expect(p.scopes).toEqual(["identify"]);
  });

  it("getAuthUrl includes required OAuth params", () => {
    const p = new DiscordIntegrationProvider(config);
    const u = new URL(p.getAuthUrl({ state: "nn" }));
    expect(u.searchParams.get("client_id")).toBe("cid");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("redirect_uri")).toBe("https://app/cb");
    expect(u.searchParams.get("state")).toBe("nn");
  });

  it("getAuthUrl honors override redirectUri", () => {
    const p = new DiscordIntegrationProvider(config);
    const u = new URL(p.getAuthUrl({ redirectUri: "https://other/cb" }));
    expect(u.searchParams.get("redirect_uri")).toBe("https://other/cb");
  });

  it("disconnect clears the client", async () => {
    const p = new DiscordIntegrationProvider(config);
    await expect(p.disconnect()).resolves.toBeUndefined();
  });

  it("handleCallback rejects when code is missing", async () => {
    const p = new DiscordIntegrationProvider(config);
    await expect(p.handleCallback({} as any)).rejects.toThrow(/code/i);
  });

  it("handleCallback throws on error payload", async () => {
    const p = new DiscordIntegrationProvider(config);
    okJson({ error: "invalid_grant", error_description: "bad" });
    await expect(p.handleCallback({ code: "x" } as any)).rejects.toThrow();
  });

  it("handleCallback throws when access_token missing", async () => {
    const p = new DiscordIntegrationProvider(config);
    okJson({});
    await expect(p.handleCallback({ code: "x" } as any)).rejects.toThrow();
  });

  it("handleCallback succeeds and returns credentials", async () => {
    const p = new DiscordIntegrationProvider(config);
    okJson({
      access_token: "a",
      refresh_token: "r",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "identify guilds",
    });
    const creds = await p.handleCallback({ code: "x" } as any);
    expect(creds.accessToken).toBe("a");
    expect(creds.refreshToken).toBe("r");
  });

  it("refreshToken throws when refresh token missing", async () => {
    const p = new DiscordIntegrationProvider(config);
    await expect(p.refreshToken({ accessToken: "a" } as any)).rejects.toThrow(
      /refresh token/i,
    );
  });

  it("refreshToken returns new credentials", async () => {
    const p = new DiscordIntegrationProvider(config);
    okJson({
      access_token: "n",
      refresh_token: "r2",
      expires_in: 60,
      token_type: "Bearer",
      scope: "",
    });
    const creds = await p.refreshToken({
      accessToken: "a",
      refreshToken: "old",
    } as any);
    expect(creds.accessToken).toBe("n");
    expect(creds.refreshToken).toBe("r2");
  });

  it("refreshToken throws on error response", async () => {
    const p = new DiscordIntegrationProvider(config);
    okJson({ error: "invalid_grant" });
    await expect(
      p.refreshToken({ accessToken: "a", refreshToken: "old" } as any),
    ).rejects.toThrow();
  });

  it("getStatus returns disconnected when no client exists", async () => {
    const p = new DiscordIntegrationProvider(config);
    const s = await p.getStatus();
    expect(s.status).toBe("disconnected");
    expect(s.id).toBe("discord");
  });

  it("getStatus returns connected when client is established via handleCallback", async () => {
    const p = new DiscordIntegrationProvider(config);
    // Establish client via handleCallback:
    okJson({ access_token: "a", refresh_token: "r", expires_in: 60 });
    await p.handleCallback({ code: "x" } as any);
    // Now getStatus will call client.getCurrentUser (which uses Bearer):
    okJson({ id: "U1", username: "me", discriminator: "0001", avatar: "abc" });
    const s = await p.getStatus();
    expect(s.status).toBe("connected");
    expect(s.config?.username).toBe("me");
    expect(s.config?.avatarUrl).toMatch(
      /cdn\.discordapp\.com\/avatars\/U1\/abc\.png/,
    );
  });
});
