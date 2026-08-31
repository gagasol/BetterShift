import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absences, calendars, user as userTable } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/sessions";
import { canViewCalendar, canEditCalendar } from "@/lib/auth/permissions";

// GET /api/absences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId");
    const userId = searchParams.get("userId");
    const myAbsences = searchParams.get("myAbsences") === "true";

    const sessionUser = await getSessionUser(request.headers);

    // If querying own absences
    if (myAbsences || (userId && sessionUser && userId === sessionUser.id)) {
      if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const results = await db
        .select({
          absence: absences,
          calendar: {
            id: calendars.id,
            name: calendars.name,
            color: calendars.color,
          },
        })
        .from(absences)
        .leftJoin(calendars, eq(absences.calendarId, calendars.id))
        .where(eq(absences.userId, sessionUser.id))
        .orderBy(asc(absences.startDate));

      const formatted = results.map((r) => ({
        ...r.absence,
        calendar: r.calendar,
      }));

      return NextResponse.json(formatted);
    }

    // If querying by calendarId
    if (calendarId) {
      const hasAccess = await canViewCalendar(sessionUser?.id, calendarId);
      if (!hasAccess && sessionUser) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const results = await db
        .select({
          absence: absences,
          calendar: {
            id: calendars.id,
            name: calendars.name,
            color: calendars.color,
          },
          user: {
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            image: userTable.image,
          },
        })
        .from(absences)
        .leftJoin(calendars, eq(absences.calendarId, calendars.id))
        .leftJoin(userTable, eq(absences.userId, userTable.id))
        .where(eq(absences.calendarId, calendarId))
        .orderBy(asc(absences.startDate));

      const formatted = results.map((r) => ({
        ...r.absence,
        calendar: r.calendar,
        user: r.user,
      }));

      return NextResponse.json(formatted);
    }

    // Default: If user is logged in, return all absences in calendars user has access to or owns
    if (sessionUser) {
      const results = await db
        .select({
          absence: absences,
          calendar: {
            id: calendars.id,
            name: calendars.name,
            color: calendars.color,
          },
        })
        .from(absences)
        .leftJoin(calendars, eq(absences.calendarId, calendars.id))
        .where(eq(absences.userId, sessionUser.id))
        .orderBy(asc(absences.startDate));

      const formatted = results.map((r) => ({
        ...r.absence,
        calendar: r.calendar,
      }));

      return NextResponse.json(formatted);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("[ABSENCES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/absences (supports single or array of items)
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request.headers);
    const body = await request.json();

    const items = Array.isArray(body.items) ? body.items : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: "No absence items provided" }, { status: 400 });
    }

    const createdAbsences = [];

    for (const item of items) {
      const {
        calendarId,
        userId: customUserId,
        userName: customUserName,
        type = "absence",
        reason,
        isRecurring = false,
        startDate,
        endDate,
        isAllDay = true,
        startTime = "08:00",
        endTime = "17:00",
        recurringDays,
      } = item;

      if (!calendarId || !startDate || !endDate) {
        return NextResponse.json(
          { error: "Missing required fields (calendarId, startDate, endDate)" },
          { status: 400 }
        );
      }

      // Check calendar access
      const hasWriteAccess = await canEditCalendar(sessionUser?.id, calendarId);
      const hasViewAccess = await canViewCalendar(sessionUser?.id, calendarId);

      if (!hasWriteAccess && !hasViewAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Determine userId and userName
      let finalUserId = sessionUser?.id || null;
      let finalUserName = sessionUser?.name || customUserName || "Employee";

      // Only admins / editors can report absence for someone else
      if (hasWriteAccess || !sessionUser) {
        if (customUserName) {
          finalUserName = customUserName;
        }
        if (customUserId) {
          finalUserId = customUserId;
        }
      } else {
        // Regular user: can ONLY report for themselves
        finalUserId = sessionUser.id;
        finalUserName = sessionUser.name || "Employee";
      }

      const [newAbsence] = await db
        .insert(absences)
        .values({
          calendarId,
          userId: finalUserId,
          userName: finalUserName,
          type,
          reason: reason || null,
          isRecurring: Boolean(isRecurring),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isAllDay: Boolean(isAllDay),
          startTime: isAllDay ? "00:00" : startTime,
          endTime: isAllDay ? "23:59" : endTime,
          recurringDays:
            isRecurring && recurringDays
              ? typeof recurringDays === "string"
                ? recurringDays
                : JSON.stringify(recurringDays)
              : null,
          status: "approved",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdAbsences.push(newAbsence);
    }

    return NextResponse.json(
      items.length === 1 ? createdAbsences[0] : createdAbsences,
      { status: 201 }
    );
  } catch (error) {
    console.error("[ABSENCES_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
