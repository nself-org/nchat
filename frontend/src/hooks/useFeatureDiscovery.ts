/**
 * useFeatureDiscovery Hook - Convenient hook for feature discovery functionality
 *
 * Provides easy access to feature tips, pro tips, and what's new
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type {
  FeatureId,
  FeatureTip,
  WhatsNewItem,
} from "@/lib/onboarding/onboarding-types";
import {
  featureTips,
  getNextTipToShow,
  getRandomProTip,
  getRandomShortcutTip,
  getTipsForFeature,
  getUnseenWhatsNewItems,
  type ProTip,
  type KeyboardShortcutTip,
} from "@/lib/onboarding/feature-discovery";

interface UseFeatureDiscoveryOptions {
  /**
   * User ID for initializing feature discovery
   */
  userId?: string;
  /**
   * Auto-initialize on mount
   */
  autoInit?: boolean;
  /**
   * Maximum tips to show per session
   */
  maxTipsPerSession?: number;
}

interface UseFeatureDiscoveryReturn {
  // Feature Tips
  nextTip: FeatureTip | null;
  getTipsForFeature: (featureId: FeatureId) => FeatureTip[];
  showTip: (tipId: string) => void;
  dismissTip: (tipId: string) => void;
  isFeatureDiscovered: (featureId: FeatureId) => boolean;
  discoverFeature: (featureId: FeatureId) => void;

  // Pro Tips
  currentProTip: ProTip | null;
  refreshProTip: () => void;
  dismissProTip: () => void;

  // Keyboard Shortcuts
  currentShortcutTip: KeyboardShortcutTip | null;
  refreshShortcutTip: () => void;
  dismissShortcutTip: () => void;

  // What's New
  unseenWhatsNew: WhatsNewItem[];
  hasUnseenWhatsNew: boolean;
  seeWhatsNewItem: (itemId: string) => void;
  seeAllWhatsNew: () => void;
  dismissWhatsNew: (days?: number) => void;
  openWhatsNewModal: () => void;
  closeWhatsNewModal: () => void;
  isWhatsNewModalOpen: boolean;
}

