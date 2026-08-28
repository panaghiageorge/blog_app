import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { CreatePostForm } from "../modules/posts/CreatePostForm";
import {
  createPostRequest,
  deletePostRequest,
  getManagePostsRequest,
  updatePostRequest,
} from "../modules/posts/posts.api";
import type { PostItem, PostPayload } from "../modules/posts/posts.types";

const toDraft = (post: PostItem): PostPayload => ({
  imageUrl: post.imageUrl,
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

  const createMutation = useMutation({
    mutationFn: createPostRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PostPayload }) =>
      updatePostRequest(id, payload),
    onSuccess: () => {
      setEditingId(null);
      setDraft(null);
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

  const startEditing = (post: PostItem) => {
    setEditingId(post.id);
    setDraft(toDraft(post));
  };

  const submitEdit = (payload: PostPayload) => {
    if (!editingId || !draft) {
      return;
    }

    updateMutation.mutate({ id: editingId, payload });
  };

  const formError =
    createMutation.error instanceof Error ? createMutation.error.message : "";
  const editError =
    updateMutation.error instanceof Error ? updateMutation.error.message : "";
  const deleteError =
    deleteMutation.error instanceof Error ? deleteMutation.error.message : "";

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">{copy.authorStudio.eyebrow}</p>
          <h2>{copy.authorStudio.title}</h2>
        </div>
        <div className="status-pill">{user?.name}</div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>{copy.authorStudio.metrics.posts}</span>
          <strong>{myPosts.length}</strong>
        </article>
        <article className="metric-card">
          <span>{copy.authorStudio.metrics.words}</span>
          <strong>{totalWords}</strong>
        </article>
        <article className="metric-card">
          <span>{copy.authorStudio.metrics.average}</span>
          <strong>{averageWords}</strong>
        </article>
        <article className="metric-card">
          <span>{copy.authorStudio.metrics.latest}</span>
          <strong>
            {latestPost
              ? dateFormatter.format(new Date(latestPost.createdAt))
              : copy.authorStudio.latestNone}
          </strong>
        </article>
      </div>

      <div className="dashboard-grid wide-left">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{copy.authorStudio.createEyebrow}</p>
              <h3>{copy.authorStudio.createTitle}</h3>
            </div>
          </div>
          <CreatePostForm
            isPending={createMutation.isPending}
            onSubmit={(payload) => createMutation.mutateAsync(payload)}
            isAdmin={user?.role === "admin"}
          />
          {formError && <p className="error">{formError}</p>}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{copy.authorStudio.focusEyebrow}</p>
              <h3>{copy.authorStudio.focusTitle}</h3>
            </div>
          </div>
          <div className="settings-list compact">
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
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.authorStudio.manageEyebrow}</p>
            <h3>{copy.authorStudio.manageTitle}</h3>
          </div>
        </div>

        {postsQuery.isLoading && <p>{copy.authorStudio.loading}</p>}
        {postsQuery.error instanceof Error && (
          <p className="error">{postsQuery.error.message}</p>
        )}
        {editError && <p className="error">{editError}</p>}
        {deleteError && <p className="error">{deleteError}</p>}

        <div className="post-editor-list">
          {myPosts.map((post) => (
            <article className="post-editor" key={post.id}>
              {editingId === post.id && draft ? (
                <CreatePostForm
                  initialValue={draft}
                  isPending={updateMutation.isPending}
                  onCancel={() => {
                    setEditingId(null);
                    setDraft(null);
                  }}
                  onSubmit={submitEdit}
                  pendingLabel={copy.postForm.saving}
                  submitLabel={copy.postForm.save}
                  isAdmin={user?.role === "admin"}
                />
              ) : (
                <>
                  <div className="management-post-heading">
                    <div>
                      <h3>{post.title}</h3>
                      <small>
                        @{post.slug} - {copy.home.categories[post.category as keyof typeof copy.home.categories] ?? post.category} -{" "}
                        {dateFormatter.format(new Date(post.createdAt))}
                      </small>
                    </div>
                    <span className={`status-pill status-${post.status}`}>
                      {copy.postForm.statusOptions[post.status]}
                    </span>
                  </div>
                  <div className="post-editor-body">
                    <p>{post.excerpt}</p>
                  </div>
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() => startEditing(post)}
                      type="button"
                    >
                      {copy.authorStudio.edit}
                    </button>
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
    </section>
  );
};
