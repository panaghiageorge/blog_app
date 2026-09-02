import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { DesignMultiSelect } from "../../components/DesignMultiSelect";
import { DesignSelect } from "../../components/DesignSelect";
import { useI18n } from "../../i18n/I18nContext";
import { mediaUrl } from "../../shared/media";
import enLocale from "../../i18n/en.json";
import roLocale from "../../i18n/ro.json";
import { getCategoriesRequest, getLanguagesRequest, getTagsRequest, uploadPostImageRequest } from "./posts.api";
import type {
  LanguageItem,
  PostPayload,
  PostTranslationItem,
} from "./posts.types";

type Props = {
  onSubmit: (payload: PostPayload) => Promise<unknown> | unknown;
  isPending?: boolean;
  initialValue?: PostPayload & { tags?: { id: number }[] };
  submitLabel?: string;
  pendingLabel?: string;
  onCancel?: () => void;
  isAdmin?: boolean;
  onDraftChange?: (payload: PostPayload) => void;
  autosaveStatus?: string;
  warnOnUnsavedChanges?: boolean;
  isNewPost?: boolean;
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

const readTimeOptions = [
  "5 min",
  "10 min",
  "15 min",
  "20 min",
  "30 min",
  "+30 min",
];
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
    if (translation.excerpt.trim().length < 20)
      fieldErrors.push(messages.excerpt);
    if (translation.excerpt.trim().length > 320)
      fieldErrors.push(messages.excerptMax);
    if ((translation.metaTitle ?? "").trim().length > 180)
      fieldErrors.push(messages.metaTitleMax);
    if ((translation.metaDescription ?? "").trim().length > 320)
      fieldErrors.push(messages.metaDescriptionMax);
    if ((translation.keywords ?? "").trim().length > 500)
      fieldErrors.push(messages.keywordsMax);
    if (translation.content.trim().length < 10)
      fieldErrors.push(messages.content);
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
      ? {
          ...existingTranslation,
          readTime: existingTranslation.readTime || "5 min",
        }
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
  onDraftChange,
  autosaveStatus,
  warnOnUnsavedChanges = false,
  isNewPost = !initialValue,
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
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: getTagsRequest,
  });
  const uploadImageMutation = useMutation({
    mutationFn: uploadPostImageRequest,
    onSuccess: (data) => {
      setPayload((current) => ({ ...current, imageUrl: data.url }));
    },
  });
  const galleryUploadMutation = useMutation({
    mutationFn: uploadPostImageRequest,
    onSuccess: (data) => {
      setPayload((current) => ({
        ...current,
        galleryImages: [...(current.galleryImages ?? []), data.url].slice(0, 5),
      }));
    },
  });
  const contentImageMutation = useMutation({
    mutationFn: uploadPostImageRequest,
    onSuccess: (data) => {
      if (!activeLanguage?.code) return;
      const currentContent = activeTranslation.content.trimEnd();
      updateTranslation(activeLanguage.code, {
        content: `${currentContent}${currentContent ? "\n\n" : ""}![${copy.postForm.contentImageAlt}](${data.url})\n\n`,
      });
    },
  });
  const languages = languagesQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  const tags = tagsQuery.data?.items ?? [];
  const [activeLanguageCode, setActiveLanguageCode] = useState("");
  const [payload, setPayload] = useState<PostPayload>({
    category: "design",
    status: "draft",
    imageUrl: "",
    galleryImages: [],
    translations: [],
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const initialPayloadRef = useRef("");
  const didInitializeRef = useRef(false);

  useEffect(() => {
    if (languages.length === 0 || categories.length === 0) return;

    setPayload((current) => {
      const nextPayload = {
      category:
        initialValue?.category ??
        (categories.some((category) => category.code === current.category)
          ? current.category
          : categories[0].code),
      status: isAdmin
        ? (initialValue?.status ?? current.status ?? "draft")
        : initialValue?.status === "published"
          ? "published"
          : "draft",
      imageUrl: initialValue?.imageUrl ?? current.imageUrl ?? "",
      galleryImages: initialValue?.galleryImages ?? current.galleryImages ?? [],
      tagIds: initialValue?.tagIds ?? initialValue?.tags?.map((tag) => tag.id) ?? current.tagIds ?? [],
      translations: translationsFor(
        languages,
        initialValue?.translations ?? current.translations,
      ),
    };
      if (!didInitializeRef.current) {
        initialPayloadRef.current = JSON.stringify(nextPayload);
        didInitializeRef.current = true;
      }
      return nextPayload;
    });
    setActiveLanguageCode((current) =>
      languages.some((language) => language.code === current)
        ? current
        : (languages.find((language) => language.isDefault)?.code ??
          languages[0].code),
    );
  }, [categories, initialValue, isAdmin, languages]);

  useEffect(() => {
    if (!didInitializeRef.current) return;
    onDraftChange?.(payload);
  }, [onDraftChange, payload]);

  const hasUnsavedChanges =
    didInitializeRef.current && JSON.stringify(payload) !== initialPayloadRef.current;

  useEffect(() => {
    if (!warnOnUnsavedChanges || !hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, warnOnUnsavedChanges]);

  const activeLanguage =
    languages.find((language) => language.code === activeLanguageCode) ??
    languages[0];
  const activeTranslation =
    payload.translations.find(
      (translation) => translation.languageCode === activeLanguage?.code,
    ) ?? emptyTranslation(activeLanguage?.code ?? "");
  const activeErrors = validationErrors[activeLanguage?.code ?? ""] ?? [];
  const categoryOptions = categories.map((category) => ({
    label: category.nativeName,
    value: category.code,
  }));
  const readTimeSelectOptions = readTimeOptions.map((option) => ({
    label: option,
    value: option,
  }));
  const statusOptions = [
    ...(isAdmin || !initialValue || initialValue.status === "draft"
      ? [{ label: copy.postForm.statusOptions.draft, value: "draft" as const }]
      : []),
    ...(isAdmin || initialValue?.status === "draft"
      ? [{ label: copy.postForm.statusOptions.pending_review, value: "pending_review" as const }]
      : []),
    ...(isAdmin || initialValue?.status === "published"
      ? [{ label: copy.postForm.statusOptions.published, value: "published" as const }]
      : []),
    ...(isAdmin || initialValue?.status === "published" || initialValue?.status === "archived"
      ? [{ label: copy.postForm.statusOptions.archived, value: "archived" as const }]
      : []),
  ];
  const tagOptions = tags.map((tag) => ({ label: tag.name, value: String(tag.id) }));
  const selectedTagValues = (payload.tagIds ?? []).map(String);
  const galleryImages = (payload.galleryImages ?? []).slice(0, 5);
  const canAddGalleryImage = galleryImages.length < 5;

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

    const submittedPayload = {
      category: payload.category,
      status: isAdmin
        ? payload.status
        : !isNewPost && initialValue
          ? payload.status !== initialValue.status
            ? payload.status
            : undefined
          : "draft",
      imageUrl: payload.imageUrl?.trim() || undefined,
      galleryImages: (payload.galleryImages ?? []).filter(Boolean).slice(0, 5),
      tagIds: payload.tagIds ?? [],
      translations: payload.translations.map((translation) => ({
        ...translation,
        title: translation.title.trim(),
        slug: translation.slug.trim(),
        excerpt: translation.excerpt?.trim() || "",
        readTime: translation.readTime?.trim() || undefined,
        content: translation.content.trim(),
      })),
    };

    await onSubmit(submittedPayload);
    initialPayloadRef.current = JSON.stringify(payload);

    if (isNewPost) {
      setValidationErrors({});
      setPayload({
        category: "design",
        status: "draft",
        imageUrl: "",
        galleryImages: [],
        tagIds: [],
        translations: translationsFor(languages),
      });
    }
  };

  if (languagesQuery.isLoading || categoriesQuery.isLoading || tagsQuery.isLoading) {
    return <p>{copy.authorStudio.loading}</p>;
  }
  if (languagesQuery.error instanceof Error) {
    return <p className="error">{languagesQuery.error.message}</p>;
  }
  if (categoriesQuery.error instanceof Error) {
    return <p className="error">{categoriesQuery.error.message}</p>;
  }
  if (tagsQuery.error instanceof Error) {
    return <p className="error">{tagsQuery.error.message}</p>;
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
            {autosaveStatus && (
              <span className="autosave-status">{autosaveStatus}</span>
            )}
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
          <p className="translation-hint">{copy.postForm.translationHint}</p>
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
              aria-invalid={activeErrors.includes(
                localeCopy.postValidation.title,
              )}
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
              aria-invalid={activeErrors.includes(
                localeCopy.postValidation.slug,
              )}
              required
            />
          </label>

          <div className="form-columns">
            <label className="field">
              <span>{copy.postForm.readTime}</span>
              <DesignSelect
                label={copy.postForm.readTime}
                value={activeTranslation.readTime ?? "5 min"}
                options={readTimeSelectOptions}
                onValueChange={(value) =>
                  updateTranslation(activeLanguage.code, { readTime: value })
                }
              />
            </label>
          </div>

          <div className="form-columns">
            <label className="field">
              <span>{copy.postForm.category}</span>
              <DesignSelect
                label={copy.postForm.category}
                value={payload.category ?? categories[0]?.code ?? "design"}
                options={categoryOptions}
                onValueChange={(value) =>
                  setPayload({
                    ...payload,
                    category: value as PostPayload["category"],
                  })
                }
              />
            </label>
            {initialValue && (
              <label className="field">
                <span>{copy.postForm.status}</span>
                <DesignSelect
                  label={copy.postForm.status}
                  value={payload.status ?? "draft"}
                  options={statusOptions}
                  onValueChange={(value) =>
                    setPayload({
                      ...payload,
                      status: value as PostPayload["status"],
                    })
                  }
                />
              </label>
            )}
          </div>

          <div className="field image-upload-field">
            <span>{copy.postForm.image}</span>
            <div className="image-upload-control">
              <input
                type="url"
                value={payload.imageUrl ?? ""}
                onChange={(event) =>
                  setPayload({ ...payload, imageUrl: event.target.value })
                }
                placeholder={copy.postForm.placeholders.image}
              />
              <label className="upload-button">
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadImageMutation.mutate(file);
                    event.target.value = "";
                  }}
                />
                {uploadImageMutation.isPending
                  ? copy.postForm.uploadingImage
                  : copy.postForm.uploadImage}
              </label>
            </div>
            {uploadImageMutation.error instanceof Error && (
              <p className="error">{copy.postForm.uploadImageError}</p>
            )}
            {payload.imageUrl && (
              <div className="image-upload-preview">
                <img src={mediaUrl(payload.imageUrl)} alt="" />
              </div>
            )}
          </div>

          <div className="field gallery-manager">
            <div className="gallery-manager-header">
              <span>{copy.postForm.galleryImages}</span>
              <small>{copy.postForm.galleryHelp}</small>
            </div>
            <div className="gallery-grid">
              {galleryImages.map((image, index) => (
                <div className="gallery-card" key={image + index}>
                  <img src={mediaUrl(image)} alt="" />
                  <button
                    type="button"
                    className="icon-button gallery-remove"
                    onClick={() =>
                      setPayload((current) => ({
                        ...current,
                        galleryImages: (current.galleryImages ?? []).filter((_, imageIndex) => imageIndex !== index),
                      }))
                    }
                    aria-label={copy.postForm.removeImage}
                    title={copy.postForm.removeImage}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {canAddGalleryImage && (
                <label className="gallery-add-card">
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) galleryUploadMutation.mutate(file);
                      event.target.value = "";
                    }}
                  />
                  <ImagePlus size={19} />
                  <span>{galleryUploadMutation.isPending ? copy.postForm.uploadingImage : copy.postForm.addGalleryImage}</span>
                </label>
              )}
            </div>
            {!canAddGalleryImage && <p className="field-help">{copy.postForm.galleryLimit}</p>}
            {galleryUploadMutation.error instanceof Error && (
              <p className="error">{copy.postForm.uploadImageError}</p>
            )}
          </div>

          <fieldset className="meta-fields tag-picker">
            <legend>{copy.postForm.tags}</legend>
            <DesignMultiSelect
              clearLabel={copy.postForm.clearTags}
              emptyLabel={copy.postForm.allTags}
              label={copy.postForm.tags}
              options={tagOptions}
              values={selectedTagValues}
              selectedLabel={(count) => `${count} ${copy.postForm.selectedTags}`}
              onChange={(values) =>
                setPayload({
                  ...payload,
                  tagIds: values.map((value) => Number(value)),
                })
              }
            />
          </fieldset>

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
              maxLength={320}
              required
              aria-invalid={activeErrors.includes(
                localeCopy.postValidation.excerpt,
              )}
              rows={3}
            />
          </label>
          <div className="field">
            <span>{copy.postForm.content}</span>
            <div className="content-image-toolbar">
              <label className="upload-button compact-upload-button">
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) contentImageMutation.mutate(file);
                    event.target.value = "";
                  }}
                />
                <ImagePlus size={17} />
                {contentImageMutation.isPending
                  ? copy.postForm.insertingContentImage
                  : copy.postForm.insertContentImage}
              </label>
            </div>
            {contentImageMutation.error instanceof Error && (
              <p className="error">{copy.postForm.uploadImageError}</p>
            )}
            <textarea
              value={activeTranslation.content}
              onChange={(event) =>
                updateTranslation(activeLanguage.code, {
                  content: event.target.value,
                })
              }
              placeholder={copy.postForm.placeholders.content}
              required
              aria-invalid={activeErrors.includes(
                localeCopy.postValidation.content,
              )}
              rows={10}
            />
          </div>
        </div>

        <aside className="post-form-preview">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{copy.postForm.preview}</p>
              <h3>
                {activeTranslation.title || copy.postForm.placeholders.title}
              </h3>
            </div>
          </div>
          <p>
            {activeTranslation.excerpt || copy.postForm.placeholders.excerpt}
          </p>
          <div className="preview-meta">
            <span>
              {copy.home.categories[
                (payload.category ??
                  "design") as keyof typeof copy.home.categories
              ] ?? payload.category}
            </span>
            <span>
              {
                activeTranslation.content.trim().split(/\s+/).filter(Boolean)
                  .length
              }{" "}
              {copy.postForm.wordCount}
            </span>
            <span>
              {activeTranslation.readTime || copy.postForm.optionalReadTime}
            </span>
            {(payload.tagIds ?? []).length > 0 && (
              <span>{(payload.tagIds ?? []).length} {copy.postForm.tags}</span>
            )}
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

