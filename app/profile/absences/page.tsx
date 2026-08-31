"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useAuthFeatures } from "@/hooks/useAuthFeatures";
import { useUserAbsences, useAbsenceMutations } from "@/hooks/useAbsences";
import { useCalendars } from "@/hooks/useCalendars";
import { useVersionInfo } from "@/hooks/useVersionInfo";
import { AuthHeader } from "@/components/auth-header";
import { AppFooter } from "@/components/app-footer";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { ReportAbsenceSheet } from "@/components/report-absence-sheet";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarOff,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  ArrowLeft,
} from "lucide-react";
import { Absence } from "@/lib/types";
import { formatDateToDDMMYYYY } from "@/lib/date-utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export default function UserAbsencesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isAuthEnabled } = useAuthFeatures();
  const versionInfo = useVersionInfo();

  const { absences = [], isLoading: absencesLoading, refetch } = useUserAbsences();
  const { deleteAbsence, isDeleting } = useAbsenceMutations();
  const { calendars = [] } = useCalendars();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [deletingAbsenceId, setDeletingAbsenceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthEnabled) {
      router.replace("/");
    } else if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [isAuthEnabled, authLoading, user, router]);

  if (!mounted || authLoading || (isAuthEnabled && !user)) {
    return <FullscreenLoader />;
  }

  const handleEdit = (absence: Absence) => {
    setEditingAbsence(absence);
    setSheetOpen(true);
  };

  const handleOpenNew = () => {
    setEditingAbsence(null);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAbsenceId) return;
    try {
      await deleteAbsence(deletingAbsenceId);
      toast.success(t("absence.deletedSuccess", { default: "Absence entry deleted" }));
      setDeletingAbsenceId(null);
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
    <div className="min-h-screen flex flex-col bg-background">
      <AuthHeader />

      <main className="container max-w-4xl mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Navigation Return Button */}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2 h-8 px-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back", { default: "Back" })}</span>
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <CalendarOff className="h-6 w-6" />
              <h1 className="text-2xl font-bold tracking-tight">
                {t("absence.myAbsences", { default: "My Absences & Vacations" })}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("absence.myAbsencesDescription", {
                default: "View, report, and manage your scheduled vacation days, leaves, and absences.",
              })}
            </p>
          </div>

          <Button
            onClick={handleOpenNew}
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{t("absence.reportAbsenceButton", { default: "Report absence" })}</span>
          </Button>
        </div>

        {/* List of Absences */}
        {absencesLoading ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">
            {t("common.loading", { default: "Loading absences..." })}
          </div>
        ) : absences.length === 0 ? (
          <Card className="border-dashed border-border/70 text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <CalendarOff className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {t("absence.noAbsencesTitle", { default: "No absences recorded" })}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {t("absence.noAbsencesDescription", {
                    default: "You haven't reported any vacation or absence periods yet. Click the button below to submit a new absence.",
                  })}
                </p>
              </div>
              <Button onClick={handleOpenNew} variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("absence.reportAbsenceButton", { default: "Report absence" })}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            <AnimatePresence>
              {[...absences]
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((absence) => {
                  const startDateStr = formatDateToDDMMYYYY(absence.startDate);
                  const endDateStr = formatDateToDDMMYYYY(absence.endDate);
                  const weekdayText = getWeekdayLabels(absence.recurringDays);

                  return (
                    <motion.div
                      key={absence.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="border border-border/60 hover:border-primary/40 transition-all shadow-sm">
                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {getTypeBadge(absence.type)}
                              {absence.isRecurring && (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 font-medium"
                                >
                                  <Repeat className="w-3 h-3" />
                                  {t("absence.recurring", { default: "Recurring" })}
                                </Badge>
                              )}
                              {absence.calendar && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal"
                                  style={{
                                    borderColor: absence.calendar.color + "40",
                                  }}
                                >
                                  {absence.calendar.name}
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
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;{absence.reason}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(absence)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title={t("common.edit")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingAbsenceId(absence.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </main>

      {/* Report / Edit Sheet */}
      <ReportAbsenceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        calendarId={calendars[0]?.id || ""}
        calendars={calendars}
        editAbsence={editingAbsence}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deletingAbsenceId}
        onOpenChange={(open) => !open && setDeletingAbsenceId(null)}
        title={t("absence.deleteConfirmTitle", { default: "Delete Absence Entry" })}
        description={t("absence.deleteConfirmDescription", {
          default: "Are you sure you want to delete this absence record? This action cannot be undone.",
        })}
        confirmText={t("common.delete")}
        onConfirm={handleDeleteConfirm}
        confirmVariant="destructive"
        confirmDisabled={isDeleting}
      />

      <AppFooter versionInfo={versionInfo} />
    </div>
  );
}
