/**
 * Theme Settings Page
 *
 * Full theme customization interface with color pickers,
 * typography controls, presets, and import/export.
 */

import { Metadata } from "next";
import { ThemeCustomizer } from "@/components/settings/ThemeCustomizer";

export const metadata: Metadata = {
  title: "Theme Settings - nChat",
  description: "Customize your theme colors, typography, and spacing",
};

export default function ThemeSettingsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <ThemeCustomizer />
    </div>
  );
}
