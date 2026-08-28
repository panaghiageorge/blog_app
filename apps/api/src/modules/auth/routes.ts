import { loginInputSchema, registerInputSchema } from "@blog/validation";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { users } from "../../db/schema.js";
import { bearerSecurity, loginBody, registerBody } from "../../openapi.js";
import { getCurrentUserId } from "./current-user.js";
import { hashPassword, verifyPassword } from "./password.js";

const publicUser = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", {
    schema: { tags: ["Auth"], summary: "Register a new author", body: registerBody },
  }, async (request, reply) => {
    const parsed = registerInputSchema.safeParse(request.body);
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

    const passwordHash = await hashPassword(input.password);
    const [createdUser] = await app.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        role: "author",
        passwordHash,
      })
      .returning(publicUser);

    const token = await reply.jwtSign(
      {
        sub: String(createdUser.id),
        email: createdUser.email,
        role: createdUser.role,
      },
      { expiresIn: "7d" },
    );
    return reply.code(201).send({ token, user: createdUser });
  });

  app.post("/login", {
    schema: { tags: ["Auth"], summary: "Login and receive a JWT", body: loginBody },
  }, async (request, reply) => {
    const parsed = loginInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ message: "Invalid payload", issues: parsed.error.flatten() });
    }

    const input = parsed.data;
    const user = await app.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const isPasswordValid = await verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const token = await reply.jwtSign(
      {
        sub: String(user.id),
        email: user.email,
        role: user.role,
      },
      { expiresIn: "7d" },
    );
    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  app.get("/me", {
    preHandler: [app.authenticate],
    schema: { tags: ["Auth"], summary: "Get the current user", security: bearerSecurity },
  }, async (request, reply) => {
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
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }

    return reply.send({ user });
  });
};
