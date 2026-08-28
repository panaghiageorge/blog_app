import enLocale from "./en.json";
import roLocale from "./ro.json";

export type Language = "ro" | "en";

export type CategoryId = string;

export const languageLabels: Record<Language, string> = {
  ro: "RO",
  en: "EN",
};

export const translations = {
  ro: roLocale,
  en: enLocale,
} as const;
