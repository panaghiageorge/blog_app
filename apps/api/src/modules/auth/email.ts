import type { FastifyInstance } from "fastify";
import net from "node:net";
import tls from "node:tls";
import { env } from "../../config/env.js";

type SmtpSocket = net.Socket | tls.TLSSocket;

type OtpEmail = {
  code: string;
  email: string;
  intro: string;
  logMessage: string;
  subject: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const senderAddress = () => {
  const match = /<([^>]+)>/.exec(env.SMTP_FROM);
  return match?.[1] ?? env.SMTP_FROM;
};

const readSmtpResponse = (socket: SmtpSocket) =>
  new Promise<string>((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines.at(-1) ?? "";
      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const assertSmtpOk = (response: string) => {
  if (!/^[23]/.test(response)) {
    throw new Error("SMTP command failed: " + response.trim());
  }
};

const sendCommand = async (socket: SmtpSocket, command: string) => {
  socket.write(command + "\r\n");
  const response = await readSmtpResponse(socket);
  assertSmtpOk(response);
};

const connectSmtp = () =>
  new Promise<SmtpSocket>((resolve, reject) => {
    const options = { host: env.SMTP_HOST, port: env.SMTP_PORT };
    const socket = env.SMTP_SECURE ? tls.connect(options) : net.connect(options);

    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });

const buildMessage = ({ code, email, intro, subject }: OtpEmail) => {
  const safeCode = escapeHtml(code);
  const html =
    "<p>" + escapeHtml(intro) + "</p>" +
    '<p style="font-size:24px;font-weight:700;letter-spacing:6px">' +
    safeCode +
    "</p>" +
    "<p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>";

  return [
    "From: " + env.SMTP_FROM,
    "To: " + email,
    "Subject: " + subject,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
};

const sendOtpEmail = async (app: FastifyInstance, payload: OtpEmail) => {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST must be configured in production");
    }

    app.log.warn(
      { email: payload.email, code: payload.code },
      payload.logMessage,
    );
    return;
  }

  if (env.NODE_ENV === "production" && !env.SMTP_SECURE) {
    throw new Error("SMTP_SECURE must be true in production");
  }

  const socket = await connectSmtp();
  try {
    const greeting = await readSmtpResponse(socket);
    assertSmtpOk(greeting);
    await sendCommand(socket, "EHLO field-notes.local");

    if (env.SMTP_USER && env.SMTP_PASS) {
      await sendCommand(socket, "AUTH LOGIN");
      await sendCommand(socket, Buffer.from(env.SMTP_USER).toString("base64"));
      await sendCommand(socket, Buffer.from(env.SMTP_PASS).toString("base64"));
    }

    await sendCommand(socket, "MAIL FROM:<" + senderAddress() + ">");
    await sendCommand(socket, "RCPT TO:<" + payload.email + ">");
    await sendCommand(socket, "DATA");
    socket.write(buildMessage(payload) + "\r\n.\r\n");
    assertSmtpOk(await readSmtpResponse(socket));
    await sendCommand(socket, "QUIT");
  } finally {
    socket.end();
  }
};

export const sendVerificationOtp = (
  app: FastifyInstance,
  email: string,
  code: string,
) =>
  sendOtpEmail(app, {
    code,
    email,
    intro: "Your Field Notes verification code is:",
    logMessage:
      "SMTP is not configured. Email verification OTP was logged for development only.",
    subject: "Field Notes verification code",
  });

export const sendPasswordResetOtp = (
  app: FastifyInstance,
  email: string,
  code: string,
) =>
  sendOtpEmail(app, {
    code,
    email,
    intro: "Your Field Notes password reset code is:",
    logMessage:
      "SMTP is not configured. Password reset OTP was logged for development only.",
    subject: "Field Notes password reset code",
  });
