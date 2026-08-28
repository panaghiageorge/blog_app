import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import { PostList } from "../modules/posts/PostList";
import {
  createPostRequest,
  getManagePostsRequest,
} from "../modules/posts/posts.api";
import type { PostItem, PostPayload } from "../modules/posts/posts.types";

export const AdminPostsPage = () => {
  const { copy } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PostItem["status"] | "all">("all");

  const postsQuery = useQuery({
    queryKey: ["posts", "admin", search],
    queryFn: () => getManagePostsRequest(1, 100, search),
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: PostPayload) => createPostRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const createError =
    createPostMutation.error instanceof Error
      ? createPostMutation.error.message
      : "";
  const posts = postsQuery.data?.items ?? [];
  const filteredPosts = useMemo(
    () =>
      status === "all" ? posts : posts.filter((post) => post.status === status),
    [posts, status],
  );
  const metrics = [
    { label: copy.adminPosts.metrics.total, value: posts.length },
    {
      label: copy.adminPosts.metrics.published,
      value: posts.filter((post) => post.status === "published").length,
    },
    {
      label: copy.adminPosts.metrics.drafts,
      value: posts.filter((post) => post.status === "draft").length,
    },
    {
      label: copy.adminPosts.metrics.archived,
      value: posts.filter((post) => post.status === "archived").length,
    },
  ];

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">{copy.adminPosts.eyebrow}</p>
          <h2>{copy.adminPosts.title}</h2>
        </div>
        <div className="status-pill">{copy.adminPosts.status}</div>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.adminPosts.createEyebrow}</p>
            <h3>{copy.adminPosts.createTitle}</h3>
          </div>
        </div>
        <CreatePostForm
          onSubmit={(payload) => createPostMutation.mutateAsync(payload)}
          isPending={createPostMutation.isPending}
          isAdmin
        />
        {createError && <p className="error">{createError}</p>}
      </section>

      <section className="panel">
        <div className="section-heading admin-filter-bar">
          <div>
            <p className="eyebrow">{copy.adminPosts.libraryEyebrow}</p>
            <h3>{copy.adminPosts.libraryTitle}</h3>
          </div>
          <div className="toolbar-controls">
            <select
              aria-label={copy.postForm.status}
              onChange={(event) =>
                setStatus(event.target.value as PostItem["status"] | "all")
              }
              value={status}
            >
              <option value="all">{copy.adminPosts.allStatuses}</option>
              <option value="published">
                {copy.postForm.statusOptions.published}
              </option>
              <option value="draft">{copy.postForm.statusOptions.draft}</option>
              <option value="archived">
                {copy.postForm.statusOptions.archived}
              </option>
            </select>
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.adminPosts.search}
            />
          </div>
        </div>
        {postsQuery.error instanceof Error && (
          <p className="error">{postsQuery.error.message}</p>
        )}
        <PostList items={filteredPosts} />
        {!postsQuery.isLoading && filteredPosts.length === 0 && (
          <p className="empty-state">{copy.adminPosts.empty}</p>
        )}
      </section>
    </section>
  );
};
