/**
 * Developer Global Feature Flags & Architecture Configuration
 *
 * This file provides a centralized global configuration for developers to toggle
 * application-wide behaviors and features (e.g. Employee-Based Interface vs. original Shift-Based Interface).
 *
 * Change values here directly or via NEXT_PUBLIC_* environment variables to apply globally across the app.
 */

export const FEATURE_FLAGS = {
  /**
   * Employee-Based Interface vs. Original Shift-Based Interface
   * - true: Enables employee-based interface (assign shifts directly to roster members/employees).
   * - false: Enables original shift-based interface (custom titles, shift presets, all-day events).
   */
  ENABLE_EMPLOYEE_BASED_INTERFACE:
    process.env.NEXT_PUBLIC_ENABLE_EMPLOYEE_BASED_INTERFACE !== undefined
      ? process.env.NEXT_PUBLIC_ENABLE_EMPLOYEE_BASED_INTERFACE === "true"
      : true,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
