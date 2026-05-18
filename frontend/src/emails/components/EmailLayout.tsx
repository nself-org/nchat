/**
 * Email Layout Component
 *
 * Provides consistent layout and branding for all email templates.
 * Uses React Email components for maximum email client compatibility.
 */

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  appName?: string;
  logoUrl?: string;
  footerText?: string;
}

export default function EmailLayout({
  preview,
  children,
  appName = "nChat",
  logoUrl,
  footerText,
}: EmailLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={appName}
                width="120"
                height="40"
                style={logo}
              />
            ) : (
              <Text style={logoText}>{appName}</Text>
            )}
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerTextStyle}>
              {footerText ||
                `© ${currentYear} ${appName}. All rights reserved.`}
            </Text>
            <Text style={footerLinks}>
              <a href="{{unsubscribeUrl}}" style={link}>
                Unsubscribe
              </a>{" "}
              |{" "}
              <a href="{{preferencesUrl}}" style={link}>
                Preferences
              </a>{" "}
              |{" "}
              <a href="{{helpUrl}}" style={link}>
                Help
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================================================
// Styles
// ============================================================================

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px",
  borderBottom: "1px solid #e6ebf1",
};

const logo = {
  margin: "0 auto",
};

const logoText = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#38bdf8",
  margin: "0",
  textAlign: "center" as const,
};

const content = {
  padding: "32px 48px",
};

const footer = {
  padding: "32px 48px",
  borderTop: "1px solid #e6ebf1",
  textAlign: "center" as const,
};

const footerTextStyle = {
  margin: "0 0 10px 0",
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "16px",
};

const footerLinks = {
  margin: "0",
  fontSize: "12px",
  color: "#8898aa",
};

const link = {
  color: "#38bdf8",
  textDecoration: "none",
};
