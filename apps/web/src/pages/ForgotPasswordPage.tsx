import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { forgotPasswordRequest, resetPasswordRequest } from "../modules/auth/auth.api";

export const ForgotPasswordPage = () => {
  const { copy } = useI18n();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"request" | "reset" | "success">("request");

  const requestMutation = useMutation({
    mutationFn: () => forgotPasswordRequest(email.trim()),
    onSuccess: () => setStep("reset"),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetPasswordRequest(email.trim(), code.trim(), password),
    onSuccess: () => {
      setPassword("");
      setCode("");
      setStep("success");
    },
  });

  const passwordRules = [
    { key: "length", isValid: password.length >= 8 },
    { key: "lowercase", isValid: /[a-z]/.test(password) },
    { key: "uppercase", isValid: /[A-Z]/.test(password) },
    { key: "number", isValid: /[0-9]/.test(password) },
    { key: "symbol", isValid: /[^A-Za-z0-9]/.test(password) },
  ] as const;
  const isStrongPassword = passwordRules.every((rule) => rule.isValid);

  const onRequestSubmit = (event: FormEvent) => {
    event.preventDefault();
    requestMutation.mutate();
  };

  const onResetSubmit = (event: FormEvent) => {
    event.preventDefault();
    resetMutation.mutate();
  };

  if (step === "success") {
    return (
      <section className="auth-center-page">
        <div className="auth-card-modern verify-card">
          <div className="verify-success-state">
            <div className="verify-success-icon" aria-hidden="true">
              <CheckCircle2 size={34} />
            </div>
            <p className="eyebrow">{copy.auth.passwordResetEyebrow}</p>
            <h2>{copy.auth.passwordResetSuccessTitle}</h2>
            <p>{copy.auth.passwordResetSuccessBody}</p>
            <Link className="auth-submit verify-success-action" to="/login">
              {copy.auth.submitLogin}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-center-page">
      <div className="auth-card-modern verify-card">
        <div className="auth-card-header">
          <p className="eyebrow">{copy.auth.passwordResetEyebrow}</p>
          <h2>
            {step === "request"
              ? copy.auth.passwordResetTitle
              : copy.auth.passwordResetCodeTitle}
          </h2>
          <p>
            {step === "request"
              ? copy.auth.passwordResetIntro
              : copy.auth.passwordResetCodeIntro}
          </p>
        </div>

        {step === "request" ? (
          <form className="form auth-form" onSubmit={onRequestSubmit}>
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
            <button className="auth-submit" type="submit" disabled={requestMutation.isPending}>
              {requestMutation.isPending
                ? copy.auth.passwordResetSending
                : copy.auth.passwordResetSendCode}
            </button>
          </form>
        ) : (
          <form className="form auth-form" onSubmit={onResetSubmit}>
            <label className="field auth-field">
              <span>{copy.auth.emailVerificationCode}</span>
              <div className="input-with-icon">
                <KeyRound size={17} />
                <input
                  autoComplete="one-time-code"
                  className="otp-input"
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={copy.auth.emailVerificationCodePlaceholder}
                  required
                />
              </div>
            </label>

            <label className="field auth-field">
              <span>{copy.auth.passwordResetNewPassword}</span>
              <div className="input-with-icon password-field">
                <LockKeyhole size={17} />
                <input
                  autoComplete="new-password"
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

            <button
              className="auth-submit"
              type="submit"
              disabled={resetMutation.isPending || code.length !== 6 || !isStrongPassword}
            >
              <ShieldCheck size={17} />
              {resetMutation.isPending
                ? copy.auth.passwordResetSaving
                : copy.auth.passwordResetSubmit}
            </button>
          </form>
        )}

        {(requestMutation.isError || resetMutation.isError) && (
          <p className="error auth-error">
            {step === "request"
              ? copy.auth.passwordResetRequestError
              : copy.auth.passwordResetCodeError}
          </p>
        )}

        <Link className="auth-mode-switch" to="/login">
          {copy.auth.switchToLogin}
        </Link>
      </div>
    </section>
  );
};
