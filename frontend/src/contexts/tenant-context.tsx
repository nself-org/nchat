/**
 * Tenant Context
 *
 * Provides tenant information throughout the application.
 * Automatically resolves tenant from subdomain/domain.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  Tenant,
  TenantContext as TenantContextType,
} from "@/lib/tenants/types";

import { logger } from "@/lib/logger";

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant;
}

interface TenantContextValue {
  tenant: Tenant | null;
  context: TenantContextType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

/**
 * Tenant Provider Component
 */
export function TenantProvider({
  children,
  initialTenant,
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant || null);
  const [context, setContext] = useState<TenantContextType | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Tenant is resolved server-side by middleware
      // Just fetch from current context
      const response = await fetch("/api/tenant/current");

      if (!response.ok) {
        throw new Error("Failed to fetch tenant");
      }

      const data = await response.json();
      setTenant(data.tenant);
      setContext(data.context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tenant";
      setError(errorMessage);
      logger.error("Error fetching tenant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTenant) {
      fetchTenant();
    } else {
      // Build context from initial tenant
      setContext({
        tenant: initialTenant,
        subdomain: initialTenant.slug,
        isCustomDomain: false,
        schemaName: initialTenant.schemaName,
      });
    }
  }, [initialTenant]);

  const value: TenantContextValue = {
    tenant,
    context,
    isLoading,
    error,
    refetch: fetchTenant,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

/**
 * Hook to use tenant context
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  return context;
}

/**
 * Hook to check if tenant has a specific feature
 */
export function useTenantFeature(feature: keyof Tenant["features"]): boolean {
  const { tenant } = useTenant();

  if (!tenant) {
    return false;
  }

  return tenant.features[feature] || false;
}

/**
 * Hook to check if tenant has exceeded limits
 */
export function useTenantLimits() {
  const { tenant } = useTenant();
  const [limitsExceeded, setLimitsExceeded] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkLimits = async () => {
    if (!tenant) {
      return;
    }

    try {
      setIsChecking(true);

      const response = await fetch(`/api/tenant/limits`);

      if (!response.ok) {
        throw new Error("Failed to check limits");
      }

      const data = await response.json();
      setLimitsExceeded(data.limits || []);
    } catch (err) {
      logger.error("Error checking limits:", err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkLimits();
  }, [tenant?.id]);

  return {
    limitsExceeded,
    hasExceededLimits: limitsExceeded.length > 0,
    isChecking,
    checkLimits,
  };
}

/**
 * Hook to get tenant billing information
 */
export function useTenantBilling() {
  const { tenant } = useTenant();

  if (!tenant) {
    return {
      plan: null,
      interval: null,
      trialEndsAt: null,
      isTrialing: false,
      isCancelled: false,
      currentPeriodEnd: null,
    };
  }

  const isTrialing = tenant.status === "trial";
  const isCancelled = tenant.status === "cancelled";

  return {
    plan: tenant.billing.plan,
    interval: tenant.billing.interval,
    trialEndsAt: tenant.trialEndsAt,
    isTrialing,
    isCancelled,
    currentPeriodEnd: tenant.billing.currentPeriodEnd,
    cancelAtPeriodEnd: tenant.billing.cancelAtPeriodEnd,
  };
}
