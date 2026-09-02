import { newsletterSubscribeInputSchema } from "@blog/validation";
import type { FastifyPluginAsync } from "fastify";
import { newsletterSubscriptions } from "../../db/schema.js";

const subscribeBody = {
  type: "object",
  required: ["email", "termsAccepted"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    termsAccepted: { type: "boolean", const: true },
    marketingAccepted: { type: "boolean", default: false },
    languageCode: { type: "string", minLength: 2, maxLength: 12, default: "ro" },
  },
};

export const newsletterRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/subscribe",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } }, schema: { tags: ["Newsletter"], summary: "Subscribe to newsletter", body: subscribeBody } },
    async (request, reply) => {
      const parsed = newsletterSubscribeInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid newsletter payload", issues: parsed.error.flatten() });
      }

      const now = new Date();
      const [item] = await app.db
        .insert(newsletterSubscriptions)
        .values({
          email: parsed.data.email,
          languageCode: parsed.data.languageCode,
          termsAccepted: true,
          termsAcceptedAt: now,
          marketingAccepted: parsed.data.marketingAccepted,
          marketingAcceptedAt: parsed.data.marketingAccepted ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: newsletterSubscriptions.email,
          set: {
            languageCode: parsed.data.languageCode,
            termsAccepted: true,
            termsAcceptedAt: now,
            marketingAccepted: parsed.data.marketingAccepted,
            marketingAcceptedAt: parsed.data.marketingAccepted ? now : null,
            updatedAt: now,
          },
        })
        .returning();

      return reply.code(201).send({ ok: true, item });
    },
  );
};
