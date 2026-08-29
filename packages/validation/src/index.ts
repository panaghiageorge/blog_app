import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).max(120).optional(),
  ),
});

const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

export const registerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[\p{L}0-9 .'-]+$/u),
  password: strongPasswordSchema,
});

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export const userRoleSchema = z.enum(["admin", "author"]);
export const postCategorySchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const createCategoryInputSchema = z.object({
  code: postCategorySchema,
  name: z.string().trim().min(2).max(80),
  nativeName: z.string().trim().min(2).max(80),
});
export const postStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "archived",
]);
export const languageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(12)
  .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/);

export const languageQuerySchema = z.object({
  language: languageCodeSchema.optional(),
});

const postTranslationInputSchema = z.object({
  languageCode: languageCodeSchema,
  metaTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  keywords: z.string().trim().max(500).optional(),
  title: z.string().min(3).max(180),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(20).max(320).optional(),
  readTime: z.string().trim().min(3).max(40).optional(),
  content: z.string().min(10),
});

export const createUserInputSchema = registerInputSchema.extend({
  role: userRoleSchema.default("author"),
});

export const updateUserInputSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
  role: userRoleSchema.optional(),
});

export const createPostInputSchema = z
  .object({
    imageUrl: z.string().url().max(2048).optional(),
    title: z.string().min(3).max(180).optional(),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    excerpt: z.string().trim().min(20).max(320).optional(),
    category: postCategorySchema.default("publishing"),
    status: postStatusSchema.default("draft"),
    readTime: z.string().trim().min(3).max(40).optional(),
    content: z.string().min(10).optional(),
    translations: z.array(postTranslationInputSchema).min(1).optional(),
  })
  .refine(
    (payload) =>
      Boolean(payload.translations?.length) ||
      Boolean(payload.title && payload.slug && payload.content),
    {
      message: "Provide at least one translation or legacy title/slug/content",
    },
  );

export const updatePostInputSchema = z.object({
  imageUrl: z.string().url().max(2048).nullable().optional(),
  title: z.string().min(3).max(180).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  excerpt: z.string().trim().min(20).max(320).optional(),
  category: postCategorySchema.optional(),
  status: postStatusSchema.optional(),
  readTime: z.string().trim().min(3).max(40).optional(),
  content: z.string().min(10).optional(),
  translations: z.array(postTranslationInputSchema).min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(3).max(200),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;
export type LanguageCode = z.infer<typeof languageCodeSchema>;
export type PostCategory = z.infer<typeof postCategorySchema>;
export type PostStatus = z.infer<typeof postStatusSchema>;
export type PostTranslationInput = z.infer<typeof postTranslationInputSchema>;
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
