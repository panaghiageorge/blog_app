import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "author"]);
export const postStatus = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  role: userRole("role").notNull().default("author"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  nativeName: varchar("native_name", { length: 80 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  nativeName: varchar("native_name", { length: 80 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  imageUrl: text("image_url"),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  title: varchar("title", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  excerpt: varchar("excerpt", { length: 320 }).notNull().default(""),
  category: varchar("category", { length: 40 })
    .notNull()
    .default("publishing"),
  status: postStatus("status").notNull().default("draft"),
  readTime: varchar("read_time", { length: 40 }).notNull().default("5 min"),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const postTranslations = pgTable(
  "post_translations",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id),
    metaTitle: varchar("meta_title", { length: 180 }),
    metaDescription: varchar("meta_description", { length: 320 }),
    keywords: varchar("keywords", { length: 500 }),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 320 }).notNull().default(""),
    readTime: varchar("read_time", { length: 40 }).notNull().default("5 min"),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("post_translations_post_language_unique").on(
      table.postId,
      table.languageId,
    ),
    uniqueIndex("post_translations_language_slug_unique").on(
      table.languageId,
      table.slug,
    ),
  ],
);

export const postsRelations = relations(posts, ({ many, one }) => ({
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  translations: many(postTranslations),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  postTranslations: many(postTranslations),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export const postTranslationsRelations = relations(
  postTranslations,
  ({ one }) => ({
    post: one(posts, {
      fields: [postTranslations.postId],
      references: [posts.id],
    }),
    language: one(languages, {
      fields: [postTranslations.languageId],
      references: [languages.id],
    }),
  }),
);
