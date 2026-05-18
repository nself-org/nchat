/**
 * Message Formatter Service
 *
 * Provides markdown parsing, HTML sanitization, code highlighting,
 * and emoji conversion for chat messages.
 *
 * SECURITY: This service implements strict XSS protection via DOMPurify.
 */

import DOMPurify from "isomorphic-dompurify";
import { marked, type Tokens, Renderer } from "marked";
import hljs from "highlight.js";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

export interface FormattedMessage {
  raw: string;
  html: string;
  codeBlocks: CodeBlock[];
  mentions: string[];
  links: string[];
}

export interface FormatterOptions {
  /** Enable syntax highlighting for code blocks */
  enableCodeHighlighting?: boolean;
  /** Enable emoji shortcode conversion */
  enableEmojis?: boolean;
  /** Enable line numbers for code blocks */
  enableLineNumbers?: boolean;
  /** Maximum code block length before truncation */
  maxCodeBlockLength?: number;
  /** Custom allowed tags for sanitization */
  additionalAllowedTags?: string[];
  /** Custom allowed attributes for sanitization */
  additionalAllowedAttributes?: Record<string, string[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Safe HTML tags that are allowed after sanitization
 */
const ALLOWED_TAGS = [
  // Text formatting
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "mark",
  "small",
  "sub",
  "sup",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Lists
  "ul",
  "ol",
  "li",
  // Code
  "pre",
  "code",
  "kbd",
  "samp",
  // Quotes and blocks
  "blockquote",
  "q",
  "cite",
  // Links and media (limited)
  "a",
  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  // Misc
  "span",
  "div",
];

/**
 * Safe attributes that are allowed on specific tags
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "rel", "target"],
  img: ["src", "alt", "title", "width", "height"],
  code: ["class"],
  pre: ["class"],
  span: ["class", "data-mention", "data-mention-type"],
  div: ["class"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  "*": ["id", "class"],
};

/**
 * URL schemes that are considered safe for href attributes
 */
const ALLOWED_URI_SCHEMES = ["http", "https", "mailto"];

/**
 * Languages supported for syntax highlighting
 */
const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "html",
  "css",
  "scss",
  "less",
  "sql",
  "bash",
  "shell",
  "sh",
  "zsh",
  "json",
  "yaml",
  "yml",
  "xml",
  "markdown",
  "md",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "haskell",
  "elixir",
  "erlang",
  "clojure",
  "r",
  "matlab",
  "lua",
  "perl",
  "dockerfile",
  "docker",
  "nginx",
  "apache",
  "graphql",
  "prisma",
  "toml",
  "ini",
  "diff",
  "plaintext",
  "text",
];

/**
 * Common emoji shortcodes and their Unicode equivalents
 */
const EMOJI_MAP: Record<string, string> = {
  // Smileys
  ":smile:": "\u{1F604}",
  ":laughing:": "\u{1F606}",
  ":blush:": "\u{1F60A}",
  ":smiley:": "\u{1F603}",
  ":relaxed:": "\u{263A}\u{FE0F}",
  ":smirk:": "\u{1F60F}",
  ":heart_eyes:": "\u{1F60D}",
  ":kissing_heart:": "\u{1F618}",
  ":kissing:": "\u{1F617}",
  ":kissing_smiling_eyes:": "\u{1F619}",
  ":kissing_closed_eyes:": "\u{1F61A}",
  ":flushed:": "\u{1F633}",
  ":relieved:": "\u{1F60C}",
  ":satisfied:": "\u{1F606}",
  ":grin:": "\u{1F601}",
  ":wink:": "\u{1F609}",
  ":stuck_out_tongue_winking_eye:": "\u{1F61C}",
  ":stuck_out_tongue_closed_eyes:": "\u{1F61D}",
  ":grinning:": "\u{1F600}",
  ":stuck_out_tongue:": "\u{1F61B}",
  ":sleeping:": "\u{1F634}",
  ":worried:": "\u{1F61F}",
  ":frowning:": "\u{1F626}",
  ":anguished:": "\u{1F627}",
  ":open_mouth:": "\u{1F62E}",
  ":grimacing:": "\u{1F62C}",
  ":confused:": "\u{1F615}",
  ":hushed:": "\u{1F62F}",
  ":expressionless:": "\u{1F611}",
  ":unamused:": "\u{1F612}",
  ":sweat_smile:": "\u{1F605}",
  ":sweat:": "\u{1F613}",
  ":disappointed_relieved:": "\u{1F625}",
  ":weary:": "\u{1F629}",
  ":pensive:": "\u{1F614}",
  ":disappointed:": "\u{1F61E}",
  ":confounded:": "\u{1F616}",
  ":fearful:": "\u{1F628}",
  ":cold_sweat:": "\u{1F630}",
  ":persevere:": "\u{1F623}",
  ":cry:": "\u{1F622}",
  ":sob:": "\u{1F62D}",
  ":joy:": "\u{1F602}",
  ":astonished:": "\u{1F632}",
  ":scream:": "\u{1F631}",
  ":tired_face:": "\u{1F62B}",
  ":angry:": "\u{1F620}",
  ":rage:": "\u{1F621}",
  ":triumph:": "\u{1F624}",
  ":sleepy:": "\u{1F62A}",
  ":yum:": "\u{1F60B}",
  ":mask:": "\u{1F637}",
  ":sunglasses:": "\u{1F60E}",
  ":dizzy_face:": "\u{1F635}",
  ":imp:": "\u{1F47F}",
  ":smiling_imp:": "\u{1F608}",
  ":neutral_face:": "\u{1F610}",
  ":no_mouth:": "\u{1F636}",
  ":innocent:": "\u{1F607}",
  ":alien:": "\u{1F47D}",
  ":skull:": "\u{1F480}",
  ":thinking:": "\u{1F914}",
  ":rofl:": "\u{1F923}",
  ":face_palm:": "\u{1F926}",
  ":shrug:": "\u{1F937}",
  ":ok_hand:": "\u{1F44C}",
  ":thumbsup:": "\u{1F44D}",
  ":thumbsdown:": "\u{1F44E}",
  ":clap:": "\u{1F44F}",
  ":wave:": "\u{1F44B}",
  ":raised_hands:": "\u{1F64C}",
  ":pray:": "\u{1F64F}",
  ":muscle:": "\u{1F4AA}",
  ":fire:": "\u{1F525}",
  ":rocket:": "\u{1F680}",
  ":star:": "\u{2B50}",
  ":sparkles:": "\u{2728}",
  ":zap:": "\u{26A1}",
  ":sunny:": "\u{2600}\u{FE0F}",
  ":cloud:": "\u{2601}\u{FE0F}",
  ":umbrella:": "\u{2614}",
  ":snowflake:": "\u{2744}\u{FE0F}",
  ":heart:": "\u{2764}\u{FE0F}",
  ":broken_heart:": "\u{1F494}",
  ":two_hearts:": "\u{1F495}",
  ":sparkling_heart:": "\u{1F496}",
  ":heartbeat:": "\u{1F493}",
  ":heartpulse:": "\u{1F497}",
  ":cupid:": "\u{1F498}",
  ":gift_heart:": "\u{1F49D}",
  ":revolving_hearts:": "\u{1F49E}",
  ":heart_decoration:": "\u{1F49F}",
  ":100:": "\u{1F4AF}",
  ":check:": "\u{2705}",
  ":x:": "\u{274C}",
  ":warning:": "\u{26A0}\u{FE0F}",
  ":question:": "\u{2753}",
  ":exclamation:": "\u{2757}",
  ":info:": "\u{2139}\u{FE0F}",
  ":lock:": "\u{1F512}",
  ":unlock:": "\u{1F513}",
  ":key:": "\u{1F511}",
  ":bell:": "\u{1F514}",
  ":bookmark:": "\u{1F516}",
  ":link:": "\u{1F517}",
  ":paperclip:": "\u{1F4CE}",
  ":scissors:": "\u{2702}\u{FE0F}",
  ":pencil:": "\u{270F}\u{FE0F}",
  ":memo:": "\u{1F4DD}",
  ":bulb:": "\u{1F4A1}",
  ":speech_balloon:": "\u{1F4AC}",
  ":thought_balloon:": "\u{1F4AD}",
  ":email:": "\u{1F4E7}",
  ":inbox_tray:": "\u{1F4E5}",
  ":outbox_tray:": "\u{1F4E4}",
  ":package:": "\u{1F4E6}",
  ":calendar:": "\u{1F4C5}",
  ":chart:": "\u{1F4CA}",
  ":chart_with_upwards_trend:": "\u{1F4C8}",
  ":chart_with_downwards_trend:": "\u{1F4C9}",
  ":file_folder:": "\u{1F4C1}",
  ":open_file_folder:": "\u{1F4C2}",
  ":page_facing_up:": "\u{1F4C4}",
  ":page_with_curl:": "\u{1F4C3}",
  ":clipboard:": "\u{1F4CB}",
  ":pushpin:": "\u{1F4CC}",
  ":round_pushpin:": "\u{1F4CD}",
  ":mag:": "\u{1F50D}",
  ":mag_right:": "\u{1F50E}",
  ":wrench:": "\u{1F527}",
  ":hammer:": "\u{1F528}",
  ":nut_and_bolt:": "\u{1F529}",
  ":gear:": "\u{2699}\u{FE0F}",
  ":bug:": "\u{1F41B}",
  ":computer:": "\u{1F4BB}",
  ":keyboard:": "\u{2328}\u{FE0F}",
  ":desktop_computer:": "\u{1F5A5}\u{FE0F}",
  ":printer:": "\u{1F5A8}\u{FE0F}",
  ":mouse:": "\u{1F5B1}\u{FE0F}",
  ":trackball:": "\u{1F5B2}\u{FE0F}",
  ":floppy_disk:": "\u{1F4BE}",
  ":cd:": "\u{1F4BF}",
  ":dvd:": "\u{1F4C0}",
  ":camera:": "\u{1F4F7}",
  ":movie_camera:": "\u{1F3A5}",
  ":microphone:": "\u{1F3A4}",
  ":headphones:": "\u{1F3A7}",
  ":speaker:": "\u{1F508}",
  ":mute:": "\u{1F507}",
  ":loud_sound:": "\u{1F50A}",
  ":phone:": "\u{260E}\u{FE0F}",
  ":mobile_phone:": "\u{1F4F1}",
  ":hourglass:": "\u{231B}",
  ":stopwatch:": "\u{23F1}\u{FE0F}",
  ":alarm_clock:": "\u{23F0}",
  ":watch:": "\u{231A}",
  ":battery:": "\u{1F50B}",
  ":electric_plug:": "\u{1F50C}",
  // Hands and gestures
  ":+1:": "\u{1F44D}",
  ":-1:": "\u{1F44E}",
  ":point_up:": "\u{261D}\u{FE0F}",
  ":point_down:": "\u{1F447}",
  ":point_left:": "\u{1F448}",
  ":point_right:": "\u{1F449}",
  ":fist:": "\u{270A}",
  ":v:": "\u{270C}\u{FE0F}",
  ":metal:": "\u{1F918}",
  ":call_me_hand:": "\u{1F919}",
  ":raised_hand:": "\u{270B}",
  ":raised_back_of_hand:": "\u{1F91A}",
  ":vulcan_salute:": "\u{1F596}",
  ":writing_hand:": "\u{270D}\u{FE0F}",
  ":selfie:": "\u{1F933}",
  // Food
  ":coffee:": "\u{2615}",
  ":tea:": "\u{1F375}",
  ":beer:": "\u{1F37A}",
  ":beers:": "\u{1F37B}",
  ":wine_glass:": "\u{1F377}",
  ":cocktail:": "\u{1F378}",
  ":tropical_drink:": "\u{1F379}",
  ":pizza:": "\u{1F355}",
  ":hamburger:": "\u{1F354}",
  ":fries:": "\u{1F35F}",
  ":hot_dog:": "\u{1F32D}",
  ":taco:": "\u{1F32E}",
  ":burrito:": "\u{1F32F}",
  ":popcorn:": "\u{1F37F}",
  ":ice_cream:": "\u{1F368}",
  ":cake:": "\u{1F370}",
  ":birthday:": "\u{1F382}",
  ":cookie:": "\u{1F36A}",
  ":chocolate_bar:": "\u{1F36B}",
  ":candy:": "\u{1F36C}",
  ":apple:": "\u{1F34E}",
  ":green_apple:": "\u{1F34F}",
  ":banana:": "\u{1F34C}",
  ":orange:": "\u{1F34A}",
  ":lemon:": "\u{1F34B}",
  ":watermelon:": "\u{1F349}",
  ":grapes:": "\u{1F347}",
  ":strawberry:": "\u{1F353}",
  ":peach:": "\u{1F351}",
  ":cherries:": "\u{1F352}",
  // Animals
  ":dog:": "\u{1F436}",
  ":cat:": "\u{1F431}",
  ":mouse_face:": "\u{1F42D}",
  ":hamster:": "\u{1F439}",
  ":rabbit:": "\u{1F430}",
  ":bear:": "\u{1F43B}",
  ":panda_face:": "\u{1F43C}",
  ":koala:": "\u{1F428}",
  ":tiger:": "\u{1F42F}",
  ":lion:": "\u{1F981}",
  ":cow:": "\u{1F42E}",
  ":pig:": "\u{1F437}",
  ":frog:": "\u{1F438}",
  ":monkey_face:": "\u{1F435}",
  ":see_no_evil:": "\u{1F648}",
  ":hear_no_evil:": "\u{1F649}",
  ":speak_no_evil:": "\u{1F64A}",
  ":chicken:": "\u{1F414}",
  ":penguin:": "\u{1F427}",
  ":bird:": "\u{1F426}",
  ":baby_chick:": "\u{1F424}",
  ":wolf:": "\u{1F43A}",
  ":horse:": "\u{1F434}",
  ":unicorn:": "\u{1F984}",
  ":bee:": "\u{1F41D}",
  ":ladybug:": "\u{1F41E}",
  ":snail:": "\u{1F40C}",
  ":butterfly:": "\u{1F98B}",
  ":turtle:": "\u{1F422}",
  ":snake:": "\u{1F40D}",
  ":octopus:": "\u{1F419}",
  ":fish:": "\u{1F41F}",
  ":tropical_fish:": "\u{1F420}",
  ":blowfish:": "\u{1F421}",
  ":dolphin:": "\u{1F42C}",
  ":whale:": "\u{1F433}",
  ":crocodile:": "\u{1F40A}",
  ":elephant:": "\u{1F418}",
  ":camel:": "\u{1F42B}",
  // Nature
  ":seedling:": "\u{1F331}",
  ":evergreen_tree:": "\u{1F332}",
  ":deciduous_tree:": "\u{1F333}",
  ":palm_tree:": "\u{1F334}",
  ":cactus:": "\u{1F335}",
  ":tulip:": "\u{1F337}",
  ":cherry_blossom:": "\u{1F338}",
  ":rose:": "\u{1F339}",
  ":hibiscus:": "\u{1F33A}",
  ":sunflower:": "\u{1F33B}",
  ":blossom:": "\u{1F33C}",
  ":bouquet:": "\u{1F490}",
  ":four_leaf_clover:": "\u{1F340}",
  ":maple_leaf:": "\u{1F341}",
  ":fallen_leaf:": "\u{1F342}",
  ":leaves:": "\u{1F343}",
  ":mushroom:": "\u{1F344}",
  ":herb:": "\u{1F33F}",
  ":rainbow:": "\u{1F308}",
  ":ocean:": "\u{1F30A}",
  ":volcano:": "\u{1F30B}",
  ":earth:": "\u{1F30D}",
  ":earth_americas:": "\u{1F30E}",
  ":earth_asia:": "\u{1F30F}",
  ":globe_with_meridians:": "\u{1F310}",
  ":new_moon:": "\u{1F311}",
  ":full_moon:": "\u{1F315}",
  ":crescent_moon:": "\u{1F319}",
  ":star2:": "\u{1F31F}",
  ":milky_way:": "\u{1F30C}",
  // Objects
  ":gift:": "\u{1F381}",
  ":balloon:": "\u{1F388}",
  ":tada:": "\u{1F389}",
  ":confetti_ball:": "\u{1F38A}",
  ":ribbon:": "\u{1F380}",
  ":trophy:": "\u{1F3C6}",
  ":medal:": "\u{1F3C5}",
  ":1st_place_medal:": "\u{1F947}",
  ":2nd_place_medal:": "\u{1F948}",
  ":3rd_place_medal:": "\u{1F949}",
  ":soccer:": "\u{26BD}",
  ":basketball:": "\u{1F3C0}",
  ":football:": "\u{1F3C8}",
  ":baseball:": "\u{26BE}",
  ":tennis:": "\u{1F3BE}",
  ":golf:": "\u{26F3}",
  ":billiards:": "\u{1F3B1}",
  ":dart:": "\u{1F3AF}",
  ":dice:": "\u{1F3B2}",
  ":video_game:": "\u{1F3AE}",
  ":slot_machine:": "\u{1F3B0}",
  ":art:": "\u{1F3A8}",
  ":performing_arts:": "\u{1F3AD}",
  ":studio_microphone:": "\u{1F399}\u{FE0F}",
  ":headphone:": "\u{1F3A7}",
  ":musical_note:": "\u{1F3B5}",
  ":notes:": "\u{1F3B6}",
  ":saxophone:": "\u{1F3B7}",
  ":guitar:": "\u{1F3B8}",
  ":trumpet:": "\u{1F3BA}",
  ":violin:": "\u{1F3BB}",
  ":drum:": "\u{1F941}",
  // Transport
  ":car:": "\u{1F697}",
  ":taxi:": "\u{1F695}",
  ":bus:": "\u{1F68C}",
  ":trolleybus:": "\u{1F68E}",
  ":racing_car:": "\u{1F3CE}\u{FE0F}",
  ":police_car:": "\u{1F693}",
  ":ambulance:": "\u{1F691}",
  ":fire_engine:": "\u{1F692}",
  ":truck:": "\u{1F69A}",
  ":bike:": "\u{1F6B2}",
  ":motorcycle:": "\u{1F3CD}\u{FE0F}",
  ":airplane:": "\u{2708}\u{FE0F}",
  ":helicopter:": "\u{1F681}",
  ":boat:": "\u{26F5}",
  ":ship:": "\u{1F6A2}",
  ":train:": "\u{1F686}",
  ":metro:": "\u{1F687}",
  ":light_rail:": "\u{1F688}",
  ":station:": "\u{1F689}",
  ":tram:": "\u{1F68A}",
};

// ============================================================================
// MESSAGE FORMATTER SERVICE CLASS
// ============================================================================

export class MessageFormatterService {
  private options: Required<FormatterOptions>;
  private purifyInstance: typeof DOMPurify | null = null;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      enableCodeHighlighting: options.enableCodeHighlighting ?? true,
      enableEmojis: options.enableEmojis ?? true,
      enableLineNumbers: options.enableLineNumbers ?? true,
      maxCodeBlockLength: options.maxCodeBlockLength ?? 10000,
      additionalAllowedTags: options.additionalAllowedTags ?? [],
      additionalAllowedAttributes: options.additionalAllowedAttributes ?? {},
    };

