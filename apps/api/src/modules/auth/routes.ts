import { createHmac, randomInt } from "node:crypto";
import { loginInputSchema, registerInputSchema } from "@blog/validation";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { emailVerificationTokens, passwordResetTokens, users } from "../../db/schema.js";
import { bearerSecurity, loginBody, registerBody } from "../../openapi.js";
import { getCurrentUserId } from "./current-user.js";
import { sendPasswordResetOtp, sendVerificationOtp } from "./email.js";
import { hashPassword, verifyPassword } from "./password.js";

type SecurityAttempt = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

type OtpPurpose = "verify-email" | "reset-password";

const failedLoginAttempts = new Map<string, SecurityAttempt>();
const otpVerificationAttempts = new Map<string, SecurityAttempt>();
const passwordResetAttempts = new Map<string, SecurityAttempt>();
const loginWindowMs = 15 * 60 * 1000;
const loginLockMs = 15 * 60 * 1000;
const maxLoginFailures = 5;
const otpWindowMs = 15 * 60 * 1000;
const otpLockMs = 15 * 60 * 1000;
const maxOtpFailures = 5;
const verificationCodeTtlMs = 15 * 60 * 1000;
const passwordResetCodeTtlMs = 15 * 60 * 1000;
const dummyPasswordHash =
  "f4ed97e096212800b9c30812e1995f44:f1430881901922680ab579af556d74b7c2db00ecaf0071e61cbfd7ecdc508c45c224ef8f363147e67d155d4e1b5699e965c768c60f23a3eb64740fe7802eddbc";

const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);

const verifyEmailBodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

const resetPasswordBodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  password: strongPasswordSchema,
});

const getClientIp = (request: { ip: string; headers: { [key: string]: string | string[] | undefined } }) => {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  return request.ip;
};

const attemptKey = (email: string, ip: string) => email + ":" + ip;

const pruneAttempts = (store: Map<string, SecurityAttempt>, windowMs: number) => {
  const now = Date.now();
  for (const [key, attempt] of store.entries()) {
    const lockExpired = !attempt.lockedUntil || attempt.lockedUntil <= now;
    const windowExpired = now - attempt.firstAttemptAt > windowMs;
    if (lockExpired && windowExpired) store.delete(key);
  }
};

const isLocked = (store: Map<string, SecurityAttempt>, key: string) => {
  pruneAttempts(store, otpWindowMs);
  const attempt = store.get(key);
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > Date.now());
};

const recordFailure = (store: Map<string, SecurityAttempt>, key: string) => {
  const now = Date.now();
  const current = store.get(key);
  const attempt =
    current && now - current.firstAttemptAt < otpWindowMs
      ? { ...current, count: current.count + 1 }
      : { count: 1, firstAttemptAt: now };

  if (attempt.count >= maxOtpFailures) attempt.lockedUntil = now + otpLockMs;
  store.set(key, attempt);
  return Boolean(attempt.lockedUntil && attempt.lockedUntil > now);
};

const isLoginLocked = (key: string) => {
  pruneAttempts(failedLoginAttempts, loginWindowMs);
  const attempt = failedLoginAttempts.get(key);
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > Date.now());
};

const recordFailedLogin = (key: string) => {
  const now = Date.now();
  const current = failedLoginAttempts.get(key);
  const attempt =
    current && now - current.firstAttemptAt < loginWindowMs
      ? { ...current, count: current.count + 1 }
      : { count: 1, firstAttemptAt: now };

  if (attempt.count >= maxLoginFailures) attempt.lockedUntil = now + loginLockMs;
  failedLoginAttempts.set(key, attempt);
};

const tokenMaxAgeSeconds = () => {
  const match = /^(\d+)([dhm])$/.exec(env.JWT_EXPIRES_IN);
  if (!match) return 60 * 60 * 24 * 30;

  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "d") return value * 60 * 60 * 24;
  if (unit === "h") return value * 60 * 60;
  return value * 60;
};

const createOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

const hashOtpCode = (purpose: OtpPurpose, email: string, code: string) =>
  createHmac("sha256", env.JWT_SECRET)
    .update(purpose + ":" + email + ":" + code)
    .digest("hex");

const createAndSendVerificationCode = async (
  app: Parameters<FastifyPluginAsync>[0],
  userId: number,
  email: string,
) => {
  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + verificationCodeTtlMs);

  await app.db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
  await app.db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashOtpCode("verify-email", email, code),
    expiresAt,
  });

  await sendVerificationOtp(app, email, code);
};

const createAndSendPasswordResetCode = async (
  app: Parameters<FastifyPluginAsync>[0],
  userId: number,
  email: string,
) => {
  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + passwordResetCodeTtlMs);

  await app.db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  await app.db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashOtpCode("reset-password", email, code),
    expiresAt,
  });

  await sendPasswordResetOtp(app, email, code);
};

const setAuthCookie = (reply: FastifyReply, token: string) => {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  reply.header(
    "Set-Cookie",
    "auth_token=" +
      encodeURIComponent(token) +
      "; HttpOnly; Path=/; SameSite=Lax; Max-Age=" +
      tokenMaxAgeSeconds() +
      secure,
  );
};

