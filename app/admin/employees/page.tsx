"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Calendar as CalendarIcon,
  UserCheck,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Shield,
  Briefcase,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { useRequireSuperAdmin } from "@/hooks/useAdminAccess";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { toast } from "sonner";
import type { FixedShiftRule, FixedShiftPatternType } from "@/lib/types";

interface CalendarSummary {
  id: string;
  name: string;
  color: string;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}

interface LocationSummary {
  id: string;
  name: string;
  color?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}

interface EmployeeItem {
  id?: string;
  calendarId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role?: string | null;
    banned?: boolean;
  };
  preferredWorkDays: number[];
  maxHoursPerMonth: number | null;
  preferredHoursPerMonth: number | null;
  minHoursPerMonth: number | null;
  canWorkAlone: boolean;
  fixedShifts: FixedShiftRule[];
  updatedAt?: string | null;
}

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", fullLabel: "Monday" },
  { id: 2, label: "Tue", fullLabel: "Tuesday" },
  { id: 3, label: "Wed", fullLabel: "Wednesday" },
  { id: 4, label: "Thu", fullLabel: "Thursday" },
  { id: 5, label: "Fri", fullLabel: "Friday" },
  { id: 6, label: "Sat", fullLabel: "Saturday" },
  { id: 7, label: "Sun", fullLabel: "Sunday" },
];

function getPatternDescription(rule: FixedShiftRule, locations: LocationSummary[]): string {
  const dayName = DAYS_OF_WEEK.find((d) => d.id === rule.dayOfWeek)?.fullLabel || "Day";
  const loc = locations.find((l) => l.id === rule.locationId);
  const locSuffix = loc ? ` @ ${loc.name}` : "";
  const timeSuffix = ` (${rule.startTime} - ${rule.endTime})`;

  switch (rule.patternType) {
    case "weekly":
      return `Every ${dayName}${timeSuffix}${locSuffix}`;
    case "biweekly": {
      const parityStr =
        rule.weekParity === "even"
          ? " (even weeks)"
          : rule.weekParity === "odd"
          ? " (odd weeks)"
          : " (every 2 weeks)";
      return `${dayName} every 2 weeks${parityStr}${timeSuffix}${locSuffix}`;
    }
    case "monthly_nth_day": {
      const nthText =
        rule.nthOccurrence === 1
          ? "1st"
          : rule.nthOccurrence === 2
          ? "2nd"
          : rule.nthOccurrence === 3
          ? "3rd"
          : rule.nthOccurrence === 4
          ? "4th"
          : rule.nthOccurrence === -1
          ? "Last"
          : `${rule.nthOccurrence}th`;
      return `Every ${nthText} ${dayName} of month${timeSuffix}${locSuffix}`;
    }
    case "monthly_day_of_month":
      return `Day ${rule.dayOfMonth || 1} of every month${timeSuffix}${locSuffix}`;
    default:
      return `Shift${timeSuffix}${locSuffix}`;
  }
}

