import { Bookmark, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { type Language, languageLabels } from "../i18n/translations";
import { useAuth } from "../modules/auth/AuthContext";
import { hasPermission } from "../shared/authorization";
import { mediaUrl } from "../shared/media";

type Theme = "light" | "dark";

const languages: Language[] = ["ro", "en"];

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

export const AppLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { copy, language, setLanguage } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const themeParam = new URLSearchParams(window.location.search).get("theme");
    if (themeParam === "dark") {
      return "dark";
    }

    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.title = copy.metaTitle;
  }, [copy.metaTitle]);

  const themeLabel =
    theme === "light" ? copy.theme.switchToDark : copy.theme.switchToLight;
  const userInitials = useMemo(() => initialsFor(user?.name ?? ""), [user?.name]);

  return (
    <main className="app-shell">
      <header className="site-header">
        <NavLink aria-label={copy.brand.aria} className="brand" to="/">
          <img
            alt=""
            aria-hidden="true"
            className="brand-logo brand-logo-light"
            src="/brand/logo_dark.png"
          />
          <img
            alt=""
            aria-hidden="true"
            className="brand-logo brand-logo-dark"
            src="/brand/logo-white.png"
          />
          <span className="brand-name">{copy.brand.name}</span>
        </NavLink>

        <nav className="nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {copy.nav.home}
          </NavLink>
          {hasPermission(user?.role, "manage_posts") && (
            <NavLink
              to="/author/posts"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {copy.nav.studio}
            </NavLink>
          )}
          {hasPermission(user?.role, "save_posts") && (
            <NavLink
              to="/saved-posts"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {copy.nav.savedPosts}
            </NavLink>
          )}
          {hasPermission(user?.role, "manage_taxonomy") && (
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {copy.nav.settings}
            </NavLink>
          )}
          {hasPermission(user?.role, "publish_posts") && (
            <NavLink
              to="/admin/posts"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {copy.nav.allPosts}
            </NavLink>
          )}
        </nav>

        <div className="header-actions">
          <div aria-label={copy.language.label} className="language-switch">
            {languages.map((languageOption) => (
              <button
                aria-label={copy.language[languageOption]}
                aria-pressed={language === languageOption}
                className={
                  language === languageOption
                    ? "language-option active"
                    : "language-option"
                }
                key={languageOption}
                onClick={() => setLanguage(languageOption)}
                title={copy.language[languageOption]}
                type="button"
              >
                {languageLabels[languageOption]}
              </button>
            ))}
          </div>
          <button
            aria-label={themeLabel}
            className="icon-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title={themeLabel}
            type="button"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {isAuthenticated && user ? (
            <div className="profile-menu">
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileOpen((current) => !current)}
                aria-label={copy.account.openMenu}
                aria-expanded={profileOpen}
              >
                {user.avatarUrl ? (
                  <img src={mediaUrl(user.avatarUrl)} alt="" />
                ) : (
                  <span>{userInitials}</span>
                )}
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <NavLink to="/account" onClick={() => setProfileOpen(false)}>
                    <Settings size={16} />
                    {copy.nav.account}
                  </NavLink>
                  <NavLink to="/saved-posts" onClick={() => setProfileOpen(false)}>
                    <Bookmark size={16} />
                    {copy.nav.savedPosts}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={16} />
                    {copy.nav.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink className="login-link" to="/login">
              {copy.nav.login}
            </NavLink>
          )}
        </div>
      </header>

      <Outlet />
    </main>
  );
};
