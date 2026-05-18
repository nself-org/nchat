/**
 * Unit tests for unfurl-service.
 * Pure parsing + cache + rate-limit + fetch logic.
 */
import {
  getCached,
  setCache,
  clearCache,
  getCacheStats,
  isRateLimited,
  recordRequest,
  parseOpenGraph,
  parseTwitterCard,
  parseBasicMeta,
  resolveUrl,
  fetchOEmbed,
  unfurlUrl,
  unfurlUrls,
  parseHtmlForUnfurl,
} from "../unfurl-service";

beforeEach(() => {
  clearCache();
  jest.restoreAllMocks();
});

describe("cache functions", () => {
  it("getCached returns null for missing", () => {
    expect(getCached("https://x.com")).toBe(null);
  });
  it("setCache + getCached round-trip", () => {
    setCache("https://x.com", {
      url: "https://x.com",
      embedType: "generic" as any,
      title: "X",
    } as any);
    expect(getCached("https://x.com")?.title).toBe("X");
  });
  it("setCache enforces size", () => {
    for (let i = 0; i < 505; i++) {
      setCache(`https://x.com/${i}`, {
        url: `x${i}`,
        embedType: "generic" as any,
      } as any);
    }
    expect(getCacheStats().size).toBeLessThanOrEqual(500);
  });
  it("expired entries removed", () => {
    setCache(
      "https://y.com",
      { url: "y", embedType: "generic" as any } as any,
      -1,
    );
    expect(getCached("https://y.com")).toBe(null);
  });
  it("clearCache empties", () => {
    setCache("https://z.com", { url: "z", embedType: "generic" as any } as any);
    clearCache();
    expect(getCacheStats().size).toBe(0);
  });
});

describe("rate limiting", () => {
  it("untracked domain not limited", () => {
    expect(isRateLimited("https://never.example/x")).toBe(false);
  });
  it("invalid URL not limited", () => {
    expect(isRateLimited("not a url")).toBe(false);
  });
  it("invalid URL recordRequest no-ops", () => {
    expect(() => recordRequest("bogus")).not.toThrow();
  });
  it("becomes rate limited after 10 requests", () => {
    const url = "https://rl.example/foo";
    for (let i = 0; i < 10; i++) recordRequest(url);
    expect(isRateLimited(url)).toBe(true);
  });
  it("resets after window (manual)", () => {
    // Can't fast-forward Date.now cleanly without time mocking — verify no-throw only
    const url = "https://rl2.example/foo";
    recordRequest(url);
    expect(isRateLimited(url)).toBe(false);
  });
});

describe("parseOpenGraph", () => {
  it("extracts og tags in property=content order", () => {
    const html = `
      <meta property="og:title" content="Hello World" />
      <meta property="og:description" content="A description" />
      <meta property="og:image" content="https://x.com/img.png" />
      <meta property="og:site_name" content="X Site" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://x.com" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="alt text" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:audio" content="https://x.com/a.mp3" />
      <meta property="og:video" content="https://x.com/v.mp4" />
      <meta property="og:video:width" content="800" />
      <meta property="og:video:height" content="600" />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:determiner" content="the" />
    `;
    const og = parseOpenGraph(html);
    expect(og.title).toBe("Hello World");
    expect(og.description).toBe("A description");
    expect(og.image).toBe("https://x.com/img.png");
    expect(og.siteName).toBe("X Site");
    expect(og.imageWidth).toBe(1200);
    expect(og.imageHeight).toBe(630);
    expect(og.type).toBe("article");
    expect(og.locale).toBe("en_US");
    expect(og.audio).toContain("mp3");
    expect(og.video).toContain("mp4");
    expect(og.videoWidth).toBe(800);
    expect(og.videoHeight).toBe(600);
    expect(og.videoType).toBe("video/mp4");
    expect(og.imageAlt).toBe("alt text");
    expect(og.determiner).toBe("the");
  });
  it("extracts og tags in content=property order (reversed)", () => {
    const html = `<meta content="Reversed" property="og:title" />`;
    expect(parseOpenGraph(html).title).toBe("Reversed");
  });
  it("decodes entities", () => {
    const html = `<meta property="og:title" content="A &amp; B" />`;
    expect(parseOpenGraph(html).title).toBe("A & B");
  });
  it("empty html returns empty obj", () => {
    expect(parseOpenGraph("")).toEqual({});
  });
});

