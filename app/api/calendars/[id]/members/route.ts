import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarShares, calendars, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const calendarId = resolvedParams.id;
    console.log("This is my last resort");
    // 1. Auth Check
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Lade die Geteilten Mitglieder (Gäste mit Lese-/Schreibrechten)
    const sharedMembers = await db
      .select({
        id: user.id,
        name: user.name,
        role: calendarShares.permission,
      })
      .from(calendarShares)
      .innerJoin(user, eq(calendarShares.userId, user.id))
      .where(eq(calendarShares.calendarId, calendarId));

    // 3. Lade den Besitzer (Owner) des Kalenders
    const calendarData = await db
      .select({ ownerId: calendars.ownerId })
      .from(calendars)
      .where(eq(calendars.id, calendarId))
      .limit(1);

    let ownerMember: { id: string; name: string; role: "admin" | "write" | "read" } | null = null;
    
    if (calendarData.length > 0 && calendarData[0].ownerId) {
      const ownerUser = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, calendarData[0].ownerId))
        .limit(1);

      if (ownerUser.length > 0 && ownerUser[0].name) { // name sicherheitshalber prüfen
        ownerMember = {
          id: ownerUser[0].id,
          name: ownerUser[0].name,
          role: "admin", // Durch die Deklaration oben meckert TS hier nicht mehr!
        };
      }
    }

    // 4. Listen zusammenfügen
    const allMembers = [...sharedMembers];
    
    // Den Owner an die erste Stelle setzen (falls er nicht versehentlich auch in Shares steht)
    if (ownerMember && !allMembers.find((m) => m.id === ownerMember.id)) {
      allMembers.unshift(ownerMember);
    }

    // Gibt nun IMMER mindestens den Besitzer zurück
    return NextResponse.json(allMembers);
    
  } catch (error) {
    console.error("[CALENDAR_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
