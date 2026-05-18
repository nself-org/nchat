/**
 * Email Button Component
 *
 * Reusable button component for email templates.
 */

import { Button } from "@react-email/components";
import * as React from "react";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export default function EmailButton({
  href,
  children,
  variant = "primary",
}: EmailButtonProps) {
  const styles = {
    primary: buttonPrimary,
    secondary: buttonSecondary,
    danger: buttonDanger,
  };

  return (
    <Button href={href} style={{ ...buttonBase, ...styles[variant] }}>
      {children}
    </Button>
  );
}

// ============================================================================
// Styles
// ============================================================================

const buttonBase = {
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: "8px",
  lineHeight: "100%",
  maxWidth: "100%",
  marginTop: "16px",
  marginBottom: "16px",
};

const buttonPrimary = {
  backgroundColor: "#38bdf8",
  color: "#ffffff",
};

const buttonSecondary = {
  backgroundColor: "#f1f5f9",
  color: "#0f172a",
};

const buttonDanger = {
  backgroundColor: "#ef4444",
  color: "#ffffff",
};
