export type LanguageItem = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
};

export type CategoryItem = {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  createdAt: string;
};

export type PostTranslationItem = {
  id?: number;
  postId?: number;
  languageId?: number;
  languageCode: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  title: string;
  slug: string;
  excerpt: string;
  readTime?: string;
  content: string;
  updatedAt?: string;
  createdAt?: string;
};

export type PostItem = {
  id: number;
  authorId: number;
  authorName?: string;
  imageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  languageCode: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  status: "draft" | "pending_review" | "published" | "archived";
  readTime: string;
  content: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  translations?: PostTranslationItem[];
};

export type PostPayload = {
  imageUrl?: string | null;
  category?: PostItem["category"];
  status?: PostItem["status"];
  translations: PostTranslationItem[];
};

export type PostsResponse = {
  items: PostItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type LanguagesResponse = {
  items: LanguageItem[];
};