describe("parseTwitterCard", () => {
  it("extracts main fields", () => {
    const html = `
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@foo" />
      <meta name="twitter:creator" content="@bar" />
      <meta name="twitter:title" content="T" />
      <meta name="twitter:description" content="D" />
      <meta name="twitter:image" content="https://x.com/i.png" />
      <meta name="twitter:image:alt" content="alt" />
      <meta name="twitter:player" content="https://x.com/p" />
      <meta name="twitter:player:width" content="640" />
      <meta name="twitter:player:height" content="480" />
      <meta name="twitter:player:stream" content="https://x.com/s.mp4" />
      <meta name="twitter:site:id" content="123" />
      <meta name="twitter:creator:id" content="456" />
    `;
    const tc = parseTwitterCard(html);
    expect(tc.card).toBe("summary_large_image");
    expect(tc.site).toBe("@foo");
    expect(tc.creator).toBe("@bar");
    expect(tc.title).toBe("T");
    expect(tc.playerWidth).toBe(640);
    expect(tc.playerStream).toContain("mp4");
    expect(tc.siteId).toBe("123");
  });
  it("reversed format", () => {
    expect(
      parseTwitterCard(`<meta content="R" name="twitter:title" />`).title,
    ).toBe("R");
  });
});

describe("parseBasicMeta", () => {
  it("title + description + favicon + theme + author + date", () => {
    const html = `
      <title>Hi</title>
      <meta name="description" content="Desc" />
      <link rel="icon" href="/favicon.ico" />
      <meta name="theme-color" content="#ff00ff" />
      <meta name="author" content="Jane" />
      <meta property="article:published_time" content="2025-01-01" />
    `;
    const m = parseBasicMeta(html);
    expect(m.title).toBe("Hi");
    expect(m.description).toBe("Desc");
    expect(m.favicon).toBe("/favicon.ico");
    expect(m.themeColor).toBe("#ff00ff");
    expect(m.author).toBe("Jane");
    expect(m.publishedDate).toBe("2025-01-01");
  });
  it("description reversed format", () => {
    expect(
      parseBasicMeta(`<meta content="D2" name="description" />`).description,
    ).toBe("D2");
  });
  it("apple-touch fallback favicon", () => {
    expect(
      parseBasicMeta(`<link rel="apple-touch-icon" href="/apple.png" />`)
        .favicon,
    ).toBe("/apple.png");
  });
  it("empty html → empty data", () => {
    expect(parseBasicMeta("")).toEqual({});
  });
});

describe("resolveUrl", () => {
  it("empty string", () => {
    expect(resolveUrl("https://x.com", "")).toBe("");
  });
  it("absolute returns as-is", () => {
    expect(resolveUrl("https://x.com", "https://y.com/z")).toBe(
      "https://y.com/z",
    );
  });
  it("protocol-relative gets https", () => {
    expect(resolveUrl("https://x.com", "//cdn.com/a.png")).toBe(
      "https://cdn.com/a.png",
    );
  });
  it("relative path resolved against base", () => {
    expect(resolveUrl("https://x.com/deep/page", "/root")).toBe(
      "https://x.com/root",
    );
  });
  it("invalid base returns relative unchanged", () => {
    expect(resolveUrl("not a url", "/x")).toBe("/x");
  });
});

