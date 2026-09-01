import { useState, useMemo } from "react";
import { format, isSameMonth, addMonths, subMonths, startOfMonth } from "date-fns";
import { useTranslations, useLocale } from "next-intl";
import { getDateLocale } from "@/lib/locales";
import { BaseSheet } from "@/components/ui/base-sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarMembers } from "@/hooks/useCalendarMembers";
import { useCalendarLocations } from "@/hooks/useCalendarLocations";
import { ShiftWithCalendar } from "@/lib/types";
import { ShiftCard } from "@/components/shift-card";

interface EmployeeShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ShiftWithCalendar[];
  calendarId?: string;
  onEditShift?: (shift: ShiftWithCalendar) => void;
  onDeleteShift?: (id: string) => void;
}

export function EmployeeShiftsDialog({
  open,
  onOpenChange,
  shifts,
  calendarId,
  onEditShift,
  onDeleteShift,
}: EmployeeShiftsDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  // Auth & Permissions
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { members } = useCalendarMembers(isAdmin ? calendarId : undefined);
  const { locations } = useCalendarLocations(calendarId || null);

  // State
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  // Filtering & Processing
  const displayShifts = useMemo(() => {
    return shifts.filter((shift) => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      
      // Filter by Month
      if (!isSameMonth(shiftDate, currentMonth)) return false;

      // Filter by Role/User
      if (isAdmin) {
        if (selectedUserId !== "all") {
          const selectedMember = members.find((m) => m.id === selectedUserId);
          return (
            shift.userId === selectedUserId ||
            (selectedMember?.name && shift.title.includes(selectedMember.name))
          );
        }
        return true;
      } else {
        return shift.userId === user?.id || (user?.name && shift.title.includes(user.name));
      }
    }).map((shift) => {
      // Modify shift color to match location if locations exist
      if (locations.length > 1 && shift.locationId) {
        const loc = locations.find((l) => l.id === shift.locationId);
        if (loc?.color) {
          return { ...shift, color: loc.color };
        }
      }
      return shift;
    }).sort((a, b) => new Date(a.date as Date).getTime() - new Date(b.date as Date).getTime());
  }, [shifts, currentMonth, isAdmin, selectedUserId, members, user, locations]);

  // Group by Date
  const groupedShifts = useMemo(() => {
    return displayShifts.reduce((acc, shift) => {
      const dateKey = shift.date ? format(new Date(shift.date), "yyyy-MM-dd") : "unknown";
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(shift);
      return acc;
    }, {} as Record<string, ShiftWithCalendar[]>);
  }, [displayShifts]);

  // Navigation Helpers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleCurrentMonth = () => setCurrentMonth(startOfMonth(new Date()));

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("common.shifts", { default: "My Shifts" })}
      showSaveButton={false}
      showCancelButton={false}
      maxWidth="md"
    >
      <div className="space-y-6 pb-6 mt-2">
        {/* Top Month Navigation */}
        <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl p-2 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <button 
            onClick={handleCurrentMonth} 
            className="text-base font-semibold hover:text-primary transition-colors cursor-pointer"
            title={t("calendar.today", { default: "Go to current month" })}
          >
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </button>
          
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Admin Filter */}
        {isAdmin && members.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">{t("common.allEmployees", { default: "All Employees" })}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || "Unknown"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Shifts List */}
        {Object.keys(groupedShifts).length === 0 ? (
           <div className="text-center py-10 text-muted-foreground">
             {t("shift.noShiftsInMonth", { default: "No shifts this month." })}
           </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedShifts).map(([dateKey, dayShifts]) => (
              <div key={dateKey} className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card">
                <div className="bg-primary/5 px-4 py-2 border-b border-border/30">
                  <span className="font-semibold text-sm">
                    {format(new Date(dayShifts[0].date as Date), "EEEE, d. MMMM yyyy", { locale: dateLocale })}
                  </span>
                </div>
                <div className="p-3 grid gap-3 sm:grid-cols-2">
                  {dayShifts.map((shift) => (
                    <div key={shift.id} className="relative">
                      <ShiftCard shift={shift} onDelete={onDeleteShift} onEdit={onEditShift} />
                      
                      {/* Location Tag */}
                      {locations.length > 1 && shift.locationId && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] bg-background/80 backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm border border-border/50">
                          <MapPin className="h-3 w-3" style={{ color: shift.color || "inherit" }} />
                          <span>{locations.find((l) => l.id === shift.locationId)?.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseSheet>
  );
}
