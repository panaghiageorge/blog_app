import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import { PostList } from "../modules/posts/PostList";
import {
  createPostRequest,
  getManagePostsRequest,
  publishPostRequest,
  updatePostRequest,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const publishPostMutation = useMutation({
    mutationFn: publishPostRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const rejectPostMutation = useMutation({
    mutationFn: (id: number) => updatePostRequest(id, { status: "draft" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const createError =
    createPostMutation.error instanceof Error
      ? createPostMutation.error.message
      : "";
  const publishError =
    publishPostMutation.error instanceof Error
      ? publishPostMutation.error.message
      : "";
  const rejectError =
    rejectPostMutation.error instanceof Error
      ? rejectPostMutation.error.message
      : "";
  const posts = postsQuery.data?.items ?? [];
  const pendingPosts = useMemo(
    () =>
      posts.filter(
        (post) => post.status === "pending_review" || post.status === "draft",
      ),
    [posts],
  );
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
    { label: copy.adminPosts.metrics.drafts, value: pendingPosts.length },
    {
      label: copy.adminPosts.metrics.archived,
      value: posts.filter((post) => post.status === "archived").length,
    },
  ];

  const renderPendingActions = (post: PostItem) => (
    <>
      <Link
        className="secondary preview-link"
        to={`/admin/posts/${post.id}/preview`}
      >
        <Eye size={16} />
        {copy.adminPosts.preview}
      </Link>
      <button
        disabled={publishPostMutation.isPending}
        onClick={() => publishPostMutation.mutate(post.id)}
        type="button"
      >
        {publishPostMutation.isPending
          ? copy.adminPosts.approving
          : copy.adminPosts.approve}
      </button>
      {post.status === "pending_review" && (
        <button
          className="secondary"
          disabled={rejectPostMutation.isPending}
          onClick={() => rejectPostMutation.mutate(post.id)}
          type="button"
        >
          {rejectPostMutation.isPending
            ? copy.adminPosts.rejecting
            : copy.adminPosts.reject}
        </button>
      )}
    </>
  );

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

      <section className="panel approval-panel">
        <div className="section-heading admin-filter-bar">
          <div>
            <p className="eyebrow">{copy.adminPosts.pendingEyebrow}</p>
            <h3>{copy.adminPosts.pendingTitle}</h3>
          </div>
          <span className="status-pill status-pending_review">
            {pendingPosts.length} {copy.adminPosts.pendingCountLabel}
          </span>
        </div>
        {publishError && <p className="error">{publishError}</p>}
        {rejectError && <p className="error">{rejectError}</p>}
        <PostList items={pendingPosts} renderAction={renderPendingActions} />
        {!postsQuery.isLoading && pendingPosts.length === 0 && (
          <p className="empty-state">{copy.adminPosts.noPending}</p>
        )}
      </section>

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
              <option value="pending_review">
                {copy.postForm.statusOptions.pending_review}
              </option>
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
        <PostList
          items={filteredPosts}
          renderAction={(post) =>
            post.status === "draft" || post.status === "pending_review"
              ? renderPendingActions(post)
              : null
          }
        />
        {!postsQuery.isLoading && filteredPosts.length === 0 && (
          <p className="empty-state">{copy.adminPosts.empty}</p>
        )}
      </section>
    </section>
  );
};
