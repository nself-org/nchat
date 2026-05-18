/**
 * Type declarations for samlify (SAML 2.0 library)
 *
 * These are minimal type declarations for the samlify package.
 * samlify is an optional dependency for SAML SSO support.
 *
 * Install with: pnpm add samlify
 * Full documentation: https://github.com/tngan/samlify
 */

declare module "samlify" {
  interface ServiceProviderConfig {
    entityID: string;
    assertionConsumerService?: Array<{
      Binding: string;
      Location: string;
    }>;
    singleLogoutService?: Array<{
      Binding: string;
      Location: string;
    }>;
    wantAssertionsSigned?: boolean;
    wantMessageSigned?: boolean;
    signatureConfig?: {
      prefix?: string;
      location?: {
        reference: string;
        action: "before" | "after" | "prepend" | "append";
      };
    };
    privateKey?: string;
    privateKeyPass?: string;
    encPrivateKey?: string;
    signingCert?: string;
  }

  interface IdentityProviderConfig {
    entityID: string;
    metadata?: string;
    signingCert?: string;
    encryptCert?: string;
    singleSignOnService?: Array<{
      Binding: string;
      Location: string;
    }>;
    singleLogoutService?: Array<{
      Binding: string;
      Location: string;
    }>;
    nameIDFormat?: string[];
    wantAuthnRequestsSigned?: boolean;
  }

  interface ParseLoginResponseResult {
    extract: {
      nameID?: string;
      sessionIndex?: {
        sessionIndex?: string;
        authnInstant?: string;
      };
      attributes?: Record<string, string | string[]>;
      conditions?: {
        notBefore?: string;
        notOnOrAfter?: string;
      };
    };
    samlContent?: string;
  }

  interface CreateLogoutRequestResult {
    context: string;
    id: string;
  }

  interface ParseLogoutResponseResult {
    extract: {
      issuer?: string;
      statusCode?: string;
      inResponseTo?: string;
    };
    samlContent?: string;
  }

  interface ServiceProvider {
    parseLoginResponse(
      idp: IdentityProvider,
      binding: "post" | "redirect",
      request: {
        body?: { SAMLResponse?: string };
        query?: { SAMLResponse?: string; RelayState?: string };
      },
    ): Promise<ParseLoginResponseResult>;

    createLoginRequest(
      idp: IdentityProvider,
      binding: "post" | "redirect",
      options?: {
        relayState?: string;
        assertionConsumerServiceUrl?: string;
      },
    ): { context: string; id: string };

    createLogoutRequest(
      idp: IdentityProvider,
      binding: "post" | "redirect",
      user: {
        logoutNameID?: string;
        sessionIndex?: string;
      },
      relayState?: string,
    ): CreateLogoutRequestResult;

    parseLogoutResponse(
      idp: IdentityProvider,
      binding: "post" | "redirect",
      request: {
        body?: { SAMLResponse?: string };
        query?: { SAMLResponse?: string; RelayState?: string };
      },
    ): Promise<ParseLogoutResponseResult>;

    getMetadata(): string;
    entityMeta: {
      getEntityID(): string;
      getAssertionConsumerService(binding: string): string | undefined;
      getSingleLogoutService?(binding: string): string | undefined;
    };
  }

  interface IdentityProvider {
    entityMeta: {
      getEntityID(): string;
      getSingleSignOnService(binding: string): string | undefined;
      getSingleLogoutService?(binding: string): string | undefined;
    };
  }

  export function ServiceProvider(
    config: ServiceProviderConfig,
  ): ServiceProvider;
  export function IdentityProvider(
    config: IdentityProviderConfig,
  ): IdentityProvider;

  export function setSchemaValidator(validator: {
    validate: (response: string) => Promise<string>;
  }): void;
}
