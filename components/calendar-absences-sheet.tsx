"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ReportAbsenceSheet } from "@/components/report-absence-sheet";
import { useCalendarAbsences, useAbsenceMutations } from "@/hooks/useAbsences";
import { Absence } from "@/lib/types";
import { formatDateToLocal } from "@/lib/date-utils";
import {
  CalendarOff,
  Plus,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface CalendarAbsencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  calendarName: string;
}

export function CalendarAbsencesSheet({
  open,
  onOpenChange,
  calendarId,
  calendarName,
}: CalendarAbsencesSheetProps) {
  const t = useTranslations();
  const { absences = [], isLoading, refetch } = useCalendarAbsences(calendarId);
  const { deleteAbsence, isDeleting } = useAbsenceMutations();

  const [searchQuery, setSearchQuery] = useState("");
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredAbsences = absences.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = (a.userName || "").toLowerCase().includes(query);
    const reasonMatch = (a.reason || "").toLowerCase().includes(query);
    const typeMatch = (a.type || "").toLowerCase().includes(query);
    return nameMatch || reasonMatch || typeMatch;
  });

  const handleCreateNew = () => {
    setEditingAbsence(null);
    setReportSheetOpen(true);
  };

  const handleEdit = (absence: Absence) => {
    setEditingAbsence(absence);
    setReportSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await deleteAbsence(deletingId);
      toast.success(t("absence.deletedSuccess", { default: "Absence deleted" }));
      setDeletingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const getWeekdayLabels = (recurringDaysStr?: string | null) => {
    if (!recurringDaysStr) return "";
    try {
      const days: number[] = JSON.parse(recurringDaysStr);
      const map: Record<number, string> = {
        1: t("absence.weekdays.mon", { default: "Mon" }),
        2: t("absence.weekdays.tue", { default: "Tue" }),
        3: t("absence.weekdays.wed", { default: "Wed" }),
        4: t("absence.weekdays.thu", { default: "Thu" }),
        5: t("absence.weekdays.fri", { default: "Fri" }),
        6: t("absence.weekdays.sat", { default: "Sat" }),
        7: t("absence.weekdays.sun", { default: "Sun" }),
      };
      return days.map((d) => map[d] || d).join(", ");
    } catch {
      return "";
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "vacation":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
            🌴 {t("absence.types.vacation", { default: "Vacation" })}
          </Badge>
        );
      case "illness":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">
            🏥 {t("absence.types.illness", { default: "Sick Leave" })}
          </Badge>
        );
      case "other":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
            📝 {t("absence.types.other", { default: "Other" })}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">
            📅 {t("absence.types.absence", { default: "Absence" })}
          </Badge>
        );
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 bg-background">
          <SheetHeader className="p-6 pb-4 border-b border-border/50 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <CalendarOff className="h-5 w-5" />
                <SheetTitle className="text-xl font-bold">
                  {t("absence.calendarAbsencesTitle", { default: "Calendar Absences" })}
                </SheetTitle>
              </div>
              <Button size="sm" onClick={handleCreateNew} className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>{t("absence.reportAbsenceButton", { default: "Add Absence" })}</span>
              </Button>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {t("absence.calendarAbsencesDesc", {
                default: "Manage all reported absences and vacations for {calendarName}",
                calendarName,
              })}
            </SheetDescription>

            {/* Search Input */}
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("absence.searchPlaceholder", {
                    default: "Search by employee, reason or type...",
                  })}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                {t("common.loading", { default: "Loading absences..." })}
              </div>
            ) : filteredAbsences.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <CalendarOff className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {searchQuery
                    ? t("absence.noSearchResults", { default: "No matching absences found" })
                    : t("absence.noCalendarAbsences", { default: "No absences recorded for this calendar" })}
                </p>
                <Button variant="outline" size="sm" onClick={handleCreateNew}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t("absence.reportAbsenceButton", { default: "Add Absence" })}
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                {filteredAbsences.map((absence) => {
                  const startDateStr = formatDateToLocal(new Date(absence.startDate));
                  const endDateStr = formatDateToLocal(new Date(absence.endDate));
                  const weekdayText = getWeekdayLabels(absence.recurringDays);

                  return (
                    <motion.div
                      key={absence.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="border border-border/60 hover:border-primary/40 transition-all shadow-sm">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="font-semibold text-sm truncate">
                                {absence.userName ||
                                  (absence.user?.name) ||
                                  t("common.unknown")}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {getTypeBadge(absence.type)}
                              {absence.isRecurring && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-primary/5 text-primary border-primary/20 flex items-center gap-1 font-medium"
                                >
                                  <Repeat className="w-3 h-3" />
                                  {t("absence.recurring", { default: "Recurring" })}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                            <div className="flex items-center gap-1 text-foreground font-medium">
                              <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>
                                {startDateStr}
                                {startDateStr !== endDateStr && ` — ${endDateStr}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {absence.isAllDay
                                  ? t("shift.allDay", { default: "All day" })
                                  : `${absence.startTime} - ${absence.endTime}`}
                              </span>
                            </div>
                          </div>

                          {absence.isRecurring && weekdayText && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {t("absence.activeOnDays", { default: "Active on:" })}
                              </span>{" "}
                              {weekdayText}
                            </p>
                          )}

                          {absence.reason && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 mt-1">
                              &ldquo;{absence.reason}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(absence)}
                              className="h-7 px-2 text-xs"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              {t("common.edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(absence.id)}
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {t("common.delete")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Report / Edit Absence Sheet */}
      <ReportAbsenceSheet
        open={reportSheetOpen}
        onOpenChange={setReportSheetOpen}
        calendarId={calendarId}
        editAbsence={editingAbsence}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={t("absence.deleteConfirmTitle", { default: "Delete Absence" })}
        description={t("absence.deleteConfirmDescription", {
          default: "Are you sure you want to delete this absence record?",
        })}
        confirmText={t("common.delete")}
        onConfirm={handleDeleteConfirm}
        confirmVariant="destructive"
        confirmDisabled={isDeleting}
      />
    </>
  );
}
