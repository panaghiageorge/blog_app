import { z } from "zod";

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const htmlTagPattern = /<[^>]*>/g;

const sanitizePlainText = (value: string) =>
  value
    .normalize("NFC")
    .replace(controlCharacters, "")
    .replace(htmlTagPattern, "")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeLongText = (value: string) =>
  value
    .normalize("NFC")
    .replace(controlCharacters, "")
    .replace(htmlTagPattern, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const sanitizeCodeText = (value: string) =>
  value
    .normalize("NFC")
    .replace(controlCharacters, "")
    .trim()
    .toLowerCase();

const plainText = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
    z.string().min(min).max(max),
  );

const optionalPlainText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
    z.string().max(max).optional(),
  );

const longText = (min: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizeLongText(value) : value),
    z.string().min(min),
  );

const codeText = (min: number, max: number, pattern: RegExp) =>
  z.preprocess(
    (value) => (typeof value === "string" ? sanitizeCodeText(value) : value),
    z.string().min(min).max(max).regex(pattern),
  );

const safeMediaUrlSchema = z.union([
  z.string().url().max(2048),
  z.string().max(2048).regex(/^\/uploads\/images\/[A-Za-z0-9._-]+$/),
]);


export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const sanitized = sanitizePlainText(value);
      return sanitized === "" ? undefined : sanitized;
    },
    z.string().min(1).max(120).optional(),
  ),
});

export const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

export const registerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: plainText(2, 80).pipe(z.string().regex(/^[\p{L}0-9 .'-]+$/u)),
  password: strongPasswordSchema,
});

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export const userRoleSchema = z.enum(["admin", "author"]);
export const postCategorySchema = codeText(2, 40, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const createCategoryInputSchema = z.object({
  code: postCategorySchema,
  name: plainText(2, 80),
  nativeName: plainText(2, 80),
});

export const updateCategoryInputSchema = createCategoryInputSchema.partial();

export const tagCodeSchema = codeText(2, 40, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const createTagInputSchema = z.object({
  code: tagCodeSchema,
  name: plainText(2, 80),
});

export const updateTagInputSchema = createTagInputSchema.partial();
export const postStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "archived",
]);
export const languageCodeSchema = codeText(2, 12, /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/);

export const languageQuerySchema = z.object({
  language: languageCodeSchema.optional(),
});

export const legalPageKeySchema = z.enum(["terms", "gdpr", "marketing"]);

export const legalPageParamSchema = z.object({
  key: legalPageKeySchema,
});

export const upsertLegalPageInputSchema = z.object({
  languageCode: languageCodeSchema,
  title: plainText(3, 160),
  content: longText(50),
});

export const newsletterSubscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  termsAccepted: z.literal(true),
  marketingAccepted: z.boolean().default(false),
  languageCode: languageCodeSchema.default("ro"),
});

const postTranslationInputSchema = z.object({
  languageCode: languageCodeSchema,
  metaTitle: optionalPlainText(180),
  metaDescription: optionalPlainText(320),
  keywords: optionalPlainText(500),
  title: plainText(3, 180),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: plainText(20, 320).optional(),
  readTime: plainText(3, 40).optional(),
  content: longText(10),
});

export const createUserInputSchema = registerInputSchema.extend({
  role: userRoleSchema.default("author"),
});

export const updateUserInputSchema = z.object({
  name: plainText(2, 120).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
  avatarUrl: safeMediaUrlSchema.nullable().optional(),
  role: userRoleSchema.optional(),
});

export const updateAccountInputSchema = z.object({
  name: plainText(2, 120).optional(),
  avatarUrl: safeMediaUrlSchema.nullable().optional(),
});

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: strongPasswordSchema,
});

const postImageUrlSchema = safeMediaUrlSchema;

export const createPostInputSchema = z
  .object({
    imageUrl: postImageUrlSchema.optional(),
    galleryImages: z.array(postImageUrlSchema).max(5).default([]),
    title: plainText(3, 180).optional(),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    excerpt: plainText(20, 320).optional(),
    category: postCategorySchema.default("publishing"),
    tagIds: z.array(z.number().int().positive()).default([]),
    status: postStatusSchema.default("draft"),
    readTime: plainText(3, 40).optional(),
    content: longText(10).optional(),
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
  imageUrl: postImageUrlSchema.nullable().optional(),
  galleryImages: z.array(postImageUrlSchema).max(5).optional(),
  title: plainText(3, 180).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  excerpt: plainText(20, 320).optional(),
  category: postCategorySchema.optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  status: postStatusSchema.optional(),
  readTime: plainText(3, 40).optional(),
  content: longText(10).optional(),
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
export type LegalPageKey = z.infer<typeof legalPageKeySchema>;
export type PostCategory = z.infer<typeof postCategorySchema>;
export type PostStatus = z.infer<typeof postStatusSchema>;
export type PostTranslationInput = z.infer<typeof postTranslationInputSchema>;
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
