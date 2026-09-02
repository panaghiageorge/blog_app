import { apiRequest } from "../shared/api";

export type LegalPageKey = "terms" | "gdpr" | "marketing";

export type LegalPageItem = {
  id: number | null;
  key: LegalPageKey;
  languageCode: string;
  title: string;
  content: string;
  updatedAt: string | null;
  createdAt: string | null;
};

export type NewsletterSubscriptionItem = {
  id: number;
  email: string;
  languageCode: string;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  marketingAccepted: boolean;
  marketingAcceptedAt: string | null;
  subscribedAt: string;
  updatedAt: string;
};

export const getLegalPageRequest = (key: LegalPageKey, language: string) =>
  apiRequest<{ item: LegalPageItem }>(
    "/api/legal/" + key + "?language=" + encodeURIComponent(language),
  );

export const updateLegalPageRequest = (
  key: LegalPageKey,
  payload: { languageCode: string; title: string; content: string },
) =>
  apiRequest<{ item: LegalPageItem }>("/api/legal/" + key, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const subscribeNewsletterRequest = (payload: {
  email: string;
  termsAccepted: true;
  marketingAccepted: boolean;
  languageCode: string;
}) =>
  apiRequest<{ ok: true; item: NewsletterSubscriptionItem }>("/api/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getNewsletterSubscriptionsRequest = () =>
  apiRequest<{ items: NewsletterSubscriptionItem[] }>("/api/legal/newsletter/subscriptions");
