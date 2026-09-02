import { useQuery } from "@tanstack/react-query";
import { Bookmark, Clock3, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PostVisual } from "../components/PostVisual";
import { useI18n } from "../i18n/I18nContext";
import { getSavedPostsRequest } from "../modules/posts/posts.api";

export const SavedPostsPage = () => {
  const { copy, language } = useI18n();
  const [search, setSearch] = useState("");
  const savedQuery = useQuery({
    queryKey: ["posts", "saved", search, language],
    queryFn: () => getSavedPostsRequest(1, 100, search, language),
  });
  const posts = savedQuery.data?.items ?? [];
  const hasSearch = search.trim().length > 0;

  const totalReadTime = useMemo(
    () => posts.reduce((total, post) => total + (Number.parseInt(post.readTime, 10) || 0), 0),
    [posts],
  );

  return (
    <section className="saved-page">
      <div className="saved-hero">
        <div>
          <p className="eyebrow">{copy.savedPosts.eyebrow}</p>
          <h1>{copy.savedPosts.title}</h1>
          <p>{copy.savedPosts.intro}</p>
        </div>
        <div className="saved-metrics">
          <span><strong>{posts.length}</strong>{copy.savedPosts.postsCount}</span>
          <span><strong>{totalReadTime}</strong>{copy.savedPosts.minutesCount}</span>
        </div>
      </div>

      <div className="saved-toolbar">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.savedPosts.search}
        />
      </div>

      {savedQuery.isLoading ? (
        <EmptyState message={copy.savedPosts.loading} />
      ) : posts.length === 0 ? (
        <EmptyState
          message={hasSearch ? copy.savedPosts.noSearchResults : copy.savedPosts.empty}
          action={hasSearch ? <button className="secondary" type="button" onClick={() => setSearch("")}>{copy.home.resetFilters}</button> : <Link className="secondary" to="/">{copy.savedPosts.explore}</Link>}
        />
      ) : (
        <div className="article-grid saved-grid">
          {posts.map((post) => (
            <article className="article-card" key={post.id}>
              <Link className="article-image" to={`/posts/${post.slug}`}>
                <PostVisual category={post.category} imageUrl={post.imageUrl} />
              </Link>
              <div className="article-card-copy">
                <span className="article-category">
                  <Bookmark size={14} />
                  {copy.savedPosts.savedLabel}
                </span>
                <h3><Link to={`/posts/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.excerpt}</p>
                <div className="article-meta">
                  <span>{post.authorName ?? `user#${post.authorId}`}</span>
                  <span><Clock3 size={15} />{post.readTime}</span>
                  <span><Eye size={15} />{(post.viewCount ?? 0).toLocaleString(language === "ro" ? "ro-RO" : "en-US")} {copy.postPage.views}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
