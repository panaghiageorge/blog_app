import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Clock3,
  Link as LinkIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PostVisual } from "../components/PostVisual";
import { useI18n } from "../i18n/I18nContext";
import {
  getPostBySlugRequest,
  getPostsRequest,
} from "../modules/posts/posts.api";
import type { PostItem } from "../modules/posts/posts.types";

type PostView = {
  id: number;
  title: string;
  slug: string;
  category: PostItem["category"];
  excerpt: string;
  readTime: string;
  imageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  author: string;
  date: string;
  content: string;
};

export const PostPage = () => {
  const { slug } = useParams();
  const { copy, language } = useI18n();
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
        metaTitle: apiPost.metaTitle,
        metaDescription: apiPost.metaDescription,
        keywords: apiPost.keywords,
        author: apiPost.authorName ?? `user#${apiPost.authorId}`,
        date: dateFormatter.format(
          new Date(apiPost.publishedAt ?? apiPost.createdAt),
        ),
        content: apiPost.content,
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
      return apiRelatedPosts
        .filter((postCopy) => postCopy.id !== post.id)
        .slice(0, 3)
        .map((postCopy) => ({
          id: postCopy.id,
          slug: postCopy.slug,
          title: postCopy.title,
        }));
    }

    return [];
  }, [post, relatedQuery.data?.items]);

  const contentBlocks = useMemo(
    () => post?.content.split(/\n\s*\n/).filter(Boolean) ?? [],
    [post?.content],
  );

  useEffect(() => {
    if (post) {
      document.title = post.metaTitle || `${post.title} | ${copy.brand.name}`;
      const updateMeta = (name: string, content: string) => {
        let element = document.head.querySelector<HTMLMetaElement>(
          `meta[name="${name}"]`,
        );
        if (!element) {
          element = document.createElement("meta");
          element.name = name;
          document.head.appendChild(element);
        }
        element.content = content;
      };

      updateMeta("description", post.metaDescription || post.excerpt);
      if (post.keywords) {
        updateMeta("keywords", post.keywords);
      }
    }
  }, [copy.brand.name, post]);

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
            {copy.home.categories[post.category as keyof typeof copy.home.categories] ?? post.category}
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
          </div>
          <div className="post-actions">
            <button className="secondary" type="button">
              <Bookmark size={17} />
              {copy.postPage.saved}
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
        <PostVisual
          category={post.category}
          imageUrl={post.imageUrl}
          size="hero"
        />
      </header>

      <div className="post-body-layout">
        <div className="post-content">
          <p className="post-lede">{post.excerpt}</p>
          {contentBlocks.map((paragraph, index) => (
            <p key={`${post.id}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <aside className="post-aside">
          <section className="author-panel">
            <span className="eyebrow">{copy.postPage.authorTitle}</span>
            <h3>{post.author}</h3>
            <p>{copy.postPage.authorBio}</p>
          </section>

          <section className="popular-panel">
            <span className="eyebrow">{copy.postPage.relatedTitle}</span>
            <div className="popular-list">
              {relatedPosts.map((relatedPost, index) => (
                <Link key={relatedPost.id} to={`/posts/${relatedPost.slug}`}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{relatedPost.title}</span>
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
