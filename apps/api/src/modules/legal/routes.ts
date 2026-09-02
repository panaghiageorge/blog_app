import {
  languageQuerySchema,
  legalPageParamSchema,
  upsertLegalPageInputSchema,
  type LegalPageKey,
} from "@blog/validation";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { legalPages, newsletterSubscriptions } from "../../db/schema.js";
import { bearerSecurity, languageQuery } from "../../openapi.js";

const fallbackPages: Record<LegalPageKey, Record<string, { title: string; content: string }>> = {
  terms: {
    ro: {
      title: "Termeni și condiții",
      content: "Această pagină este un draft editabil. Adaugă aici regulile de utilizare ale site-ului, drepturile și obligațiile utilizatorilor, condițiile de publicare și limitările de răspundere. Pentru producție, textul trebuie verificat juridic.",
    },
    en: {
      title: "Terms and conditions",
      content: "This page is an editable draft. Add the site usage rules, user rights and responsibilities, publishing terms, and liability limits here. For production, the copy should be legally reviewed.",
    },
  },
  gdpr: {
    ro: {
      title: "Politica GDPR",
      content: "Această pagină este un draft editabil. Explică ce date colectezi, de ce le colectezi, temeiul legal, perioada de păstrare, drepturile utilizatorului și metodele de contact pentru solicitări GDPR. Pentru producție, textul trebuie verificat juridic.",
    },
    en: {
      title: "GDPR policy",
      content: "This page is an editable draft. Explain what data you collect, why you collect it, legal basis, retention period, user rights, and contact methods for GDPR requests. For production, the copy should be legally reviewed.",
    },
  },
  marketing: {
    ro: {
      title: "Politica de marketing",
      content: "Această pagină este un draft editabil. Descrie cum folosești emailul pentru newsletter, ce tip de comunicări trimiți, cât de des, cum se poate retrage acordul și cum gestionezi preferințele de marketing.",
    },
    en: {
      title: "Marketing policy",
      content: "This page is an editable draft. Describe how email is used for the newsletter, what messages are sent, frequency, how consent can be withdrawn, and how marketing preferences are managed.",
    },
  },
};

const legalKeyParams = {
  type: "object",
  required: ["key"],
  properties: { key: { type: "string", enum: ["terms", "gdpr", "marketing"] } },
};

const legalBody = {
  type: "object",
  required: ["languageCode", "title", "content"],
  additionalProperties: false,
  properties: {
    languageCode: { type: "string", minLength: 2, maxLength: 12 },
    title: { type: "string", minLength: 3, maxLength: 160 },
    content: { type: "string", minLength: 50 },
  },
};

export const legalRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/:key",
    { schema: { tags: ["Legal"], summary: "Get a legal page", params: legalKeyParams, querystring: languageQuery } },
    async (request, reply) => {
      const parsedParams = legalPageParamSchema.safeParse(request.params);
      const parsedQuery = languageQuerySchema.safeParse(request.query);
      if (!parsedParams.success || !parsedQuery.success) {
        return reply.code(400).send({ message: "Invalid legal page request" });
      }

      const languageCode = parsedQuery.data.language ?? "ro";
      const page = await app.db.query.legalPages.findFirst({
        where: and(eq(legalPages.key, parsedParams.data.key), eq(legalPages.languageCode, languageCode)),
      });

      if (page) return reply.send({ item: page });

      const fallback = fallbackPages[parsedParams.data.key][languageCode] ?? fallbackPages[parsedParams.data.key].ro;
      return reply.send({
        item: {
          id: null,
          key: parsedParams.data.key,
          languageCode,
          title: fallback.title,
          content: fallback.content,
          updatedAt: null,
          createdAt: null,
        },
      });
    },
  );

  app.patch(
    "/:key",
    {
      preHandler: [app.authenticate, app.authorize("manage_legal")],
      schema: { tags: ["Legal"], summary: "Update a legal page", security: bearerSecurity, params: legalKeyParams, body: legalBody },
    },
    async (request, reply) => {
      const parsedParams = legalPageParamSchema.safeParse(request.params);
      const parsedBody = upsertLegalPageInputSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: "Invalid legal page payload" });
      }

      const [page] = await app.db
        .insert(legalPages)
        .values({ ...parsedBody.data, key: parsedParams.data.key, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [legalPages.key, legalPages.languageCode],
          set: { title: parsedBody.data.title, content: parsedBody.data.content, updatedAt: new Date() },
        })
        .returning();

      return reply.send({ item: page });
    },
  );

  app.get(
    "/newsletter/subscriptions",
    {
      preHandler: [app.authenticate, app.authorize("manage_legal")],
      schema: { tags: ["Legal"], summary: "List newsletter subscriptions", security: bearerSecurity },
    },
    async (_request, reply) => {
      const items = await app.db
        .select()
        .from(newsletterSubscriptions)
        .orderBy(desc(newsletterSubscriptions.subscribedAt))
        .limit(200);

      return reply.send({ items });
    },
  );
};