export default function SuperadminEmployeesPage() {
  useRequireSuperAdmin("/admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string>("");
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editPreferredDays, setEditPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [editMinHours, setEditMinHours] = useState<string>("");
  const [editPreferredHours, setEditPreferredHours] = useState<string>("");
  const [editMaxHours, setEditMaxHours] = useState<string>("");
  const [editCanWorkAlone, setEditCanWorkAlone] = useState<boolean>(true);
  const [editFixedShifts, setEditFixedShifts] = useState<FixedShiftRule[]>([]);

  // Fixed Shift Builder sub-form state
  const [newRulePattern, setNewRulePattern] = useState<FixedShiftPatternType>("weekly");
  const [newRuleDayOfWeek, setNewRuleDayOfWeek] = useState<number>(1);
  const [newRuleWeekParity, setNewRuleWeekParity] = useState<"all" | "even" | "odd">("all");
  const [newRuleNth, setNewRuleNth] = useState<number>(1);
  const [newRuleDayOfMonth, setNewRuleDayOfMonth] = useState<number>(1);
  const [newRuleStartTime, setNewRuleStartTime] = useState<string>("09:00");
  const [newRuleEndTime, setNewRuleEndTime] = useState<string>("17:00");
  const [newRuleLocationId, setNewRuleLocationId] = useState<string>("");
  const [newRuleTitle, setNewRuleTitle] = useState<string>("");

  const fetchData = async (calendarId?: string) => {
    setLoading(true);
    try {
      const url = calendarId
        ? `/api/admin/employees?calendarId=${calendarId}`
        : `/api/admin/employees`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch employee settings");
      }
      const data = await res.json();
      setCalendars(data.calendars || []);
      setActiveCalendarId(data.activeCalendarId || "");
      setLocations(data.locations || []);
      setEmployees(data.employees || []);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to load employee settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalendarChange = (calId: string) => {
    setActiveCalendarId(calId);
    fetchData(calId);
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.user.name?.toLowerCase().includes(q) ||
        emp.user.email?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditPreferredDays(emp.preferredWorkDays || [1, 2, 3, 4, 5]);
    setEditMinHours(emp.minHoursPerMonth !== null ? String(emp.minHoursPerMonth) : "");
    setEditPreferredHours(
      emp.preferredHoursPerMonth !== null ? String(emp.preferredHoursPerMonth) : ""
    );
    setEditMaxHours(emp.maxHoursPerMonth !== null ? String(emp.maxHoursPerMonth) : "");
    setEditCanWorkAlone(emp.canWorkAlone !== false);
    setEditFixedShifts(emp.fixedShifts ? [...emp.fixedShifts] : []);

    // Set default builder times from location/calendar
    const cal = calendars.find((c) => c.id === activeCalendarId);
    setNewRuleStartTime(locations[0]?.defaultStartTime || cal?.defaultStartTime || "09:00");
    setNewRuleEndTime(locations[0]?.defaultEndTime || cal?.defaultEndTime || "17:00");
    setNewRuleLocationId(locations[0]?.id || "");
    setNewRuleTitle("");
  };

  const handleTogglePreferredDay = (dayId: number) => {
    setEditPreferredDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleAddFixedShiftRule = () => {
    const newRule: FixedShiftRule = {
      id: crypto.randomUUID(),
      title: newRuleTitle.trim() || undefined,
      patternType: newRulePattern,
      dayOfWeek:
        newRulePattern === "monthly_day_of_month" ? undefined : newRuleDayOfWeek,
      weekParity: newRulePattern === "biweekly" ? newRuleWeekParity : undefined,
      nthOccurrence:
        newRulePattern === "monthly_nth_day"
          ? (newRuleNth as 1 | 2 | 3 | 4 | -1)
          : undefined,
      dayOfMonth:
        newRulePattern === "monthly_day_of_month" ? newRuleDayOfMonth : undefined,
      startTime: newRuleStartTime,
      endTime: newRuleEndTime,
      locationId: newRuleLocationId || null,
    };

    setEditFixedShifts((prev) => [...prev, newRule]);
    setNewRuleTitle("");
    toast.success("Fixed shift rule added to list");
  };

  const handleRemoveFixedShiftRule = (ruleId: string) => {
    setEditFixedShifts((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleSaveEmployeeSettings = async () => {
    if (!editingEmployee || !activeCalendarId) return;

    setSaving(true);
    try {
      const minH = editMinHours ? parseFloat(editMinHours) : null;
      const prefH = editPreferredHours ? parseFloat(editPreferredHours) : null;
      const maxH = editMaxHours ? parseFloat(editMaxHours) : null;

      const payload = {
        calendarId: activeCalendarId,
        userId: editingEmployee.userId,
        preferredWorkDays: editPreferredDays,
        minHoursPerMonth: minH,
        preferredHoursPerMonth: prefH,
        maxHoursPerMonth: maxH,
        canWorkAlone: editCanWorkAlone,
        fixedShifts: editFixedShifts,
      };

      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      toast.success(
        `Employee settings saved for ${editingEmployee.user.name || editingEmployee.user.email}`
      );
      setEditingEmployee(null);
      fetchData(activeCalendarId);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to save employee settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Employee Interface Inactive</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          The employee-based interface is currently disabled by configuration.
        </p>
      </div>
    );
  }

  if (loading && employees.length === 0) {
    return <FullscreenLoader />;
  }

  const activeCalendar = calendars.find((c) => c.id === activeCalendarId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Employee Management
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  <Shield className="w-3 h-3 mr-1" /> Superadmin Only
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure employee-specific constraints, monthly hours, work preferences, and recurring fixed shifts.
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Selector */}
        <div className="flex items-center gap-2.5">
          <Label htmlFor="calendar-select" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Calendar:
          </Label>
          <div className="relative min-w-[200px]">
            <select
              id="calendar-select"
              value={activeCalendarId}
              onChange={(e) => handleCalendarChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search employee by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-background/60"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Total Employees: <strong className="text-foreground">{employees.length}</strong>
          </span>
          <span>•</span>
          <span>
            Locations: <strong className="text-foreground">{locations.length}</strong>
          </span>
        </div>
      </div>

      {/* Employee List / Table */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Fixed Shifts</th>
                <th className="px-5 py-3.5">Preferred Days</th>
                <th className="px-5 py-3.5">Hours / Month</th>
                <th className="px-5 py-3.5">Can Work Alone</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">
                    No employees found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const fixedCount = emp.fixedShifts?.length || 0;
                  const prefDays = emp.preferredWorkDays || [1, 2, 3, 4, 5];

                  return (
                    <tr
                      key={emp.userId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* Employee Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border border-border/60">
                            <AvatarImage src={emp.user.image || undefined} />
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {emp.user.name?.[0] || emp.user.email?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {emp.user.name || "Unnamed"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {emp.user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fixed Shifts */}
                      <td className="px-5 py-4">
                        {fixedCount === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            None configured
                          </span>
                        ) : (
                          <div className="space-y-1 max-w-[260px]">
                            {emp.fixedShifts.slice(0, 2).map((rule, idx) => (
                              <div
                                key={rule.id || idx}
                                className="text-xs px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/20 truncate"
                                title={getPatternDescription(rule, locations)}
                              >
                                {getPatternDescription(rule, locations)}
                              </div>
                            ))}
                            {fixedCount > 2 && (
                              <span className="text-[11px] text-muted-foreground font-medium block">
                                +{fixedCount - 2} more rule(s)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Preferred Days */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {DAYS_OF_WEEK.map((d) => {
                            const isSelected = prefDays.includes(d.id);
                            return (
                              <span
                                key={d.id}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-muted text-muted-foreground/40"
                                }`}
                                title={d.fullLabel}
                              >
                                {d.label[0]}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Hours per Month */}
                      <td className="px-5 py-4">
                        <div className="text-xs space-y-0.5">
                          <div className="text-muted-foreground">
                            Min: <strong className="text-foreground">{emp.minHoursPerMonth ?? "-"}</strong>
                          </div>
                          <div className="text-muted-foreground">
                            Pref: <strong className="text-foreground">{emp.preferredHoursPerMonth ?? "-"}</strong>
                          </div>
                          <div className="text-muted-foreground">
                            Max: <strong className="text-foreground">{emp.maxHoursPerMonth ?? "-"}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Can Work Alone */}
                      <td className="px-5 py-4">
                        {emp.canWorkAlone ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                            <Check className="w-3 h-3 mr-1" /> Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                            <X className="w-3 h-3 mr-1" /> No
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(emp)}
                          className="h-8 gap-1.5 border-primary/30 hover:bg-primary/10 text-primary font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Configure
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee Constraints Dialog */}
      <Dialog
        open={!!editingEmployee}
        onOpenChange={(open) => {
          if (!open) setEditingEmployee(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Configure Employee: {editingEmployee?.user.name || editingEmployee?.user.email}
            </DialogTitle>
            <DialogDescription>
              Set availability constraints and recurring fixed shift templates for calendar:{" "}
              <strong>{activeCalendar?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Preferred Work Days */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Preferred Work Days
              </Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isChecked = editPreferredDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleTogglePreferredDay(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {day.fullLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Hours Limits */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Monthly Hours Limits
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Minimum Hours</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 40"
                    value={editMinHours}
                    onChange={(e) => setEditMinHours(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Preferred Hours</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 140"
                    value={editPreferredHours}
                    onChange={(e) => setEditPreferredHours(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Maximum Hours</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 160"
                    value={editMaxHours}
                    onChange={(e) => setEditMaxHours(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Can Work Alone */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Solo Shift Capability
              </Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="canWorkAlone"
                    checked={editCanWorkAlone}
                    onChange={() => setEditCanWorkAlone(true)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Can work alone (qualified for single-person shifts)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="canWorkAlone"
                    checked={!editCanWorkAlone}
                    onChange={() => setEditCanWorkAlone(false)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Requires supervision / partner</span>
                </label>
              </div>
            </div>

            {/* Fixed Shifts Section */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Fixed Shifts & Complex Recurring Patterns
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supports &quot;Every 1st Monday of month&quot;, &quot;Tuesday every 2 weeks&quot;, weekly &amp; monthly rules.
                  </p>
                </div>
              </div>

              {/* Current Fixed Shifts List */}
              {editFixedShifts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editFixedShifts.map((rule, idx) => (
                    <div
                      key={rule.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-xs font-medium text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {getPatternDescription(rule, locations)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFixedShiftRule(rule.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/60 rounded-lg">
                  No fixed shift rules added yet. Use the builder below to add rules.
                </div>
              )}

              {/* Add New Fixed Shift Rule Builder */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Fixed Shift Rule
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pattern Type */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Pattern Type</span>
                    <select
                      value={newRulePattern}
                      onChange={(e) => setNewRulePattern(e.target.value as FixedShiftPatternType)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="weekly">Weekly (Every week)</option>
                      <option value="biweekly">Biweekly (Every 2 weeks)</option>
                      <option value="monthly_nth_day">Monthly Nth Day (e.g. 1st Monday)</option>
                      <option value="monthly_day_of_month">Monthly Day of Month (e.g. 15th)</option>
                    </select>
                  </div>

                  {/* Day of Week or Day of Month Selector */}
                  {newRulePattern === "monthly_day_of_month" ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Day of Month (1-31)</span>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={newRuleDayOfMonth}
                        onChange={(e) => setNewRuleDayOfMonth(Number(e.target.value))}
                        className="h-9 bg-background text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Day of Week</span>
                      <select
                        value={newRuleDayOfWeek}
                        onChange={(e) => setNewRuleDayOfWeek(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Biweekly parity selector */}
                  {newRulePattern === "biweekly" && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Week Interval</span>
                      <select
                        value={newRuleWeekParity}
                        onChange={(e) => setNewRuleWeekParity(e.target.value as "all" | "even" | "odd")}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">Every 2 weeks</option>
                        <option value="even">Even ISO weeks</option>
                        <option value="odd">Odd ISO weeks</option>
                      </select>
                    </div>
                  )}

                  {/* Monthly Nth Occurrence */}
                  {newRulePattern === "monthly_nth_day" && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Which Week?</span>
                      <select
                        value={newRuleNth}
                        onChange={(e) => setNewRuleNth(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value={1}>1st occurrence of month</option>
                        <option value={2}>2nd occurrence of month</option>
                        <option value={3}>3rd occurrence of month</option>
                        <option value={4}>4th occurrence of month</option>
                        <option value={-1}>Last occurrence of month</option>
                      </select>
                    </div>
                  )}

                  {/* Location selection */}
                  {locations.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Location</span>
                      <select
                        value={newRuleLocationId}
                        onChange={(e) => {
                          const targetLocId = e.target.value;
                          setNewRuleLocationId(targetLocId);
                          const loc = locations.find((l) => l.id === targetLocId);
                          if (loc?.defaultStartTime) setNewRuleStartTime(loc.defaultStartTime);
                          if (loc?.defaultEndTime) setNewRuleEndTime(loc.defaultEndTime);
                        }}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Default Location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Start Time</span>
                    <Input
                      type="time"
                      value={newRuleStartTime}
                      onChange={(e) => setNewRuleStartTime(e.target.value)}
                      className="h-9 bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">End Time</span>
                    <Input
                      type="time"
                      value={newRuleEndTime}
                      onChange={(e) => setNewRuleEndTime(e.target.value)}
                      className="h-9 bg-background text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddFixedShiftRule}
                  className="w-full h-8 bg-primary/90 hover:bg-primary text-primary-foreground text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule to Template
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEmployee(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEmployeeSettings}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
