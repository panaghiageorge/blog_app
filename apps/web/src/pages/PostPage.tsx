import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Clock3,
  Eye,
  Link as LinkIcon,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PostCarousel } from "../components/PostCarousel";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import {
  getPostBySlugRequest,
  getPostsRequest,
  getSavedPostStatusRequest,
  savePostRequest,
  trackPostViewRequest,
  unsavePostRequest,
} from "../modules/posts/posts.api";
import type { PostItem } from "../modules/posts/posts.types";
import { mediaUrl } from "../shared/media";
import { useDocumentMeta } from "../shared/useDocumentMeta";

type PostView = {
  id: number;
  title: string;
  slug: string;
  category: PostItem["category"];
  excerpt: string;
  readTime: string;
  imageUrl?: string | null;
  galleryImages?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  author: string;
  date: string;
  publishedAt: string;
  viewCount: number;
  lastViewedAt?: string | null;
  content: string;
  tags: string[];
};

export const PostPage = () => {
  const { slug } = useParams();
  const { copy, language } = useI18n();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const postQuery = useQuery({
    queryKey: ["posts", "slug", slug, language],
    queryFn: () => getPostBySlugRequest(slug ?? "", language),
    enabled: Boolean(slug),
    retry: false,
  });
  const relatedQuery = useQuery({
    queryKey: ["posts", "related", language],
    queryFn: () => getPostsRequest(1, 6, "", language),
  });
  const savedStatusQuery = useQuery({
    queryKey: ["posts", "saved-status", postQuery.data?.item?.id],
    queryFn: () => getSavedPostStatusRequest(postQuery.data!.item.id),
    enabled: isAuthenticated && Boolean(postQuery.data?.item?.id),
  });
  const saveMutation = useMutation({
    mutationFn: (shouldSave: boolean) =>
      shouldSave ? savePostRequest(post!.id) : unsavePostRequest(post!.id),
    onSuccess: (data) => {
      queryClient.setQueryData(["posts", "saved-status", post?.id], data);
      queryClient.invalidateQueries({ queryKey: ["posts", "saved"] });
    },
  });
  const viewMutation = useMutation({
    mutationFn: trackPostViewRequest,
    onSuccess: (data) => {
      queryClient.setQueryData<typeof postQuery.data>(
        ["posts", "slug", slug, language],
        (current) =>
          current
            ? {
                item: {
                  ...current.item,
                  viewCount: data.item.viewCount,
                  lastViewedAt: data.item.lastViewedAt,
                },
              }
            : current,
      );
    },
  });

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [language],
  );

  const post = useMemo<PostView | undefined>(() => {
    const apiPost = postQuery.data?.item;

    if (apiPost) {
      return {
        id: apiPost.id,
        title: apiPost.title,
        slug: apiPost.slug,
        category: apiPost.category,
        excerpt: apiPost.excerpt,
        readTime: apiPost.readTime,
        imageUrl: apiPost.imageUrl,
        galleryImages: apiPost.galleryImages ?? [],
        metaTitle: apiPost.metaTitle,
        metaDescription: apiPost.metaDescription,
        keywords: apiPost.keywords,
        author: apiPost.authorName ?? `user#${apiPost.authorId}`,
        date: dateFormatter.format(
          new Date(apiPost.publishedAt ?? apiPost.createdAt),
        ),
        publishedAt: apiPost.publishedAt ?? apiPost.createdAt,
        viewCount: apiPost.viewCount ?? 0,
        lastViewedAt: apiPost.lastViewedAt,
        content: apiPost.content,
        tags: apiPost.tags?.map((tag) => tag.name) ?? [],
      };
    }

    return undefined;
  }, [dateFormatter, postQuery.data?.item]);

  const relatedPosts = useMemo(() => {
    if (!post) {
      return [];
    }

    const apiRelatedPosts = relatedQuery.data?.items;

    if (apiRelatedPosts?.length) {
      const currentTags = new Set(post.tags.map((tag) => tag.toLowerCase()));
      return apiRelatedPosts
        .filter((postCopy) => postCopy.id !== post.id)
        .map((postCopy) => {
          const matchingTags = postCopy.tags?.filter((tag) => currentTags.has(tag.name.toLowerCase())).length ?? 0;
          const categoryScore = postCopy.category === post.category ? 1 : 0;
          return { postCopy, score: matchingTags * 2 + categoryScore };
        })
        .sort((first, second) => second.score - first.score)
        .slice(0, 3)
        .map(({ postCopy }) => ({
          id: postCopy.id,
          slug: postCopy.slug,
          title: postCopy.title,
          category: postCopy.category,
          readTime: postCopy.readTime,
        }));
    }

    return [];
  }, [post, relatedQuery.data?.items]);

  const contentBlocks = useMemo(
    () => post?.content.split(/\n\s*\n/).filter(Boolean) ?? [],
    [post?.content],
  );

  useEffect(() => {
    if (!post?.id) return;

    const storageKey = `post-viewed:${post.id}`;
    const lastTrackedAt = Number(window.sessionStorage.getItem(storageKey) ?? 0);
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - lastTrackedAt < thirtyMinutes) return;

    window.sessionStorage.setItem(storageKey, String(Date.now()));
    viewMutation.mutate(post.id);
  }, [post?.id]);

  useDocumentMeta({
    title: post ? post.metaTitle || `${post.title} | ${copy.brand.name}` : copy.metaTitle,
    description: post ? post.metaDescription || post.excerpt : copy.home.intro,
    keywords: post?.keywords,
    image: post?.imageUrl ? mediaUrl(post.imageUrl) : undefined,
    canonicalPath: post ? `/posts/${post.slug}` : undefined,
    publishedTime: post?.publishedAt,
    author: post?.author,
    tags: post?.tags,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.metaDescription || post.excerpt,
          datePublished: post.publishedAt,
          author: { "@type": "Person", name: post.author },
          keywords: post.tags,
          image: post.imageUrl
            ? new URL(mediaUrl(post.imageUrl), window.location.origin).toString()
            : undefined,
          mainEntityOfPage: new URL("/posts/" + post.slug, window.location.origin).toString(),
        }
      : undefined,
    type: "article",
  });

  if (!post && postQuery.isLoading) {
    return (
      <section className="post-page post-not-found">
        <div className="panel">
          <p className="eyebrow">{copy.postPage.articleLabel}</p>
          <h2>{copy.postPage.loading}</h2>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="post-page post-not-found">
        <Link className="text-link back-link" to="/">
          <ArrowLeft size={17} />
          {copy.postPage.back}
        </Link>
        <div className="panel">
          <p className="eyebrow">{copy.postPage.articleLabel}</p>
          <h2>{copy.postPage.notFoundTitle}</h2>
          <p>{copy.postPage.notFoundBody}</p>
        </div>
      </section>
    );
  }

  const isSaved = Boolean(savedStatusQuery.data?.isSaved);

  const handleSavePost = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    saveMutation.mutate(!isSaved);
  };

  const handleCopyLink = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="post-page">
      <Link className="text-link back-link" to="/#latest">
        <ArrowLeft size={17} />
        {copy.postPage.back}
      </Link>

      <header className="post-hero">
        <div className="post-hero-copy">
          <span className="eyebrow">
            {copy.home.categories[
              post.category as keyof typeof copy.home.categories
            ] ?? post.category}
          </span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="post-meta">
            <span>
              {copy.postPage.by} {post.author}
            </span>
            <span>{post.date}</span>
            <span>
              <Clock3 size={16} />
              {post.readTime}
            </span>
            <span>
              <Eye size={16} />
              {post.viewCount.toLocaleString(language === "ro" ? "ro-RO" : "en-US")} {copy.postPage.views}
            </span>
          </div>
          {post.tags.length > 0 && (
            <div className="post-tag-list" aria-label={copy.postPage.tagsTitle}>
              {post.tags.map((tag) => (
                <span key={tag}>
                  <Tag size={14} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="post-actions">
            <button
              className={isSaved ? "secondary saved-action active" : "secondary saved-action"}
              disabled={saveMutation.isPending}
              onClick={handleSavePost}
              type="button"
            >
              <Bookmark size={17} />
              {isSaved ? copy.postPage.savedActive : copy.postPage.saved}
            </button>
            <button
              className="secondary"
              onClick={handleCopyLink}
              type="button"
            >
              <LinkIcon size={17} />
              {copied ? copy.postPage.share : copy.postPage.copyLink}
            </button>
          </div>
        </div>
        <PostCarousel
          category={post.category}
          images={[post.imageUrl, ...(post.galleryImages ?? [])]}
        />
      </header>

      <div className="post-body-layout">
        <div className="post-content">
          <p className="post-lede">{post.excerpt}</p>
          {contentBlocks.map((block, index) => {
            const imageMatch = block.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
            if (imageMatch) {
              const [, alt, src] = imageMatch;
              return (
                <figure className="post-content-image" key={`${post.id}-${index}`}>
                  <img src={mediaUrl(src)} alt={alt} />
                  {alt && <figcaption>{alt}</figcaption>}
                </figure>
              );
            }

            return <p key={`${post.id}-${index}`}>{block}</p>;
          })}
        </div>

        <aside className="post-aside">
          <section className="author-panel">
            <span className="eyebrow">{copy.postPage.authorTitle}</span>
            <h3>{post.author}</h3>
            <p>{copy.postPage.authorBio}</p>
          </section>

          <section className="popular-panel related-panel">
            <span className="eyebrow">{copy.postPage.relatedTitle}</span>
            <div className="popular-list">
              {relatedPosts.map((relatedPost, index) => (
                <Link key={relatedPost.id} to={`/posts/${relatedPost.slug}`}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{relatedPost.title}</span>
                  <small>{relatedPost.readTime}</small>
                </Link>
              ))}
            </div>
          </section>

          {relatedPosts[0] && (
            <Link className="next-read" to={`/posts/${relatedPosts[0].slug}`}>
              <span>{copy.postPage.continueReading}</span>
              <strong>{relatedPosts[0].title}</strong>
              <ArrowUpRight size={18} />
            </Link>
          )}
        </aside>
      </div>
    </article>
  );
};
