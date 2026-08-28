import {
  createPostInputSchema,
  idParamSchema,
  languageQuerySchema,
  paginationQuerySchema,
  slugParamSchema,
  updatePostInputSchema,
  type PostTranslationInput,
} from "@blog/validation";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  categories,
  languages,
  posts,
  postTranslations,
  users,
} from "../../db/schema.js";
import {
  bearerSecurity,
  createPostBody,
  idParams,
  languageQuery,
  paginationQuery,
  postsQuery,
  slugParams,
  updatePostBody,
} from "../../openapi.js";
import { getCurrentUserId } from "../auth/current-user.js";

const postColumns = {
  id: posts.id,
  authorId: posts.authorId,
  imageUrl: posts.imageUrl,
  categoryId: posts.categoryId,
  category: posts.category,
  status: posts.status,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
  createdAt: posts.createdAt,
};

const translatedPostColumns = {
  ...postColumns,
  title: postTranslations.title,
  slug: postTranslations.slug,
  excerpt: postTranslations.excerpt,
  readTime: postTranslations.readTime,
  content: postTranslations.content,
  languageCode: languages.code,
  authorName: users.name,
  metaTitle: postTranslations.metaTitle,
  metaDescription: postTranslations.metaDescription,
  keywords: postTranslations.keywords,
};

const createExcerpt = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 220
    ? `${normalized.slice(0, 217).trim()}...`
    : normalized;
};

