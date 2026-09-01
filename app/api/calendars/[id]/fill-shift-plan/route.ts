import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calendars,
  calendarLocations,
  employeeCalendarSettings,
  user,
  shifts,
  absences,
} from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/sessions";
import { canManageCalendar } from "@/lib/auth/permissions";
import { isSuperAdmin } from "@/lib/auth/admin";
import type { FixedShiftRule } from "@/lib/types";

function getIsoDayOfWeek(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function doesRuleMatchDate(rule: FixedShiftRule, date: Date, totalDaysInMonth: number): boolean {
  const dayOfWeek = getIsoDayOfWeek(date);
  const dayOfMonth = date.getDate();
  const weekNum = getIsoWeekNumber(date);
  const nth = Math.floor((dayOfMonth - 1) / 7) + 1;
  const isLast = dayOfMonth + 7 > totalDaysInMonth;

  switch (rule.patternType) {
    case "weekly":
      return rule.dayOfWeek === undefined || rule.dayOfWeek === dayOfWeek;

    case "biweekly": {
      if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== dayOfWeek) {
        return false;
      }
      if (rule.weekParity === "odd") {
        return weekNum % 2 !== 0;
      }
      if (rule.weekParity === "even") {
        return weekNum % 2 === 0;
      }
      const interval = rule.weekInterval || 2;
      return weekNum % interval === 0;
    }

    case "monthly_nth_day": {
      if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== dayOfWeek) {
        return false;
      }
      if (rule.nthOccurrence === -1) {
        return isLast;
      }
      return rule.nthOccurrence === nth;
    }

    case "monthly_day_of_month":
      return rule.dayOfMonth === dayOfMonth;

    default:
      return false;
  }
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * POST /api/calendars/[id]/fill-shift-plan
 *
 * Populates the calendar with fixed shifts for a given year and month.
 * Body: { year: number, month: number } (month is 1-12 or 0-11)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params;
    const currentUser = await getSessionUser(request.headers);

    const hasAccess =
      (await canManageCalendar(currentUser?.id, calendarId)) ||
      isSuperAdmin(currentUser);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const targetYear = typeof body.year === "number" ? body.year : currentYear;
    let targetMonth = typeof body.month === "number" ? body.month : currentMonth;

    // Normalize month if 0-indexed (0-11)
    if (targetMonth === 0) {
      targetMonth = 1;
    } else if (targetMonth > 12) {
      targetMonth = 12;
    }

    // Calendar & locations
    const [calendar] = await db
      .select()
      .from(calendars)
      .where(eq(calendars.id, calendarId));

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    const locations = await db
      .select()
      .from(calendarLocations)
      .where(eq(calendarLocations.calendarId, calendarId))
      .orderBy(asc(calendarLocations.order));

    const locationMap = new Map<string, typeof calendarLocations.$inferSelect>();
    locations.forEach((loc) => locationMap.set(loc.id, loc));

    // Fetch employee settings for this calendar
    const settingsList = await db
      .select()
      .from(employeeCalendarSettings)
      .where(eq(employeeCalendarSettings.calendarId, calendarId));

    if (settingsList.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No fixed shift rules configured for this calendar.",
        createdCount: 0,
        skippedAbsencesCount: 0,
        skippedExistingCount: 0,
      });
    }

    // Fetch users for employee names
    const allUsers = await db.select().from(user);
    const userMap = new Map<string, typeof user.$inferSelect>();
    allUsers.forEach((u) => userMap.set(u.id, u));

    // Month boundary
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Existing shifts for the month
    const existingShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.calendarId, calendarId),
          gte(shifts.date, startOfMonth),
          lte(shifts.date, endOfMonth)
        )
      );

    // Existing absences for the month
    const calendarAbsences = await db
      .select()
      .from(absences)
      .where(
        and(
          eq(absences.calendarId, calendarId),
          eq(absences.status, "approved")
        )
      );

    let createdCount = 0;
    let skippedAbsencesCount = 0;
    let skippedExistingCount = 0;

    const shiftsToInsert: Array<typeof shifts.$inferInsert> = [];

    // Loop through each day of the target month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDate = new Date(targetYear, targetMonth - 1, day, 12, 0, 0);
      const isoDayOfWeek = getIsoDayOfWeek(currentDate);

      // Evaluate each employee's settings
      for (const setting of settingsList) {
        if (!setting.fixedShifts) continue;

        let fixedRules: FixedShiftRule[] = [];
        try {
          fixedRules = JSON.parse(setting.fixedShifts);
        } catch {
          continue;
        }

        if (!Array.isArray(fixedRules) || fixedRules.length === 0) continue;

        const employeeUser = userMap.get(setting.userId);
        const employeeName = employeeUser?.name || "Employee";

        for (const rule of fixedRules) {
          if (!doesRuleMatchDate(rule, currentDate, totalDaysInMonth)) {
            continue;
          }

          const targetLocationId = rule.locationId || locations[0]?.id || null;
          const targetLocation = targetLocationId ? locationMap.get(targetLocationId) : null;

          const startTime =
            rule.startTime ||
            targetLocation?.defaultStartTime ||
            calendar.defaultStartTime ||
            "09:00";

          const endTime =
            rule.endTime ||
            targetLocation?.defaultEndTime ||
            calendar.defaultEndTime ||
            "17:00";

          const title = rule.title || employeeName;
          const color =
            rule.color ||
            targetLocation?.color ||
            calendar.color ||
            "#3b82f6";

          // 1. Check for Absences
          const isAbsent = calendarAbsences.some((abs) => {
            if (abs.userId && abs.userId !== setting.userId) return false;
            if (abs.userName && !abs.userId && abs.userName.toLowerCase() !== employeeName.toLowerCase()) {
              return false;
            }

            if (abs.isRecurring) {
              let recDays: number[] = [];
              if (abs.recurringDays) {
                try {
                  recDays = JSON.parse(abs.recurringDays);
                } catch {
                  recDays = [];
                }
              }
              if (!recDays.includes(isoDayOfWeek)) return false;
              if (abs.isAllDay) return true;
              return timesOverlap(startTime, endTime, abs.startTime || "08:00", abs.endTime || "17:00");
            } else {
              const absStart = new Date(abs.startDate);
              const absEnd = new Date(abs.endDate);
              const dayStart = new Date(targetYear, targetMonth - 1, day, 0, 0, 0);
              const dayEnd = new Date(targetYear, targetMonth - 1, day, 23, 59, 59);

              if (dayEnd < absStart || dayStart > absEnd) return false;
              if (abs.isAllDay) return true;
              return timesOverlap(startTime, endTime, abs.startTime || "08:00", abs.endTime || "17:00");
            }
          });

          if (isAbsent) {
            skippedAbsencesCount++;
            continue;
          }

          // 2. Check for duplicate or overlapping existing shift
          const hasExistingShift =
            existingShifts.some((s) => {
              if (s.userId !== setting.userId) return false;
              const sDate = new Date(s.date);
              if (
                sDate.getFullYear() === targetYear &&
                sDate.getMonth() === targetMonth - 1 &&
                sDate.getDate() === day
              ) {
                return timesOverlap(startTime, endTime, s.startTime, s.endTime);
              }
              return false;
            }) ||
            shiftsToInsert.some((s) => {
              if (s.userId !== setting.userId) return false;
              const sDate = s.date instanceof Date ? s.date : new Date(String(s.date));
              if (
                sDate.getFullYear() === targetYear &&
                sDate.getMonth() === targetMonth - 1 &&
                sDate.getDate() === day
              ) {
                return timesOverlap(startTime, endTime, s.startTime, s.endTime);
              }
              return false;
            });

          if (hasExistingShift) {
            skippedExistingCount++;
            continue;
          }

          // 3. Queue shift for insertion
          shiftsToInsert.push({
            calendarId,
            locationId: targetLocationId,
            userId: setting.userId,
            title,
            color,
            startTime,
            endTime,
            date: currentDate,
            isAllDay: false,
            notes: rule.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    if (shiftsToInsert.length > 0) {
      for (const newShift of shiftsToInsert) {
        await db.insert(shifts).values(newShift);
      }
      createdCount = shiftsToInsert.length;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedAbsencesCount,
      skippedExistingCount,
      targetMonth,
      targetYear,
    });
  } catch (error: unknown) {
    console.error("Failed to fill shift plan:", error);
    return NextResponse.json(
      { error: "Failed to fill shift plan" },
      { status: 500 }
    );
  }
}
