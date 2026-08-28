import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import enLocale from "../../i18n/en.json";
import roLocale from "../../i18n/ro.json";
import { getCategoriesRequest, getLanguagesRequest } from "./posts.api";
import type {
  LanguageItem,
  PostPayload,
  PostTranslationItem,
} from "./posts.types";

type Props = {
  onSubmit: (payload: PostPayload) => Promise<unknown> | unknown;
  isPending?: boolean;
  initialValue?: PostPayload;
  submitLabel?: string;
  pendingLabel?: string;
  onCancel?: () => void;
  isAdmin?: boolean;
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

const readTimeOptions = ["5 min", "10 min", "15 min", "20 min", "30 min", "+30 min"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ValidationErrors = Record<string, string[]>;

const validateTranslations = (
  translations: PostTranslationItem[],
  messages: typeof roLocale.postValidation,
) => {
  const errors: ValidationErrors = {};

  for (const translation of translations) {
    const fieldErrors: string[] = [];
    if (translation.title.trim().length < 3) fieldErrors.push(messages.title);
    if (
      translation.slug.trim().length < 3 ||
      !slugPattern.test(translation.slug.trim())
    ) {
      fieldErrors.push(messages.slug);
    }
    if (translation.excerpt.trim().length < 20) fieldErrors.push(messages.excerpt);
    if (translation.content.trim().length < 10) fieldErrors.push(messages.content);
    if (!readTimeOptions.includes(translation.readTime ?? "")) {
      fieldErrors.push(messages.readTime);
    }
    if (fieldErrors.length > 0) errors[translation.languageCode] = fieldErrors;
  }

  return errors;
};

const emptyTranslation = (languageCode: string): PostTranslationItem => ({
  languageCode,
  title: "",
  slug: "",
  excerpt: "",
  readTime: "5 min",
  content: "",
});

const translationsFor = (
  languages: LanguageItem[],
  existing: PostTranslationItem[] = [],
) =>
  languages.map((language) => {
    const existingTranslation = existing.find(
      (item) => item.languageCode === language.code,
    );

    return existingTranslation
      ? { ...existingTranslation, readTime: existingTranslation.readTime || "5 min" }
      : emptyTranslation(language.code);
  });

export const CreatePostForm = ({
  onSubmit,
  isPending,
  initialValue,
  submitLabel,
  pendingLabel,
  onCancel,
  isAdmin = false,
}: Props) => {
  const { copy, language } = useI18n();
  const localeCopy = language === "ro" ? roLocale : enLocale;
  const languagesQuery = useQuery({
    queryKey: ["languages"],
    queryFn: getLanguagesRequest,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoriesRequest,
  });
  const languages = languagesQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  const [activeLanguageCode, setActiveLanguageCode] = useState("");
  const [payload, setPayload] = useState<PostPayload>({
    category: "design",
    status: "draft",
    imageUrl: "",
    translations: [],
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (languages.length === 0 || categories.length === 0) return;

    setPayload((current) => ({
      category:
        initialValue?.category ??
        (categories.some((category) => category.code === current.category)
          ? current.category
          : categories[0].code),
      status: isAdmin
        ? (initialValue?.status ?? current.status ?? "draft")
        : (initialValue?.status === "published" ? "published" : "draft"),
      imageUrl: initialValue?.imageUrl ?? current.imageUrl ?? "",
      translations: translationsFor(
        languages,
        initialValue?.translations ?? current.translations,
      ),
    }));
    setActiveLanguageCode((current) =>
      languages.some((language) => language.code === current)
        ? current
        : (languages.find((language) => language.isDefault)?.code ??
          languages[0].code),
    );
  }, [categories, initialValue, isAdmin, languages]);

  const activeLanguage =
    languages.find((language) => language.code === activeLanguageCode) ??
    languages[0];
  const activeTranslation =
    payload.translations.find(
      (translation) => translation.languageCode === activeLanguage?.code,
    ) ?? emptyTranslation(activeLanguage?.code ?? "");
  const activeErrors = validationErrors[activeLanguage?.code ?? ""] ?? [];

  const updateTranslation = (
    languageCode: string,
    updates: Partial<PostTranslationItem>,
  ) => {
    setPayload((current) => ({
      ...current,
      translations: current.translations.map((translation) =>
        translation.languageCode === languageCode
          ? { ...translation, ...updates }
          : translation,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validateTranslations(
      payload.translations,
      localeCopy.postValidation,
    );
    setValidationErrors(errors);
    const firstInvalidLanguage = Object.keys(errors)[0];
    if (firstInvalidLanguage) {
      setActiveLanguageCode(firstInvalidLanguage);
      return;
    }

    await onSubmit({
      category: payload.category,
      status: isAdmin
        ? payload.status
        : initialValue
          ? payload.status !== initialValue.status
            ? payload.status
            : undefined
          : "draft",
      imageUrl: payload.imageUrl?.trim() || undefined,
      translations: payload.translations.map((translation) => ({
        ...translation,
        title: translation.title.trim(),
        slug: translation.slug.trim(),
        excerpt: translation.excerpt?.trim() || "",
        readTime: translation.readTime?.trim() || undefined,
        content: translation.content.trim(),
      })),
    });

    if (!initialValue) {
      setValidationErrors({});
      setPayload({
        category: "design",
        status: "draft",
        imageUrl: "",
        translations: translationsFor(languages),
      });
    }
  };

  if (languagesQuery.isLoading || categoriesQuery.isLoading) {
    return <p>{copy.authorStudio.loading}</p>;
  }
  if (languagesQuery.error instanceof Error) {
    return <p className="error">{languagesQuery.error.message}</p>;
  }
  if (categoriesQuery.error instanceof Error) {
    return <p className="error">{categoriesQuery.error.message}</p>;
  }
  if (!activeLanguage || categories.length === 0) {
    return <p className="error">{copy.postForm.noActiveLanguages}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="post-form">
      <div className="post-form-grid">
        <div className="post-form-fields">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{copy.postForm.editDetails}</p>
              <h3>{copy.postForm.title}</h3>
            </div>
            {initialValue && (
              <span className={`status-pill status-${payload.status}`}>
                {copy.postForm.statusOptions[payload.status ?? "draft"]}
              </span>
            )}
          </div>

          <div
            className="language-tabs"
            role="tablist"
            aria-label={copy.language.label}
          >
            {languages.map((language) => (
              <button
                className={
                  activeLanguage.code === language.code
                    ? "language-tab active"
                    : "language-tab"
                }
                key={language.code}
                onClick={() => setActiveLanguageCode(language.code)}
                role="tab"
                type="button"
              >
                {language.nativeName} ({language.code.toUpperCase()})
              </button>
            ))}
          </div>
          <p className="translation-hint">
            {copy.postForm.translationHint}
          </p>
          <p className="translation-hint">
            {isAdmin ? copy.postForm.workflowHelp : copy.postForm.archiveHelp}
          </p>
          {activeErrors.length > 0 && (
            <div className="form-validation-errors" role="alert">
              <strong>{localeCopy.postValidation.invalid}</strong>
              <ul>
                {activeErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <label className="field">
            <span>{copy.postForm.title}</span>
            <input
              value={activeTranslation.title}
              onChange={(event) =>
                updateTranslation(activeLanguage.code, {
                  title: event.target.value,
                  slug:
                    activeTranslation.slug || createSlug(event.target.value),
                })
              }
              placeholder={copy.postForm.placeholders.title}
              aria-invalid={activeErrors.includes(localeCopy.postValidation.title)}
              required
            />
          </label>

          <label className="field">
            <span>{copy.postForm.slug}</span>
            <input
              value={activeTranslation.slug}
              onChange={(event) =>
                updateTranslation(activeLanguage.code, {
                  slug: createSlug(event.target.value),
                })
              }
              placeholder={copy.postForm.placeholders.slug}
              aria-invalid={activeErrors.includes(localeCopy.postValidation.slug)}
              required
            />
          </label>

          <div className="form-columns">
            <label className="field">
              <span>{copy.postForm.readTime}</span>
              <select
                value={activeTranslation.readTime ?? ""}
                onChange={(event) =>
                  updateTranslation(activeLanguage.code, {
                    readTime: event.target.value,
                  })
                }
                required
                aria-invalid={activeErrors.includes(localeCopy.postValidation.readTime)}
              >
                {readTimeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-columns">
            <label className="field">
              <span>{copy.postForm.category}</span>
              <select
                value={payload.category ?? "design"}
                onChange={(event) =>
                  setPayload({
                    ...payload,
                    category: event.target.value as PostPayload["category"],
                  })
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.code}>
                    {category.nativeName}
                  </option>
                ))}
              </select>
            </label>
            {initialValue && <label className="field">
              <span>{copy.postForm.status}</span>
              <select
                value={payload.status ?? "draft"}
                disabled={!isAdmin && initialValue?.status !== "published"}
                onChange={(event) =>
                  setPayload({
                    ...payload,
                    status: event.target.value as PostPayload["status"],
                  })
                }
              >
                {(isAdmin || !initialValue || initialValue.status === "draft") && (
                  <option value="draft">{copy.postForm.statusOptions.draft}</option>
                )}
                {(isAdmin || initialValue?.status === "published") && (
                  <option value="published">
                    {copy.postForm.statusOptions.published}
                  </option>
                )}
                {(isAdmin ||
                  initialValue?.status === "published" ||
                  initialValue?.status === "archived") && (
                  <option value="archived">
                    {copy.postForm.statusOptions.archived}
                  </option>
                )}
              </select>
            </label>}
          </div>

          <label className="field">
            <span>{copy.postForm.image}</span>
            <input
              type="url"
              value={payload.imageUrl ?? ""}
              onChange={(event) =>
                setPayload({ ...payload, imageUrl: event.target.value })
              }
              placeholder={copy.postForm.placeholders.image}
            />
          </label>

          <fieldset className="meta-fields">
            <legend>{copy.postForm.metaTitleSection}</legend>
            <label className="field">
              <span>{copy.postForm.metaTitle}</span>
              <input
                value={activeTranslation.metaTitle ?? ""}
                onChange={(event) =>
                  updateTranslation(activeLanguage.code, {
                    metaTitle: event.target.value,
                  })
                }
                placeholder={copy.postForm.placeholders.metaTitle}
                maxLength={180}
              />
            </label>
            <label className="field">
              <span>{copy.postForm.metaDescription}</span>
              <textarea
                value={activeTranslation.metaDescription ?? ""}
                onChange={(event) =>
                  updateTranslation(activeLanguage.code, {
                    metaDescription: event.target.value,
                  })
                }
                placeholder={copy.postForm.placeholders.metaDescription}
                maxLength={320}
                rows={3}
              />
            </label>
            <label className="field">
              <span>{copy.postForm.keywords}</span>
              <input
                value={activeTranslation.keywords ?? ""}
                onChange={(event) =>
                  updateTranslation(activeLanguage.code, {
                    keywords: event.target.value,
                  })
                }
                placeholder={copy.postForm.placeholders.keywords}
                maxLength={500}
              />
            </label>
          </fieldset>

          <label className="field">
            <span>{copy.postForm.excerpt}</span>
            <textarea
              value={activeTranslation.excerpt ?? ""}
              onChange={(event) =>
                updateTranslation(activeLanguage.code, {
                  excerpt: event.target.value,
                })
              }
              placeholder={copy.postForm.placeholders.excerpt}
              required
              aria-invalid={activeErrors.includes(localeCopy.postValidation.excerpt)}
              rows={3}
            />
          </label>
          <label className="field">
            <span>{copy.postForm.content}</span>
            <textarea
              value={activeTranslation.content}
              onChange={(event) =>
                updateTranslation(activeLanguage.code, {
                  content: event.target.value,
                })
              }
              placeholder={copy.postForm.placeholders.content}
              required
              aria-invalid={activeErrors.includes(localeCopy.postValidation.content)}
              rows={10}
            />
          </label>
        </div>

        <aside className="post-form-preview">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{copy.postForm.preview}</p>
              <h3>{activeTranslation.title || copy.postForm.placeholders.title}</h3>
            </div>
          </div>
          <p>{activeTranslation.excerpt || copy.postForm.placeholders.excerpt}</p>
          <div className="preview-meta">
            <span>
              {copy.home.categories[
                (payload.category ?? "design") as keyof typeof copy.home.categories
              ] ?? payload.category}
            </span>
            <span>
              {activeTranslation.content.trim().split(/\s+/).filter(Boolean).length}{" "}
              {copy.postForm.wordCount}
            </span>
            <span>
              {activeTranslation.readTime || copy.postForm.optionalReadTime}
            </span>
          </div>
        </aside>
      </div>

      <div className="button-row form-actions">
        <button type="submit" disabled={isPending}>
          {isPending
            ? (pendingLabel ?? copy.postForm.creating)
            : (submitLabel ?? copy.postForm.create)}
        </button>
        {onCancel && (
          <button className="secondary" onClick={onCancel} type="button">
            {copy.postForm.cancel}
          </button>
        )}
      </div>
    </form>
  );
};
