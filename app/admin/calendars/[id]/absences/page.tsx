"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIsAdmin, useAdminLevel } from "@/hooks/useAdminAccess";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarAbsences, useAbsenceMutations } from "@/hooks/useAbsences";
import { useCalendars } from "@/hooks/useCalendars";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { ReportAbsenceSheet } from "@/components/report-absence-sheet";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarOff,
  Plus,
  ArrowLeft,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  User,
  Shield,
} from "lucide-react";
import { Absence } from "@/lib/types";
import { formatDateToLocal } from "@/lib/date-utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface AdminCalendarAbsencesPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCalendarAbsencesPage({
  params,
}: AdminCalendarAbsencesPageProps) {
  const resolvedParams = use(params);
  const calendarId = resolvedParams.id;
  const t = useTranslations();
  const router = useRouter();

  const { isLoading: authLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const adminLevel = useAdminLevel();
  const isSuperAdmin = adminLevel === "superadmin";

  const { calendars = [] } = useCalendars();
  const calendar = calendars.find((c) => c.id === calendarId);

  const { absences = [], isLoading: absencesLoading, refetch } = useCalendarAbsences(calendarId);
  const { deleteAbsence, isDeleting } = useAbsenceMutations();

  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (authLoading) {
    return <FullscreenLoader />;
  }

  if (!isAdmin && !isSuperAdmin) {
    router.replace("/");
    return null;
  }

  const filteredAbsences = absences.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.userName || "").toLowerCase().includes(q) ||
      (a.reason || "").toLowerCase().includes(q) ||
      (a.type || "").toLowerCase().includes(q)
    );
  });

  const handleCreateNew = () => {
    setEditingAbsence(null);
    setSheetOpen(true);
  };

  const handleEdit = (absence: Absence) => {
    setEditingAbsence(absence);
    setSheetOpen(true);
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="container max-w-5xl mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("admin.adminPanel", { default: "Admin Panel" })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarOff className="h-6 w-6 text-primary" />
              <span>
                {calendar?.name || t("calendar.title")} —{" "}
                {t("absence.calendarAbsencesTitle", { default: "Absence Management" })}
              </span>
            </h1>
          </div>

          <Button
            onClick={handleCreateNew}
            className="bg-primary text-primary-foreground flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t("absence.reportAbsenceButton", { default: "Add Absence" })}</span>
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("absence.searchPlaceholder", {
                default: "Search by employee, reason or type...",
              })}
              className="pl-9 h-10"
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {filteredAbsences.length} {t("absence.totalAbsences", { default: "entries" })}
          </div>
        </div>

        {/* List of absences */}
        {absencesLoading ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">
            {t("common.loading", { default: "Loading absences..." })}
          </div>
        ) : filteredAbsences.length === 0 ? (
          <Card className="border-dashed border-border/70 text-center py-16">
            <CardContent className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <CalendarOff className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">
                {searchQuery
                  ? t("absence.noSearchResults", { default: "No matching absences found" })
                  : t("absence.noCalendarAbsences", { default: "No absences recorded for this calendar" })}
              </p>
              <Button onClick={handleCreateNew} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("absence.reportAbsenceButton", { default: "Add Absence" })}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
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
                      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 font-semibold text-sm">
                              <User className="w-4 h-4 text-primary" />
                              <span>
                                {absence.userName ||
                                  absence.user?.name ||
                                  t("common.unknown")}
                              </span>
                            </div>
                            {getTypeBadge(absence.type)}
                            {absence.isRecurring && (
                              <Badge
                                variant="outline"
                                className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 text-xs font-medium"
                              >
                                <Repeat className="w-3 h-3" />
                                {t("absence.recurring", { default: "Recurring" })}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
                            <div className="flex items-center gap-1.5 font-medium">
                              <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                              <span>
                                {startDateStr}
                                {startDateStr !== endDateStr && ` — ${endDateStr}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                              &ldquo;{absence.reason}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(absence)}
                            className="h-8 px-2.5 text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(absence.id)}
                            className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t("common.delete")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sheet */}
      <ReportAbsenceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        calendarId={calendarId}
        editAbsence={editingAbsence}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
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
    </div>
  );
}
