import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PostVisual } from "../components/PostVisual";
import { useI18n } from "../i18n/I18nContext";
import { getManagePostsRequest } from "../modules/posts/posts.api";
import type {
  PostItem,
  PostTranslationItem,
} from "../modules/posts/posts.types";

const pickTranslation = (post: PostItem, language: string) => {
  const translation = post.translations?.find(
    (item: PostTranslationItem) => item.languageCode === language,
  );

  return {
    title: translation?.title ?? post.title,
    slug: translation?.slug ?? post.slug,
    excerpt: translation?.excerpt ?? post.excerpt,
    readTime: translation?.readTime ?? post.readTime,
    content: translation?.content ?? post.content,
    metaTitle: translation?.metaTitle ?? post.metaTitle,
    metaDescription: translation?.metaDescription ?? post.metaDescription,
    keywords: translation?.keywords ?? post.keywords,
  };
};

export const AdminPostPreviewPage = () => {
  const { id } = useParams();
  const { copy, language } = useI18n();
  const location = useLocation();
  const isAuthorPreview = location.pathname.startsWith("/author/");
  const backPath = isAuthorPreview ? "/author/posts" : "/admin/posts";
  const backLabel = isAuthorPreview
    ? copy.authorStudio.backToPosts
    : copy.adminPosts.backToApproval;
  const previewNotice = isAuthorPreview
    ? copy.authorStudio.previewNotice
    : copy.adminPosts.previewNotice;
  const postId = Number(id);
  const postsQuery = useQuery({
    queryKey: ["posts", "admin-preview", language],
    queryFn: () => getManagePostsRequest(1, 100, ""),
  });

  const post = postsQuery.data?.items.find((item) => item.id === postId);
  const translatedPost = post ? pickTranslation(post, language) : undefined;
  const contentBlocks = useMemo(
    () => translatedPost?.content.split(/\n\s*\n/).filter(Boolean) ?? [],
    [translatedPost?.content],
  );

  if (postsQuery.isLoading) {
    return <p className="empty-state">{copy.postPage.loading}</p>;
  }

  if (!post || !translatedPost) {
    return (
      <section className="post-page post-not-found">
        <Link className="text-link back-link" to={backPath}>
          <ArrowLeft size={17} />
          {backLabel}
        </Link>
        <div className="panel">
          <p className="eyebrow">{copy.adminPosts.preview}</p>
          <h2>{copy.postPage.notFoundTitle}</h2>
        </div>
      </section>
    );
  }

  return (
    <article className="post-page">
      <Link className="text-link back-link" to={backPath}>
        <ArrowLeft size={17} />
        {backLabel}
      </Link>

      <div className="preview-banner">
        <span className={`status-pill status-${post.status}`}>
          {copy.postForm.statusOptions[post.status]}
        </span>
        <span>{previewNotice}</span>
      </div>

      <header className="post-hero">
        <div className="post-hero-copy">
          <span className="eyebrow">
            {copy.home.categories[
              post.category as keyof typeof copy.home.categories
            ] ?? post.category}
          </span>
          <h1>{translatedPost.title}</h1>
          <p>{translatedPost.excerpt}</p>
          <div className="post-meta">
            <span>
              {copy.postPage.by} {post.authorName ?? `user#${post.authorId}`}
            </span>
            <span>
              <Clock3 size={16} />
              {translatedPost.readTime}
            </span>
          </div>
        </div>
        <PostVisual
          category={post.category}
          imageUrl={post.imageUrl}
          size="hero"
        />
      </header>

      <div className="post-body-layout">
        <div className="post-content">
          <p className="post-lede">{translatedPost.excerpt}</p>
          {contentBlocks.map((paragraph, index) => (
            <p key={`${post.id}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <aside className="post-aside">
          <section className="author-panel">
            <span className="eyebrow">{copy.postPage.authorTitle}</span>
            <h3>{post.authorName ?? `user#${post.authorId}`}</h3>
            <p>{copy.postPage.authorBio}</p>
          </section>
        </aside>
      </div>
    </article>
  );
};