export function useFeatureDiscovery(
  options: UseFeatureDiscoveryOptions = {},
): UseFeatureDiscoveryReturn {
  const { userId, autoInit = true, maxTipsPerSession = 3 } = options;

  const {
    featureDiscovery,
    featureDiscoveryConfig,
    whatsNew,
    whatsNewModalOpen,
    initialize,
    discoverFeature: storeDiscoverFeature,
    seeTip,
    dismissFeatureTip,
    seeWhatsNewItem: storeSeeWhatsNewItem,
    seeAllWhatsNew: storeSeeAllWhatsNew,
    dismissWhatsNewModal,
    openWhatsNewModal: storeOpenWhatsNewModal,
    closeWhatsNewModal: storeCloseWhatsNewModal,
  } = useOnboardingStore();

  // Local state for session tips
  const [sessionTipsShown, setSessionTipsShown] = useState(0);
  const [seenProTipIds, setSeenProTipIds] = useState<string[]>([]);
  const [seenShortcutIds, setSeenShortcutIds] = useState<string[]>([]);
  const [currentProTip, setCurrentProTip] = useState<ProTip | null>(null);
  const [currentShortcutTip, setCurrentShortcutTip] =
    useState<KeyboardShortcutTip | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (autoInit && userId) {
      initialize(userId);
    }
  }, [autoInit, userId, initialize]);

  // Initialize pro tip
  useEffect(() => {
    if (featureDiscoveryConfig.showProTips && !currentProTip) {
      setCurrentProTip(getRandomProTip(seenProTipIds));
    }
  }, [featureDiscoveryConfig.showProTips, seenProTipIds, currentProTip]);

  // Initialize shortcut tip
  useEffect(() => {
    if (
      featureDiscoveryConfig.showKeyboardShortcutTips &&
      !currentShortcutTip
    ) {
      setCurrentShortcutTip(getRandomShortcutTip(seenShortcutIds));
    }
  }, [
    featureDiscoveryConfig.showKeyboardShortcutTips,
    seenShortcutIds,
    currentShortcutTip,
  ]);

  // Computed: next tip to show
  const nextTip = useMemo(() => {
    if (!featureDiscovery || sessionTipsShown >= maxTipsPerSession) {
      return null;
    }
    return getNextTipToShow(featureDiscovery, featureDiscoveryConfig);
  }, [
    featureDiscovery,
    featureDiscoveryConfig,
    sessionTipsShown,
    maxTipsPerSession,
  ]);

  // Computed: unseen what's new items
  const unseenWhatsNew = useMemo(() => {
    return getUnseenWhatsNewItems(whatsNew);
  }, [whatsNew]);

  // Feature Tips Actions
  const showTip = useCallback(
    (tipId: string) => {
      seeTip(tipId);
      setSessionTipsShown((prev) => prev + 1);
    },
    [seeTip],
  );

  const dismissTipAction = useCallback(
    (tipId: string) => {
      dismissFeatureTip(tipId);
    },
    [dismissFeatureTip],
  );

  const isFeatureDiscoveredCheck = useCallback(
    (featureId: FeatureId): boolean => {
      return featureDiscovery?.discoveredFeatures.includes(featureId) ?? false;
    },
    [featureDiscovery?.discoveredFeatures],
  );

  const discoverFeatureAction = useCallback(
    (featureId: FeatureId) => {
      storeDiscoverFeature(featureId);
    },
    [storeDiscoverFeature],
  );

  const getTipsForFeatureAction = useCallback(
    (featureId: FeatureId): FeatureTip[] => {
      return getTipsForFeature(featureId);
    },
    [],
  );

  // Pro Tips Actions
  const refreshProTip = useCallback(() => {
    if (currentProTip) {
      setSeenProTipIds((prev) => [...prev, currentProTip.id]);
    }
    const newTip = getRandomProTip([...seenProTipIds, currentProTip?.id ?? ""]);
    setCurrentProTip(newTip);
  }, [currentProTip, seenProTipIds]);

  const dismissProTip = useCallback(() => {
    if (currentProTip) {
      setSeenProTipIds((prev) => [...prev, currentProTip.id]);
    }
    setCurrentProTip(null);
  }, [currentProTip]);

  // Keyboard Shortcut Tips Actions
  const refreshShortcutTip = useCallback(() => {
    if (currentShortcutTip) {
      setSeenShortcutIds((prev) => [...prev, currentShortcutTip.id]);
    }
    const newTip = getRandomShortcutTip([
      ...seenShortcutIds,
      currentShortcutTip?.id ?? "",
    ]);
    setCurrentShortcutTip(newTip);
  }, [currentShortcutTip, seenShortcutIds]);

  const dismissShortcutTip = useCallback(() => {
    if (currentShortcutTip) {
      setSeenShortcutIds((prev) => [...prev, currentShortcutTip.id]);
    }
    setCurrentShortcutTip(null);
  }, [currentShortcutTip]);

  // What's New Actions
  const seeWhatsNewItem = useCallback(
    (itemId: string) => {
      storeSeeWhatsNewItem(itemId);
    },
    [storeSeeWhatsNewItem],
  );

  const seeAllWhatsNew = useCallback(() => {
    storeSeeAllWhatsNew();
  }, [storeSeeAllWhatsNew]);

  const dismissWhatsNew = useCallback(
    (days?: number) => {
      dismissWhatsNewModal(days);
    },
    [dismissWhatsNewModal],
  );

  const openWhatsNewModal = useCallback(() => {
    storeOpenWhatsNewModal();
  }, [storeOpenWhatsNewModal]);

  const closeWhatsNewModal = useCallback(() => {
    storeCloseWhatsNewModal();
  }, [storeCloseWhatsNewModal]);

  return {
    // Feature Tips
    nextTip,
    getTipsForFeature: getTipsForFeatureAction,
    showTip,
    dismissTip: dismissTipAction,
    isFeatureDiscovered: isFeatureDiscoveredCheck,
    discoverFeature: discoverFeatureAction,

    // Pro Tips
    currentProTip,
    refreshProTip,
    dismissProTip,

    // Keyboard Shortcuts
    currentShortcutTip,
    refreshShortcutTip,
    dismissShortcutTip,

    // What's New
    unseenWhatsNew,
    hasUnseenWhatsNew: unseenWhatsNew.length > 0,
    seeWhatsNewItem,
    seeAllWhatsNew,
    dismissWhatsNew,
    openWhatsNewModal,
    closeWhatsNewModal,
    isWhatsNewModalOpen: whatsNewModalOpen,
  };
}

/**
 * Hook for tracking when a feature is first used
 */
export function useFeatureUsageTracking(featureId: FeatureId) {
  const { discoverFeature: storeDiscoverFeature } = useOnboardingStore();

  const trackUsage = useCallback(() => {
    storeDiscoverFeature(featureId);
  }, [featureId, storeDiscoverFeature]);

  return trackUsage;
}

/**
 * Hook to get tip for a specific feature
 */
export function useFeatureTip(featureId: FeatureId): FeatureTip | null {
  const { featureDiscovery, featureDiscoveryConfig } = useOnboardingStore();

  if (!featureDiscoveryConfig.enabled) return null;

  const tips = getTipsForFeature(featureId);
  if (tips.length === 0) return null;

  // Find first non-dismissed, non-seen (if showOnce) tip
  return (
    tips.find((tip) => {
      if (featureDiscovery?.dismissedTips.includes(tip.id)) return false;
      if (tip.showOnce && featureDiscovery?.seenTips.includes(tip.id))
        return false;
      return true;
    }) ?? null
  );
}
