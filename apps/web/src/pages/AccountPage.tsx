import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, KeyRound, Mail, Shield, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../modules/auth/AuthContext";
import { uploadPostImageRequest } from "../modules/posts/posts.api";
import { changeAccountPasswordRequest, updateAccountRequest } from "../modules/users/users.api";
import { mediaUrl } from "../shared/media";

const passwordRules = [
  { key: "length", test: (value: string) => value.length >= 8 },
  { key: "lowercase", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", test: (value: string) => /[0-9]/.test(value) },
  { key: "symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

export const AccountPage = () => {
  const { copy, language } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.avatarUrl, user?.name]);

  const profileMutation = useMutation({
    mutationFn: updateAccountRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], { user: data.user });
      setProfileMessage(copy.account.profileSaved);
    },
    onError: () => setProfileMessage(copy.account.profileError),
  });

  const avatarMutation = useMutation({
    mutationFn: uploadPostImageRequest,
    onSuccess: (data) => setAvatarUrl(data.url),
    onError: () => setProfileMessage(copy.account.avatarError),
  });

  const passwordMutation = useMutation({
    mutationFn: changeAccountPasswordRequest,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage(copy.account.passwordSaved);
    },
    onError: () => setPasswordMessage(copy.account.passwordError),
  });

  const validRules = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, valid: rule.test(newPassword) })),
    [newPassword],
  );
  const canChangePassword = currentPassword.length >= 8 && validRules.every((rule) => rule.valid);

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileMessage("");
    profileMutation.mutate({ name, avatarUrl: avatarUrl.trim() || null });
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) return null;

  return (
    <section className="account-page">
      <header className="account-hero">
        <div className="account-avatar-large">
          {avatarUrl ? <img src={mediaUrl(avatarUrl)} alt="" /> : <span>{initialsFor(user.name)}</span>}
        </div>
        <div>
          <p className="eyebrow">{copy.account.eyebrow}</p>
          <h1>{copy.account.title}</h1>
          <p>{copy.account.intro}</p>
        </div>
      </header>

      <div className="account-grid">
        <form className="account-panel" onSubmit={submitProfile}>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{copy.account.profileEyebrow}</p>
              <h3>{copy.account.profileTitle}</h3>
            </div>
            <UserRound size={20} />
          </div>

          <label className="field">
            <span>{copy.auth.name}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />
          </label>

          <label className="field">
            <span>{copy.auth.email}</span>
            <div className="readonly-field"><Mail size={16} />{user.email}</div>
          </label>

          <div className="field image-upload-field">
            <span>{copy.account.avatar}</span>
            <div className="image-upload-control">
              <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder={copy.account.avatarPlaceholder} />
              <label className="upload-button">
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) avatarMutation.mutate(file);
                    event.target.value = "";
                  }}
                />
                <Camera size={17} />
                {avatarMutation.isPending ? copy.postForm.uploadingImage : copy.account.uploadAvatar}
              </label>
            </div>
          </div>

          <button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? copy.account.saving : copy.account.saveProfile}
          </button>
          {profileMessage && <p className="form-note">{profileMessage}</p>}
        </form>

        <form className="account-panel" onSubmit={submitPassword}>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{copy.account.securityEyebrow}</p>
              <h3>{copy.account.passwordTitle}</h3>
            </div>
            <KeyRound size={20} />
          </div>

          <label className="field">
            <span>{copy.account.currentPassword}</span>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
          </label>
          <label className="field">
            <span>{copy.account.newPassword}</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
          </label>

          <div className="password-rule-list">
            {validRules.map((rule) => (
              <span className={rule.valid ? "valid" : ""} key={rule.key}>
                <Check size={14} />
                {copy.auth.passwordRules[rule.key]}
              </span>
            ))}
          </div>

          <button type="submit" disabled={!canChangePassword || passwordMutation.isPending}>
            {passwordMutation.isPending ? copy.account.savingPassword : copy.account.savePassword}
          </button>
          {passwordMessage && <p className="form-note">{passwordMessage}</p>}
        </form>

        <aside className="account-panel account-summary">
          <Shield size={22} />
          <div>
            <p className="eyebrow">{copy.account.summaryEyebrow}</p>
            <h3>{copy.account.summaryTitle}</h3>
            <dl>
              <div><dt>{copy.account.role}</dt><dd>{user.role}</dd></div>
              <div><dt>{copy.account.language}</dt><dd>{language.toUpperCase()}</dd></div>
              <div><dt>{copy.account.memberSince}</dt><dd>{new Date(user.createdAt).toLocaleDateString(language === "ro" ? "ro-RO" : "en-US")}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
};
