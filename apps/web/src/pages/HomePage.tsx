import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Clock3, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PostVisual } from "../components/PostVisual";
import { useI18n } from "../i18n/I18nContext";
import type { CategoryId } from "../i18n/translations";
import { PostsPagination } from "../modules/posts/PostsPagination";
import {
  getCategoriesRequest,
  getPostsRequest,
} from "../modules/posts/posts.api";
import type { PostItem } from "../modules/posts/posts.types";

type HomePost = {
  id: number;
  title: string;
  slug: string;
  category: Exclude<CategoryId, "all">;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
};

export const HomePage = () => {
  const { copy, language } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoriesRequest,
  });
  const categoryItems = categoriesQuery.data?.items ?? [];
  const categoryOptions: CategoryId[] = [
    "all",
    ...categoryItems.map((category) => category.code),
  ];
  const categoryLabel = (category: string) =>
    copy.home.categories[category as keyof typeof copy.home.categories] ??
    categoryItems.find((item) => item.code === category)?.nativeName ??
    category;

  const postsQuery = useQuery({
    queryKey: ["posts", "home", language, page, query],
    queryFn: () => getPostsRequest(page, 7, query, language),
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

  const posts = useMemo<HomePost[]>(() => {
    const apiPosts = postsQuery.data?.items ?? [];

    return apiPosts.map((post: PostItem) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          category: post.category,
          excerpt: post.excerpt,
          image: post.imageUrl ?? "",
          author: post.authorName ?? `user#${post.authorId}`,
          date: dateFormatter.format(
            new Date(post.publishedAt ?? post.createdAt),
          ),
          readTime: post.readTime,
        }));
  }, [dateFormatter, postsQuery.data?.items]);

  if (postsQuery.isLoading) {
    return <p className="empty-state">{copy.home.latest}...</p>;
  }

  const featuredPost = posts[0];

  if (!featuredPost) {
    return <p className="empty-state">{copy.home.offlineFallback}</p>;
  }

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === "all" || post.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${post.title} ${post.excerpt} ${categoryLabel(post.category)}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, categoryItems, copy.home.categories, posts, query]);

  const latestPosts = filteredPosts.filter(
    (post) => post.id !== featuredPost.id,
  );
  const popularPosts = posts.slice(1, 4);
  const totalPages = postsQuery.data?.pagination.totalPages ?? 1;

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="kicker">
            <Sparkles size={16} />
            {copy.home.kicker}
          </span>
          <h2>
            {copy.home.headline.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p>{copy.home.intro}</p>
          <div className="hero-actions">
            <Link className="primary-link" to={`/posts/${featuredPost.slug}`}>
              {copy.home.leadAction}
              <ArrowUpRight size={18} />
            </Link>
            <a className="text-link" href="#latest">
              {copy.home.browseAction}
            </a>
          </div>
        </div>

        <article className="featured-story" id={featuredPost.slug}>
          <Link
            className="featured-story-link"
            to={`/posts/${featuredPost.slug}`}
          >
            <PostVisual
              category={featuredPost.category}
              imageUrl={featuredPost.image}
            />
          </Link>
          <div className="featured-story-copy">
            <span>{categoryLabel(featuredPost.category)}</span>
            <h3>{featuredPost.title}</h3>
            <p>{featuredPost.excerpt}</p>
            <small>
              {featuredPost.author} / {featuredPost.date} /{" "}
              {featuredPost.readTime}
            </small>
          </div>
        </article>
      </section>

      <section className="topic-strip" aria-label={copy.home.categoryLabel}>
        {categoryOptions.map((category) => (
          <button
            className={activeCategory === category ? "topic active" : "topic"}
            key={category}
            onClick={() => {
              setActiveCategory(category);
              setPage(1);
            }}
            type="button"
          >
            {category === "all"
              ? copy.home.categories.all
              : categoryLabel(category)}
          </button>
        ))}
      </section>

      <section className="content-layout" id="latest">
        <div className="article-column">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">{copy.home.latest}</span>
              <h2>{copy.home.allPosts}</h2>
            </div>
            <label className="search-box">
              <Search size={18} />
              <input
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={copy.home.searchPlaceholder}
                value={query}
              />
            </label>
          </div>
          {postsQuery.error instanceof Error && (
            <p className="empty-state">{copy.home.offlineFallback}</p>
          )}

          <div className="article-grid">
            {latestPosts.map((post) => (
              <article className="article-card" key={post.id}>
                <Link className="article-image" to={`/posts/${post.slug}`}>
                  <PostVisual category={post.category} imageUrl={post.image} />
                </Link>
                <div className="article-card-copy">
                  <span className="article-category">
                    {categoryLabel(post.category)}
                  </span>
                  <h3>
                    <Link to={`/posts/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p>{post.excerpt}</p>
                  <div className="article-meta">
                    <span>{post.author}</span>
                    <span>
                      <Clock3 size={15} />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            {latestPosts.length === 0 && (
              <p className="empty-state">{copy.home.noResults}</p>
            )}
          </div>
          {totalPages > 1 && (
            <PostsPagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            />
          )}
        </div>

        <aside className="home-sidebar">
          <section className="newsletter-panel">
            <BookOpen size={24} />
            <h3>{copy.home.newsletterTitle}</h3>
            <p>{copy.home.newsletterBody}</p>
            <form>
              <input placeholder={copy.home.emailPlaceholder} type="email" />
              <button type="button">{copy.home.subscribe}</button>
            </form>
          </section>

          <section className="popular-panel">
            <span className="eyebrow">{copy.home.popular}</span>
            <div className="popular-list">
              {popularPosts.map((post, index) => (
                <Link to={`/posts/${post.slug}`} key={post.id}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{post.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};
