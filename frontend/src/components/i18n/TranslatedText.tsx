"use client";

/**
 * TranslatedText Component
 *
 * Renders translated text with interpolation support.
 */

import * as React from "react";
import { type ReactNode, useMemo } from "react";

import { translate, type TranslateOptions } from "@/lib/i18n/translator";

// ============================================================================
// Types
// ============================================================================

interface TranslatedTextProps {
  /** Translation key (e.g., 'common.buttons.save' or 'chat:messages.new') */
  i18nKey: string;
  /** Interpolation values */
  values?: Record<string, string | number | boolean>;
  /** Count for pluralization */
  count?: number;
  /** Context for contextual translations */
  context?: string;
  /** Default value if translation not found */
  defaultValue?: string;
  /** Namespace override */
  ns?: string;
  /** HTML tag to render (default: span) */
  as?: keyof React.JSX.IntrinsicElements;
  /** Additional class name */
  className?: string;
  /** Custom render function for rich formatting */
  children?: (text: string) => ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function TranslatedText({
  i18nKey,
  values,
  count,
  context,
  defaultValue,
  ns,
  as = "span",
  className,
  children,
}: TranslatedTextProps) {
  const options: TranslateOptions = useMemo(
    () => ({
      values,
      count,
      context,
      defaultValue,
      ns,
    }),
    [values, count, context, defaultValue, ns],
  );

  const translatedText = useMemo(
    () => translate(i18nKey, options),
    [i18nKey, options],
  );

  // If children is a render function, use it
  if (typeof children === "function") {
    return <>{children(translatedText)}</>;
  }

  const Component = as as React.ElementType;
  return <Component className={className}>{translatedText}</Component>;
}

// ============================================================================
// Shorthand Components
// ============================================================================

/**
 * T - Shorthand for TranslatedText
 */
export function T(props: TranslatedTextProps) {
  return <TranslatedText {...props} />;
}

/**
 * Plural - Shorthand for pluralized text
 */
interface PluralProps {
  i18nKey: string;
  count: number;
  values?: Record<string, string | number | boolean>;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

export function Plural({ i18nKey, count, values, as, className }: PluralProps) {
  return (
    <TranslatedText
      i18nKey={i18nKey}
      count={count}
      values={{ ...values, count }}
      as={as}
      className={className}
    />
  );
}

/**
 * Trans - Component for translations with embedded components
 *
 * Usage:
 * <Trans
 *   i18nKey="terms.accept"
 *   components={{
 *     link: <a href="/terms" />,
 *     bold: <strong />
 *   }}
 * />
 *
 * Where translation is: "By signing up you accept our <link>terms</link> and <bold>conditions</bold>"
 */
interface TransProps {
  i18nKey: string;
  components?: Record<string, ReactNode>;
  values?: Record<string, string | number | boolean>;
  count?: number;
  ns?: string;
  defaultValue?: string;
}

export function Trans({
  i18nKey,
  components = {},
  values,
  count,
  ns,
  defaultValue,
}: TransProps) {
  const translatedText = useMemo(
    () =>
      translate(i18nKey, {
        values,
        count,
        ns,
        defaultValue,
      }),
    [i18nKey, values, count, ns, defaultValue],
  );

  // Parse and replace component placeholders
  const rendered = useMemo(() => {
    if (Object.keys(components).length === 0) {
      return translatedText;
    }

    // Match patterns like <name>content</name> or <name />
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const regex = /<(\w+)(?:\s*\/>|>(.*?)<\/\1>)/g;
    let match: RegExpExecArray | null;

    let key = 0;
    while ((match = regex.exec(translatedText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(translatedText.slice(lastIndex, match.index));
      }

      const [fullMatch, componentName, content] = match;
      const component = components[componentName];

      if (component && typeof component === "object" && "type" in component) {
        // Clone the component with content as children if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cloned = { ...(component as any) };
        if (content !== undefined) {
          cloned.props = { ...cloned.props, children: content };
        }
        cloned.key = key++;
        parts.push(cloned);
      } else {
        // Fallback: render content without wrapper
        parts.push(content || fullMatch);
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < translatedText.length) {
      parts.push(translatedText.slice(lastIndex));
    }

    return parts.length > 0 ? parts : translatedText;
  }, [translatedText, components]);

  return <>{rendered}</>;
}

export default TranslatedText;
