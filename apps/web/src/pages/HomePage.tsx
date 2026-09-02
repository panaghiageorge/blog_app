import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Clock3, Eye, RotateCcw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeNewsletterRequest } from "../modules/legal.api";
import { AppModal } from "../components/AppModal";
import { DesignMultiSelect } from "../components/DesignMultiSelect";
import { DesignSelect } from "../components/DesignSelect";
import { EmptyState } from "../components/EmptyState";
import { PostVisual } from "../components/PostVisual";
import { useI18n } from "../i18n/I18nContext";
import type { CategoryId } from "../i18n/translations";
import { PostsPagination } from "../modules/posts/PostsPagination";
import {
  getCategoriesRequest,
  getPostsRequest,
} from "../modules/posts/posts.api";
import type { PostItem } from "../modules/posts/posts.types";
import { useDocumentMeta } from "../shared/useDocumentMeta";

type HomePost = {
  id: number;
  title: string;
  slug: string;
  category: Exclude<CategoryId, "all">;
  excerpt: string;
  author: string;
  date: string;
  publishedAtMs: number;
  readTime: string;
  readMinutes: number;
  viewCount: number;
  image: string;
  tags: string[];
};

type SortMode = "published-desc" | "published-asc" | "title-asc" | "title-desc";
type DatePreset = "all" | "month" | "quarter" | "year" | "custom";
type ReadTimeFilter = "all" | "short" | "medium" | "long";

const homePageSize = 6;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const startOfDay = (value: string) => new Date(value + "T00:00:00").getTime();
const endOfDay = (value: string) => new Date(value + "T23:59:59.999").getTime();
const daysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;
const parseReadMinutes = (value: string) => Number.parseInt(value, 10) || 0;

