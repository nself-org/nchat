/**
 * Auth Providers Index
 *
 * Central export for all authentication providers.
 * Each provider can be individually imported or all at once.
 */

// Re-export the plugin interface
export * from "../auth-plugin.interface";

// Import all providers
import EmailPasswordProvider from "./email-password.provider";
import MagicLinkProvider from "./magic-link.provider";
import GoogleProvider from "./google.provider";
import GitHubProvider from "./github.provider";
import AppleProvider from "./apple.provider";
import MicrosoftProvider from "./microsoft.provider";
import FacebookProvider from "./facebook.provider";
import TwitterProvider from "./twitter.provider";
import PhoneSmsProvider from "./phone-sms.provider";
import WhatsAppProvider from "./whatsapp.provider";
import TelegramProvider from "./telegram.provider";
import IdMeProvider from "./idme.provider";

// Export individual providers
export {
  EmailPasswordProvider,
  MagicLinkProvider,
  GoogleProvider,
  GitHubProvider,
  AppleProvider,
  MicrosoftProvider,
  FacebookProvider,
  TwitterProvider,
  PhoneSmsProvider,
  WhatsAppProvider,
  TelegramProvider,
  IdMeProvider,
};

// Provider map for dynamic access
export const authProviders = {
  "email-password": EmailPasswordProvider,
  "magic-link": MagicLinkProvider,
  google: GoogleProvider,
  github: GitHubProvider,
  apple: AppleProvider,
  microsoft: MicrosoftProvider,
  facebook: FacebookProvider,
  twitter: TwitterProvider,
  "phone-sms": PhoneSmsProvider,
  whatsapp: WhatsAppProvider,
  telegram: TelegramProvider,
  idme: IdMeProvider,
} as const;

export type AuthProviderId = keyof typeof authProviders;

// Provider categories for UI organization
export const providerCategories = {
  traditional: ["email-password", "magic-link"],
  social: ["google", "github", "apple", "microsoft", "facebook", "twitter"],
  phone: ["phone-sms", "whatsapp", "telegram"],
  verification: ["idme"],
} as const;

// Provider icons mapping (for UI)
export const providerIcons: Record<AuthProviderId, string> = {
  "email-password": "mail",
  "magic-link": "wand",
  google: "google",
  github: "github",
  apple: "apple",
  microsoft: "microsoft",
  facebook: "facebook",
  twitter: "twitter",
  "phone-sms": "phone",
  whatsapp: "whatsapp",
  telegram: "telegram",
  idme: "shield-check",
};

// Provider display names
export const providerNames: Record<AuthProviderId, string> = {
  "email-password": "Email & Password",
  "magic-link": "Magic Link",
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  microsoft: "Microsoft",
  facebook: "Facebook",
  twitter: "Twitter / X",
  "phone-sms": "Phone (SMS)",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  idme: "ID.me",
};

// Provider descriptions
export const providerDescriptions: Record<AuthProviderId, string> = {
  "email-password": "Sign in with email and password",
  "magic-link": "Passwordless sign in via email link",
  google: "Sign in with your Google account",
  github: "Sign in with your GitHub account",
  apple: "Sign in with your Apple ID",
  microsoft: "Sign in with your Microsoft account",
  facebook: "Sign in with your Facebook account",
  twitter: "Sign in with your Twitter/X account",
  "phone-sms": "Sign in with SMS verification",
  whatsapp: "Sign in with WhatsApp verification",
  telegram: "Sign in with your Telegram account",
  idme: "Verify your identity with ID.me",
};

// Feature flags mapping to provider IDs
export const featureFlagToProvider: Record<string, AuthProviderId> = {
  // sast-ignore: HARDCODED_CREDENTIAL -- these are auth provider identifier strings, not credential values
  emailPassword: "email-password",
  magicLinks: "magic-link",
  google: "google",
  github: "github",
  apple: "apple",
  microsoft: "microsoft",
  facebook: "facebook",
  twitter: "twitter",
  phoneSms: "phone-sms",
  whatsapp: "whatsapp",
  telegram: "telegram",
  idme: "idme",
};

