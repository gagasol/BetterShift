import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarLocations, shifts } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/sessions";
import { canViewCalendar, canManageCalendar } from "@/lib/auth/permissions";

// GET all locations for a calendar (auto-seeds 1 default if empty)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params;
    const user = await getSessionUser(request.headers);

    // Check read permission
    const hasAccess = await canViewCalendar(user?.id, calendarId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch existing locations
    let locations = await db
      .select()
      .from(calendarLocations)
      .where(eq(calendarLocations.calendarId, calendarId))
      .orderBy(asc(calendarLocations.order), asc(calendarLocations.createdAt));

    // If no locations exist yet for this calendar, create a default location
    if (locations.length === 0) {
      const [newLocation] = await db
        .insert(calendarLocations)
        .values({
          calendarId,
          name: "Main Location",
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Also associate any existing orphaned shifts of this calendar with this default location
      if (newLocation) {
        await db
          .update(shifts)
          .set({ locationId: newLocation.id })
          .where(eq(shifts.calendarId, calendarId));
        locations = [newLocation];
      }
    }

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Failed to fetch calendar locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params;
    const user = await getSessionUser(request.headers);

    const hasAccess = await canManageCalendar(user?.id, calendarId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, color, order } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    // Get current max order if order not specified
    let locationOrder = order;
    if (typeof locationOrder !== "number") {
      const existing = await db
        .select()
        .from(calendarLocations)
        .where(eq(calendarLocations.calendarId, calendarId));
      locationOrder = existing.length;
    }

    const [newLocation] = await db
      .insert(calendarLocations)
      .values({
        calendarId,
        name: name.trim(),
        color: color || null,
        order: locationOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Failed to create calendar location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

// PATCH update a location (name, color, order)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params;
    const user = await getSessionUser(request.headers);

    const hasAccess = await canManageCalendar(user?.id, calendarId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { locationId, name, color, order } = body;

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      color?: string | null;
      order?: number;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (color !== undefined) {
      updateData.color = color || null;
    }
    if (typeof order === "number") {
      updateData.order = order;
    }

    const [updated] = await db
      .update(calendarLocations)
      .set(updateData)
      .where(eq(calendarLocations.id, locationId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update calendar location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// DELETE a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params;
    const user = await getSessionUser(request.headers);

    const hasAccess = await canManageCalendar(user?.id, calendarId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    let locationId = searchParams.get("locationId");

    if (!locationId) {
      try {
        const body = await request.json();
        locationId = body.locationId || body.id;
      } catch {
        // no body
      }
    }

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    // Check count of locations - each calendar must have at least 1 location
    const existing = await db
      .select()
      .from(calendarLocations)
      .where(eq(calendarLocations.calendarId, calendarId));

    if (existing.length <= 1) {
      return NextResponse.json(
        { error: "A calendar must have at least one location." },
        { status: 400 }
      );
    }

    // Delete location
    await db
      .delete(calendarLocations)
      .where(eq(calendarLocations.id, locationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete calendar location:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
