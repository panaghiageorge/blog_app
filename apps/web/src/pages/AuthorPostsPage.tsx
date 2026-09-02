import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import {
  deletePostRequest,
  getManagePostsRequest,
  updatePostRequest,
} from "../modules/posts/posts.api";
import type { PostItem, PostPayload } from "../modules/posts/posts.types";

const toDraft = (post: PostItem): PostPayload => ({
  imageUrl: post.imageUrl,
  galleryImages: post.galleryImages ?? [],
  category: post.category,
  status: post.status,
  translations: post.translations ?? [
    {
      languageCode: post.languageCode,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      keywords: post.keywords,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      readTime: post.readTime,
      content: post.content,
    },
  ],
});

export const AuthorPostsPage = () => {
  const { copy, language } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PostPayload | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const autosaveTimeoutRef = useRef<number | null>(null);
  const skipNextAutosaveRef = useRef(false);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [language],
  );

  const postsQuery = useQuery({
    queryKey: ["posts", "author-studio"],
    queryFn: () => getManagePostsRequest(1, 100, ""),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PostPayload }) =>
      updatePostRequest(id, payload),
    onSuccess: () => {
      setEditingId(null);
      setDraft(null);
      setAutosaveStatus("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const autosaveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PostPayload }) =>
      updatePostRequest(id, payload),
    onMutate: () => setAutosaveStatus(copy.postForm.autosaveSaving),
    onSuccess: () => {
      setAutosaveStatus(copy.postForm.autosaveSaved);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => setAutosaveStatus(copy.postForm.autosaveError),
  });

  const submitReviewMutation = useMutation({
    mutationFn: (id: number) =>
      updatePostRequest(id, { status: "pending_review" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePostRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const allPosts = postsQuery.data?.items ?? [];
  const myPosts = useMemo(
    () => allPosts.filter((post) => post.authorId === user?.id),
    [allPosts, user?.id],
  );

  const totalWords = useMemo(
    () =>
      myPosts.reduce((sum, post) => {
        const words = post.content.trim().split(/\s+/).filter(Boolean);
        return sum + words.length;
      }, 0),
    [myPosts],
  );

  const latestPost = myPosts[0];
  const averageWords =
    myPosts.length > 0 ? Math.round(totalWords / myPosts.length) : 0;
  const draftsCount = myPosts.filter((post) => post.status === "draft").length;
  const reviewCount = myPosts.filter(
    (post) => post.status === "pending_review",
  ).length;

  const startEditing = (post: PostItem) => {
    skipNextAutosaveRef.current = true;
    setEditingId(post.id);
    setDraft(toDraft(post));
    setAutosaveStatus(copy.postForm.autosaveIdle);
  };

  const scheduleAutosave = useCallback(
    (nextDraft: PostPayload) => {
      setDraft(nextDraft);
      if (!editingId) return;
      if (skipNextAutosaveRef.current) {
        skipNextAutosaveRef.current = false;
        return;
      }
      if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
      setAutosaveStatus(copy.postForm.autosavePending);
      autosaveTimeoutRef.current = window.setTimeout(() => {
        autosaveMutation.mutate({ id: editingId, payload: nextDraft });
      }, 1200);
    },
    [autosaveMutation, copy.postForm.autosavePending, editingId],
  );

  useEffect(
    () => () => {
      if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    },
    [],
  );

  const submitEdit = (payload: PostPayload) => {
    if (!editingId || !draft) return;
    updateMutation.mutate({ id: editingId, payload });
  };

  const editError =
    updateMutation.error instanceof Error ? updateMutation.error.message : "";
  const submitReviewError =
    submitReviewMutation.error instanceof Error
      ? submitReviewMutation.error.message
      : "";
  const deleteError =
    deleteMutation.error instanceof Error ? deleteMutation.error.message : "";

  return (
    <section className="page-stack author-studio">
      <div className="author-hero">
        <div>
          <p className="eyebrow">{copy.authorStudio.eyebrow}</p>
          <h2>{copy.authorStudio.title}</h2>
          <p>{copy.authorStudio.accountAuthor}</p>
        </div>
        <div className="author-hero-actions">
          <span className="status-pill">{user?.name}</span>
          <Link className="action-link" to="/author/posts/new">
            <PenLine size={17} />
            {copy.postForm.create}
          </Link>
        </div>
      </div>

      <div className="author-dashboard">
        <section className="panel author-posts-panel">
          <div className="section-heading admin-filter-bar">
            <div>
              <p className="eyebrow">{copy.authorStudio.manageEyebrow}</p>
              <h3>{copy.authorStudio.manageTitle}</h3>
            </div>
            <span className="status-pill">
              {myPosts.length} {copy.authorStudio.metrics.posts}
            </span>
          </div>

          {postsQuery.isLoading && <p>{copy.authorStudio.loading}</p>}
          {postsQuery.error instanceof Error && (
            <p className="error">{postsQuery.error.message}</p>
          )}
          {editError && <p className="error">{editError}</p>}
          {submitReviewError && <p className="error">{submitReviewError}</p>}
          {deleteError && <p className="error">{deleteError}</p>}

          <div className="post-editor-list author-post-list">
            {myPosts.map((post) => (
              <article className="post-editor author-post-card" key={post.id}>
                {editingId === post.id && draft ? (
                  <CreatePostForm
                    initialValue={draft}
                    isPending={updateMutation.isPending}
                    onCancel={() => {
                      if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
                      setEditingId(null);
                      setDraft(null);
                      setAutosaveStatus("");
                    }}
                    onDraftChange={scheduleAutosave}
                    autosaveStatus={autosaveStatus}
                    warnOnUnsavedChanges
                    onSubmit={submitEdit}
                    pendingLabel={copy.postForm.saving}
                    submitLabel={copy.postForm.save}
                    isAdmin={user?.role === "admin"}
                  />
                ) : (
                  <>
                    <div className="author-post-topline">
                      <span>
                        {copy.home.categories[
                          post.category as keyof typeof copy.home.categories
                        ] ?? post.category}
                      </span>
                      <span>{dateFormatter.format(new Date(post.createdAt))}</span>
                    </div>
                    <div className="management-post-heading author-post-heading">
                      <div>
                        <h3>{post.title}</h3>
                        <small>@{post.slug}</small>
                      </div>
                      <span className={`status-pill status-${post.status}`}>
                        {copy.postForm.statusOptions[post.status]}
                      </span>
                    </div>
                    <div className="post-editor-body">
                      <p>{post.excerpt}</p>
                    </div>
                    <div className="button-row author-post-actions">
                      <Link
                        className="secondary preview-link"
                        to={`/author/posts/${post.id}/preview`}
                      >
                        <Eye size={16} />
                        {copy.authorStudio.preview}
                      </Link>
                      <button
                        className="secondary"
                        onClick={() => startEditing(post)}
                        type="button"
                      >
                        {copy.authorStudio.edit}
                      </button>
                      {post.status === "draft" && (
                        <button
                          disabled={submitReviewMutation.isPending}
                          onClick={() => submitReviewMutation.mutate(post.id)}
                          type="button"
                        >
                          {submitReviewMutation.isPending
                            ? copy.authorStudio.submittingReview
                            : copy.authorStudio.submitReview}
                        </button>
                      )}
                      <button
                        className="danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(post.id)}
                        type="button"
                      >
                        {copy.authorStudio.delete}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
            {!postsQuery.isLoading && myPosts.length === 0 && (
              <p className="empty-state">{copy.authorStudio.noPosts}</p>
            )}
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="panel author-stats-panel">
            <p className="eyebrow">{copy.authorStudio.focusEyebrow}</p>
            <h3>{copy.authorStudio.focusTitle}</h3>
            <div className="author-stat-grid">
              <article>
                <span>{copy.authorStudio.metrics.posts}</span>
                <strong>{myPosts.length}</strong>
              </article>
              <article>
                <span>{copy.authorStudio.metrics.words}</span>
                <strong>{totalWords}</strong>
              </article>
              <article>
                <span>{copy.authorStudio.metrics.average}</span>
                <strong>{averageWords}</strong>
              </article>
              <article>
                <span>{copy.postForm.statusOptions.draft}</span>
                <strong>{draftsCount}</strong>
              </article>
            </div>
          </section>

          <section className="panel author-stats-panel compact-info-panel">
            <div className="setting-row">
              <span>
                <strong>{copy.authorStudio.ownership}</strong>
                <small>
                  {user?.role === "admin"
                    ? copy.authorStudio.accountAdmin
                    : copy.authorStudio.accountAuthor}
                </small>
              </span>
              <span className="status-pill success">{user?.role}</span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.authorStudio.longestPost}</strong>
                <small>
                  {myPosts.length
                    ? myPosts.reduce((longest, post) =>
                        post.content.length > longest.content.length
                          ? post
                          : longest,
                      ).title
                    : copy.authorStudio.noPosts}
                </small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.postForm.statusOptions.pending_review}</strong>
                <small>{reviewCount}</small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.authorStudio.metrics.latest}</strong>
                <small>
                  {latestPost
                    ? dateFormatter.format(new Date(latestPost.createdAt))
                    : copy.authorStudio.latestNone}
                </small>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};