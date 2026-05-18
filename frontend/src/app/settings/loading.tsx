import { SettingsSkeleton } from "@/components/loading/settings-skeleton";

/**
 * Settings page loading skeleton
 * Shows navigation and content area skeletons
 */
export default function SettingsLoading() {
  return (
    <div className="h-screen bg-background">
      <SettingsSkeleton showNav sectionCount={3} />
    </div>
  );
}
