/**
 * @jest-environment node
 */

/**
 * EmailSender SMTP send-path test (P7-HYG-45)
 *
 * Sends through the real nodemailer transport that EmailSender builds from its
 * SMTP config, to an in-process SMTP server bound to 127.0.0.1 on an ephemeral
 * port. Nothing leaves the machine. A mock would not prove the installed
 * nodemailer major still speaks SMTP.
 */

import type { AddressInfo } from "net";
import { SMTPServer } from "smtp-server";
import { EmailSender } from "../sender";
import type { EmailConfig } from "../types";

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

function smtpConfig(port: number): EmailConfig {
  return {
    provider: "smtp",
    from: { name: "nChat Test", email: "noreply@chat.test" },
    smtp: {
      host: "127.0.0.1",
      port,
      secure: false,
      auth: { user: "mailer", pass: "not-a-real-secret" },
    },
  };
}

describe("EmailSender SMTP send path (real nodemailer transport)", () => {
  let sink: Sink | null = null;

  afterEach(async () => {
    if (sink) {
      await sink.close();
      sink = null;
    }
  });

  it("delivers one message with the expected envelope, subject and body", async () => {
    sink = await startSink();
    const sender = new EmailSender(smtpConfig(sink.port));

    const result = await sender.send({
      to: { name: "Alice", email: "alice@example.test" },
      subject: "Reset your password",
      html: "<p>Hello Alice, use code 482913.</p>",
      text: "Hello Alice, use code 482913.",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("smtp");
    expect(result.messageId).toEqual(expect.any(String));

    expect(sink.messages).toHaveLength(1);
    const msg = sink.messages[0];
    expect(msg.mailFrom).toBe("noreply@chat.test");
    expect(msg.rcptTo).toEqual(["alice@example.test"]);
    expect(msg.raw).toMatch(/^Subject: Reset your password\r?$/m);
    expect(msg.raw).toContain("Hello Alice, use code 482913.");
    expect(msg.raw).toContain("<p>Hello Alice, use code 482913.</p>");
    expect(sink.authUsers).toEqual(["mailer"]);
  });

  it("returns a failure result, not a throw, when the connection is refused", async () => {
    // Bind then release an ephemeral port so nothing is listening on it.
    const closed = await startSink();
    const { port } = closed;
    await closed.close();

    const sender = new EmailSender(smtpConfig(port));
    const result = await sender.send({
      to: { name: "Alice", email: "alice@example.test" },
      subject: "Never delivered",
      html: "<p>x</p>",
      text: "x",
    });

    expect(result.success).toBe(false);
    expect(result.provider).toBe("smtp");
    expect(typeof result.error).toBe("string");
  });
});
