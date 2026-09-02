import { asc, eq } from "drizzle-orm";
import {
  createCategoryInputSchema,
  idParamSchema,
  updateCategoryInputSchema,
} from "@blog/validation";
import type { FastifyPluginAsync } from "fastify";
import { categories } from "../../db/schema.js";

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_request, reply) => {
    const items = await app.db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name));

    return reply.send({ items });
  });

  app.post(
    "/",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsed = createCategoryInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const existing = await app.db.query.categories.findFirst({
        where: eq(categories.code, parsed.data.code),
      });
      if (existing) {
        return reply.code(409).send({ message: "Category code already exists" });
      }

      const [created] = await app.db
        .insert(categories)
        .values(parsed.data)
        .returning();
      return reply.code(201).send({ item: created });
    },
  );

  app.patch(
    "/:id",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      const parsedBody = updateCategoryInputSchema.safeParse(request.body);
      if (!parsedId.success || !parsedBody.success) {
        return reply.code(400).send({ message: "Invalid payload" });
      }

      const [updated] = await app.db
        .update(categories)
        .set(parsedBody.data)
        .where(eq(categories.id, parsedId.data.id))
        .returning();
      if (!updated) return reply.code(404).send({ message: "Category not found" });
      return reply.send({ item: updated });
    },
  );

  app.delete(
    "/:id",
    { preHandler: [app.authenticate, app.authorize("manage_taxonomy")] },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      if (!parsedId.success) return reply.code(400).send({ message: "Invalid category id" });

      const [updated] = await app.db
        .update(categories)
        .set({ isActive: false })
        .where(eq(categories.id, parsedId.data.id))
        .returning();
      if (!updated) return reply.code(404).send({ message: "Category not found" });
      return reply.send({ item: updated });
    },
  );
};
