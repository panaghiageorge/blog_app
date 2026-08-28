import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import type * as schema from "../db/schema.js";

declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
    pg: Pool;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
