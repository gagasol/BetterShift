// Re-export types from Drizzle schema
export type {
  Calendar,
  Shift,
  ExternalSync,
  CalendarLocation,
  Absence,
  NewAbsence,
  EmployeeCalendarSetting,
  NewEmployeeCalendarSetting,
} from "./db/schema";
import type { CalendarLocation, Absence } from "./db/schema";

export type FixedShiftPatternType =
  | "weekly"
  | "biweekly"
  | "monthly_nth_day"
  | "monthly_day_of_month";

export interface FixedShiftRule {
  id: string;
  title?: string;
  patternType: FixedShiftPatternType;
  dayOfWeek?: number; // 1 = Mon ... 7 = Sun
  weekInterval?: number; // e.g. 2 for biweekly
  weekParity?: "even" | "odd" | "all";
  nthOccurrence?: 1 | 2 | 3 | 4 | -1; // 1st, 2nd, 3rd, 4th, -1 = last
  dayOfMonth?: number; // 1-31
  locationId?: string | null;
  startTime: string;
  endTime: string;
  color?: string | null;
  notes?: string | null;
}

export interface EmployeeCalendarSettingWithUser {
  id?: string;
  calendarId: string;
  userId: string;
  preferredWorkDays: number[]; // 1=Mon ... 7=Sun
  maxHoursPerMonth: number | null;
  preferredHoursPerMonth: number | null;
  minHoursPerMonth: number | null;
  canWorkAlone: boolean;
  fixedShifts: FixedShiftRule[];
  user?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role?: string | null;
  } | null;
}

export interface AbsenceWithDetails extends Absence {
  calendar?: {
    id: string;
    name: string;
    color: string;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
}

export interface CalendarWithCount {
  id: string;
  name: string;
  color: string;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  ownerId?: string | null;
  guestPermission?: "none" | "read" | "write";
  createdAt: Date | null;
  updatedAt: Date | null;
  _count?: number;
  locations?: CalendarLocation[];
  // Permission metadata (only for authenticated users)
  sharePermission?: "owner" | "admin" | "write" | "read";
  tokenPermission?: "read" | "write"; // Permission from access token
  isSubscribed?: boolean;
  subscriptionSource?: "guest" | "shared" | "token";
}

export interface ShiftWithCalendar {
  id: string;
  calendarId: string;
  locationId?: string | null;
  location?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  userId?: string | null;
  presetId?: string | null;
  calendar?: {
    id: string;
    name: string;
    color: string;
  };
  date: Date | null;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  notes?: string | null;
  isAllDay?: boolean;
  syncedFromExternal?: boolean;
  externalSyncId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
