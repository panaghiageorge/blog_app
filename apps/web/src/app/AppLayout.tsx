import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { type Language, languageLabels } from "../i18n/translations";
import { useAuth } from "../modules/auth/AuthContext";

type Theme = "light" | "dark";

const languages: Language[] = ["ro", "en"];

export const AppLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { copy, language, setLanguage } = useI18n();
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
          <NavLink
            to="/author/posts"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {copy.nav.studio}
          </NavLink>
          {user?.role === "admin" && (
            <>
              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {copy.nav.settings}
              </NavLink>
              <NavLink
                to="/admin/posts"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {copy.nav.allPosts}
              </NavLink>
            </>
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
          {isAuthenticated ? (
            <button type="button" className="secondary" onClick={logout}>
              {copy.nav.logout}
            </button>
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
