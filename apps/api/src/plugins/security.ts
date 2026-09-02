import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";
import { users } from "../db/schema.js";
import { hasPermission, type Permission, type UserRole } from "../modules/auth/authorization.js";
import { getCurrentUserId } from "../modules/auth/current-user.js";

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getCookie = (cookieHeader: string | undefined, name: string) => {
  const cookies = cookieHeader?.split(";") ?? [];
  const cookie = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
};


const getFreshUserRole = async (app: FastifyInstanceLike, request: FastifyRequest) => {
  const userId = getCurrentUserId(request);
  if (!userId) return undefined;

  const user = await app.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  return user?.role as UserRole | undefined;
};

type FastifyInstanceLike = FastifyInstance;

const isAllowedRequestOrigin = (request: FastifyRequest) => {
  const origin = request.headers.origin;
  if (origin) return allowedOrigins.includes(origin);

  const referer = request.headers.referer;
  if (!referer) return env.NODE_ENV !== "production";

  try {
    return allowedOrigins.includes(new URL(referer).origin);
  } catch {
    return false;
  }
};

export const securityPlugin = fp(async (app) => {
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"), false);
    },
    credentials: true,
  });

  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!unsafeMethods.has(request.method)) return;
    if (request.url.startsWith("/documentation")) return;
    if (isAllowedRequestOrigin(request)) return;

    return reply.code(403).send({ message: "Forbidden" });
  });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookieToken = getCookie(request.headers.cookie, "auth_token");
      if (!cookieToken) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      try {
        request.user = app.jwt.verify(cookieToken);
      } catch {
        return reply.code(401).send({ message: "Unauthorized" });
      }
    },
  );

  app.decorate(
    "requireRole",
    (roles: UserRole[]) => async (request: FastifyRequest, reply: FastifyReply) => {
      const role = await getFreshUserRole(app, request);
      if (!role) return reply.code(401).send({ message: "Unauthorized" });
      if (!roles.includes(role)) return reply.code(403).send({ message: "Forbidden" });
    },
  );

  app.decorate(
    "authorize",
    (permission: Permission) => async (request: FastifyRequest, reply: FastifyReply) => {
      const role = await getFreshUserRole(app, request);
      if (!role) return reply.code(401).send({ message: "Unauthorized" });
      if (!hasPermission(role, permission)) {
        return reply.code(403).send({ message: "Forbidden" });
      }
    },
  );

  app.decorate(
    "requireAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = await getFreshUserRole(app, request);
      if (!role) return reply.code(401).send({ message: "Unauthorized" });
      if (role !== "admin") return reply.code(403).send({ message: "Forbidden" });
    },
  );
});