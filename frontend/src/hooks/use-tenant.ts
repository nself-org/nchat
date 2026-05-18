/**
 * useTenant Hook
 *
 * Custom hooks for tenant operations.
 * Provides CRUD operations and utility functions.
 */

import { useState } from "react";
import type {
  Tenant,
  UpdateTenantRequest,
  CreateTenantRequest,
  BillingPlan,
  BillingInterval,
} from "@/lib/tenants/types";

/**
 * Hook for tenant management operations
 */
export function useTenantManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new tenant
   */
  const createTenant = async (
    data: CreateTenantRequest,
  ): Promise<Tenant | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/tenants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create tenant");
      }

      const tenant = await response.json();
      return tenant;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update tenant
   */
  const updateTenant = async (
    id: string,
    data: UpdateTenantRequest,
  ): Promise<Tenant | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update tenant");
      }

      const tenant = await response.json();
      return tenant;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete tenant
   */
  const deleteTenant = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/tenants/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete tenant");
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createTenant,
    updateTenant,
    deleteTenant,
    isLoading,
    error,
  };
}

/**
 * Hook for billing operations
 */
export function useTenantBillingOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create checkout session
   */
  const createCheckoutSession = async (
    plan: BillingPlan,
    interval: BillingInterval,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string } | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval, successUrl, cancelUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create billing portal session
   */
  const createPortalSession = async (
    returnUrl: string,
  ): Promise<{ url: string } | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create portal session");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upgrade plan
   */
  const upgradePlan = async (
    plan: BillingPlan,
    interval: BillingInterval,
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upgrade plan");
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel subscription
   */
  const cancelSubscription = async (
    immediately: boolean = false,
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediately }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckoutSession,
    createPortalSession,
    upgradePlan,
    cancelSubscription,
    isLoading,
    error,
  };
}

/**
 * Hook for tenant usage statistics
 */
export function useTenantUsage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current month usage
   */
  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/tenant/usage");

      if (!response.ok) {
        throw new Error("Failed to fetch usage");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchUsage,
    isLoading,
    error,
  };
}