const estimateReadTime = (content: string) => {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(wordCount / 220))} min`;
};

const withFallbackExcerpt = <T extends { content: string; excerpt: string }>(
  post: T,
) => ({
  ...post,
  excerpt: post.excerpt || createExcerpt(post.content),
});

const getCurrentUserRole = async (app: FastifyInstance, userId: number) => {
  const user = await app.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  return user?.role;
};

const getRequestedLanguage = async (app: FastifyInstance, query: unknown) => {
  const parsed = languageQuerySchema.safeParse(query);
  const requestedCode = parsed.success ? parsed.data.language : undefined;

  const requestedLanguage = requestedCode
    ? await app.db.query.languages.findFirst({
        where: and(
          eq(languages.code, requestedCode),
          eq(languages.isActive, true),
        ),
      })
    : undefined;

  if (requestedLanguage) {
    return requestedLanguage;
  }

  const defaultLanguage = await app.db.query.languages.findFirst({
    where: and(eq(languages.isDefault, true), eq(languages.isActive, true)),
  });

  if (defaultLanguage) {
    return defaultLanguage;
  }

  return app.db.query.languages.findFirst({
    where: eq(languages.isActive, true),
  });
};

const createTranslationPayloads = (
  payload: {
    title?: string;
    slug?: string;
    excerpt?: string;
    readTime?: string;
    content?: string;
    translations?: PostTranslationInput[];
  },
  defaultLanguageCode: string,
) => {
  if (payload.translations?.length) {
    return payload.translations.map((translation) => ({
      ...translation,
      excerpt: translation.excerpt ?? createExcerpt(translation.content),
      readTime: translation.readTime ?? estimateReadTime(translation.content),
    }));
  }

  if (!(payload.title && payload.slug && payload.content)) {
    return [];
  }

  return [
    {
      languageCode: defaultLanguageCode,
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt ?? createExcerpt(payload.content),
      readTime: payload.readTime ?? estimateReadTime(payload.content),
      content: payload.content,
    },
  ];
};

const pickPrimaryTranslation = (
  translations: ReturnType<typeof createTranslationPayloads>,
  defaultLanguageCode: string,
) =>
  translations.find(
    (translation) => translation.languageCode === defaultLanguageCode,
  ) ?? translations[0];

const getTranslationLanguageIds = async (
  app: FastifyInstance,
  translations: ReturnType<typeof createTranslationPayloads>,
) => {
  const codes = [
    ...new Set(translations.map((translation) => translation.languageCode)),
  ];
  const rows = await app.db.query.languages.findMany({
    where: inArray(languages.code, codes),
  });
  const languageMap = new Map(
    rows.map((language) => [language.code, language]),
  );
  const missingCode = codes.find((code) => !languageMap.get(code)?.isActive);

  if (missingCode) {
    return { error: `Language ${missingCode} is not active` };
  }

  return { languageMap };
};

const getPostTranslationsByPostIds = async (
  app: FastifyInstance,
  postIds: number[],
) => {
  if (postIds.length === 0) {
    return new Map<number, unknown[]>();
  }

  const rows = await app.db
    .select({
      id: postTranslations.id,
      postId: postTranslations.postId,
      languageId: postTranslations.languageId,
      languageCode: languages.code,
      metaTitle: postTranslations.metaTitle,
      metaDescription: postTranslations.metaDescription,
      keywords: postTranslations.keywords,
      title: postTranslations.title,
      slug: postTranslations.slug,
      excerpt: postTranslations.excerpt,
      readTime: postTranslations.readTime,
      content: postTranslations.content,
      updatedAt: postTranslations.updatedAt,
      createdAt: postTranslations.createdAt,
    })
    .from(postTranslations)
    .innerJoin(languages, eq(postTranslations.languageId, languages.id))
    .where(inArray(postTranslations.postId, postIds));

  const grouped = new Map<number, typeof rows>();
  for (const row of rows) {
    grouped.set(row.postId, [...(grouped.get(row.postId) ?? []), row]);
  }

  return grouped;
};

export const postRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["Posts"],
        summary: "List published posts",
        querystring: postsQuery,
      },
    },
    async (request, reply) => {
      const parsed = paginationQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid query", issues: parsed.error.flatten() });
      }

      const language = await getRequestedLanguage(app, request.query);
      if (!language) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      const { page, pageSize, search } = parsed.data;
      const publicCondition = eq(posts.status, "published");
      const languageCondition = eq(postTranslations.languageId, language.id);
      const searchCondition = search
        ? or(
            ilike(postTranslations.title, `%${search}%`),
            ilike(postTranslations.excerpt, `%${search}%`),
            ilike(postTranslations.content, `%${search}%`),
          )
        : undefined;
      const whereCondition = and(
        publicCondition,
        languageCondition,
        searchCondition,
      );

      const itemsQuery = app.db
        .select(translatedPostColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .innerJoin(languages, eq(postTranslations.languageId, languages.id))
        .where(whereCondition)
        .orderBy(desc(posts.publishedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const countQuery = app.db
        .select({ total: count() })
        .from(posts)
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .where(whereCondition);

      const [items, totalResult] = await Promise.all([itemsQuery, countQuery]);

      const total = Number(totalResult[0]?.total ?? 0);
      return reply.send({
        items: items.map(withFallbackExcerpt),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      });
    },
  );

  app.get(
    "/manage",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "List posts available to the current user",
        security: bearerSecurity,
        querystring: postsQuery,
      },
    },
    async (request, reply) => {
      const parsed = paginationQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid query", issues: parsed.error.flatten() });
      }

      const currentUserId = getCurrentUserId(request);
      if (!currentUserId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const language = await getRequestedLanguage(app, request.query);
      if (!language) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      const currentUserRole = await getCurrentUserRole(app, currentUserId);
      const { page, pageSize, search } = parsed.data;
      const languageCondition = eq(postTranslations.languageId, language.id);
      const searchCondition = search
        ? or(
            ilike(postTranslations.title, `%${search}%`),
            ilike(postTranslations.excerpt, `%${search}%`),
            ilike(postTranslations.content, `%${search}%`),
          )
        : undefined;
      const ownershipCondition =
        currentUserRole === "admin"
          ? undefined
          : eq(posts.authorId, currentUserId);
      const whereCondition = and(
        ownershipCondition,
        languageCondition,
        searchCondition,
      );

      const itemsQuery = app.db
        .select(translatedPostColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .innerJoin(languages, eq(postTranslations.languageId, languages.id))
        .where(whereCondition)
        .orderBy(desc(posts.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const countQuery = app.db
        .select({ total: count() })
        .from(posts)
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .where(whereCondition);

      const [items, totalResult] = await Promise.all([itemsQuery, countQuery]);
      const translations = await getPostTranslationsByPostIds(
        app,
        items.map((item) => item.id),
      );

      const total = Number(totalResult[0]?.total ?? 0);
      return reply.send({
        items: items.map((item) => ({
          ...withFallbackExcerpt(item),
          translations: translations.get(item.id) ?? [],
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      });
    },
  );

  app.get(
    "/slug/:slug",
    {
      schema: {
        tags: ["Posts"],
        summary: "Get a published post by slug",
        params: slugParams,
        querystring: languageQuery,
      },
    },
    async (request, reply) => {
      const parsed = slugParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid post slug" });
      }

      const language = await getRequestedLanguage(app, request.query);
      if (!language) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      let [post] = await app.db
        .select(translatedPostColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .innerJoin(languages, eq(postTranslations.languageId, languages.id))
        .where(
          and(
            eq(postTranslations.slug, parsed.data.slug),
            eq(postTranslations.languageId, language.id),
            eq(posts.status, "published"),
          ),
        )
        .limit(1);

      if (!post) {
        const [postWithSlug] = await app.db
          .select({ postId: postTranslations.postId })
          .from(postTranslations)
          .where(eq(postTranslations.slug, parsed.data.slug))
          .limit(1);

        if (postWithSlug) {
          [post] = await app.db
            .select(translatedPostColumns)
            .from(posts)
            .innerJoin(users, eq(posts.authorId, users.id))
            .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
            .innerJoin(languages, eq(postTranslations.languageId, languages.id))
            .where(
              and(
                eq(posts.id, postWithSlug.postId),
                eq(postTranslations.languageId, language.id),
                eq(posts.status, "published"),
              ),
            )
            .limit(1);
        }
      }

      if (!post) {
        return reply.code(404).send({ message: "Post not found" });
      }

      return reply.send({ item: withFallbackExcerpt(post) });
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        tags: ["Posts"],
        summary: "Get a published post by ID",
        params: idParams,
        querystring: languageQuery,
      },
    },
    async (request, reply) => {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid post id" });
      }

      const language = await getRequestedLanguage(app, request.query);
      if (!language) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      const [post] = await app.db
        .select(translatedPostColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
        .innerJoin(languages, eq(postTranslations.languageId, languages.id))
        .where(
          and(
            eq(posts.id, parsed.data.id),
            eq(postTranslations.languageId, language.id),
            eq(posts.status, "published"),
          ),
        )
        .limit(1);

      if (!post) {
        return reply.code(404).send({ message: "Post not found" });
      }

      return reply.send({ item: withFallbackExcerpt(post) });
    },
  );

  app.post(
    "/",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Create a post",
        security: bearerSecurity,
        body: createPostBody,
      },
    },
    async (request, reply) => {
      const parsed = createPostInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ message: "Invalid payload", issues: parsed.error.flatten() });
      }

      const currentUserId = getCurrentUserId(request);
      if (!currentUserId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const postStatus = "draft" as const;
      const category = await app.db.query.categories.findFirst({
        where: eq(categories.code, parsed.data.category),
      });
      if (!category) {
        return reply.code(400).send({ message: "Category not found" });
      }

      const defaultLanguage = await getRequestedLanguage(app, {});
      if (!defaultLanguage) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      const translationPayloads = createTranslationPayloads(
        parsed.data,
        defaultLanguage.code,
      );
      const primaryTranslation = pickPrimaryTranslation(
        translationPayloads,
        defaultLanguage.code,
      );
      const languageResult = await getTranslationLanguageIds(
        app,
        translationPayloads,
      );

      if ("error" in languageResult) {
        return reply.code(400).send({ message: languageResult.error });
      }

      for (const translation of translationPayloads) {
        const language = languageResult.languageMap.get(
          translation.languageCode,
        );
        if (!language) {
          return reply
            .code(400)
            .send({
              message: `Language ${translation.languageCode} not found`,
            });
        }

        const existing = await app.db.query.postTranslations.findFirst({
          where: and(
            eq(postTranslations.languageId, language.id),
            eq(postTranslations.slug, translation.slug),
          ),
          columns: { id: true },
        });

        if (existing) {
          return reply.code(409).send({ message: "Slug already in use" });
        }
      }

      const [createdPost] = await app.db
        .insert(posts)
        .values({
          title: primaryTranslation.title,
          slug: primaryTranslation.slug,
          excerpt: primaryTranslation.excerpt,
          category: parsed.data.category,
          status: postStatus,
          readTime: primaryTranslation.readTime,
          content: primaryTranslation.content,
          publishedAt: null,
          authorId: currentUserId,
          imageUrl: parsed.data.imageUrl,
          categoryId: category.id,
        })
        .returning(postColumns);

      await app.db.insert(postTranslations).values(
        translationPayloads.map((translation) => {
          const language = languageResult.languageMap.get(
            translation.languageCode,
          );

          return {
            postId: createdPost.id,
            languageId: language?.id ?? defaultLanguage.id,
            metaTitle: translation.metaTitle,
            metaDescription: translation.metaDescription,
            keywords: translation.keywords,
            title: translation.title,
            slug: translation.slug,
            excerpt: translation.excerpt,
            readTime: translation.readTime,
            content: translation.content,
          };
        }),
      );

      return reply.code(201).send({
        item: {
          ...createdPost,
          ...primaryTranslation,
          languageCode: primaryTranslation.languageCode,
        },
      });
    },
  );

  app.post(
    "/:id/publish",
    {
      preHandler: [app.authenticate, app.requireAdmin],
      schema: {
        tags: ["Posts"],
        summary: "Publish a post",
        security: bearerSecurity,
        params: idParams,
      },
    },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      if (!parsedId.success) {
        return reply.code(400).send({ message: "Invalid post id" });
      }

      const existingPost = await app.db.query.posts.findFirst({
        where: eq(posts.id, parsedId.data.id),
        columns: { id: true },
      });

      if (!existingPost) {
        return reply.code(404).send({ message: "Post not found" });
      }

      const [updatedPost] = await app.db
        .update(posts)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(posts.id, parsedId.data.id))
        .returning(postColumns);

      return reply.send({ item: updatedPost });
    },
  );
  app.patch(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Update a post",
        security: bearerSecurity,
        params: idParams,
        body: updatePostBody,
      },
    },
    async (request, reply) => {
      const parsedId = idParamSchema.safeParse(request.params);
      if (!parsedId.success) {
        return reply.code(400).send({ message: "Invalid post id" });
      }

      const parsedBody = updatePostInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          message: "Invalid payload",
          issues: parsedBody.error.flatten(),
        });
      }

      const currentUserId = getCurrentUserId(request);
      if (!currentUserId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const existingPost = await app.db.query.posts.findFirst({
        where: eq(posts.id, parsedId.data.id),
        columns: { id: true, authorId: true, publishedAt: true },
      });

      if (!existingPost) {
        return reply.code(404).send({ message: "Post not found" });
      }

      const currentUserRole = await getCurrentUserRole(app, currentUserId);
      const updates = parsedBody.data;
      if (
        updates.status &&
        currentUserRole !== "admin" &&
        !(
          updates.status === "pending_review" ||
          (updates.status === "archived" && existingPost.publishedAt)
        )
      ) {
        return reply.code(403).send({
          message:
            "Only admins can publish; authors can submit drafts for review",
        });
      }
      if (
        existingPost.authorId !== currentUserId &&
        currentUserRole !== "admin"
      ) {
        return reply.code(403).send({ message: "Forbidden" });
      }

      if (Object.keys(updates).length === 0) {
        return reply.code(400).send({ message: "No fields to update" });
      }

      const defaultLanguage = await getRequestedLanguage(app, {});
      if (!defaultLanguage) {
        return reply
          .code(500)
          .send({ message: "No active language configured" });
      }

      const translationPayloads = createTranslationPayloads(
        updates,
        defaultLanguage.code,
      );
      const primaryTranslation = translationPayloads.length
        ? pickPrimaryTranslation(translationPayloads, defaultLanguage.code)
        : undefined;
      const languageResult = await getTranslationLanguageIds(
        app,
        translationPayloads,
      );

      if ("error" in languageResult) {
        return reply.code(400).send({ message: languageResult.error });
      }

      const updatedCategory = updates.category
        ? await app.db.query.categories.findFirst({
            where: eq(categories.code, updates.category),
          })
        : undefined;
      if (updates.category && !updatedCategory) {
        return reply.code(400).send({ message: "Category not found" });
      }

      for (const translation of translationPayloads) {
        const language = languageResult.languageMap.get(
          translation.languageCode,
        );
        if (!language) {
          return reply
            .code(400)
            .send({
              message: `Language ${translation.languageCode} not found`,
            });
        }

        const existingSlug = await app.db.query.postTranslations.findFirst({
          where: and(
            eq(postTranslations.languageId, language.id),
            eq(postTranslations.slug, translation.slug),
          ),
          columns: { id: true, postId: true },
        });

        if (existingSlug && existingSlug.postId !== parsedId.data.id) {
          return reply.code(409).send({ message: "Slug already in use" });
        }
      }

      const nextUpdates = {
        ...(updates.imageUrl !== undefined
          ? { imageUrl: updates.imageUrl }
          : {}),
        ...(updates.category ? { category: updates.category } : {}),
        ...(updatedCategory ? { categoryId: updatedCategory.id } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(primaryTranslation
          ? {
              title: primaryTranslation.title,
              slug: primaryTranslation.slug,
              excerpt: primaryTranslation.excerpt,
              readTime: primaryTranslation.readTime,
              content: primaryTranslation.content,
            }
          : {}),
        ...(updates.status === "published" && !existingPost.publishedAt
          ? { publishedAt: new Date() }
          : {}),
        ...(updates.status === "draft" ||
        updates.status === "pending_review" ||
        updates.status === "archived"
          ? { publishedAt: null }
          : {}),
        updatedAt: new Date(),
      };

      const [updatedPost] = await app.db
        .update(posts)
        .set(nextUpdates)
        .where(eq(posts.id, parsedId.data.id))
        .returning(postColumns);

      for (const translation of translationPayloads) {
        const language = languageResult.languageMap.get(
          translation.languageCode,
        );
        if (!language) {
          continue;
        }

        await app.db
          .insert(postTranslations)
          .values({
            postId: parsedId.data.id,
            languageId: language.id,
            metaTitle: translation.metaTitle,
            metaDescription: translation.metaDescription,
            keywords: translation.keywords,
            title: translation.title,
            slug: translation.slug,
            excerpt: translation.excerpt,
            readTime: translation.readTime,
            content: translation.content,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [postTranslations.postId, postTranslations.languageId],
            set: {
              title: translation.title,
              metaTitle: translation.metaTitle,
              metaDescription: translation.metaDescription,
              keywords: translation.keywords,
              slug: translation.slug,
              excerpt: translation.excerpt,
              readTime: translation.readTime,
              content: translation.content,
              updatedAt: new Date(),
            },
          });
      }

      return reply.send({
        item: {
          ...updatedPost,
          ...(primaryTranslation ?? {}),
          languageCode:
            primaryTranslation?.languageCode ?? defaultLanguage.code,
        },
      });
    },
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Delete a post",
        security: bearerSecurity,
        params: idParams,
      },
    },
    async (request, reply) => {
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid post id" });
      }

      const currentUserId = getCurrentUserId(request);
      if (!currentUserId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const existingPost = await app.db.query.posts.findFirst({
        where: eq(posts.id, parsed.data.id),
        columns: { id: true, authorId: true },
      });

      if (!existingPost) {
        return reply.code(404).send({ message: "Post not found" });
      }

      const currentUserRole = await getCurrentUserRole(app, currentUserId);
      if (
        existingPost.authorId !== currentUserId &&
        currentUserRole !== "admin"
      ) {
        return reply.code(403).send({ message: "Forbidden" });
      }

      const [deletedPost] = await app.db
        .delete(posts)
        .where(eq(posts.id, parsed.data.id))
        .returning(postColumns);

      return reply.send({ item: deletedPost });
    },
  );
};
