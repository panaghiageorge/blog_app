import { asc, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { languages } from "../../db/schema.js";

export const languageRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", {
    schema: { tags: ["Languages"], summary: "List active languages" },
  }, async (_request, reply) => {
    const items = await app.db
      .select()
      .from(languages)
      .where(eq(languages.isActive, true))
      .orderBy(desc(languages.isDefault), asc(languages.name));

    return reply.send({ items });
  });
};
