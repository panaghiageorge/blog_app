import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";
import { users } from "../db/schema.js";
import { getCurrentUserId } from "../modules/auth/current-user.js";

export const securityPlugin = fp(async (app) => {
  await app.register(cors, {
    origin: true,
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

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ message: "Unauthorized" });
      }
    },
  );

  app.decorate(
    "requireAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getCurrentUserId(request);
      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true },
      });

      if (user?.role !== "admin") {
        return reply.code(403).send({ message: "Forbidden" });
      }
    },
  );
});