export const HomePage = () => {
  const { copy, language } = useI18n();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeAuthor, setActiveAuthor] = useState("all");
  const [readTimeFilter, setReadTimeFilter] = useState<ReadTimeFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("published-desc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterTerms, setNewsletterTerms] = useState(false);
  const [newsletterMarketing, setNewsletterMarketing] = useState(true);

  useDocumentMeta({
    title: copy.metaTitle,
    description: copy.home.intro,
    canonicalPath: "/",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const newsletterMutation = useMutation({
    mutationFn: subscribeNewsletterRequest,
    onSuccess: () => {
      setNewsletterEmail("");
      setNewsletterTerms(false);
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoriesRequest,
  });
  const categoryItems = categoriesQuery.data?.items ?? [];
  const categoryOptions: CategoryId[] = [
    "all",
    ...categoryItems.map((category) => category.code),
  ];
  const categoryLabel = useCallback(
    (category: string) =>
      copy.home.categories[category as keyof typeof copy.home.categories] ??
      categoryItems.find((item) => item.code === category)?.nativeName ??
      category,
    [categoryItems, copy.home.categories],
  );

  const postsQuery = useQuery({
    queryKey: ["posts", "home", language],
    queryFn: () => getPostsRequest(1, 100, "", language),
    staleTime: 30_000,
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

    return apiPosts.map((post: PostItem) => {
      const publishedDate = new Date(post.publishedAt ?? post.createdAt);
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        excerpt: post.excerpt,
        image: post.imageUrl ?? "",
        author: post.authorName ?? `user#${post.authorId}`,
        date: dateFormatter.format(publishedDate),
        publishedAtMs: publishedDate.getTime(),
        readTime: post.readTime,
        readMinutes: parseReadMinutes(post.readTime),
        viewCount: post.viewCount ?? 0,
        tags: post.tags?.map((tag) => tag.name) ?? [],
      };
    });
  }, [dateFormatter, postsQuery.data?.items]);

  const tagOptions = useMemo(() => {
    const tags = new Map<string, string>();
    posts.flatMap((post) => post.tags).forEach((tag) => {
      tags.set(normalizeSearchText(tag), tag);
    });
    return Array.from(tags.values()).sort((first, second) =>
      normalizeSearchText(first).localeCompare(normalizeSearchText(second)),
    );
  }, [posts]);

  const authorOptions = useMemo(
    () => Array.from(new Set(posts.map((post) => post.author))).sort(),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(debouncedQuery);
    const fromTime =
      datePreset === "month"
        ? daysAgo(30)
        : datePreset === "quarter"
          ? daysAgo(90)
          : datePreset === "year"
            ? new Date(new Date().getFullYear(), 0, 1).getTime()
            : dateFrom
              ? startOfDay(dateFrom)
              : Number.NEGATIVE_INFINITY;
    const toTime = datePreset === "custom" && dateTo ? endOfDay(dateTo) : Number.POSITIVE_INFINITY;

    return posts
      .filter((post) => {
        const matchesCategory =
          activeCategory === "all" || post.category === activeCategory;
        const matchesTag =
          activeTags.length === 0 ||
          activeTags.every((selectedTag) =>
            post.tags.some(
              (tag) => normalizeSearchText(tag) === normalizeSearchText(selectedTag),
            ),
          );
        const matchesAuthor = activeAuthor === "all" || post.author === activeAuthor;
        const matchesReadTime =
          readTimeFilter === "all" ||
          (readTimeFilter === "short" && post.readMinutes < 5) ||
          (readTimeFilter === "medium" && post.readMinutes >= 5 && post.readMinutes <= 10) ||
          (readTimeFilter === "long" && post.readMinutes > 10);
        const matchesQuery =
          normalizedQuery.length === 0 ||
          normalizeSearchText(
            `${post.title} ${post.excerpt} ${post.author} ${post.tags.join(" ")} ${categoryLabel(post.category)}`,
          ).includes(normalizedQuery);
        const matchesDate =
          post.publishedAtMs >= fromTime && post.publishedAtMs <= toTime;

        return (
          matchesCategory &&
          matchesTag &&
          matchesAuthor &&
          matchesReadTime &&
          matchesQuery &&
          matchesDate
        );
      })
      .sort((first, second) => {
        if (sortMode === "title-asc") {
          return normalizeSearchText(first.title).localeCompare(
            normalizeSearchText(second.title),
          );
        }
        if (sortMode === "title-desc") {
          return normalizeSearchText(second.title).localeCompare(
            normalizeSearchText(first.title),
          );
        }
        if (sortMode === "published-asc") {
          return first.publishedAtMs - second.publishedAtMs;
        }
        return second.publishedAtMs - first.publishedAtMs;
      });
  }, [
    activeAuthor,
    activeCategory,
    activeTags,
    categoryLabel,
    dateFrom,
    datePreset,
    dateTo,
    debouncedQuery,
    posts,
    readTimeFilter,
    sortMode,
  ]);

  if (postsQuery.isLoading && !postsQuery.data) {
    return <EmptyState message={`${copy.home.latest}...`} />;
  }

  const isFilteredView =
    debouncedQuery.length > 0 ||
    activeCategory !== "all" ||
    activeTags.length > 0 ||
    activeAuthor !== "all" ||
    readTimeFilter !== "all" ||
    datePreset !== "all" ||
    dateFrom.length > 0 ||
    dateTo.length > 0 ||
    sortMode !== "published-desc";
  const featuredPost = posts[0];

  if (!featuredPost && postsQuery.error instanceof Error) {
    return <EmptyState message={copy.home.offlineFallback} />;
  }

  if (!featuredPost) {
    return <EmptyState message={copy.home.noResults} />;
  }

  const latestPosts = isFilteredView
    ? filteredPosts
    : filteredPosts.filter((post) => post.id !== featuredPost.id);
  const totalPages = Math.max(1, Math.ceil(latestPosts.length / homePageSize));
  const paginatedPosts = latestPosts.slice(
    (page - 1) * homePageSize,
    page * homePageSize,
  );
  const popularPosts = posts.slice(1, 4);

  const activeFilterCount = [
    debouncedQuery.length > 0,
    activeCategory !== "all",
    activeTags.length > 0,
    activeAuthor !== "all",
    readTimeFilter !== "all",
    datePreset !== "all",
    dateFrom.length > 0,
    dateTo.length > 0,
    sortMode !== "published-desc",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setActiveCategory("all");
    setActiveTags([]);
    setActiveAuthor("all");
    setReadTimeFilter("all");
    setQuery("");
    setDebouncedQuery("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setSortMode("published-desc");
    setPage(1);
  };

  const categorySelectOptions = categoryOptions.map((category) => ({
    label: category === "all" ? copy.home.categories.all : categoryLabel(category),
    value: category,
  }));
  const authorSelectOptions = [
    { label: copy.home.filterAllAuthors, value: "all" },
    ...authorOptions.map((author) => ({ label: author, value: author })),
  ];
  const tagSelectOptions = tagOptions.map((tag) => ({ label: tag, value: tag }));
  const readTimeOptions: { label: string; value: ReadTimeFilter }[] = [
    { label: copy.home.readTimeAll, value: "all" },
    { label: copy.home.readTimeShort, value: "short" },
    { label: copy.home.readTimeMedium, value: "medium" },
    { label: copy.home.readTimeLong, value: "long" },
  ];
  const datePresetOptions: { label: string; value: DatePreset }[] = [
    { label: copy.home.dateAll, value: "all" },
    { label: copy.home.dateLastMonth, value: "month" },
    { label: copy.home.dateLastQuarter, value: "quarter" },
    { label: copy.home.dateThisYear, value: "year" },
    { label: copy.home.dateCustom, value: "custom" },
  ];
  const sortOptions: { label: string; value: SortMode }[] = [
    { label: copy.home.sortPublishedDesc, value: "published-desc" },
    { label: copy.home.sortPublishedAsc, value: "published-asc" },
    { label: copy.home.sortTitleAsc, value: "title-asc" },
    { label: copy.home.sortTitleDesc, value: "title-desc" },
  ];

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
          <Link className="featured-story-link" to={`/posts/${featuredPost.slug}`}>
            <PostVisual category={featuredPost.category} imageUrl={featuredPost.image} />
          </Link>
          <div className="featured-story-copy">
            <span>{categoryLabel(featuredPost.category)}</span>
            <h3>{featuredPost.title}</h3>
            <p>{featuredPost.excerpt}</p>
            <small>
              {featuredPost.author} / {featuredPost.date} / {" "}
              {featuredPost.readTime} / {featuredPost.viewCount.toLocaleString(language === "ro" ? "ro-RO" : "en-US")} {copy.postPage.views}
            </small>
          </div>
        </article>
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.home.searchPlaceholder}
                value={query}
              />
            </label>
          </div>

          <div className="filter-toolbar">
            <button
              className="filter-open-button"
              type="button"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={17} />
              {copy.home.openFilters}
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button className="filter-reset-inline" type="button" onClick={resetFilters}>
                <RotateCcw size={15} />
                {copy.home.resetFilters}
              </button>
            )}
          </div>

          <AppModal
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            title={copy.home.filtersTitle}
            description={copy.home.filtersDescription}
            footer={
              <>
                <button className="secondary" type="button" onClick={resetFilters} disabled={!isFilteredView}>
                  <RotateCcw size={16} />
                  {copy.home.resetFilters}
                </button>
                <button type="button" onClick={() => setFiltersOpen(false)}>
                  {copy.home.applyFilters}
                </button>
              </>
            }
          >
            <div className="filter-modal-content" aria-label={copy.home.filtersLabel}>
              <section className="filter-group">
                <div className="filter-group-heading">
                  <span>{copy.home.filterCategory}</span>
                </div>
                <DesignSelect
                  label={copy.home.filterCategory}
                  value={activeCategory}
                  options={categorySelectOptions}
                  onValueChange={(value) => {
                    setActiveCategory(value as CategoryId);
                    setPage(1);
                  }}
                />
              </section>

              <section className="filter-group">
                <div className="filter-group-heading">
                  <span>{copy.home.filterAuthor}</span>
                </div>
                <DesignSelect
                  label={copy.home.filterAuthor}
                  value={activeAuthor}
                  options={authorSelectOptions}
                  onValueChange={(value) => {
                    setActiveAuthor(value);
                    setPage(1);
                  }}
                />
              </section>

              <section className="filter-group filter-group-wide filter-group-featured">
                <div className="filter-group-heading">
                  <span>{copy.home.filterTag}</span>
                </div>
                <DesignMultiSelect
                  clearLabel={copy.home.clearTags}
                  emptyLabel={copy.home.filterAllTags}
                  label={copy.home.filterTag}
                  options={tagSelectOptions}
                  values={activeTags}
                  selectedLabel={(count) => `${count} ${copy.home.selectedTags}`}
                  onChange={(values) => {
                    setActiveTags(values);
                    setPage(1);
                  }}
                />
              </section>

              <section className="filter-group">
                <div className="filter-group-heading">
                  <span>{copy.home.filterReadTime}</span>
                </div>
                <DesignSelect
                  label={copy.home.filterReadTime}
                  value={readTimeFilter}
                  options={readTimeOptions}
                  onValueChange={(value) => {
                    setReadTimeFilter(value);
                    setPage(1);
                  }}
                />
              </section>

              <section className="filter-group">
                <div className="filter-group-heading">
                  <span>{copy.home.datePreset}</span>
                </div>
                <DesignSelect
                  label={copy.home.datePreset}
                  value={datePreset}
                  options={datePresetOptions}
                  onValueChange={(value) => {
                    setDatePreset(value);
                    if (value !== "custom") {
                      setDateFrom("");
                      setDateTo("");
                    }
                    setPage(1);
                  }}
                />
              </section>

              <section className="filter-group filter-group-wide date-range-group">
                <div className="date-range-fields">
                  <label>
                    <span>{copy.home.filterFrom}</span>
                    <input
                      disabled={datePreset !== "custom"}
                      type="date"
                      value={dateFrom}
                      onChange={(event) => {
                        setDateFrom(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label>
                    <span>{copy.home.filterTo}</span>
                    <input
                      disabled={datePreset !== "custom"}
                      type="date"
                      value={dateTo}
                      onChange={(event) => {
                        setDateTo(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                </div>
              </section>

              <section className="filter-group filter-group-wide">
                <div className="filter-group-heading">
                  <span>{copy.home.sortBy}</span>
                </div>
                <DesignSelect
                  label={copy.home.sortBy}
                  value={sortMode}
                  options={sortOptions}
                  onValueChange={(value) => {
                    setSortMode(value);
                    setPage(1);
                  }}
                />
              </section>
            </div>
          </AppModal>

          {postsQuery.error instanceof Error && (
            <EmptyState message={copy.home.offlineFallback} />
          )}

          <div className="article-grid">
            {paginatedPosts.map((post) => (
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
                    <span>
                      <Eye size={15} />
                      {post.viewCount.toLocaleString(language === "ro" ? "ro-RO" : "en-US")} {copy.postPage.views}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            {paginatedPosts.length === 0 && (
              <EmptyState
                message={copy.home.noResults}
                action={
                  isFilteredView ? (
                    <button className="secondary" type="button" onClick={resetFilters}>
                      <RotateCcw size={15} />
                      {copy.home.resetFilters}
                    </button>
                  ) : null
                }
              />
            )}
          </div>
          {totalPages > 1 && (
            <PostsPagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          )}
        </div>

        <aside className="home-sidebar">
          <section className="newsletter-panel">
            <BookOpen size={24} />
            <h3>{copy.home.newsletterTitle}</h3>
            <p>{copy.home.newsletterBody}</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!newsletterTerms) return;
                newsletterMutation.mutate({
                  email: newsletterEmail,
                  termsAccepted: true,
                  marketingAccepted: newsletterMarketing,
                  languageCode: language,
                });
              }}
            >
              <input
                placeholder={copy.home.emailPlaceholder}
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                required
              />
              <label className="newsletter-consent">
                <input
                  type="checkbox"
                  checked={newsletterTerms}
                  onChange={(event) => setNewsletterTerms(event.target.checked)}
                  required
                />
                <span>
                  {copy.newsletter.acceptTerms} <Link to="/legal/terms">{copy.legal.terms}</Link> {copy.newsletter.and} <Link to="/legal/gdpr">{copy.legal.gdpr}</Link>
                </span>
              </label>
              <label className="newsletter-consent">
                <input
                  type="checkbox"
                  checked={newsletterMarketing}
                  onChange={(event) => setNewsletterMarketing(event.target.checked)}
                />
                <span>
                  {copy.newsletter.acceptMarketing} <Link to="/legal/marketing">{copy.legal.marketing}</Link>
                </span>
              </label>
              <button type="submit" disabled={newsletterMutation.isPending || !newsletterTerms}>
                {newsletterMutation.isPending ? copy.newsletter.pending : copy.home.subscribe}
              </button>
              {newsletterMutation.isSuccess && <p className="form-note">{copy.newsletter.success}</p>}
              {newsletterMutation.isError && <p className="error">{copy.newsletter.error}</p>}
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
