import { Absence } from "@/lib/db/schema";
import { formatDateToLocal } from "@/lib/date-utils";

/**
 * Normalizes any date input (string, Date, ISO timestamp, timestamp number)
 * into a standard "YYYY-MM-DD" local date string without timezone skew.
 */
export function normalizeDateToLocalString(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "";

  if (typeof dateInput === "string") {
    // If it starts with YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.slice(0, 10);
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return formatDateToLocal(d);
    }
    return dateInput;
  }

  if (typeof dateInput === "number") {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return formatDateToLocal(d);
    }
    return "";
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return formatDateToLocal(dateInput);
  }

  return "";
}

/**
 * Checks if two time intervals overlap.
 * If either interval is all-day, they always overlap.
 */
export function doTimesOverlap(
  isAllDayA: boolean | undefined | null,
  startTimeA: string | undefined | null,
  endTimeA: string | undefined | null,
  isAllDayB: boolean | undefined | null,
  startTimeB: string | undefined | null,
  endTimeB: string | undefined | null
): boolean {
  // If either is all day (or lacks start/end time), they cover the whole day -> overlap
  if (isAllDayA || isAllDayB || !startTimeA || !endTimeA || !startTimeB || !endTimeB) {
    return true;
  }

  const startA = startTimeA.trim();
  const endA = endTimeA.trim();
  const startB = startTimeB.trim();
  const endB = endTimeB.trim();

  // Standard interval overlap: startA < endB and endA > startB
  return startA < endB && endA > startB;
}

/**
 * Checks if a given date falls within an absence period
 * @param date The date to check (Date object or YYYY-MM-DD string)
 * @param absence The absence record
 */
export function isDateInAbsence(date: Date | string, absence: Absence): boolean {
  if (!date || !absence) return false;

  const targetDateStr =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : normalizeDateToLocalString(date);

  if (!targetDateStr) return false;

  const startDateStr = normalizeDateToLocalString(absence.startDate);
  const endDateStr = normalizeDateToLocalString(absence.endDate);

  // Check if targetDate is within date range
  if (targetDateStr < startDateStr || targetDateStr > endDateStr) {
    return false;
  }

  // If recurring, check if targetDate falls on one of the recurring weekdays
  if (absence.isRecurring) {
    if (!absence.recurringDays) return false;
    try {
      const days: number[] = JSON.parse(absence.recurringDays);
      if (!Array.isArray(days) || days.length === 0) return false;

      // Parse targetDate string to get day of week in local time
      const [year, month, day] = targetDateStr.split("-").map(Number);
      const targetDate = new Date(year, month - 1, day);

      // JavaScript getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
      const jsDay = targetDate.getDay();
      // ISO Day: 1 = Mon, 2 = Tue, ..., 7 = Sun
      const isoDay = jsDay === 0 ? 7 : jsDay;

      return days.includes(isoDay) || days.includes(jsDay);
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Finds all absences that are active on a specific date
 */
export function getAbsencesForDate(date: Date | string, absences: Absence[]): Absence[] {
  if (!absences || !Array.isArray(absences)) return [];
  return absences.filter((absence) => isDateInAbsence(date, absence));
}

/**
 * Checks if an employee (by name or userId) is absent on a specific date
 */
export function isEmployeeAbsent(
  employeeNameOrId: string,
  date: Date | string,
  absences: Absence[]
): { isAbsent: boolean; absence?: Absence } {
  if (!employeeNameOrId || !date || !absences) {
    return { isAbsent: false };
  }

  const normalizedTarget = employeeNameOrId.trim().toLowerCase();
  const dayAbsences = getAbsencesForDate(date, absences);

  const found = dayAbsences.find((a) => {
    if (a.userId && a.userId === employeeNameOrId) return true;
    if (a.userName && a.userName.trim().toLowerCase() === normalizedTarget) return true;
    return false;
  });

  return {
    isAbsent: !!found,
    absence: found,
  };
}

