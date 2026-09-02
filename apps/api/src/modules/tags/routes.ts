import { asc, eq } from "drizzle-orm";
import { createTagInputSchema, idParamSchema, updateTagInputSchema } from "@blog/validation";
import type { FastifyPluginAsync } from "fastify";
import { tags } from "../../db/schema.js";

export const tagRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_request, reply) => {
    const items = await app.db
      .select()
      .from(tags)
      .where(eq(tags.isActive, true))
      .orderBy(asc(tags.name));

    return reply.send({ items });
  });

  app.post(
    "/",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsed = createTagInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const existing = await app.db.query.tags.findFirst({
        where: eq(tags.code, parsed.data.code),
      });
      if (existing) return reply.code(409).send({ message: "Tag code already exists" });

      const [created] = await app.db.insert(tags).values(parsed.data).returning();
      return reply.code(201).send({ item: created });
    },
  );

  app.patch(
    "/:id",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      const parsedBody = updateTagInputSchema.safeParse(request.body);
      if (!parsedId.success || !parsedBody.success) {
        return reply.code(400).send({ message: "Invalid payload" });
      }

      const [updated] = await app.db
        .update(tags)
        .set(parsedBody.data)
        .where(eq(tags.id, parsedId.data.id))
        .returning();
      if (!updated) return reply.code(404).send({ message: "Tag not found" });
      return reply.send({ item: updated });
    },
  );

  app.delete(
    "/:id",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      if (!parsedId.success) return reply.code(400).send({ message: "Invalid tag id" });

      const [updated] = await app.db
        .update(tags)
        .set({ isActive: false })
        .where(eq(tags.id, parsedId.data.id))
        .returning();
      if (!updated) return reply.code(404).send({ message: "Tag not found" });
      return reply.send({ item: updated });
    },
  );
};
