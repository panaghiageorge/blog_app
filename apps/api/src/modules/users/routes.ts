import {
  createUserInputSchema,
  idParamSchema,
  paginationQuerySchema,
  updateUserInputSchema,
} from "@blog/validation";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { users } from "../../db/schema.js";
import { getCurrentUserId } from "../auth/current-user.js";
import { hashPassword } from "../auth/password.js";
import {
  bearerSecurity,
  createUserBody,
  idParams,
  paginationQuery,
  updateUserBody,
} from "../../openapi.js";

const userColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Users"],
        summary: "List users",
        security: bearerSecurity,
        querystring: paginationQuery,
      },
    },
    async (request, reply) => {
      const parsed = paginationQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid query", issues: parsed.error.flatten() });
      }

      const { page, pageSize, search } = parsed.data;
      const whereCondition = search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          )
        : null;

      const itemsQuery = whereCondition
        ? app.db
            .select(userColumns)
            .from(users)
            .where(whereCondition)
            .orderBy(desc(users.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize)
        : app.db
            .select(userColumns)
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

      const countQuery = whereCondition
        ? app.db.select({ total: count() }).from(users).where(whereCondition)
        : app.db.select({ total: count() }).from(users);

      const [items, totalResult] = await Promise.all([itemsQuery, countQuery]);

      return reply.send({
        items,
        pagination: {
          page,
          pageSize,
          total: Number(totalResult[0]?.total ?? 0),
          totalPages: Math.max(
            1,
            Math.ceil(Number(totalResult[0]?.total ?? 0) / pageSize),
          ),
        },
      });
    },
  );

  app.get(
    "/:id",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Users"],
        summary: "Get a user by ID",
        security: bearerSecurity,
        params: idParams,
      },
    },
    async (request, reply) => {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid user id" });
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.id, parsed.data.id),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ message: "User not found" });
      }

      return reply.send({ item: user });
    },
  );

  app.post(
    "/",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Users"],
        summary: "Create a user",
        security: bearerSecurity,
        body: createUserBody,
      },
    },
    async (request, reply) => {
      const parsed = createUserInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const input = parsed.data;
      const existingUser = await app.db.query.users.findFirst({
        where: eq(users.email, input.email),
        columns: { id: true },
      });

      if (existingUser) {
        return reply.code(409).send({ message: "Email already in use" });
      }

      const [createdUser] = await app.db
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          role: input.role,
          passwordHash: await hashPassword(input.password),
        })
        .returning(userColumns);

      return reply.code(201).send({ item: createdUser });
    },
  );

  app.patch(
    "/:id",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Users"],
        summary: "Update a user",
        security: bearerSecurity,
        params: idParams,
        body: updateUserBody,
      },
    },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      if (!parsedId.success) {
        return reply.code(400).send({ message: "Invalid user id" });
      }

      const parsedBody = updateUserInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          message: "Invalid payload",
          issues: parsedBody.error.flatten(),
        });
      }

      const updates = parsedBody.data;
      if (Object.keys(updates).length === 0) {
        return reply.code(400).send({ message: "No fields to update" });
      }

      if (updates.role && parsedId.data.id === getCurrentUserId(request)) {
        return reply
          .code(400)
          .send({ message: "Admins cannot change their own role" });
      }

      if (updates.email) {
        const existingUser = await app.db.query.users.findFirst({
          where: eq(users.email, updates.email),
          columns: { id: true },
        });

        if (existingUser && existingUser.id !== parsedId.data.id) {
          return reply.code(409).send({ message: "Email already in use" });
        }
      }

      const [updatedUser] = await app.db
        .update(users)
        .set(updates)
        .where(eq(users.id, parsedId.data.id))
        .returning(userColumns);

      if (!updatedUser) {
        return reply.code(404).send({ message: "User not found" });
      }

      return reply.send({ item: updatedUser });
    },
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Users"],
        summary: "Delete a user",
        security: bearerSecurity,
        params: idParams,
      },
    },
    async (request, reply) => {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid user id" });
      }

      if (parsed.data.id === getCurrentUserId(request)) {
        return reply
          .code(400)
          .send({ message: "Admins cannot delete their own account" });
      }

      const [deletedUser] = await app.db
        .delete(users)
        .where(eq(users.id, parsed.data.id))
        .returning(userColumns);

      if (!deletedUser) {
        return reply.code(404).send({ message: "User not found" });
      }

      return reply.send({ item: deletedUser });
    },
  );
};
