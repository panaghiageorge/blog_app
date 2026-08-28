import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { loginRequest, registerRequest } from "../modules/auth/auth.api";
import type { AuthMode } from "../modules/auth/auth.types";

export const LoginPage = () => {
  const { copy } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("demo@blog.local");
  const [password, setPassword] = useState("password123");

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "register") {
        return registerRequest(name, email, password);
      }
      return loginRequest(email, password);
    },
    onSuccess: (data) => {
      login(data.token);
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

  const error = mutation.error instanceof Error ? mutation.error.message : "";

  return (
    <section className="auth-panel">
      <div className="auth-copy">
        <p className="eyebrow">{copy.auth.eyebrow}</p>
        <h2>
          {mode === "login" ? copy.auth.titleLogin : copy.auth.titleRegister}
        </h2>
        <p>{copy.auth.intro}</p>
        <span className="status-pill">{copy.auth.demoHint}</span>
      </div>

      <div className="panel">
        <div className="row">
          <h3>
            {mode === "login" ? copy.auth.titleLogin : copy.auth.titleRegister}
          </h3>
          <button
            type="button"
            className="secondary"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? copy.auth.switchToRegister
              : copy.auth.switchToLogin}
          </button>
        </div>

        <form onSubmit={onSubmit} className="form">
          {mode === "register" && (
            <label className="field">
              <span>{copy.auth.name}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.auth.name}
              />
            </label>
          )}
          <label className="field">
            <span>{copy.auth.email}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.auth.email}
              required
            />
          </label>
          <label className="field">
            <span>{copy.auth.password}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={copy.auth.password}
              type="password"
              required
            />
          </label>
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? copy.auth.pending
              : mode === "login"
                ? copy.auth.submitLogin
                : copy.auth.submitRegister}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
};
