import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/sessions";
import { canEditCalendar } from "@/lib/auth/permissions";

// GET /api/absences/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [absence] = await db
      .select()
      .from(absences)
      .where(eq(absences.id, id))
      .limit(1);

    if (!absence) {
      return NextResponse.json({ error: "Absence not found" }, { status: 404 });
    }

    return NextResponse.json(absence);
  } catch (error) {
    console.error("[ABSENCE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/absences/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser(request.headers);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(absences)
      .where(eq(absences.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Absence not found" }, { status: 404 });
    }

    // Permission check: owner of absence or calendar admin/write
    const isOwner = sessionUser && existing.userId === sessionUser.id;
    const canManage = await canEditCalendar(sessionUser?.id, existing.calendarId);

    if (!isOwner && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Partial<typeof absences.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.userName !== undefined) updateData.userName = body.userName;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.isRecurring !== undefined) updateData.isRecurring = Boolean(body.isRecurring);
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.isAllDay !== undefined) updateData.isAllDay = Boolean(body.isAllDay);
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.endTime !== undefined) updateData.endTime = body.endTime;
    if (body.recurringDays !== undefined) {
      updateData.recurringDays =
        typeof body.recurringDays === "string"
          ? body.recurringDays
          : JSON.stringify(body.recurringDays);
    }
    if (body.status !== undefined) updateData.status = body.status;

    const [updated] = await db
      .update(absences)
      .set(updateData)
      .where(eq(absences.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ABSENCE_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/absences/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser(request.headers);

    const [existing] = await db
      .select()
      .from(absences)
      .where(eq(absences.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Absence not found" }, { status: 404 });
    }

    // Permission check: owner of absence or calendar admin/write
    const isOwner = sessionUser && existing.userId === sessionUser.id;
    const canManage = await canEditCalendar(sessionUser?.id, existing.calendarId);

    if (!isOwner && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(absences).where(eq(absences.id, id));

    return NextResponse.json({ success: true, message: "Absence deleted" });
  } catch (error) {
    console.error("[ABSENCE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