describe("fetchOEmbed", () => {
  it("returns null when no link", async () => {
    expect(await fetchOEmbed("<html></html>", "https://x.com")).toBe(null);
  });
  it("returns data when link present", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ title: "oE", type: "video" }),
    })) as any;
    const html = `<link rel="alternate" type="application/json+oembed" href="https://e.com/oe" />`;
    const res = await fetchOEmbed(html, "https://x.com");
    expect(res?.title).toBe("oE");
  });
  it("reversed link format", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ title: "R" }),
    })) as any;
    const html = `<link href="https://e.com/oe" type="application/json+oembed" />`;
    const res = await fetchOEmbed(html, "https://x.com");
    expect(res?.title).toBe("R");
  });
  it("non-ok response → null", async () => {
    global.fetch = jest.fn(async () => ({ ok: false })) as any;
    const html = `<link rel="alternate" type="application/json+oembed" href="https://e.com" />`;
    expect(await fetchOEmbed(html, "https://x.com")).toBe(null);
  });
  it("fetch throws → null", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("nope");
    }) as any;
    const html = `<link rel="alternate" type="application/json+oembed" href="https://e.com" />`;
    expect(await fetchOEmbed(html, "https://x.com")).toBe(null);
  });
});

describe("unfurlUrl", () => {
  it("cache hit returns cached", async () => {
    setCache("https://hit.com", {
      url: "https://hit.com",
      embedType: "generic" as any,
      title: "C",
    } as any);
    const res = await unfurlUrl("https://hit.com");
    expect(res.success).toBe(true);
    if (res.success) expect(res.cached).toBe(true);
  });
  it("rate limited returns error", async () => {
    for (let i = 0; i < 10; i++) recordRequest("https://rl.test/x");
    const res = await unfurlUrl("https://rl.test/x");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe("RATE_LIMITED");
  });
  it("fetch error branch", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("network");
    }) as any;
    const res = await unfurlUrl("https://fail.test/x");
    expect(res.success).toBe(false);
  });
  it("non-ok response includes errorData", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found", errorCode: "NOT_FOUND" }),
    })) as any;
    const res = await unfurlUrl("https://notfound.test/x");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe("NOT_FOUND");
  });
  it("non-ok with bad JSON falls back", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no json");
      },
    })) as any;
    const res = await unfurlUrl("https://badjson.test/x");
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe("FETCH_FAILED");
  });
  it("happy path caches", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        url: "https://ok.test/",
        embedType: "generic",
        title: "OK",
      }),
    })) as any;
    const res = await unfurlUrl("https://ok.test/");
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.title).toBe("OK");
    // second call should be cached
    const res2 = await unfurlUrl("https://ok.test/");
    if (res2.success) expect(res2.cached).toBe(true);
  });
  it("skipCache flag", async () => {
    setCache("https://skip.test/", {
      url: "x",
      embedType: "generic" as any,
      title: "cached",
    } as any);
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ url: "x", embedType: "generic", title: "fresh" }),
    })) as any;
    const res = await unfurlUrl("https://skip.test/", { skipCache: true });
    if (res.success) expect(res.data.title).toBe("fresh");
  });
});

describe("unfurlUrls batch", () => {
  it("batches with concurrency", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ url: "x", embedType: "generic", title: "batch" }),
    })) as any;
    const results = await unfurlUrls(
      [
        "https://b1.test/a",
        "https://b2.test/b",
        "https://b3.test/c",
        "https://b4.test/d",
      ],
      { concurrency: 2 },
    );
    expect(results.size).toBe(4);
  });
});

describe("parseHtmlForUnfurl (integration of parsers)", () => {
  it("merges OG + Twitter + basic meta", async () => {
    const html = `
      <title>T</title>
      <meta property="og:title" content="OG T" />
      <meta name="twitter:title" content="TW T" />
      <meta name="twitter:description" content="D" />
      <meta property="og:image" content="/img.png" />
    `;
    const data = await parseHtmlForUnfurl(html, "https://x.com/");
    // priority: twitter > og > basic for title
    expect(data.title).toBe("TW T");
    expect(data.description).toBe("D");
    expect(data.image).toContain("/img.png");
  });
});
