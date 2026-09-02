import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { loginRequest, registerRequest } from "../modules/auth/auth.api";
import type { AuthMode, AuthResponse, RegisterResponse } from "../modules/auth/auth.types";
import { useDocumentMeta } from "../shared/useDocumentMeta";

export const LoginPage = () => {
  const { copy } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation<AuthResponse | RegisterResponse>({
    mutationFn: () => {
      if (mode === "register") {
        return registerRequest(name.trim(), email.trim(), password);
      }
      return loginRequest(email.trim(), password);
    },
    onSuccess: (data) => {
      if (mode === "register") {
        const registeredEmail = "email" in data ? data.email : email.trim();
        setPassword("");
        navigate("/verify-email?email=" + encodeURIComponent(registeredEmail), {
          replace: true,
        });
        return;
      }

      if ("user" in data) {
        login(data.user);
      }
      const from =
        (location.state as { from?: string } | null)?.from ?? "/author/posts";
      navigate(from, { replace: true });
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/author/posts", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setPassword("");
    mutation.reset();
  };

  const passwordRules = [
    { key: "length", isValid: password.length >= 8 },
    { key: "lowercase", isValid: /[a-z]/.test(password) },
    { key: "uppercase", isValid: /[A-Z]/.test(password) },
    { key: "number", isValid: /[0-9]/.test(password) },
    { key: "symbol", isValid: /[^A-Za-z0-9]/.test(password) },
  ] as const;
  const isStrongPassword = passwordRules.every((rule) => rule.isValid);
  const canSubmit = mode === "login" || isStrongPassword;

  const error = mutation.error instanceof Error ? mutation.error.message : "";

  useDocumentMeta({
    title: `${mode === "login" ? copy.auth.titleLogin : copy.auth.titleRegister} | ${copy.brand.name}`,
    description: copy.auth.intro,
    canonicalPath: "/login",
  });

  return (
    <section className="auth-center-page">
      <div className="auth-card-modern">
        <div className="auth-card-header">
          <p className="eyebrow">{copy.auth.eyebrow}</p>
          <h2>
            {mode === "login" ? copy.auth.titleLogin : copy.auth.titleRegister}
          </h2>
          <p>{copy.auth.intro}</p>
        </div>

        <form onSubmit={onSubmit} className="form auth-form">
          {mode === "register" && (
            <label className="field auth-field">
              <span>{copy.auth.name}</span>
              <div className="input-with-icon">
                <UserRound size={17} />
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={copy.auth.namePlaceholder}
                  required
                />
              </div>
            </label>
          )}

          <label className="field auth-field">
            <span>{copy.auth.email}</span>
            <div className="input-with-icon">
              <Mail size={17} />
              <input
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.auth.emailPlaceholder}
                required
                type="email"
              />
            </div>
          </label>

          <label className="field auth-field">
            <span>{copy.auth.password}</span>
            <div className="input-with-icon password-field">
              <LockKeyhole size={17} />
              <input
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.auth.passwordPlaceholder}
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={
                  showPassword ? copy.auth.hidePassword : copy.auth.showPassword
                }
                className="icon-button password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {mode === "login" && (
            <Link className="auth-forgot-link" to="/forgot-password">
              {copy.auth.forgotPassword}
            </Link>
          )}

          {mode === "register" && (
            <div className="password-rules" aria-live="polite">
              <span>{copy.auth.passwordRulesTitle}</span>
              <ul>
                {passwordRules.map((rule) => (
                  <li className={rule.isValid ? "valid" : ""} key={rule.key}>
                    {copy.auth.passwordRules[rule.key]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending
              ? copy.auth.pending
              : mode === "login"
                ? copy.auth.submitLogin
                : copy.auth.submitRegister}
          </button>
        </form>

        {error && <p className="error auth-error">{error}</p>}

        <button className="auth-mode-switch" type="button" onClick={toggleMode}>
          {mode === "login"
            ? copy.auth.switchToRegister
            : copy.auth.switchToLogin}
        </button>
      </div>
    </section>
  );
};
