/**
 * Feature Flags & Architecture Mode Configuration
 *
 * This module provides a centralized registry for feature flags in BetterShift.
 * Use this pattern to safely introduce new experimental features or conflicting
 * implementations without breaking existing core functionality.
 */

export interface FeatureFlagConfig {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
  category: "interface" | "workflow" | "experimental";
}

export const FEATURE_FLAGS = {
  /**
   * Employee-Based Interface vs. Original Shift-Based Interface
   * - When true: Changes shift creation to assign team members/employees directly.
   * - When false: Original shift workflow with presets, custom titles, and all-day shifts.
   */
  ENABLE_EMPLOYEE_BASED_INTERFACE: "enable-employee-based-interface",
} as const;

export const FEATURE_FLAG_DEFINITIONS: Record<string, FeatureFlagConfig> = {
  [FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE]: {
    id: FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE,
    name: "Employee-Based Interface",
    description: "Switch between shift-centric planning and employee roster assignments",
    defaultValue: true,
    category: "workflow",
  },
};

/**
 * Reads a feature flag safely from localStorage with a fallback default.
 */
export function getFeatureFlag(flagKey: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(flagKey);
    if (stored === null) return defaultValue;
    return stored === "true";
  } catch {
    return defaultValue;
  }
}

/**
 * Persists a feature flag value to localStorage.
 */
export function setFeatureFlag(flagKey: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(flagKey, value.toString());
  } catch (e) {
    console.error(`Failed to save feature flag ${flagKey}:`, e);
  }
}
