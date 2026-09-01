import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  user,
  calendars,
  calendarLocations,
  employeeCalendarSettings,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth/admin";
import {
  getValidatedAdminUser,
  isErrorResponse,
} from "@/lib/auth/admin-helpers";
import type { FixedShiftRule } from "@/lib/types";

/**
 * Superadmin Employee Settings API
 *
 * GET /api/admin/employees?calendarId=xyz
 * List all users with their calendar-specific employee constraints & fixed shifts.
 *
 * POST /api/admin/employees
 * Upsert employee settings for a specific calendar and user.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getValidatedAdminUser(request);
    if (isErrorResponse(currentUser)) return currentUser;

    requireSuperAdmin(currentUser);

    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId");

    // Fetch all available calendars
    const allCalendars = await db
      .select({
        id: calendars.id,
        name: calendars.name,
        color: calendars.color,
        defaultStartTime: calendars.defaultStartTime,
        defaultEndTime: calendars.defaultEndTime,
      })
      .from(calendars)
      .orderBy(asc(calendars.name));

    // Determine target calendar
    const activeCalendarId = calendarId || allCalendars[0]?.id;

    // Fetch locations for active calendar
    let locations: typeof calendarLocations.$inferSelect[] = [];
    if (activeCalendarId) {
      locations = await db
        .select()
        .from(calendarLocations)
        .where(eq(calendarLocations.calendarId, activeCalendarId))
        .orderBy(asc(calendarLocations.order), asc(calendarLocations.createdAt));
    }

    // Fetch all users
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        banned: user.banned,
      })
      .from(user)
      .orderBy(asc(user.name));

    // Fetch employee settings for active calendar
    let settingsList: typeof employeeCalendarSettings.$inferSelect[] = [];
    if (activeCalendarId) {
      settingsList = await db
        .select()
        .from(employeeCalendarSettings)
        .where(eq(employeeCalendarSettings.calendarId, activeCalendarId));
    }

    // Map settings by userId
    const settingsMap = new Map<string, typeof employeeCalendarSettings.$inferSelect>();
    for (const s of settingsList) {
      settingsMap.set(s.userId, s);
    }

    // Combine users with settings
    const employees = allUsers.map((u) => {
      const setting = settingsMap.get(u.id);
      let parsedPreferredWorkDays: number[] = [1, 2, 3, 4, 5];
      let parsedFixedShifts: FixedShiftRule[] = [];

      if (setting?.preferredWorkDays) {
        try {
          parsedPreferredWorkDays = JSON.parse(setting.preferredWorkDays);
        } catch {
          parsedPreferredWorkDays = [1, 2, 3, 4, 5];
        }
      }

      if (setting?.fixedShifts) {
        try {
          parsedFixedShifts = JSON.parse(setting.fixedShifts);
        } catch {
          parsedFixedShifts = [];
        }
      }

      return {
        id: setting?.id,
        calendarId: activeCalendarId,
        userId: u.id,
        user: u,
        preferredWorkDays: parsedPreferredWorkDays,
        maxHoursPerMonth: setting?.maxHoursPerMonth ?? null,
        preferredHoursPerMonth: setting?.preferredHoursPerMonth ?? null,
        minHoursPerMonth: setting?.minHoursPerMonth ?? null,
        canWorkAlone: setting?.canWorkAlone ?? true,
        fixedShifts: parsedFixedShifts,
        updatedAt: setting?.updatedAt ?? null,
      };
    });

    return NextResponse.json({
      calendars: allCalendars,
      activeCalendarId,
      locations,
      employees,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch admin employee settings:", error);
    const errObj = error as { statusCode?: number; status?: number; message?: string };
    if (errObj.statusCode === 403 || errObj.status === 403 || errObj.message?.includes("Superadmin")) {
      return NextResponse.json(
        { error: "Superadmin access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch employee settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getValidatedAdminUser(request);
    if (isErrorResponse(currentUser)) return currentUser;

    requireSuperAdmin(currentUser);

    const body = await request.json();
    const {
      calendarId,
      userId,
      preferredWorkDays,
      maxHoursPerMonth,
      preferredHoursPerMonth,
      minHoursPerMonth,
      canWorkAlone,
      fixedShifts,
    } = body;

    if (!calendarId || !userId) {
      return NextResponse.json(
        { error: "calendarId and userId are required" },
        { status: 400 }
      );
    }

    // Check existing
    const [existing] = await db
      .select()
      .from(employeeCalendarSettings)
      .where(
        and(
          eq(employeeCalendarSettings.calendarId, calendarId),
          eq(employeeCalendarSettings.userId, userId)
        )
      );

    const preferredWorkDaysStr = Array.isArray(preferredWorkDays)
      ? JSON.stringify(preferredWorkDays)
      : JSON.stringify([1, 2, 3, 4, 5]);

    const fixedShiftsStr = Array.isArray(fixedShifts)
      ? JSON.stringify(fixedShifts)
      : "[]";

    let result;
    if (existing) {
      [result] = await db
        .update(employeeCalendarSettings)
        .set({
          preferredWorkDays: preferredWorkDaysStr,
          maxHoursPerMonth:
            typeof maxHoursPerMonth === "number" ? maxHoursPerMonth : null,
          preferredHoursPerMonth:
            typeof preferredHoursPerMonth === "number"
              ? preferredHoursPerMonth
              : null,
          minHoursPerMonth:
            typeof minHoursPerMonth === "number" ? minHoursPerMonth : null,
          canWorkAlone: typeof canWorkAlone === "boolean" ? canWorkAlone : true,
          fixedShifts: fixedShiftsStr,
          updatedAt: new Date(),
        })
        .where(eq(employeeCalendarSettings.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(employeeCalendarSettings)
        .values({
          calendarId,
          userId,
          preferredWorkDays: preferredWorkDaysStr,
          maxHoursPerMonth:
            typeof maxHoursPerMonth === "number" ? maxHoursPerMonth : null,
          preferredHoursPerMonth:
            typeof preferredHoursPerMonth === "number"
              ? preferredHoursPerMonth
              : null,
          minHoursPerMonth:
            typeof minHoursPerMonth === "number" ? minHoursPerMonth : null,
          canWorkAlone: typeof canWorkAlone === "boolean" ? canWorkAlone : true,
          fixedShifts: fixedShiftsStr,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      setting: {
        ...result,
        preferredWorkDays: JSON.parse(result.preferredWorkDays || "[]"),
        fixedShifts: JSON.parse(result.fixedShifts || "[]"),
      },
    });
  } catch (error: unknown) {
    console.error("Failed to save employee settings:", error);
    const errObj = error as { statusCode?: number; status?: number; message?: string };
    if (errObj.statusCode === 403 || errObj.status === 403 || errObj.message?.includes("Superadmin")) {
      return NextResponse.json(
        { error: "Superadmin access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save employee settings" },
      { status: 500 }
    );
  }
}
