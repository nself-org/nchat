/**
 * Email Heading Component
 *
 * Reusable heading component for email templates.
 */

import { Heading } from "@react-email/components";
import * as React from "react";

interface EmailHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
}

export default function EmailHeading({
  children,
  level = 1,
}: EmailHeadingProps) {
  const styles = {
    1: h1,
    2: h2,
    3: h3,
  };

  return (
    <Heading as={`h${level}` as "h1" | "h2" | "h3"} style={styles[level]}>
      {children}
    </Heading>
  );
}

// ============================================================================
// Styles
// ============================================================================

const h1 = {
  color: "#0f172a",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 24px",
  lineHeight: "1.3",
};

const h2 = {
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "600",
  margin: "24px 0 16px",
  lineHeight: "1.3",
};

const h3 = {
  color: "#334155",
  fontSize: "18px",
  fontWeight: "600",
  margin: "16px 0 12px",
  lineHeight: "1.4",
};
