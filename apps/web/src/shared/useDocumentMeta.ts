import { useEffect } from "react";

type DocumentMeta = {
  author?: string;
  canonicalPath?: string;
  description: string;
  image?: string | null;
  jsonLd?: Record<string, unknown>;
  keywords?: string | null;
  publishedTime?: string | null;
  tags?: string[];
  title: string;
  type?: "article" | "website";
};

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
};

const removeMeta = (selector: string) => {
  document.head.querySelectorAll(selector).forEach((element) => element.remove());
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
};

export const useDocumentMeta = ({
  author,
  canonicalPath,
  description,
  image,
  jsonLd,
  keywords,
  publishedTime,
  tags = [],
  title,
  type = "website",
}: DocumentMeta) => {
  useEffect(() => {
    const url = new URL(canonicalPath ?? window.location.pathname, window.location.origin).toString();

    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    }
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    if (image) {
      upsertMeta('meta[property="og:image"]', {
        property: "og:image",
        content: new URL(image, window.location.origin).toString(),
      });
    }

    removeMeta('meta[property^="article:"]');
    if (type === "article") {
      if (publishedTime) {
        upsertMeta('meta[property="article:published_time"]', {
          property: "article:published_time",
          content: publishedTime,
        });
      }
      if (author) {
        upsertMeta('meta[property="article:author"]', {
          property: "article:author",
          content: author,
        });
      }
      tags.forEach((tag) => {
        const element = document.createElement("meta");
        element.setAttribute("property", "article:tag");
        element.setAttribute("content", tag);
        document.head.appendChild(element);
      });
    }

    let structuredData = document.head.querySelector<HTMLScriptElement>('script[data-managed="json-ld"]');
    if (jsonLd) {
      if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.type = "application/ld+json";
        structuredData.dataset.managed = "json-ld";
        document.head.appendChild(structuredData);
      }
      structuredData.textContent = JSON.stringify(jsonLd);
    } else {
      structuredData?.remove();
    }

    upsertCanonical(url);
  }, [author, canonicalPath, description, image, jsonLd, keywords, publishedTime, tags, title, type]);
};