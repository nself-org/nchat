/**
 * @jest-environment node
 */

/**
 * EmailService sendWithSMTP send-path test (P7-HYG-45)
 *
 * The live password-reset, verification and signup routes call
 * emailService.send(), which builds a nodemailer transport from SMTP_* env.
 * This drives it with SMTP_HOST=127.0.0.1 and SMTP_PORT=<sink port> against an
 * in-process SMTP server, through the real nodemailer transport. Nothing
 * leaves the machine.
 */

import type { AddressInfo } from "net";
import { SMTPServer } from "smtp-server";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

interface Received {
  raw: string;
  mailFrom: string;
  rcptTo: string[];
}

interface Sink {
  port: number;
  messages: Received[];
  authUsers: string[];
  close: () => Promise<void>;
}

/** Start a plain-text SMTP sink on 127.0.0.1:<ephemeral>. TLS is off here only. */
function startSink(): Promise<Sink> {
  const messages: Received[] = [];
  const authUsers: string[] = [];
  const server = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ["STARTTLS"],
    logger: false,
    onAuth(auth, _session, callback) {
      authUsers.push(String(auth.username));
      callback(null, { user: String(auth.username) });
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => {
        messages.push({
          raw: Buffer.concat(chunks).toString("utf8"),
          mailFrom: session.envelope.mailFrom
            ? session.envelope.mailFrom.address
            : "",
          rcptTo: session.envelope.rcptTo.map((r) => r.address),
        });
        callback();
      });
    },
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        port: (server.server.address() as AddressInfo).port,
        messages,
        authUsers,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

const ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SENDGRID_API_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_FROM_NAME",
] as const;

type EmailServiceModule = typeof import("../email.service");

/** Load a fresh EmailService singleton with the given SMTP_* env applied first. */
function loadEmailService(env: Record<string, string>): EmailServiceModule {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, { EMAIL_FROM: "noreply@chat.test" }, env);
  let mod!: EmailServiceModule;
  jest.isolateModules(() => {
    mod = require("../email.service");
  });
  return mod;
}

describe("emailService SMTP send path (real nodemailer transport)", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let sink: Sink | null = null;

  beforeAll(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });

  afterEach(async () => {
    if (sink) {
      await sink.close();
      sink = null;
    }
  });

  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("delivers one message with the expected envelope, subject and body", async () => {
    sink = await startSink();
    const { emailService } = loadEmailService({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(sink.port),
    });

    const ok = await emailService.send({
      to: "alice@example.test",
      subject: "Verify your email",
      html: "<p>Confirm code 731905.</p>",
      text: "Confirm code 731905.",
    });

    expect(ok).toBe(true);
    expect(sink.messages).toHaveLength(1);
    const msg = sink.messages[0];
    expect(msg.mailFrom).toBe("noreply@chat.test");
    expect(msg.rcptTo).toEqual(["alice@example.test"]);
    expect(msg.raw).toMatch(/^Subject: Verify your email\r?$/m);
    expect(msg.raw).toContain("Confirm code 731905.");
    expect(msg.raw).toContain("<p>Confirm code 731905.</p>");
    // No SMTP_USER set: the transport must not authenticate.
    expect(sink.authUsers).toEqual([]);
  });

  it("authenticates with SMTP_USER and SMTP_PASSWORD when both are set", async () => {
    sink = await startSink();
    const { emailService } = loadEmailService({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(sink.port),
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "not-a-real-secret",
    });

    const ok = await emailService.send({
      to: ["alice@example.test", "bob@example.test"],
      subject: "Reset your password",
      html: "<p>Reset link below.</p>",
    });

    expect(ok).toBe(true);
    expect(sink.authUsers).toEqual(["mailer"]);
    expect(sink.messages).toHaveLength(1);
    expect(sink.messages[0].rcptTo.sort()).toEqual([
      "alice@example.test",
      "bob@example.test",
    ]);
  });

  it("returns false, not a throw, when the connection is refused", async () => {
    // Bind then release an ephemeral port so nothing is listening on it.
    const closed = await startSink();
    const { port } = closed;
    await closed.close();

    const { emailService } = loadEmailService({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(port),
    });

    await expect(
      emailService.send({
        to: "alice@example.test",
        subject: "Never delivered",
        html: "<p>x</p>",
      }),
    ).resolves.toBe(false);
  });
});
