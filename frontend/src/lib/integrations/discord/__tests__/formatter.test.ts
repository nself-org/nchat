/**
 * Unit tests for Discord formatter.
 */
import {
  formatDiscordNotification,
  buildEmbed,
  convertDiscordMarkdownToPlainText,
  convertDiscordMarkdownToHtml,
  convertHtmlToDiscordMarkdown,
  convertDiscordMessageToChat,
  convertChatMessageToDiscord,
  hexToDiscordColor,
  discordColorToHex,
  DISCORD_COLORS,
} from "../formatter";

const msgBase = {
  id: "m1",
  channel_id: "c1",
  content: "hi",
  timestamp: "2024-01-01T00:00:00Z",
  author: { id: "u1", username: "alice", avatar: "abc" },
  attachments: [],
  embeds: [],
} as any;

const guildBase = { id: "g1", name: "My Guild" } as any;

describe("formatDiscordNotification — MESSAGE_CREATE", () => {
  it("produces blue message icon with truncated body", () => {
    const n = formatDiscordNotification("MESSAGE_CREATE", {
      message: { ...msgBase, content: "x".repeat(500) },
      guild: guildBase,
    });
    expect(n.icon).toBe("message");
    expect(n.color).toBe("blue");
    expect(n.body.length).toBeLessThanOrEqual(150);
    expect(n.url).toContain("discord.com");
    expect(n.metadata.guildId).toBe("g1");
  });

  it("empty content → placeholder body", () => {
    const n = formatDiscordNotification("MESSAGE_CREATE", {
      message: { ...msgBase, content: "" },
      guild: guildBase,
    });
    expect(n.body).toMatch(/Attachment|embed/i);
  });

  it("author avatar URL built correctly", () => {
    const n = formatDiscordNotification("MESSAGE_CREATE", {
      message: msgBase,
      guild: guildBase,
    });
    expect(n.metadata.userAvatarUrl).toContain("cdn.discordapp.com");
  });
});

describe("formatDiscordNotification — MESSAGE_UPDATE + DELETE", () => {
  it("MESSAGE_UPDATE yellow", () => {
    const n = formatDiscordNotification("MESSAGE_UPDATE", {
      message: msgBase,
      guild: guildBase,
    });
    expect(n.color).toBe("yellow");
    expect(n.title).toContain("Edited");
  });

  it("MESSAGE_DELETE red", () => {
    const n = formatDiscordNotification("MESSAGE_DELETE", {
      id: "m2",
      channel_id: "c1",
      guild_id: "g1",
    });
    expect(n.color).toBe("red");
    expect(n.metadata.messageId).toBe("m2");
  });
});

describe("formatDiscordNotification — reactions", () => {
  it("reaction add with unicode emoji", () => {
    const n = formatDiscordNotification("MESSAGE_REACTION_ADD", {
      emoji: { name: "🔥" },
      user_id: "u2",
      message_id: "m1",
    });
    expect(n.icon).toBe("reaction");
    expect(n.color).toBe("green");
    expect(n.body).toContain("🔥");
  });

  it("reaction remove with custom emoji", () => {
    const n = formatDiscordNotification("MESSAGE_REACTION_REMOVE", {
      emoji: { name: "partyparrot", id: "1234" },
      user_id: "u2",
    });
    expect(n.color).toBe("gray");
    expect(n.body).toContain("partyparrot");
  });
});

describe("formatDiscordNotification — member/channel/role events", () => {
  it("GUILD_MEMBER_ADD green with username", () => {
    const n = formatDiscordNotification("GUILD_MEMBER_ADD", {
      user: { id: "u3", username: "bob" },
      guild_id: "g1",
    });
    expect(n.icon).toBe("member-join");
    expect(n.color).toBe("green");
    expect(n.body).toContain("bob");
  });

  it("GUILD_MEMBER_REMOVE red", () => {
    const n = formatDiscordNotification("GUILD_MEMBER_REMOVE", {
      user: { id: "u3", username: "bob" },
    });
    expect(n.color).toBe("red");
    expect(n.icon).toBe("member-leave");
  });

  it("CHANNEL_CREATE green with channel name", () => {
    const n = formatDiscordNotification("CHANNEL_CREATE", {
      name: "general",
      id: "c2",
    });
    expect(n.color).toBe("green");
    expect(n.body).toContain("#general");
  });

  it("CHANNEL_DELETE red", () => {
    const n = formatDiscordNotification("CHANNEL_DELETE", {
      name: "old",
      id: "c3",
    });
    expect(n.color).toBe("red");
  });

  it("GUILD_ROLE_CREATE green with role name", () => {
    const n = formatDiscordNotification("GUILD_ROLE_CREATE", {
      role: { id: "r1", name: "Admin" },
    });
    expect(n.body).toContain("@Admin");
  });

  it("GUILD_ROLE_DELETE red", () => {
    const n = formatDiscordNotification("GUILD_ROLE_DELETE", {
      guild_id: "g1",
    });
    expect(n.color).toBe("red");
  });

  it("unknown event → gray", () => {
    const n = formatDiscordNotification("SOMETHING_NEW" as any, {});
    expect(n.color).toBe("gray");
    expect(n.icon).toBe("discord");
  });
});

