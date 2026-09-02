import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AppModal } from "../components/AppModal";
import { TaxonomyAdminSection } from "../components/TaxonomyAdminSection";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import {
  createCategoryRequest,
  createTagRequest,
  deleteCategoryRequest,
  deleteTagRequest,
  getCategoriesRequest,
  getManagePostsRequest,
  getTagsRequest,
  updateCategoryRequest,
  updateTagRequest,
} from "../modules/posts/posts.api";
import { getLegalPageRequest, getNewsletterSubscriptionsRequest, updateLegalPageRequest, type LegalPageKey } from "../modules/legal.api";
import { getUsersRequest, updateUserRequest } from "../modules/users/users.api";
import type { CategoryItem, TagItem } from "../modules/posts/posts.types";
import type { UserItem } from "../modules/users/users.types";

export const AdminSettingsPage = () => {
  const { copy, language } = useI18n();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState("Blog Starter");
  const [publicRegistration, setPublicRegistration] = useState(true);
  const [manualReview, setManualReview] = useState(false);
  const [authorLimit, setAuthorLimit] = useState(5);
  const [search, setSearch] = useState("");
  const [legalKey, setLegalKey] = useState<LegalPageKey>("terms");
  const [legalTitle, setLegalTitle] = useState("");
  const [legalContent, setLegalContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "category"; item: CategoryItem } | { type: "tag"; item: TagItem } | null
  >(null);

  const postsQuery = useQuery({
    queryKey: ["admin-settings-posts"],
    queryFn: () => getManagePostsRequest(1, 100, ""),
  });

  const usersQuery = useQuery({
    queryKey: ["users", search],
    queryFn: () => getUsersRequest(1, 20, search),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoriesRequest,
  });
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: getTagsRequest,
  });
  const legalPageQuery = useQuery({
    queryKey: ["legal", legalKey, language],
    queryFn: () => getLegalPageRequest(legalKey, language),
  });
  const newsletterSubscriptionsQuery = useQuery({
    queryKey: ["newsletter", "subscriptions"],
    queryFn: getNewsletterSubscriptionsRequest,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: createTagRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CategoryItem> }) =>
      updateCategoryRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TagItem> }) =>
      updateTagRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategoryRequest,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTagRequest,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const updateLegalMutation = useMutation({
    mutationFn: () =>
      updateLegalPageRequest(legalKey, {
        languageCode: language,
        title: legalTitle,
        content: legalContent,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["legal"] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ user, role }: { user: UserItem; role: UserItem["role"] }) =>
      updateUserRequest(user.id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  useEffect(() => {
    const page = legalPageQuery.data?.item;
    if (!page) return;
    setLegalTitle(page.title);
    setLegalContent(page.content);
  }, [legalPageQuery.data?.item]);

  const submitLegalPage = (event: FormEvent) => {
    event.preventDefault();
    updateLegalMutation.mutate();
  };

  const users = usersQuery.data?.items ?? [];
  const posts = postsQuery.data?.items ?? [];
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [language],
  );
  const formatDate = (date: string) => dateFormatter.format(new Date(date));

  const metrics = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin").length;
    const authors = users.filter((user) => user.role === "author").length;
    const activeAuthorIds = new Set(posts.map((post) => post.authorId));

    return [
      {
        label: copy.adminSettings.metrics.posts,
        value: postsQuery.data?.pagination.total ?? posts.length,
      },
      {
        label: copy.adminSettings.metrics.users,
        value: usersQuery.data?.pagination.total ?? users.length,
      },
      { label: copy.adminSettings.metrics.admins, value: admins },
      {
        label: copy.adminSettings.metrics.activeAuthors,
        value: activeAuthorIds.size || authors,
      },
    ];
  }, [
    copy.adminSettings.metrics.activeAuthors,
    copy.adminSettings.metrics.admins,
    copy.adminSettings.metrics.posts,
    copy.adminSettings.metrics.users,
    posts,
    postsQuery.data?.pagination.total,
    users,
    usersQuery.data?.pagination.total,
  ]);

  const latestPosts = posts.slice(0, 5);
  const categoryError =
    createCategoryMutation.error instanceof Error
      ? createCategoryMutation.error.message
      : "";
  const tagError =
    createTagMutation.error instanceof Error
      ? createTagMutation.error.message
      : "";

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">{copy.adminSettings.eyebrow}</p>
          <h2>{copy.adminSettings.title}</h2>
        </div>
        <div className="status-pill">{copy.adminSettings.status}</div>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{copy.adminSettings.publishingEyebrow}</p>
              <h3>{copy.adminSettings.publishingTitle}</h3>
            </div>
          </div>

          <div className="settings-list">
            <label className="field">
              <span>{copy.adminSettings.siteName}</span>
              <input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>{copy.adminSettings.publicRegistration}</strong>
                <small>{copy.adminSettings.publicRegistrationHelp}</small>
              </span>
              <input
                checked={publicRegistration}
                onChange={(event) =>
                  setPublicRegistration(event.target.checked)
                }
                type="checkbox"
              />
            </label>

            <label className="setting-row">
              <span>
                <strong>{copy.adminSettings.manualReview}</strong>
                <small>{copy.adminSettings.manualReviewHelp}</small>
              </span>
              <input
                checked={manualReview}
                onChange={(event) => setManualReview(event.target.checked)}
                type="checkbox"
              />
            </label>

            <label className="field">
              <span>{copy.adminSettings.authorLimit}</span>
              <input
                min={1}
                max={25}
                onChange={(event) => setAuthorLimit(Number(event.target.value))}
                type="number"
                value={authorLimit}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{copy.adminSettings.securityEyebrow}</p>
              <h3>{copy.adminSettings.securityTitle}</h3>
            </div>
          </div>

          <div className="settings-list compact">
            <div className="setting-row">
              <span>
                <strong>{copy.adminSettings.adminArea}</strong>
                <small>{copy.adminSettings.adminAreaHelp}</small>
              </span>
              <span className="status-pill success">
                {copy.adminSettings.enforced}
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.adminSettings.authorStudio}</strong>
                <small>{copy.adminSettings.authorStudioHelp}</small>
              </span>
              <span className="status-pill success">
                {copy.adminSettings.enforced}
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.adminSettings.sessionLifetime}</strong>
                <small>{copy.adminSettings.sessionLifetimeHelp}</small>
              </span>
              <span className="status-pill">{copy.adminSettings.days7}</span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{copy.adminSettings.rateLimit}</strong>
                <small>{copy.adminSettings.rateLimitHelp}</small>
              </span>
              <span className="status-pill">
                {copy.adminSettings.perMinute}
              </span>
            </div>
          </div>
        </section>
      </div>


      <section className="panel legal-admin-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.adminSettings.legalEyebrow}</p>
            <h3>{copy.adminSettings.legalTitle}</h3>
          </div>
          <span className="status-pill">{language.toUpperCase()}</span>
        </div>
        <form className="legal-editor" onSubmit={submitLegalPage}>
          <label className="field">
            <span>{copy.adminSettings.legalType}</span>
            <select value={legalKey} onChange={(event) => setLegalKey(event.target.value as LegalPageKey)}>
              <option value="terms">{copy.legal.terms}</option>
              <option value="gdpr">{copy.legal.gdpr}</option>
              <option value="marketing">{copy.legal.marketing}</option>
            </select>
          </label>
          <label className="field">
            <span>{copy.adminSettings.legalPageTitle}</span>
            <input value={legalTitle} onChange={(event) => setLegalTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>{copy.adminSettings.legalContent}</span>
            <textarea rows={10} value={legalContent} onChange={(event) => setLegalContent(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="submit" disabled={updateLegalMutation.isPending || legalPageQuery.isLoading}>
              {updateLegalMutation.isPending ? copy.adminSettings.savingLegal : copy.adminSettings.saveLegal}
            </button>
            <span className="form-note">{copy.adminSettings.newsletterSubscribers}: {newsletterSubscriptionsQuery.data?.items.length ?? 0}</span>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.adminSettings.peopleEyebrow}</p>
            <h3>{copy.adminSettings.peopleTitle}</h3>
          </div>
          <input
            className="search-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.adminSettings.searchUsers}
            value={search}
          />
        </div>

        {usersQuery.error instanceof Error && (
          <p className="error">{usersQuery.error.message}</p>
        )}
        {usersQuery.isLoading && <p>{copy.adminSettings.loadingUsers}</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{copy.adminSettings.name}</th>
                <th>{copy.adminSettings.email}</th>
                <th>{copy.adminSettings.role}</th>
                <th>{copy.adminSettings.joined}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      disabled={
                        updateRoleMutation.isPending ||
                        user.id === currentUser?.id
                      }
                      onChange={(event) =>
                        updateRoleMutation.mutate({
                          user,
                          role: event.target.value as UserItem["role"],
                        })
                      }
                      value={user.role}
                    >
                      <option value="admin">Admin</option>
                      <option value="author">Author</option>
                    </select>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TaxonomyAdminSection
        eyebrow={copy.adminSettings.categoriesEyebrow}
        title={copy.adminSettings.categoriesTitle}
        items={categoriesQuery.data?.items ?? []}
        withNativeName
        createPending={createCategoryMutation.isPending}
        updatePending={updateCategoryMutation.isPending}
        error={categoryError}
        labels={{
          add: copy.adminSettings.addCategory,
          code: copy.adminSettings.categoryCode,
          codePlaceholder: copy.adminSettings.categoryCodePlaceholder,
          deleteAction: copy.adminSettings.deleteTaxonomy,
          editAction: copy.adminSettings.editTaxonomy,
          empty: copy.adminSettings.emptyCategories,
          name: copy.adminSettings.categoryName,
          namePlaceholder: copy.adminSettings.categoryNamePlaceholder,
          nativeName: copy.adminSettings.categoryNativeName,
          nativeNamePlaceholder: copy.adminSettings.categoryNativeNamePlaceholder,
          saveAction: copy.adminSettings.saveTaxonomy,
          cancelAction: copy.adminSettings.cancelTaxonomy,
        }}
        onCreate={(payload) => createCategoryMutation.mutate({
          code: payload.code,
          name: payload.name,
          nativeName: payload.nativeName ?? payload.name,
        })}
        onUpdate={(id, payload) => updateCategoryMutation.mutate({
          id,
          payload: {
            code: payload.code,
            name: payload.name,
            nativeName: payload.nativeName ?? payload.name,
          },
        })}
        onDeleteRequest={(item) => setDeleteTarget({ type: "category", item: item as CategoryItem })}
      />

      <TaxonomyAdminSection
        eyebrow={copy.adminSettings.tagsEyebrow}
        title={copy.adminSettings.tagsTitle}
        items={tagsQuery.data?.items ?? []}
        createPending={createTagMutation.isPending}
        updatePending={updateTagMutation.isPending}
        error={tagError}
        labels={{
          add: copy.adminSettings.addTag,
          code: copy.adminSettings.tagCode,
          codePlaceholder: copy.adminSettings.tagCodePlaceholder,
          deleteAction: copy.adminSettings.deleteTaxonomy,
          editAction: copy.adminSettings.editTaxonomy,
          empty: copy.adminSettings.emptyTags,
          name: copy.adminSettings.tagName,
          namePlaceholder: copy.adminSettings.tagNamePlaceholder,
          saveAction: copy.adminSettings.saveTaxonomy,
          cancelAction: copy.adminSettings.cancelTaxonomy,
        }}
        onCreate={(payload) => createTagMutation.mutate({ code: payload.code, name: payload.name })}
        onUpdate={(id, payload) => updateTagMutation.mutate({
          id,
          payload: { code: payload.code, name: payload.name },
        })}
        onDeleteRequest={(item) => setDeleteTarget({ type: "tag", item: item as TagItem })}
      />

      <AppModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={copy.adminSettings.deleteConfirmTitle}
        description={copy.adminSettings.deleteConfirmBody}
        footer={
          <>
            <button className="secondary" type="button" onClick={() => setDeleteTarget(null)}>
              {copy.adminSettings.cancelTaxonomy}
            </button>
            <button
              className="danger"
              type="button"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "category") {
                  deleteCategoryMutation.mutate(deleteTarget.item.id);
                } else {
                  deleteTagMutation.mutate(deleteTarget.item.id);
                }
              }}
              disabled={deleteCategoryMutation.isPending || deleteTagMutation.isPending}
            >
              {copy.adminSettings.deleteTaxonomy}
            </button>
          </>
        }
      >
        <p className="confirm-copy">
          {deleteTarget?.item.name ?? deleteTarget?.item.code}
        </p>
      </AppModal>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.adminSettings.contentEyebrow}</p>
            <h3>{copy.adminSettings.contentTitle}</h3>
          </div>
          <span className="status-pill">{siteName}</span>
        </div>

        {postsQuery.error instanceof Error && (
          <p className="error">{postsQuery.error.message}</p>
        )}
        <div className="activity-list">
          {latestPosts.map((post) => (
            <article className="activity-item" key={post.id}>
              <div>
                <strong>{post.title}</strong>
                <small>
                  @{post.slug} {copy.adminSettings.by}{" "}
                  {post.authorName ?? `user#${post.authorId}`}
                </small>
              </div>
              <span>{formatDate(post.createdAt)}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};
