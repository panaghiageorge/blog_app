export const paginationQuery = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    search: { type: "string", minLength: 0, maxLength: 120 },
  },
  additionalProperties: false,
};

export const languageQuery = {
  type: "object",
  properties: {
    language: { type: "string", minLength: 2, maxLength: 12 },
  },
  additionalProperties: false,
};

export const postsQuery = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 7 },
    search: { type: "string", minLength: 0, maxLength: 120 },
    language: { type: "string", minLength: 2, maxLength: 12 },
  },
  additionalProperties: false,
};

export const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1 } },
};

export const slugParams = {
  type: "object",
  required: ["slug"],
  properties: {
    slug: {
      type: "string",
      minLength: 3,
      maxLength: 200,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    },
  },
};

export const registerBody = {
  type: "object",
  required: ["email", "name", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    name: { type: "string", minLength: 2, maxLength: 120 },
    password: {
      type: "string",
      minLength: 8,
      maxLength: 128,
      format: "password",
    },
  },
};

export const loginBody = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    password: {
      type: "string",
      minLength: 8,
      maxLength: 128,
      format: "password",
    },
  },
};

export const createUserBody = {
  ...registerBody,
  properties: {
    ...registerBody.properties,
    role: { type: "string", enum: ["admin", "author"], default: "author" },
  },
};

export const updateUserBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    name: { type: "string", minLength: 2, maxLength: 120 },
    role: { type: "string", enum: ["admin", "author"] },
  },
};

const translationBody = {
  type: "object",
  required: ["languageCode", "title", "slug", "content"],
  additionalProperties: false,
  properties: {
    languageCode: {
      type: "string",
      minLength: 2,
      maxLength: 12,
      default: "ro",
    },
    metaTitle: { type: "string", maxLength: 180 },
    metaDescription: { type: "string", maxLength: 320 },
    keywords: { type: "string", maxLength: 500 },
    title: {
      type: "string",
      minLength: 3,
      maxLength: 180,
      default: "O postare de test",
    },
    slug: {
      type: "string",
      minLength: 3,
      maxLength: 200,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      default: "o-postare-de-test",
    },
    excerpt: {
      type: "string",
      minLength: 20,
      maxLength: 320,
      default: "Un exemplu valid de descriere a postării.",
    },
    readTime: { type: "string", minLength: 3, maxLength: 40, default: "3 min" },
    content: {
      type: "string",
      minLength: 10,
      default: "Acesta este conținutul unei postări de test.",
    },
  },
};

const postProperties = {
  imageUrl: { type: "string", format: "uri", maxLength: 2048 },
  title: {
    type: "string",
    minLength: 3,
    maxLength: 180,
    default: "O postare de test",
  },
  slug: {
    type: "string",
    minLength: 3,
    maxLength: 200,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    default: "o-postare-de-test",
  },
  excerpt: {
    type: "string",
    minLength: 20,
    maxLength: 320,
    default: "Un exemplu valid de descriere a postării.",
  },
  category: {
    type: "string",
    enum: ["design", "publishing", "essays", "product"],
    default: "publishing",
  },
  status: {
    type: "string",
    enum: ["draft", "pending_review", "published", "archived"],
    default: "draft",
  },
  readTime: { type: "string", minLength: 3, maxLength: 40, default: "3 min" },
  content: {
    type: "string",
    minLength: 10,
    default: "Acesta este conținutul unei postări de test.",
  },
  translations: {
    type: "array",
    minItems: 1,
    items: translationBody,
    default: [
      {
        languageCode: "ro",
        title: "O postare de test",
        slug: "o-postare-de-test",
        excerpt: "Un exemplu valid de descriere a postării.",
        readTime: "3 min",
        content: "Acesta este conținutul unei postări de test.",
      },
    ],
  },
};

export const createPostBody = {
  type: "object",
  additionalProperties: false,
  properties: postProperties,
};

export const updatePostBody = createPostBody;

export const bearerSecurity = [{ bearerAuth: [] }];
