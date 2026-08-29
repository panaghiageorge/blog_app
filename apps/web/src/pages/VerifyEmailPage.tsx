import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { verifyEmailRequest } from "../modules/auth/auth.api";

export const VerifyEmailPage = () => {
  const { copy } = useI18n();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: () => verifyEmailRequest(email.trim(), code.trim()),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    verifyMutation.mutate();
  };

  return (
    <section className="auth-center-page">
      <div className="auth-card-modern verify-card">
        {verifyMutation.isSuccess ? (
          <div className="verify-success-state">
            <div className="verify-success-icon" aria-hidden="true">
              <CheckCircle2 size={34} />
            </div>
            <p className="eyebrow">{copy.auth.emailVerificationEyebrow}</p>
            <h2>{copy.auth.emailVerificationSuccessTitle}</h2>
            <p>{copy.auth.emailVerificationSuccessBody}</p>
            <Link className="auth-submit verify-success-action" to="/login">
              {copy.auth.submitLogin}
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-card-header">
              <p className="eyebrow">{copy.auth.emailVerificationEyebrow}</p>
              <h2>{copy.auth.emailVerificationTitle}</h2>
              <p>{copy.auth.emailVerificationIntro}</p>
            </div>

            <form className="form auth-form" onSubmit={onSubmit}>
              <label className="field auth-field">
                <span>{copy.auth.emailVerificationEmail}</span>
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

              <button
                className="auth-submit"
                type="submit"
                disabled={verifyMutation.isPending || code.length !== 6}
              >
                <ShieldCheck size={17} />
                {verifyMutation.isPending
                  ? copy.auth.emailVerificationPending
                  : copy.auth.emailVerificationSubmit}
              </button>
            </form>

            {verifyMutation.isError && (
              <p className="error auth-error">
                {copy.auth.emailVerificationErrorBody}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};



