"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCalendarMembers } from "@/hooks/useCalendarMembers";
import { useAbsenceMutations } from "@/hooks/useAbsences";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarPermission } from "@/hooks/useCalendarPermission";
import { formatDateToLocal, formatDateToDDMMYYYY } from "@/lib/date-utils";
import { CalendarWithCount, Absence } from "@/lib/types";
import {
  CalendarOff,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";

export interface NonRecurringPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
}

interface ReportAbsenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  calendars?: CalendarWithCount[];
  editAbsence?: Absence | null;
  onSuccess?: () => void;
}

export function ReportAbsenceSheet({
  open,
  onOpenChange,
  calendarId,
  calendars = [],
  editAbsence = null,
  onSuccess,
}: ReportAbsenceSheetProps) {
  const t = useTranslations();
  const { user } = useAuth();
  const { members = [], isLoading: membersLoading } = useCalendarMembers(calendarId);
  const { createAbsence, updateAbsence, isCreating, isUpdating } = useAbsenceMutations();

  const isEditing = !!editAbsence;

  // Selected calendar if customizable
  const [selectedCalId, setSelectedCalId] = useState(calendarId);
  const permission = useCalendarPermission(selectedCalId || calendarId);
  // Only admins/owners or when auth is disabled can report absences for everyone
  const canReportOthers = permission.canEdit || permission.isOwner || !user;

  // Form State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [absenceType, setAbsenceType] = useState<string>("absence");
  const [reason, setReason] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  // Recurring state
  const [recurringStartDate, setRecurringStartDate] = useState<string>(() =>
    formatDateToLocal(new Date())
  );
  const [recurringEndDate, setRecurringEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToLocal(d);
  });
  // Weekday selections: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurringAllDay, setRecurringAllDay] = useState<boolean>(true);
  const [recurringStartTime, setRecurringStartTime] = useState<string>("08:00");
  const [recurringEndTime, setRecurringEndTime] = useState<string>("17:00");

  // Non-recurring input state
  const [nonRecStartDate, setNonRecStartDate] = useState<string>(() =>
    formatDateToLocal(new Date())
  );
  const [nonRecEndDate, setNonRecEndDate] = useState<string>(() =>
    formatDateToLocal(new Date())
  );
  const [toFieldManuallyModified, setToFieldManuallyModified] = useState<boolean>(false);
  const [nonRecAllDay, setNonRecAllDay] = useState<boolean>(true);
  const [nonRecStartTime, setNonRecStartTime] = useState<string>("08:00");
  const [nonRecEndTime, setNonRecEndTime] = useState<string>("17:00");

  // Non-recurring editable list of periods - starts empty for new absences
  const [periodsList, setPeriodsList] = useState<NonRecurringPeriod[]>([]);

  // Initialize or reset when sheet opens or editAbsence changes
  useEffect(() => {
    if (open) {
      setSelectedCalId(calendarId);
      if (editAbsence) {
        setSelectedCalId(editAbsence.calendarId);
        setSelectedUserId(editAbsence.userId || "");
        setUserName(editAbsence.userName || "");
        setAbsenceType(editAbsence.type || "absence");
        setReason(editAbsence.reason || "");
        setIsRecurring(editAbsence.isRecurring);

        const startStr = formatDateToLocal(new Date(editAbsence.startDate));
        const endStr = formatDateToLocal(new Date(editAbsence.endDate));

        if (editAbsence.isRecurring) {
          setRecurringStartDate(startStr);
          setRecurringEndDate(endStr);
          setRecurringAllDay(editAbsence.isAllDay);
          setRecurringStartTime(editAbsence.startTime || "08:00");
          setRecurringEndTime(editAbsence.endTime || "17:00");
          try {
            const parsed = JSON.parse(editAbsence.recurringDays || "[]");
            setSelectedWeekdays(Array.isArray(parsed) ? parsed : [1, 2, 3, 4, 5]);
          } catch {
            setSelectedWeekdays([1, 2, 3, 4, 5]);
          }
        } else {
          setPeriodsList([
            {
              id: editAbsence.id,
              startDate: startStr,
              endDate: endStr,
              isAllDay: editAbsence.isAllDay,
              startTime: editAbsence.startTime || "08:00",
              endTime: editAbsence.endTime || "17:00",
            },
          ]);
          setNonRecStartDate(startStr);
          setNonRecEndDate(endStr);
          setNonRecAllDay(editAbsence.isAllDay);
          setNonRecStartTime(editAbsence.startTime || "08:00");
          setNonRecEndTime(editAbsence.endTime || "17:00");
        }
      } else {
        // New Absence initialization
        const todayStr = formatDateToLocal(new Date());
        setSelectedUserId(user?.id || "");
        setUserName(user?.name || "");
        setAbsenceType("absence");
        setReason("");
        setIsRecurring(false);
        setRecurringStartDate(todayStr);
        setRecurringEndDate(formatDateToLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
        setSelectedWeekdays([1, 2, 3, 4, 5]);
        setRecurringAllDay(true);
        setRecurringStartTime("08:00");
        setRecurringEndTime("17:00");

        setNonRecStartDate(todayStr);
        setNonRecEndDate(todayStr);
        setToFieldManuallyModified(false);
        setNonRecAllDay(true);
        setNonRecStartTime("08:00");
        setNonRecEndTime("17:00");
        // Start with empty list so user can build their specific periods
        setPeriodsList([]);
      }
    }
  }, [open, editAbsence, calendarId, user]);

  // Weekday toggling
  const toggleWeekday = (dayNumber: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(dayNumber)
        ? prev.filter((d) => d !== dayNumber)
        : [...prev, dayNumber].sort((a, b) => a - b)
    );
  };

  const weekdays = [
    { num: 1, label: t("absence.weekdays.mon", { default: "Mon" }) },
    { num: 2, label: t("absence.weekdays.tue", { default: "Tue" }) },
    { num: 3, label: t("absence.weekdays.wed", { default: "Wed" }) },
    { num: 4, label: t("absence.weekdays.thu", { default: "Thu" }) },
    { num: 5, label: t("absence.weekdays.fri", { default: "Fri" }) },
    { num: 6, label: t("absence.weekdays.sat", { default: "Sat" }) },
    { num: 7, label: t("absence.weekdays.sun", { default: "Sun" }) },
  ];

  // Handle From date change for non-recurring
  const handleFromDateChange = (newFromDate: string) => {
    setNonRecStartDate(newFromDate);
    // If To field has not been manually changed yet, default to same as From
    if (!toFieldManuallyModified) {
      setNonRecEndDate(newFromDate);
    }
  };

  // Add non-recurring period to editable list (sorted ascending by date)
  const handleAddPeriod = () => {
    if (!nonRecStartDate || !nonRecEndDate) {
      toast.error(t("absence.invalidDates", { default: "Please enter valid dates" }));
      return;
    }

    if (nonRecStartDate > nonRecEndDate) {
      toast.error(t("absence.endBeforeStart", { default: "End date cannot be before start date" }));
      return;
    }

    const newPeriod: NonRecurringPeriod = {
      id: crypto.randomUUID(),
      startDate: nonRecStartDate,
      endDate: nonRecEndDate,
      isAllDay: nonRecAllDay,
      startTime: nonRecAllDay ? "00:00" : nonRecStartTime,
      endTime: nonRecAllDay ? "23:59" : nonRecEndTime,
    };

    setPeriodsList((prev) =>
      [...prev, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
    toast.success(t("absence.periodAdded", { default: "Period added to list" }));

    // Reset input fields
    setToFieldManuallyModified(false);
  };

  // Update a row in the editable list
  const handleUpdatePeriod = (
    id: string,
    field: keyof NonRecurringPeriod,
    value: NonRecurringPeriod[keyof NonRecurringPeriod]
  ) => {
    setPeriodsList((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, [field]: value } : item))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
  };

  // Remove a row from the editable list
  const handleRemovePeriod = (id: string) => {
    setPeriodsList((prev) => prev.filter((item) => item.id !== id));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetCalId = selectedCalId || calendarId;
    if (!targetCalId) {
      toast.error(t("absence.noCalendarSelected", { default: "Please select a calendar" }));
      return;
    }

    // If user is not admin/manager, they can ONLY report absence for themselves
    const finalSelectedUserId = canReportOthers ? (selectedUserId || user?.id || null) : (user?.id || null);
    const targetUserName = canReportOthers
      ? (userName || members.find((m) => m.id === selectedUserId)?.name || user?.name || "Employee")
      : (user?.name || "Employee");

    try {
      if (isEditing && editAbsence) {
        // Update single absence
        if (isRecurring) {
          if (selectedWeekdays.length === 0) {
            toast.error(
              t("absence.selectAtLeastOneDay", {
                default: "Please select at least one weekday",
              })
            );
            return;
          }
          await updateAbsence({
            id: editAbsence.id,
            data: {
              calendarId: targetCalId,
              userId: finalSelectedUserId,
              userName: targetUserName,
              type: absenceType,
              reason,
              isRecurring: true,
              startDate: recurringStartDate,
              endDate: recurringEndDate,
              isAllDay: recurringAllDay,
              startTime: recurringAllDay ? "00:00" : recurringStartTime,
              endTime: recurringAllDay ? "23:59" : recurringEndTime,
              recurringDays: selectedWeekdays,
            },
          });
        } else {
          const firstPeriod = periodsList[0] || {
            startDate: nonRecStartDate,
            endDate: nonRecEndDate,
            isAllDay: nonRecAllDay,
            startTime: nonRecStartTime,
            endTime: nonRecEndTime,
          };
          await updateAbsence({
            id: editAbsence.id,
            data: {
              calendarId: targetCalId,
              userId: finalSelectedUserId,
              userName: targetUserName,
              type: absenceType,
              reason,
              isRecurring: false,
              startDate: firstPeriod.startDate,
              endDate: firstPeriod.endDate,
              isAllDay: firstPeriod.isAllDay,
              startTime: firstPeriod.isAllDay ? "00:00" : firstPeriod.startTime,
              endTime: firstPeriod.isAllDay ? "23:59" : firstPeriod.endTime,
              recurringDays: null,
            },
          });
        }
        toast.success(t("absence.updatedSuccess", { default: "Absence updated successfully" }));
      } else {
        // Create new absence(s)
        if (isRecurring) {
          if (selectedWeekdays.length === 0) {
            toast.error(
              t("absence.selectAtLeastOneDay", {
                default: "Please select at least one weekday",
              })
            );
            return;
          }
          await createAbsence({
            calendarId: targetCalId,
            userId: finalSelectedUserId,
            userName: targetUserName,
            type: absenceType,
            reason,
            isRecurring: true,
            startDate: recurringStartDate,
            endDate: recurringEndDate,
            isAllDay: recurringAllDay,
            startTime: recurringAllDay ? "00:00" : recurringStartTime,
            endTime: recurringAllDay ? "23:59" : recurringEndTime,
            recurringDays: selectedWeekdays,
          });
        } else {
          // If periods list is empty, use current non-recurring inputs
          const finalPeriods =
            periodsList.length > 0
              ? periodsList
              : [
                  {
                    id: crypto.randomUUID(),
                    startDate: nonRecStartDate,
                    endDate: nonRecEndDate,
                    isAllDay: nonRecAllDay,
                    startTime: nonRecStartTime,
                    endTime: nonRecEndTime,
                  },
                ];

          const itemsToCreate = finalPeriods.map((period) => ({
            calendarId: targetCalId,
            userId: finalSelectedUserId,
            userName: targetUserName,
            type: absenceType,
            reason,
            isRecurring: false,
            startDate: period.startDate,
            endDate: period.endDate,
            isAllDay: period.isAllDay,
            startTime: period.isAllDay ? "00:00" : period.startTime,
            endTime: period.isAllDay ? "23:59" : period.endTime,
          }));

          await createAbsence({ items: itemsToCreate });
        }
        toast.success(t("absence.createdSuccess", { default: "Absence reported successfully" }));
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <SheetHeader className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent space-y-1.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {isEditing
                  ? t("absence.editAbsence", { default: "Edit Absence" })
                  : t("absence.reportAbsence", { default: "Report Absence & Vacation" })}
              </SheetTitle>
              <SheetDescription className="text-xs sm:text-sm text-muted-foreground">
                {t("absence.formDescription", {
                  default: "Communicate planned vacation, illness, or absence periods.",
                })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Calendar Selector (if multiple available) */}
          {calendars.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {t("calendar.title")}
              </Label>
              <select
                value={selectedCalId}
                onChange={(e) => setSelectedCalId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20"
              >
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t("common.employee")}
            </Label>
            {!canReportOthers && user ? (
              <div className="flex h-11 w-full items-center rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-sm text-foreground">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{user.name || "Me"}</span>
                <span className="ml-2 text-xs text-muted-foreground">({t("common.you", { default: "You" })})</span>
              </div>
            ) : members.length > 0 ? (
              <select
                value={selectedUserId || userName}
                onChange={(e) => {
                  const val = e.target.value;
                  const member = members.find((m) => m.id === val);
                  if (member) {
                    setSelectedUserId(member.id);
                    setUserName(member.name || "");
                  } else {
                    setSelectedUserId("");
                    setUserName(val);
                  }
                }}
                disabled={membersLoading}
                className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20"
              >
                {user && (
                  <option value={user.id}>
                    {user.name || "Me"} ({t("common.you", { default: "You" })})
                  </option>
                )}
                {members
                  .filter((m) => m.id !== user?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `Member (${m.id.slice(0, 6)})`}
                    </option>
                  ))}
              </select>
            ) : (
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t("absence.employeeNamePlaceholder", {
                  default: "Enter employee name",
                })}
                className="h-11 border-border/50 bg-background/50"
                required
              />
            )}
          </div>

          {/* Absence Type & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("absence.type", { default: "Type" })}
              </Label>
              <select
                value={absenceType}
                onChange={(e) => setAbsenceType(e.target.value)}
                className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20"
              >
                <option value="absence">
                  📅 {t("absence.types.absence", { default: "Absence" })}
                </option>
                <option value="vacation">
                  🌴 {t("absence.types.vacation", { default: "Vacation" })}
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("form.notesLabel", { default: "Notes / Reason" })}{" "}
                <span className="text-xs text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("absence.reasonPlaceholder", {
                  default: "e.g. Summer holiday, Doctor appointment",
                })}
                className="h-11 border-border/50 bg-background/50"
              />
            </div>
          </div>

          {/* 1. Recurrence Selection (Dropdown / Choice) */}
          <div className="space-y-2.5 p-4 rounded-xl border border-border/50 bg-muted/20">
            <Label htmlFor="recurrence-type" className="text-sm font-medium flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" />
              {t("absence.recurrenceChoice", { default: "Recurrence Option" })}
            </Label>
            <select
              id="recurrence-type"
              value={isRecurring ? "recurring" : "non-recurring"}
              onChange={(e) => setIsRecurring(e.target.value === "recurring")}
              className="flex h-11 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm font-medium focus:border-primary/50 focus:ring-primary/20"
            >
              <option value="non-recurring">
                {t("absence.nonRecurring", { default: "Non-recurring (Specific Dates / List of Periods)" })}
              </option>
              <option value="recurring">
                {t("absence.recurring", { default: "Recurring (Specific Weekdays in a Time Period)" })}
              </option>
            </select>
          </div>

          {/* RECURRING ABSENCE FORM */}
          {isRecurring ? (
            <motion.div
              key="recurring-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Repeat className="w-4 h-4" />
                {t("absence.recurringPeriod", { default: "Recurring Period Settings" })}
              </div>

              {/* From and To Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rec-from-date" className="text-sm font-medium">
                    {t("absence.fromDate", { default: "From Date" })}
                  </Label>
                  <Input
                    id="rec-from-date"
                    type="date"
                    value={recurringStartDate}
                    onChange={(e) => setRecurringStartDate(e.target.value)}
                    className="h-11 border-border/50 bg-background"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-to-date" className="text-sm font-medium">
                    {t("absence.toDate", { default: "To Date" })}
                  </Label>
                  <Input
                    id="rec-to-date"
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    className="h-11 border-border/50 bg-background"
                    required
                  />
                </div>
              </div>

              {/* Weekdays selection */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">
                  {t("absence.selectWeekdays", {
                    default: "Select weekdays you cannot work:",
                  })}
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {weekdays.map((w) => {
                    const isSelected = selectedWeekdays.includes(w.num);
                    return (
                      <button
                        key={w.num}
                        type="button"
                        onClick={() => toggleWeekday(w.num)}
                        className={`h-11 rounded-lg text-xs sm:text-sm font-medium transition-all flex flex-col items-center justify-center border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background/80 text-muted-foreground border-border/50 hover:bg-accent"
                        }`}
                      >
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time fields and All Day checkbox */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rec-all-day"
                    checked={recurringAllDay}
                    onCheckedChange={(checked) => setRecurringAllDay(Boolean(checked))}
                  />
                  <label
                    htmlFor="rec-all-day"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t("shift.allDay", { default: "All day" })}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="rec-start-time"
                      className={`text-xs font-medium ${recurringAllDay ? "text-muted-foreground" : ""}`}
                    >
                      {t("shift.startTime")}
                    </Label>
                    <Input
                      id="rec-start-time"
                      type="time"
                      value={recurringStartTime}
                      onChange={(e) => setRecurringStartTime(e.target.value)}
                      disabled={recurringAllDay}
                      className={`h-10 border-border/50 ${
                        recurringAllDay ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "bg-background"
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="rec-end-time"
                      className={`text-xs font-medium ${recurringAllDay ? "text-muted-foreground" : ""}`}
                    >
                      {t("shift.endTime")}
                    </Label>
                    <Input
                      id="rec-end-time"
                      type="time"
                      value={recurringEndTime}
                      onChange={(e) => setRecurringEndTime(e.target.value)}
                      disabled={recurringAllDay}
                      className={`h-10 border-border/50 ${
                        recurringAllDay ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "bg-background"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* NON-RECURRING ABSENCE FORM */
            <motion.div
              key="non-recurring-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Editable List of Periods */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <CalendarOff className="w-4 h-4 text-primary" />
                    {t("absence.periodsList", { default: "Absence Periods List" })}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({periodsList.length})
                    </span>
                  </Label>
                </div>

                {periodsList.length === 0 ? (
                  <div className="p-4 text-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground bg-muted/10">
                    {t("absence.noPeriodsYet", {
                      default: "No periods added yet. Use the inputs below to add dates.",
                    })}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {periodsList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-3 transition-all hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                          <span>
                            {t("absence.periodNumber", { default: "Period" })} #{idx + 1}
                            {item.startDate && (
                              <span className="ml-2 font-normal text-foreground">
                                ({formatDateToDDMMYYYY(item.startDate)}
                                {item.startDate !== item.endDate && ` - ${formatDateToDDMMYYYY(item.endDate)}`})
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePeriod(item.id)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* From and To date fields in row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">
                              {t("absence.fromDate", { default: "From" })}
                            </Label>
                            <Input
                              type="date"
                              value={item.startDate}
                              onChange={(e) =>
                                handleUpdatePeriod(item.id, "startDate", e.target.value)
                              }
                              className="h-9 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">
                              {t("absence.toDate", { default: "To" })}
                            </Label>
                            <Input
                              type="date"
                              value={item.endDate}
                              onChange={(e) =>
                                handleUpdatePeriod(item.id, "endDate", e.target.value)
                              }
                              className="h-9 text-xs bg-background"
                            />
                          </div>
                        </div>

                        {/* All Day & Times in row */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/30">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`item-allday-${item.id}`}
                              checked={item.isAllDay}
                              onCheckedChange={(checked) =>
                                handleUpdatePeriod(item.id, "isAllDay", Boolean(checked))
                              }
                            />
                            <label
                              htmlFor={`item-allday-${item.id}`}
                              className="text-xs cursor-pointer select-none"
                            >
                              {t("shift.allDay")}
                            </label>
                          </div>

                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Input
                              type="time"
                              value={item.startTime}
                              onChange={(e) =>
                                handleUpdatePeriod(item.id, "startTime", e.target.value)
                              }
                              disabled={item.isAllDay}
                              className={`h-8 text-xs flex-1 ${
                                item.isAllDay
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                  : "bg-background"
                              }`}
                            />
                            <span className="text-xs text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={item.endTime}
                              onChange={(e) =>
                                handleUpdatePeriod(item.id, "endTime", e.target.value)
                              }
                              disabled={item.isAllDay}
                              className={`h-8 text-xs flex-1 ${
                                item.isAllDay
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                  : "bg-background"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Period Section */}
              <div className="space-y-4 p-4 rounded-xl border border-border/60 bg-muted/10">
                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  {t("absence.addNewPeriod", { default: "Add a Date / Period to List" })}
                </div>

                {/* From and To Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nonrec-from-date" className="text-xs font-medium">
                      {t("absence.fromDate", { default: "From Date" })}
                    </Label>
                    <Input
                      id="nonrec-from-date"
                      type="date"
                      value={nonRecStartDate}
                      onChange={(e) => handleFromDateChange(e.target.value)}
                      className="h-10 border-border/50 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nonrec-to-date" className="text-xs font-medium">
                      {t("absence.toDate", { default: "To Date" })}
                    </Label>
                    <Input
                      id="nonrec-to-date"
                      type="date"
                      value={nonRecEndDate}
                      onChange={(e) => {
                        setToFieldManuallyModified(true);
                        setNonRecEndDate(e.target.value);
                      }}
                      className="h-10 border-border/50 bg-background"
                    />
                  </div>
                </div>

                {/* Time & All Day */}
                <div className="space-y-3 pt-1 border-t border-border/40">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nonrec-all-day"
                      checked={nonRecAllDay}
                      onCheckedChange={(checked) => setNonRecAllDay(Boolean(checked))}
                    />
                    <label
                      htmlFor="nonrec-all-day"
                      className="text-xs font-medium cursor-pointer"
                    >
                      {t("shift.allDay", { default: "All day" })}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor="nonrec-start-time"
                        className={`text-xs ${nonRecAllDay ? "text-muted-foreground" : ""}`}
                      >
                        {t("shift.startTime")}
                      </Label>
                      <Input
                        id="nonrec-start-time"
                        type="time"
                        value={nonRecStartTime}
                        onChange={(e) => setNonRecStartTime(e.target.value)}
                        disabled={nonRecAllDay}
                        className={`h-9 text-xs border-border/50 ${
                          nonRecAllDay
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                            : "bg-background"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="nonrec-end-time"
                        className={`text-xs ${nonRecAllDay ? "text-muted-foreground" : ""}`}
                      >
                        {t("shift.endTime")}
                      </Label>
                      <Input
                        id="nonrec-end-time"
                        type="time"
                        value={nonRecEndTime}
                        onChange={(e) => setNonRecEndTime(e.target.value)}
                        disabled={nonRecAllDay}
                        className={`h-9 text-xs border-border/50 ${
                          nonRecAllDay
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                            : "bg-background"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Static Add Button inside form is moved to bottom */}
              </div>
            </motion.div>
          )}
        </form>

        {/* Sheet Footer */}
        <SheetFooter className="p-4 sm:p-6 border-t border-border/50 bg-muted/20 shrink-0 space-y-3">
          {/* Static Add to List Button above Cancel and Submit for Non-recurring */}
          {!isRecurring && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddPeriod}
              className="w-full h-10 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("absence.addPeriodToList", { default: "Add Period to List" })}
            </Button>
          )}

          <div className="flex items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
              className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md shadow-primary/20 font-medium"
            >
              {isCreating || isUpdating
                ? t("common.saving")
                : isEditing
                ? t("common.save")
                : t("absence.submitAbsence", { default: "Submit Absence" })}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