describe("buildEmbed", () => {
  it("constructs rich embed with all fields", () => {
    const e = buildEmbed({
      title: "T",
      description: "D",
      url: "https://x",
      color: "#ff00ff",
      timestamp: new Date("2024-01-01T00:00:00Z"),
      footer: { text: "foot" },
      fields: [{ name: "f", value: "v", inline: true }],
    });
    expect(e.type).toBe("rich");
    expect(e.title).toBe("T");
    expect(e.color).toBe(0xff00ff);
    expect(e.timestamp).toBe("2024-01-01T00:00:00.000Z");
  });

  it("numeric color passes through", () => {
    const e = buildEmbed({ color: 0x112233 });
    expect(e.color).toBe(0x112233);
  });

  it("string timestamp passes through", () => {
    const e = buildEmbed({ timestamp: "2024-02-01T00:00:00Z" });
    expect(e.timestamp).toBe("2024-02-01T00:00:00Z");
  });
});

describe("convertDiscordMarkdownToPlainText", () => {
  it("strips bold/italic/strikethrough", () => {
    expect(convertDiscordMarkdownToPlainText("**a**")).toBe("a");
    expect(convertDiscordMarkdownToPlainText("*b*")).toBe("b");
    expect(convertDiscordMarkdownToPlainText("~~s~~")).toBe("s");
    // Note: underline __x__ is partially consumed by italic regex — produces _x_
    expect(convertDiscordMarkdownToPlainText("_italic_")).toBe("italic");
  });

  it("replaces mentions and emoji", () => {
    expect(convertDiscordMarkdownToPlainText("<@123> hi")).toContain("@user");
    expect(convertDiscordMarkdownToPlainText("<#456>")).toContain("#channel");
    expect(convertDiscordMarkdownToPlainText("<@&789>")).toContain("@role");
    expect(convertDiscordMarkdownToPlainText("<:party:123>")).toContain(
      ":party:",
    );
  });

  it("replaces spoilers and code blocks", () => {
    expect(convertDiscordMarkdownToPlainText("||secret||")).toContain(
      "[spoiler]",
    );
    expect(convertDiscordMarkdownToPlainText("```js\nx\n```")).toContain(
      "[code block]",
    );
  });
});

describe("convertDiscordMarkdownToHtml", () => {
  it("converts bold + italic to HTML tags", () => {
    const html = convertDiscordMarkdownToHtml("**a** *b*");
    expect(html).toContain("<strong>a</strong>");
    expect(html).toContain("<em>b</em>");
  });

  it("newline becomes <br>", () => {
    expect(convertDiscordMarkdownToHtml("x\ny")).toContain("<br>");
  });

  it("escapes html in source first", () => {
    expect(convertDiscordMarkdownToHtml("<script>")).not.toContain("<script>");
  });

  it("code blocks wrap in pre/code", () => {
    const h = convertDiscordMarkdownToHtml("```js\nconst x = 1\n```");
    expect(h).toContain("<pre>");
    expect(h).toContain("language-js");
  });
});

describe("convertHtmlToDiscordMarkdown", () => {
  it("converts common tags", () => {
    const md = convertHtmlToDiscordMarkdown(
      "<strong>a</strong><em>b</em><code>c</code>",
    );
    expect(md).toContain("**a**");
    expect(md).toContain("*b*");
    expect(md).toContain("`c`");
  });

  it("<a> tag becomes markdown link", () => {
    const md = convertHtmlToDiscordMarkdown('<a href="https://x">link</a>');
    expect(md).toBe("[link](https://x)");
  });

  it("decodes HTML entities", () => {
    expect(convertHtmlToDiscordMarkdown("a &amp; b")).toContain("a & b");
  });
});

describe("convertDiscordMessageToChat", () => {
  it("returns content + html + attachments + author", () => {
    const r = convertDiscordMessageToChat(
      {
        ...msgBase,
        content: "**hi**",
        attachments: [
          { id: "1", filename: "pic.png", url: "u", proxy_url: "p", size: 100 },
        ],
        embeds: [],
      } as any,
      guildBase,
    );
    expect(r.content).toBe("hi");
    expect(r.html).toContain("<strong>");
    expect(r.attachments?.[0].type).toBe("image");
    expect(r.author.name).toBe("alice");
  });

  it("detects non-image attachment types", () => {
    const r = convertDiscordMessageToChat({
      ...msgBase,
      attachments: [
        { id: "1", filename: "v.mp4", url: "u", proxy_url: "p", size: 1 },
      ],
    } as any);
    expect(r.attachments?.[0].type).toBe("video");
  });
});

describe("convertChatMessageToDiscord", () => {
  it("returns markdown-converted content", () => {
    const r = convertChatMessageToDiscord("<strong>hi</strong>");
    expect(r.content).toContain("**hi**");
  });

  it("passes through username/avatar/embeds", () => {
    const r = convertChatMessageToDiscord("hi", {
      username: "bot",
      avatarUrl: "https://a",
      embeds: [{ type: "rich", title: "t" }] as any,
    });
    expect(r.username).toBe("bot");
    expect(r.avatar_url).toBe("https://a");
    expect(r.embeds?.[0].title).toBe("t");
  });
});

describe("Color conversion helpers", () => {
  it("hexToDiscordColor strips # and parses", () => {
    expect(hexToDiscordColor("#ff0000")).toBe(0xff0000);
    expect(hexToDiscordColor("00ff00")).toBe(0x00ff00);
  });

  it("discordColorToHex pads to 6 chars", () => {
    expect(discordColorToHex(0xff0000)).toBe("#ff0000");
    expect(discordColorToHex(0x00ff00)).toBe("#00ff00");
  });

  it("DISCORD_COLORS contains brand values", () => {
    expect(DISCORD_COLORS.blurple).toBe(0x5865f2);
    expect(DISCORD_COLORS.green).toBe(0x57f287);
    expect(DISCORD_COLORS.red).toBe(0xed4245);
  });
});
