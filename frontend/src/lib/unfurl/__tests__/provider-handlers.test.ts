/**
 * Provider Handlers Tests
 *
 * Tests for provider-specific URL handlers.
 */

import {
  redditHandler,
  twitchHandler,
  vimeoHandler,
  loomHandler,
  figmaHandler,
  linkedinHandler,
  tiktokHandler,
  mediumHandler,
  stackoverflowHandler,
  instagramHandler,
  getProviderHandler,
  extractProviderData,
  getOembedUrlForProvider,
  getEmbedUrlForProvider,
  PROVIDER_HANDLERS,
} from "../provider-handlers";

describe("Provider Handlers", () => {
  describe("Reddit Handler", () => {
    it("should detect Reddit URLs", () => {
      expect(redditHandler.canHandle("https://reddit.com/r/programming")).toBe(
        true,
      );
      expect(
        redditHandler.canHandle("https://www.reddit.com/r/javascript"),
      ).toBe(true);
      expect(redditHandler.canHandle("https://old.reddit.com/r/news")).toBe(
        true,
      );
      expect(redditHandler.canHandle("https://redd.it/abc123")).toBe(true);
      expect(redditHandler.canHandle("https://twitter.com/user")).toBe(false);
    });

    it("should extract post data", () => {
      const data = redditHandler.extractFromUrl(
        "https://reddit.com/r/programming/comments/abc123/title",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("reddit");
      expect(data!.type).toBe("post");
      expect(data!.id).toBe("abc123");
      expect(data!.extra?.subreddit).toBe("programming");
    });

    it("should extract subreddit data", () => {
      const data = redditHandler.extractFromUrl(
        "https://reddit.com/r/javascript",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("subreddit");
      expect(data!.id).toBe("javascript");
    });

    it("should provide oEmbed URL", () => {
      const url = "https://reddit.com/r/programming/comments/abc123";
      const oembedUrl = redditHandler.getOembedUrl!(url);
      expect(oembedUrl).toContain("reddit.com/oembed");
      expect(oembedUrl).toContain(encodeURIComponent(url));
    });
  });

  describe("Twitch Handler", () => {
    it("should detect Twitch URLs", () => {
      expect(twitchHandler.canHandle("https://twitch.tv/streamer")).toBe(true);
      expect(twitchHandler.canHandle("https://www.twitch.tv/videos/123")).toBe(
        true,
      );
      expect(twitchHandler.canHandle("https://clips.twitch.tv/ClipName")).toBe(
        true,
      );
      expect(twitchHandler.canHandle("https://youtube.com/channel")).toBe(
        false,
      );
    });

    it("should extract channel data", () => {
      const data = twitchHandler.extractFromUrl("https://twitch.tv/ninja");
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("twitch");
      expect(data!.type).toBe("channel");
      expect(data!.id).toBe("ninja");
    });

    it("should extract video data", () => {
      const data = twitchHandler.extractFromUrl(
        "https://twitch.tv/videos/123456789",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("video");
      expect(data!.id).toBe("123456789");
    });

    it("should extract clip data", () => {
      const data = twitchHandler.extractFromUrl(
        "https://clips.twitch.tv/AwesomeClip123",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("clip");
      expect(data!.id).toBe("AwesomeClip123");
    });

    it("should generate embed URL", () => {
      const embedUrl = twitchHandler.getEmbedUrl!("ninja", {
        parent: "example.com",
      });
      expect(embedUrl).toContain("player.twitch.tv");
      expect(embedUrl).toContain("channel=ninja");
      expect(embedUrl).toContain("parent=example.com");
    });

    it("should generate video embed URL", () => {
      const embedUrl = twitchHandler.getEmbedUrl!("123456789", {
        parent: "example.com",
      });
      expect(embedUrl).toContain("video=123456789");
    });
  });

  describe("Vimeo Handler", () => {
    it("should detect Vimeo URLs", () => {
      expect(vimeoHandler.canHandle("https://vimeo.com/123456789")).toBe(true);
      // player.vimeo.com is handled separately
      expect(vimeoHandler.canHandle("https://youtube.com/watch?v=abc")).toBe(
        false,
      );
    });

    it("should extract video data", () => {
      const data = vimeoHandler.extractFromUrl("https://vimeo.com/123456789");
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("vimeo");
      expect(data!.type).toBe("video");
      expect(data!.id).toBe("123456789");
      expect(data!.image).toContain("vumbnail.com");
    });

    it("should provide oEmbed URL", () => {
      const url = "https://vimeo.com/123456789";
      const oembedUrl = vimeoHandler.getOembedUrl!(url);
      expect(oembedUrl).toContain("vimeo.com/api/oembed.json");
    });

    it("should generate embed URL", () => {
      const embedUrl = vimeoHandler.getEmbedUrl!("123456789");
      expect(embedUrl).toBe("https://player.vimeo.com/video/123456789");
    });
  });

  describe("Loom Handler", () => {
    it("should detect Loom URLs", () => {
      expect(loomHandler.canHandle("https://www.loom.com/share/abc123")).toBe(
        true,
      );
      expect(loomHandler.canHandle("https://loom.com/share/xyz")).toBe(true);
      expect(loomHandler.canHandle("https://vimeo.com/123")).toBe(false);
    });

    it("should extract video data", () => {
      const data = loomHandler.extractFromUrl(
        "https://www.loom.com/share/abc123def456",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("loom");
      expect(data!.type).toBe("video");
      expect(data!.id).toBe("abc123def456");
    });

    it("should generate embed URL", () => {
      const embedUrl = loomHandler.getEmbedUrl!("abc123");
      expect(embedUrl).toBe("https://www.loom.com/embed/abc123");
    });
  });

  describe("Figma Handler", () => {
    it("should detect Figma URLs", () => {
      expect(figmaHandler.canHandle("https://www.figma.com/file/abc123")).toBe(
        true,
      );
      expect(figmaHandler.canHandle("https://figma.com/proto/xyz")).toBe(true);
      expect(figmaHandler.canHandle("https://figma.com/design/def")).toBe(true);
      expect(figmaHandler.canHandle("https://sketch.com/file/abc")).toBe(false);
    });

    it("should extract file data", () => {
      const data = figmaHandler.extractFromUrl(
        "https://www.figma.com/file/abc123def",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("figma");
      expect(data!.type).toBe("file");
      expect(data!.id).toBe("abc123def");
    });

    it("should extract prototype data", () => {
      const data = figmaHandler.extractFromUrl(
        "https://figma.com/proto/xyz789",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("prototype");
    });
  });

  describe("LinkedIn Handler", () => {
    it("should detect LinkedIn URLs", () => {
      expect(
        linkedinHandler.canHandle("https://linkedin.com/in/username"),
      ).toBe(true);
      expect(
        linkedinHandler.canHandle("https://www.linkedin.com/company/name"),
      ).toBe(true);
      expect(linkedinHandler.canHandle("https://lnkd.in/abc")).toBe(true);
      expect(linkedinHandler.canHandle("https://twitter.com/user")).toBe(false);
    });

    it("should extract profile data", () => {
      const data = linkedinHandler.extractFromUrl(
        "https://linkedin.com/in/johndoe",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("linkedin");
      expect(data!.type).toBe("profile");
      expect(data!.id).toBe("johndoe");
    });

    it("should extract company data", () => {
      const data = linkedinHandler.extractFromUrl(
        "https://linkedin.com/company/acme-corp",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("company");
      expect(data!.id).toBe("acme-corp");
    });

    it("should extract post data", () => {
      const data = linkedinHandler.extractFromUrl(
        "https://linkedin.com/feed/update/urn:li:activity:123",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("post");
    });
  });

  describe("TikTok Handler", () => {
    it("should detect TikTok URLs", () => {
      expect(
        tiktokHandler.canHandle("https://tiktok.com/@user/video/123"),
      ).toBe(true);
      expect(tiktokHandler.canHandle("https://www.tiktok.com/@user")).toBe(
        true,
      );
      expect(tiktokHandler.canHandle("https://vm.tiktok.com/abc")).toBe(true);
      expect(tiktokHandler.canHandle("https://instagram.com/p/abc")).toBe(
        false,
      );
    });

    it("should extract video data", () => {
      const data = tiktokHandler.extractFromUrl(
        "https://tiktok.com/@creator/video/7123456789",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("tiktok");
      expect(data!.type).toBe("video");
      expect(data!.id).toBe("7123456789");
      expect(data!.author).toBe("creator");
    });

    it("should extract profile data", () => {
      const data = tiktokHandler.extractFromUrl("https://tiktok.com/@username");
      expect(data).not.toBeNull();
      expect(data!.type).toBe("profile");
      expect(data!.id).toBe("username");
    });

    it("should provide oEmbed URL", () => {
      const url = "https://tiktok.com/@user/video/123";
      const oembedUrl = tiktokHandler.getOembedUrl!(url);
      expect(oembedUrl).toContain("tiktok.com/oembed");
    });
  });

  describe("Medium Handler", () => {
    it("should detect Medium URLs", () => {
      expect(mediumHandler.canHandle("https://medium.com/@user/article")).toBe(
        true,
      );
      expect(
        mediumHandler.canHandle("https://medium.com/publication/article"),
      ).toBe(true);
      expect(mediumHandler.canHandle("https://blog.medium.com/article")).toBe(
        true,
      );
      expect(mediumHandler.canHandle("https://dev.to/user/article")).toBe(
        false,
      );
    });

    it("should extract article data", () => {
      const data = mediumHandler.extractFromUrl(
        "https://medium.com/@author/article-slug-123",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("medium");
      expect(data!.type).toBe("article");
      // Author could be with or without @ prefix
      expect(data!.author).toContain("author");
    });
  });

  describe("Stack Overflow Handler", () => {
    it("should detect Stack Overflow URLs", () => {
      expect(
        stackoverflowHandler.canHandle(
          "https://stackoverflow.com/questions/123",
        ),
      ).toBe(true);
      expect(
        stackoverflowHandler.canHandle("https://stackoverflow.com/a/456"),
      ).toBe(true);
      expect(
        stackoverflowHandler.canHandle(
          "https://stackexchange.com/questions/789",
        ),
      ).toBe(true);
      expect(
        stackoverflowHandler.canHandle("https://github.com/org/repo"),
      ).toBe(false);
    });

    it("should extract question data", () => {
      const data = stackoverflowHandler.extractFromUrl(
        "https://stackoverflow.com/questions/12345/question-title",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("stackoverflow");
      expect(data!.type).toBe("question");
      expect(data!.id).toBe("12345");
    });

    it("should extract answer data", () => {
      const data = stackoverflowHandler.extractFromUrl(
        "https://stackoverflow.com/a/67890",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("answer");
      expect(data!.id).toBe("67890");
    });
  });

  describe("Instagram Handler", () => {
    it("should detect Instagram URLs", () => {
      expect(instagramHandler.canHandle("https://instagram.com/p/abc123")).toBe(
        true,
      );
      expect(
        instagramHandler.canHandle("https://www.instagram.com/reel/xyz"),
      ).toBe(true);
      expect(instagramHandler.canHandle("https://instagram.com/username")).toBe(
        true,
      );
      expect(instagramHandler.canHandle("https://twitter.com/user")).toBe(
        false,
      );
    });

    it("should extract post data", () => {
      const data = instagramHandler.extractFromUrl(
        "https://instagram.com/p/Abc123Xyz",
      );
      expect(data).not.toBeNull();
      expect(data!.provider).toBe("instagram");
      expect(data!.type).toBe("post");
      expect(data!.id).toBe("Abc123Xyz");
    });

    it("should extract reel data", () => {
      const data = instagramHandler.extractFromUrl(
        "https://instagram.com/reel/Xyz789Abc",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("reel");
    });

    it("should extract profile data", () => {
      const data = instagramHandler.extractFromUrl(
        "https://instagram.com/johndoe",
      );
      expect(data).not.toBeNull();
      expect(data!.type).toBe("profile");
      expect(data!.id).toBe("johndoe");
    });

    it("should not extract reserved paths as profiles", () => {
      expect(
        instagramHandler.extractFromUrl("https://instagram.com/explore"),
      ).toBeNull();
      expect(
        instagramHandler.extractFromUrl("https://instagram.com/direct"),
      ).toBeNull();
    });
  });

  describe("Handler Registry", () => {
    it("should have handlers for expected providers", () => {
      expect(PROVIDER_HANDLERS.reddit).toBeDefined();
      expect(PROVIDER_HANDLERS.twitch).toBeDefined();
      expect(PROVIDER_HANDLERS.vimeo).toBeDefined();
      expect(PROVIDER_HANDLERS.loom).toBeDefined();
      expect(PROVIDER_HANDLERS.figma).toBeDefined();
      expect(PROVIDER_HANDLERS.linkedin).toBeDefined();
      expect(PROVIDER_HANDLERS.tiktok).toBeDefined();
      expect(PROVIDER_HANDLERS.medium).toBeDefined();
      expect(PROVIDER_HANDLERS.stackoverflow).toBeDefined();
      expect(PROVIDER_HANDLERS.instagram).toBeDefined();
    });

    it("should return undefined for unsupported providers", () => {
      expect(PROVIDER_HANDLERS.generic).toBeUndefined();
    });
  });

  describe("extractProviderData", () => {
    it("should extract data using correct handler", () => {
      const redditData = extractProviderData(
        "https://reddit.com/r/programming/comments/abc",
      );
      expect(redditData).not.toBeNull();
      expect(redditData!.provider).toBe("reddit");

      const twitchData = extractProviderData("https://twitch.tv/streamer");
      expect(twitchData).not.toBeNull();
      expect(twitchData!.provider).toBe("twitch");
    });

    it("should return null for unsupported URLs", () => {
      const data = extractProviderData("https://random-unsupported-site.com");
      expect(data).toBeNull();
    });
  });

  describe("getOembedUrlForProvider", () => {
    it("should return oEmbed URL for supported providers", () => {
      const redditOembed = getOembedUrlForProvider("https://reddit.com/r/test");
      expect(redditOembed).not.toBeNull();
      expect(redditOembed).toContain("oembed");
    });

    it("should return null for providers without oEmbed", () => {
      const result = getOembedUrlForProvider("https://unsupported-site.com");
      expect(result).toBeNull();
    });
  });

  describe("getEmbedUrlForProvider", () => {
    it("should return embed URL", () => {
      const twitchEmbed = getEmbedUrlForProvider("twitch", "channel_name", {
        parent: "test.com",
      });
      expect(twitchEmbed).not.toBeNull();
      expect(twitchEmbed).toContain("player.twitch.tv");

      const vimeoEmbed = getEmbedUrlForProvider("vimeo", "123456");
      expect(vimeoEmbed).toBe("https://player.vimeo.com/video/123456");
    });

    it("should return null for providers without embed", () => {
      const result = getEmbedUrlForProvider("generic", "id");
      expect(result).toBeNull();
    });
  });

  describe("HTML Parsing", () => {
    it("should parse Reddit HTML", () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test Post Title">
            <meta property="og:description" content="Post description">
            <meta property="og:image" content="https://preview.redd.it/image.jpg">
          </head>
        </html>
      `;
      const data = redditHandler.parseHtml!(
        html,
        "https://reddit.com/r/test/comments/abc",
      );
      expect(data.title).toBe("Test Post Title");
      expect(data.description).toBe("Post description");
      expect(data.image).toBe("https://preview.redd.it/image.jpg");
    });

    it("should detect live streams from HTML", () => {
      const liveHtml = `
        <html>
          <script>{"isLiveBroadcast":true}</script>
        </html>
      `;
      const data = twitchHandler.parseHtml!(
        liveHtml,
        "https://twitch.tv/channel",
      );
      expect(data.isLive).toBe(true);
    });
  });
});