const clearAuthCookie = (reply: FastifyReply) => {
  reply.header(
    "Set-Cookie",
    "auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        tags: ["Auth"],
        summary: "Register a new author",
        body: registerBody,
      },
    },
    async (request, reply) => {
      const parsed = registerInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const input = parsed.data;
      const passwordHash = await hashPassword(input.password);
      const existingUser = await app.db.query.users.findFirst({
        where: eq(users.email, input.email),
        columns: { id: true, emailVerifiedAt: true },
      });

      if (!existingUser) {
        const [createdUser] = await app.db
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            role: "author",
            passwordHash,
            emailVerifiedAt: null,
          })
          .returning({ id: users.id });
        await createAndSendVerificationCode(app, createdUser.id, input.email);
      } else if (!existingUser.emailVerifiedAt) {
        await createAndSendVerificationCode(app, existingUser.id, input.email);
      }

      return reply.code(201).send({ ok: true, email: input.email });
    },
  );

  app.post(
    "/verify-email",
    { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      pruneAttempts(otpVerificationAttempts, otpWindowMs);
      const parsed = verifyEmailBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid verification code" });
      }

      const key = attemptKey(parsed.data.email, getClientIp(request));
      if (isLocked(otpVerificationAttempts, key)) {
        return reply.code(429).send({ message: "Too many verification attempts" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.email, parsed.data.email),
        columns: { id: true },
      });
      if (!user) {
        const locked = recordFailure(otpVerificationAttempts, key);
        return reply
          .code(locked ? 429 : 400)
          .send({ message: locked ? "Too many verification attempts" : "Invalid verification code" });
      }

      const verification = await app.db.query.emailVerificationTokens.findFirst({
        where: and(
          eq(emailVerificationTokens.userId, user.id),
          eq(emailVerificationTokens.tokenHash, hashOtpCode("verify-email", parsed.data.email, parsed.data.code)),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      });

      if (!verification) {
        const locked = recordFailure(otpVerificationAttempts, key);
        return reply
          .code(locked ? 429 : 400)
          .send({ message: locked ? "Too many verification attempts" : "Invalid verification code" });
      }

      otpVerificationAttempts.delete(key);
      await app.db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, verification.userId));
      await app.db
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, verification.id));

      return reply.send({ ok: true });
    },
  );

  app.post(
    "/forgot-password",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      pruneAttempts(passwordResetAttempts, otpWindowMs);
      const parsed = forgotPasswordBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid email" });
      }

      const key = attemptKey(parsed.data.email, getClientIp(request));
      if (isLocked(passwordResetAttempts, key)) {
        return reply.code(429).send({ message: "Too many reset attempts" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.email, parsed.data.email),
        columns: { id: true, emailVerifiedAt: true },
      });

      if (user?.emailVerifiedAt) {
        await createAndSendPasswordResetCode(app, user.id, parsed.data.email);
      }

      return reply.send({ ok: true, email: parsed.data.email });
    },
  );

  app.post(
    "/reset-password",
    { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      pruneAttempts(passwordResetAttempts, otpWindowMs);
      const parsed = resetPasswordBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid reset payload" });
      }

      const key = attemptKey(parsed.data.email, getClientIp(request));
      if (isLocked(passwordResetAttempts, key)) {
        return reply.code(429).send({ message: "Too many reset attempts" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.email, parsed.data.email),
        columns: { id: true },
      });
      if (!user) {
        const locked = recordFailure(passwordResetAttempts, key);
        return reply
          .code(locked ? 429 : 400)
          .send({ message: locked ? "Too many reset attempts" : "Invalid reset code" });
      }

      const reset = await app.db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.tokenHash, hashOtpCode("reset-password", parsed.data.email, parsed.data.code)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      });

      if (!reset) {
        const locked = recordFailure(passwordResetAttempts, key);
        return reply
          .code(locked ? 429 : 400)
          .send({ message: locked ? "Too many reset attempts" : "Invalid reset code" });
      }

      passwordResetAttempts.delete(key);
      failedLoginAttempts.delete(key);
      await app.db
        .update(users)
        .set({ passwordHash: await hashPassword(parsed.data.password) })
        .where(eq(users.id, reset.userId));
      await app.db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, reset.id));

      clearAuthCookie(reply);
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: { tags: ["Auth"], summary: "Login", body: loginBody },
    },
    async (request, reply) => {
      pruneAttempts(failedLoginAttempts, loginWindowMs);
      const parsed = loginInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const input = parsed.data;
      const key = attemptKey(input.email, getClientIp(request));
      if (isLoginLocked(key)) {
        return reply.code(429).send({ message: "Too many login attempts" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      const isPasswordValid = await verifyPassword(
        input.password,
        user?.passwordHash ?? dummyPasswordHash,
      );
      if (!user || !isPasswordValid) {
        recordFailedLogin(key);
        return reply.code(401).send({ message: "Invalid credentials" });
      }

      if (!user.emailVerifiedAt) {
        return reply.code(403).send({ message: "Email not verified" });
      }

      failedLoginAttempts.delete(key);

      const token = await reply.jwtSign(
        {
          sub: String(user.id),
          email: user.email,
          role: user.role,
        },
        { expiresIn: env.JWT_EXPIRES_IN },
      );
      setAuthCookie(reply, token);
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    },
  );

  app.post("/logout", async (_request, reply) => {
    clearAuthCookie(reply);
    return reply.send({ ok: true });
  });

  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Get the current user",
        security: bearerSecurity,
      },
    },
    async (request, reply) => {
      const userId = getCurrentUserId(request);
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ message: "User not found" });
      }

      return reply.send({ user });
    },
  );
};
