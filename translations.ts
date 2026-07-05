// Basit çeviri sözlüğü. Varsayılan dil "en" (İngilizce).
// Yeni dil eklemek için: aşağıya yeni bir anahtar (örn. "tr", "fr") ekle,
// aynı key'lerin çevirisini yaz. Kullanıcının seçtiği dil tarayıcıda
// localStorage'a kaydedilir, bir sonraki ziyarette hatırlanır.

export type Locale = "en" | "tr" | "fr";

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },
];

export const DEFAULT_LOCALE: Locale = "en";

export type TranslationKey =
  | "nav.whisky"
  | "nav.wine"
  | "nav.worldSpirits"
  | "nav.signIn"
  | "nav.signOut"
  | "nav.dashboard"
  | "product.inStock"
  | "product.outOfStock"
  | "product.priceDrop"
  | "product.addFavorite"
  | "auth.title"
  | "auth.emailPlaceholder"
  | "auth.sendLink"
  | "auth.checkEmail"
  | "dashboard.title"
  | "dashboard.empty"
  | "dashboard.notifyOnPriceDrop"
  | "dashboard.notifyOnRestock";

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "nav.whisky": "Whisky",
    "nav.wine": "Wine",
    "nav.worldSpirits": "World spirits",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "nav.dashboard": "Your bottles",
    "product.inStock": "In stock",
    "product.outOfStock": "Out of stock",
    "product.priceDrop": "Price drop",
    "product.addFavorite": "Track this bottle",
    "auth.title": "Sign in to track bottles",
    "auth.emailPlaceholder": "name@example.com",
    "auth.sendLink": "Send sign-in link",
    "auth.checkEmail": "Check your email for a sign-in link.",
    "dashboard.title": "Your tracked bottles",
    "dashboard.empty": "You're not tracking any bottles yet.",
    "dashboard.notifyOnPriceDrop": "On price drop",
    "dashboard.notifyOnRestock": "On restock",
  },
  tr: {
    "nav.whisky": "Viski",
    "nav.wine": "Şarap",
    "nav.worldSpirits": "Dünya içkileri",
    "nav.signIn": "Giriş yap",
    "nav.signOut": "Çıkış yap",
    "nav.dashboard": "Şişelerin",
    "product.inStock": "Stokta",
    "product.outOfStock": "Tükendi",
    "product.priceDrop": "Fiyat düştü",
    "product.addFavorite": "Bu şişeyi takip et",
    "auth.title": "Şişeleri takip etmek için giriş yap",
    "auth.emailPlaceholder": "isim@example.com",
    "auth.sendLink": "Giriş linki gönder",
    "auth.checkEmail": "Giriş linki için e-postanı kontrol et.",
    "dashboard.title": "Takip ettiğin şişeler",
    "dashboard.empty": "Henüz hiçbir şişeyi takip etmiyorsun.",
    "dashboard.notifyOnPriceDrop": "Fiyat düşünce",
    "dashboard.notifyOnRestock": "Stoğa girince",
  },
  fr: {
    "nav.whisky": "Whisky",
    "nav.wine": "Vin",
    "nav.worldSpirits": "Spiritueux du monde",
    "nav.signIn": "Se connecter",
    "nav.signOut": "Se déconnecter",
    "nav.dashboard": "Vos bouteilles",
    "product.inStock": "En stock",
    "product.outOfStock": "Épuisé",
    "product.priceDrop": "Baisse de prix",
    "product.addFavorite": "Suivre cette bouteille",
    "auth.title": "Connectez-vous pour suivre des bouteilles",
    "auth.emailPlaceholder": "nom@exemple.com",
    "auth.sendLink": "Envoyer le lien de connexion",
    "auth.checkEmail": "Vérifiez votre e-mail pour le lien de connexion.",
    "dashboard.title": "Vos bouteilles suivies",
    "dashboard.empty": "Vous ne suivez encore aucune bouteille.",
    "dashboard.notifyOnPriceDrop": "En cas de baisse",
    "dashboard.notifyOnRestock": "En cas de réappro",
  },
};

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations[DEFAULT_LOCALE][key];
}
