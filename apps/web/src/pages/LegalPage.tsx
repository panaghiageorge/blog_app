import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useI18n } from "../i18n/I18nContext";
import { getLegalPageRequest, type LegalPageKey } from "../modules/legal.api";
import { useDocumentMeta } from "../shared/useDocumentMeta";

const isLegalKey = (value: string | undefined): value is LegalPageKey =>
  value === "terms" || value === "gdpr" || value === "marketing";

export const LegalPage = () => {
  const { key } = useParams();
  const { copy, language } = useI18n();
  const legalKey = isLegalKey(key) ? key : "terms";
  const pageQuery = useQuery({
    queryKey: ["legal", legalKey, language],
    queryFn: () => getLegalPageRequest(legalKey, language),
  });
  const page = pageQuery.data?.item;

  useDocumentMeta({
    title: page ? page.title + " | " + copy.brand.name : copy.metaTitle,
    description: page?.content.slice(0, 150) ?? copy.home.intro,
    canonicalPath: "/legal/" + legalKey,
  });

  if (pageQuery.isLoading) return <EmptyState message={copy.legal.loading} />;
  if (!page) return <EmptyState message={copy.legal.notFound} />;

  return (
    <article className="legal-page">
      <Link className="text-link back-link" to="/">{copy.postPage.back}</Link>
      <header className="legal-hero">
        <p className="eyebrow">{copy.legal.eyebrow}</p>
        <h1>{page.title}</h1>
        {page.updatedAt && (
          <p>
            {copy.legal.updatedAt} {new Date(page.updatedAt).toLocaleDateString(language === "ro" ? "ro-RO" : "en-US")}
          </p>
        )}
      </header>
      <div className="legal-content">
        {page.content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
};