// Reverse mapping
export const providerToFeatureFlag: Record<AuthProviderId, string> = {
  "email-password": "emailPassword",
  "magic-link": "magicLinks",
  google: "google",
  github: "github",
  apple: "apple",
  microsoft: "microsoft",
  facebook: "facebook",
  twitter: "twitter",
  "phone-sms": "phoneSms",
  whatsapp: "whatsapp",
  telegram: "telegram",
  idme: "idme",
};

/**
 * Create and configure all auth providers based on app config
 */
export function createAuthProviders(config: {
  emailPassword?: boolean;
  magicLinks?: boolean;
  google?: boolean;
  github?: boolean;
  apple?: boolean;
  microsoft?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  phoneSms?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  idme?: boolean | { enabled: boolean };
}): Map<AuthProviderId, InstanceType<(typeof authProviders)[AuthProviderId]>> {
  const providers = new Map<
    AuthProviderId,
    InstanceType<(typeof authProviders)[AuthProviderId]>
  >();

  // Create each provider and set enabled status
  if (config.emailPassword !== undefined) {
    const provider = new EmailPasswordProvider();
    provider.setEnabled(!!config.emailPassword);
    providers.set("email-password", provider);
  }

  if (config.magicLinks !== undefined) {
    const provider = new MagicLinkProvider();
    provider.setEnabled(!!config.magicLinks);
    providers.set("magic-link", provider);
  }

  if (config.google !== undefined) {
    const provider = new GoogleProvider();
    provider.setEnabled(!!config.google);
    providers.set("google", provider);
  }

  if (config.github !== undefined) {
    const provider = new GitHubProvider();
    provider.setEnabled(!!config.github);
    providers.set("github", provider);
  }

  if (config.apple !== undefined) {
    const provider = new AppleProvider();
    provider.setEnabled(!!config.apple);
    providers.set("apple", provider);
  }

  if (config.microsoft !== undefined) {
    const provider = new MicrosoftProvider();
    provider.setEnabled(!!config.microsoft);
    providers.set("microsoft", provider);
  }

  if (config.facebook !== undefined) {
    const provider = new FacebookProvider();
    provider.setEnabled(!!config.facebook);
    providers.set("facebook", provider);
  }

  if (config.twitter !== undefined) {
    const provider = new TwitterProvider();
    provider.setEnabled(!!config.twitter);
    providers.set("twitter", provider);
  }

  if (config.phoneSms !== undefined) {
    const provider = new PhoneSmsProvider();
    provider.setEnabled(!!config.phoneSms);
    providers.set("phone-sms", provider);
  }

  if (config.whatsapp !== undefined) {
    const provider = new WhatsAppProvider();
    provider.setEnabled(!!config.whatsapp);
    providers.set("whatsapp", provider);
  }

  if (config.telegram !== undefined) {
    const provider = new TelegramProvider();
    provider.setEnabled(!!config.telegram);
    providers.set("telegram", provider);
  }

  if (config.idme !== undefined) {
    const provider = new IdMeProvider();
    const isEnabled =
      typeof config.idme === "object" ? config.idme.enabled : !!config.idme;
    provider.setEnabled(isEnabled);
    providers.set("idme", provider);
  }

  return providers;
}

/**
 * Get enabled providers from a configuration object
 */
export function getEnabledProviders(
  config: Record<string, boolean | { enabled: boolean }>,
): AuthProviderId[] {
  const enabled: AuthProviderId[] = [];

  for (const [flag, value] of Object.entries(config)) {
    const providerId = featureFlagToProvider[flag];
    if (providerId) {
      const isEnabled = typeof value === "object" ? value.enabled : !!value;
      if (isEnabled) {
        enabled.push(providerId);
      }
    }
  }

  return enabled;
}

export default authProviders;
