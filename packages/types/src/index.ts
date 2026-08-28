export type ApiHealthResponse = {
  status: "ok";
  timestamp: string;
};

export type UserDto = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "author";
  createdAt: string | Date;
};

export type LanguageDto = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string | Date;
};

export type PostTranslationDto = {
  id: number;
  postId: number;
  languageId: number;
  languageCode: string;
  title: string;
  slug: string;
  excerpt: string;
  readTime: string;
  content: string;
  updatedAt: string | Date;
  createdAt: string | Date;
};

export type PostDto = {
  id: number;
  authorId: number;
  authorName?: string;
  languageCode: string;
  title: string;
  slug: string;
  excerpt: string;
  category: "design" | "publishing" | "essays" | "product";
  status: "draft" | "pending_review" | "published" | "archived";
  readTime: string;
  content: string;
  publishedAt: string | Date | null;
  updatedAt: string | Date;
  createdAt: string | Date;
  translations?: PostTranslationDto[];
};
