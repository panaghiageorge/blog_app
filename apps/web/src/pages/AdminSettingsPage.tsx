import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import {
  createCategoryRequest,
  getCategoriesRequest,
  getManagePostsRequest,
} from "../modules/posts/posts.api";
import { getUsersRequest, updateUserRequest } from "../modules/users/users.api";
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
  const [categoryForm, setCategoryForm] = useState({
    code: "",
    name: "",
    nativeName: "",
  });

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

  const createCategoryMutation = useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      setCategoryForm({ code: "", name: "", nativeName: "" });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ user, role }: { user: UserItem; role: UserItem["role"] }) =>
      updateUserRequest(user.id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

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

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.adminSettings.categoriesEyebrow}</p>
            <h3>{copy.adminSettings.categoriesTitle}</h3>
          </div>
        </div>
        <form
          className="form-columns"
          onSubmit={(event) => {
            event.preventDefault();
            createCategoryMutation.mutate(categoryForm);
          }}
        >
          <label className="field">
            <span>{copy.adminSettings.categoryCode}</span>
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={categoryForm.code}
              onChange={(event) =>
                setCategoryForm({
                  ...categoryForm,
                  code: event.target.value.toLowerCase().replace(/\s+/g, "-"),
                })
              }
              placeholder={copy.adminSettings.categoryCodePlaceholder}
            />
          </label>
          <label className="field">
            <span>{copy.adminSettings.categoryName}</span>
            <input
              required
              minLength={2}
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm({ ...categoryForm, name: event.target.value })
              }
              placeholder={copy.adminSettings.categoryNamePlaceholder}
            />
          </label>
          <label className="field">
            <span>{copy.adminSettings.categoryNativeName}</span>
            <input
              required
              minLength={2}
              value={categoryForm.nativeName}
              onChange={(event) =>
                setCategoryForm({
                  ...categoryForm,
                  nativeName: event.target.value,
                })
              }
              placeholder={copy.adminSettings.categoryNativeNamePlaceholder}
            />
          </label>
          <button type="submit" disabled={createCategoryMutation.isPending}>
            {copy.adminSettings.addCategory}
          </button>
        </form>
        {categoryError && <p className="error">{categoryError}</p>}
        <div className="popular-list">
          {(categoriesQuery.data?.items ?? []).map((category) => (
            <div key={category.id} className="setting-row">
              <span>
                <strong>{category.nativeName}</strong>
                <small>{category.code}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

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
