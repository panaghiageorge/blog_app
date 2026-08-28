import { drizzle } from "drizzle-orm/node-postgres";
import fp from "fastify-plugin";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "../db/schema.js";

export const dbPlugin = fp(async (app) => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  app.decorate("db", db);
  app.decorate("pg", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
});