    // Configure marked
    this.configureMarked();
  }

  /**
   * Configure marked parser with custom renderer
   */
  private configureMarked(): void {
    const renderer = new Renderer();

    // Custom code block renderer with syntax highlighting
    renderer.code = ({ text, lang }: Tokens.Code): string => {
      const language = this.normalizeLanguage(lang || "");
      const highlighted = this.highlightCode(text, language);
      const lineNumbersHtml = this.options.enableLineNumbers
        ? this.generateLineNumbers(text)
        : "";

      return `<pre class="hljs-code-block" data-language="${language}"><code class="hljs language-${language}">${lineNumbersHtml}${highlighted}</code></pre>`;
    };

    // Custom inline code renderer
    renderer.codespan = ({ text }: Tokens.Codespan): string => {
      return `<code class="hljs-inline">${this.escapeHtml(text)}</code>`;
    };

    // Custom link renderer with security checks
    renderer.link = ({ href, title, text }: Tokens.Link): string => {
      const sanitizedHref = this.sanitizeUrl(href);
      if (!sanitizedHref) {
        return text;
      }
      const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : "";
      return `<a href="${sanitizedHref}"${titleAttr} rel="noopener noreferrer" target="_blank">${text}</a>`;
    };

    marked.use({
      renderer,
      gfm: true,
      breaks: true,
    });
  }

  /**
   * Parse markdown content to HTML
   */
  parseMarkdown(content: string): string {
    try {
      if (!content || typeof content !== "string") {
        return "";
      }

      // Parse markdown to HTML
      const html = marked.parse(content, { async: false }) as string;
      return html;
    } catch (error) {
      logger.error(
        "MessageFormatterService.parseMarkdown failed",
        error as Error,
      );
      return this.escapeHtml(content);
    }
  }

  /**
   * Sanitize HTML to remove XSS vectors
   *
   * SECURITY CRITICAL: This method removes dangerous content from HTML
   */
  sanitizeHtml(html: string): string {
    try {
      if (!html || typeof html !== "string") {
        return "";
      }

      // Get DOMPurify instance (handles both browser and Node.js)
      const purify = this.getDOMPurify();

      // Build allowed tags list
      const allowedTags = [
        ...ALLOWED_TAGS,
        ...this.options.additionalAllowedTags,
      ];

      // Build allowed attributes map
      const allowedAttributes: Record<string, string[]> = {
        ...ALLOWED_ATTRIBUTES,
        ...this.options.additionalAllowedAttributes,
      };

      // Convert to DOMPurify format
      const allowedAttrArray: string[] = [];
      for (const [tag, attrs] of Object.entries(allowedAttributes)) {
        if (tag === "*") {
          allowedAttrArray.push(...attrs);
        } else {
          for (const attr of attrs) {
            allowedAttrArray.push(`${attr}`);
          }
        }
      }

      // Configure DOMPurify
      const clean = purify.sanitize(html, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: Array.from(new Set(allowedAttrArray)),
        ALLOWED_URI_REGEXP: new RegExp(
          `^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
          "i",
        ),
        ALLOW_DATA_ATTR: false,
        ADD_ATTR: ["target", "rel"],
        FORBID_TAGS: [
          "script",
          "style",
          "iframe",
          "object",
          "embed",
          "form",
          "input",
          "button",
        ],
        FORBID_ATTR: [
          "onerror",
          "onclick",
          "onload",
          "onmouseover",
          "onmouseout",
          "onmousedown",
          "onmouseup",
          "onkeydown",
          "onkeyup",
          "onkeypress",
          "onfocus",
          "onblur",
          "onchange",
          "onsubmit",
          "onreset",
          "onselect",
          "ondblclick",
          "oncontextmenu",
          "ondrag",
          "ondragend",
          "ondragenter",
          "ondragleave",
          "ondragover",
          "ondragstart",
          "ondrop",
        ],
      });

      return clean;
    } catch (error) {
      logger.error(
        "MessageFormatterService.sanitizeHtml failed",
        error as Error,
      );
      // Return escaped HTML as fallback
      return this.escapeHtml(html);
    }
  }

  /**
   * Format a message: parse markdown, sanitize, and apply transformations
   */
  formatMessage(content: string): FormattedMessage {
    try {
      if (!content || typeof content !== "string") {
        return {
          raw: "",
          html: "",
          codeBlocks: [],
          mentions: [],
          links: [],
        };
      }

      // Extract code blocks before processing
      const codeBlocks = this.extractCodeBlocks(content);

      // Convert emoji shortcodes if enabled
      let processedContent = content;
      if (this.options.enableEmojis) {
        processedContent = this.convertEmojis(processedContent);
      }

      // Parse markdown to HTML
      let html = this.parseMarkdown(processedContent);

      // Sanitize the HTML
      html = this.sanitizeHtml(html);

      // Extract mentions and links
      const mentions = this.extractMentions(content);
      const links = this.extractLinks(content);

      return {
        raw: content,
        html,
        codeBlocks,
        mentions,
        links,
      };
    } catch (error) {
      logger.error(
        "MessageFormatterService.formatMessage failed",
        error as Error,
      );
      return {
        raw: content,
        html: this.escapeHtml(content),
        codeBlocks: [],
        mentions: [],
        links: [],
      };
    }
  }

  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [fullMatch, language, code] = match;
      codeBlocks.push({
        language: this.normalizeLanguage(language || "plaintext"),
        code: code.trim(),
        startIndex: match.index,
        endIndex: match.index + fullMatch.length,
      });
    }

    return codeBlocks;
  }

  /**
   * Highlight code with syntax highlighting
   */
  highlightCode(code: string, language: string): string {
    try {
      if (!this.options.enableCodeHighlighting) {
        return this.escapeHtml(code);
      }

      // Truncate very long code blocks
      let processedCode = code;
      if (code.length > this.options.maxCodeBlockLength) {
        processedCode =
          code.slice(0, this.options.maxCodeBlockLength) +
          "\n\n... (truncated)";
      }

      const normalizedLang = this.normalizeLanguage(language);

      // Check if language is supported
      if (
        SUPPORTED_LANGUAGES.includes(normalizedLang) &&
        hljs.getLanguage(normalizedLang)
      ) {
        const highlighted = hljs.highlight(processedCode, {
          language: normalizedLang,
          ignoreIllegals: true,
        });
        return highlighted.value;
      }

      // Try auto-detection for unknown languages
      if (
        !normalizedLang ||
        normalizedLang === "plaintext" ||
        normalizedLang === "text"
      ) {
        return this.escapeHtml(processedCode);
      }

      // Fallback to auto-detection
      const autoHighlighted = hljs.highlightAuto(
        processedCode,
        SUPPORTED_LANGUAGES,
      );
      return autoHighlighted.value;
    } catch (error) {
      logger.warn("MessageFormatterService.highlightCode failed", {
        language,
        error,
      });
      return this.escapeHtml(code);
    }
  }

  /**
   * Convert emoji shortcodes to Unicode emojis
   */
  convertEmojis(content: string): string {
    if (!content) {
      return "";
    }

    let result = content;

    // Replace known shortcodes
    for (const [shortcode, emoji] of Object.entries(EMOJI_MAP)) {
      result = result.split(shortcode).join(emoji);
    }

    return result;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get or create DOMPurify instance
   */
  private getDOMPurify(): typeof DOMPurify {
    if (this.purifyInstance) {
      return this.purifyInstance;
    }

    // In browser environment, use the window directly
    if (typeof window !== "undefined") {
      this.purifyInstance = DOMPurify;
      return this.purifyInstance;
    }

    // In Node.js environment, DOMPurify should work with jsdom from isomorphic-dompurify
    // But for now, we return the base DOMPurify
    this.purifyInstance = DOMPurify;
    return this.purifyInstance;
  }

  /**
   * Normalize language name for highlight.js
   */
  private normalizeLanguage(lang: string): string {
    const normalized = lang.toLowerCase().trim();

    // Language aliases
    const aliases: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      rb: "ruby",
      sh: "bash",
      zsh: "bash",
      shell: "bash",
      yml: "yaml",
      md: "markdown",
      docker: "dockerfile",
      "c++": "cpp",
      "c#": "csharp",
    };

    return aliases[normalized] || normalized || "plaintext";
  }

  /**
   * Generate line numbers HTML for code block
   */
  private generateLineNumbers(code: string): string {
    const lines = code.split("\n");
    const numbers = lines
      .map((_, i) => `<span class="hljs-line-number">${i + 1}</span>`)
      .join("\n");
    return `<span class="hljs-line-numbers" aria-hidden="true">${numbers}</span>`;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }

  /**
   * Sanitize URL to prevent javascript: and other dangerous schemes
   */
  private sanitizeUrl(url: string): string | null {
    try {
      if (!url) {
        return null;
      }

      // Check for dangerous schemes
      const trimmedUrl = url.trim().toLowerCase();

      // Block javascript:, data:, vbscript:, and other dangerous schemes
      const dangerousPatterns = [
        /^javascript:/i,
        /^vbscript:/i,
        /^data:/i,
        /^file:/i,
        /^about:/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmedUrl)) {
          logger.warn("Blocked dangerous URL scheme", {
            url: trimmedUrl.slice(0, 50),
          });
          return null;
        }
      }

      // Allow relative URLs
      if (
        url.startsWith("/") ||
        url.startsWith("#") ||
        url.startsWith("./") ||
        url.startsWith("../")
      ) {
        return url;
      }

      // Parse and validate absolute URLs
      try {
        const parsed = new URL(url);
        const scheme = parsed.protocol.replace(":", "");

        if (!ALLOWED_URI_SCHEMES.includes(scheme)) {
          logger.warn("Blocked URL with disallowed scheme", { scheme });
          return null;
        }

        return url;
      } catch {
        // If URL parsing fails, it might be a relative URL
        // Allow it if it doesn't match dangerous patterns
        return url;
      }
    } catch (error) {
      logger.warn("URL sanitization failed", { url });
      return null;
    }
  }

  /**
   * Extract mentions from content (@username, @channel, @role)
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return Array.from(new Set(mentions));
  }

  /**
   * Extract links from content
   */
  private extractLinks(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"\[\]]+/gi;
    const links = content.match(urlRegex) || [];
    return Array.from(new Set(links));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let formatterServiceInstance: MessageFormatterService | null = null;

/**
 * Get or create the formatter service singleton
 */
export function getFormatterService(
  options?: FormatterOptions,
): MessageFormatterService {
  if (!formatterServiceInstance) {
    formatterServiceInstance = new MessageFormatterService(options);
  }
  return formatterServiceInstance;
}

/**
 * Create a new formatter service instance (for testing or custom configs)
 */
export function createFormatterService(
  options?: FormatterOptions,
): MessageFormatterService {
  return new MessageFormatterService(options);
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick format function for simple use cases
 */
export function formatMessageContent(content: string): FormattedMessage {
  return getFormatterService().formatMessage(content);
}

/**
 * Quick sanitize function
 */
export function sanitizeMessageHtml(html: string): string {
  return getFormatterService().sanitizeHtml(html);
}

/**
 * Quick markdown parse function
 */
export function parseMessageMarkdown(content: string): string {
  return getFormatterService().parseMarkdown(content);
}

export default MessageFormatterService;
