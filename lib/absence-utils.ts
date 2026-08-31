import { Absence } from "@/lib/db/schema";
import { parseLocalDate, formatDateToLocal } from "@/lib/date-utils";

/**
 * Checks if a given date falls within an absence period
 * @param date The date to check (Date object or YYYY-MM-DD string)
 * @param absence The absence record
 */
export function isDateInAbsence(date: Date | string, absence: Absence): boolean {
  if (!date || !absence) return false;

  const targetDate = typeof date === "string" ? parseLocalDate(date) : new Date(date);
  const targetDateStr = formatDateToLocal(targetDate);

  const start = new Date(absence.startDate);
  const end = new Date(absence.endDate);

  const startDateStr = formatDateToLocal(start);
  const endDateStr = formatDateToLocal(end);

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
