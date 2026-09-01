"use client";

import { useState, useEffect, useRef } from "react";
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
import { ColorPicker } from "@/components/ui/color-picker";
import { CalendarShareManagementSheet } from "@/components/calendar-share-management-sheet";
import { CalendarLocationsManager } from "@/components/calendar-locations-manager";
import { CalendarAbsencesSheet } from "@/components/calendar-absences-sheet";
import { useCalendars } from "@/hooks/useCalendars";
import { useCalendarLocations } from "@/hooks/useCalendarLocations";
import { useCalendarPermission } from "@/hooks/useCalendarPermission";
import { useAuthFeatures } from "@/hooks/useAuthFeatures";
import { PRESET_COLORS } from "@/lib/constants";
import {
  AlertTriangle,
  Trash2,
  Download,
  Cloud,
  Users,
  CalendarOff,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";
import { ExportDialog } from "@/components/export-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useDirtyState } from "@/hooks/useDirtyState";
import { CalendarWithCount } from "@/lib/types";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { toast } from "sonner";

interface CalendarSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  calendarGuestPermission?: "none" | "read" | "write";
  onSuccess: () => void;
  onDelete: () => void;
  onExternalSync?: () => void;
  availableCalendars?: CalendarWithCount[];
}

interface FormState {
  name: string;
  selectedColor: string;
  defaultStartTime: string;
  defaultEndTime: string;
}

export function CalendarSettingsSheet({
  open,
  onOpenChange,
  calendarId,
  calendarName,
  calendarColor,
  calendarGuestPermission = "none",
  onSuccess,
  onDelete,
  onExternalSync,
  availableCalendars = [],
}: CalendarSettingsSheetProps) {
  const t = useTranslations();
  const { updateCalendar } = useCalendars();
  const { locations } = useCalendarLocations(calendarId);
  const { canShare, canManage, canDelete } = useCalendarPermission(calendarId);
  const { isAuthEnabled } = useAuthFeatures();

  const isEmployeeInterface = FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE;
  const currentCalendar = availableCalendars.find((c) => c.id === calendarId);

  const initialStart = currentCalendar?.defaultStartTime || "09:00";
  const initialEnd = currentCalendar?.defaultEndTime || "17:00";

  // Use props directly as initial state, controlled by key prop on component
  const [name, setName] = useState(calendarName);
  const [selectedColor, setSelectedColor] = useState(calendarColor);
  const [defaultStartTime, setDefaultStartTime] = useState(initialStart);
  const [defaultEndTime, setDefaultEndTime] = useState(initialEnd);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareManagement, setShowShareManagement] = useState(false);
  const [showAbsenceManagement, setShowAbsenceManagement] = useState(false);

  // Fill shift plan state
  const [isFillingPlan, setIsFillingPlan] = useState(false);
  const [fillPlanMonth, setFillPlanMonth] = useState(() => new Date().getMonth() + 1);
  const [fillPlanYear, setFillPlanYear] = useState(() => new Date().getFullYear());
  const [showFillPlanConfirm, setShowFillPlanConfirm] = useState(false);

  const initialFormStateRef = useRef<FormState | null>(null);

  // Initialize form state reference when opening
  useEffect(() => {
    if (open) {
      const cur = availableCalendars.find((c) => c.id === calendarId);
      const start = cur?.defaultStartTime || "09:00";
      const end = cur?.defaultEndTime || "17:00";

      setName(calendarName);
      setSelectedColor(calendarColor);
      setDefaultStartTime(start);
      setDefaultEndTime(end);

      initialFormStateRef.current = {
        name: calendarName,
        selectedColor: calendarColor,
        defaultStartTime: start,
        defaultEndTime: end,
      };
    } else {
      initialFormStateRef.current = null;
      setShowFillPlanConfirm(false);
    }
  }, [open, calendarId, calendarName, calendarColor, calendarGuestPermission, availableCalendars]);

  const hasChanges = () => {
    if (!initialFormStateRef.current) return false;

    const current: FormState = {
      name,
      selectedColor,
      defaultStartTime,
      defaultEndTime,
    };

    return (
      JSON.stringify(current) !== JSON.stringify(initialFormStateRef.current)
    );
  };

  const {
    isDirty,
    handleClose,
    showConfirmDialog,
    setShowConfirmDialog,
    handleConfirmClose,
  } = useDirtyState({
    onClose: onOpenChange,
    hasChanges,
  });

  const handleSubmit = async () => {
    setLoading(true);

    const updates = {
      name: name !== calendarName ? name : undefined,
      color: selectedColor !== calendarColor ? selectedColor : undefined,
      defaultStartTime: isEmployeeInterface ? defaultStartTime : undefined,
      defaultEndTime: isEmployeeInterface ? defaultEndTime : undefined,
    };

    await updateCalendar(calendarId, updates);

    setLoading(false);
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  const handleFillShiftPlan = async () => {
    setIsFillingPlan(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/fill-shift-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: fillPlanYear,
          month: fillPlanMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fill shift plan");
      }

      toast.success(
        `Shift plan generated! ${data.createdCount} shift(s) scheduled. (${data.skippedAbsencesCount || 0} skipped due to absences, ${data.skippedExistingCount || 0} already existed)`
      );
      setShowFillPlanConfirm(false);
      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to fill shift plan";
      toast.error(msg);
    } finally {
      setIsFillingPlan(false);
    }
  };

  // Only owner/admin can access settings
  if (!canManage) {
    return null;
  }

  const hasSingleLocation = locations.length <= 1;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[600px] p-0 flex flex-col gap-0 border-l border-border/50 overflow-hidden"
        >
          <SheetHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-5 space-y-1.5">
            <SheetTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t("calendar.settings", { name: calendarName })}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {t("calendar.settingsDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Calendar Name */}
            <div className="space-y-2.5">
              <Label
                htmlFor="calendarName"
                className="text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
                {t("common.labels.name")}
              </Label>
              <Input
                id="calendarName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder", {
                  example: t("calendar.name"),
                })}
                className="h-11 border-primary/30 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
                required
              />
            </div>

            {/* Calendar Color */}
            <ColorPicker
              color={selectedColor}
              onChange={setSelectedColor}
              label={t("form.colorLabel")}
              presetColors={PRESET_COLORS}
            />

            {/* Calendar Default Times (if single location or employee interface) */}
            {isEmployeeInterface && hasSingleLocation && (
              <div className="space-y-2.5 pt-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Default Shift Times
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Start Time</span>
                    <Input
                      type="time"
                      value={defaultStartTime}
                      onChange={(e) => setDefaultStartTime(e.target.value)}
                      className="h-10 bg-background/50 border-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">End Time</span>
                    <Input
                      type="time"
                      value={defaultEndTime}
                      onChange={(e) => setDefaultEndTime(e.target.value)}
                      className="h-10 bg-background/50 border-primary/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Locations Manager Section */}
            <CalendarLocationsManager calendarId={calendarId} />

            {/* Fill Shift Plan Section */}
            {isEmployeeInterface && canManage && (
              <div className="pt-4 mt-4 border-t border-border/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Fill Shift Plan
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Apply configured fixed shifts & rules for the selected month.
                      </p>
                    </div>
                  </div>

                  {!showFillPlanConfirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFillPlanConfirm(true)}
                      className="w-full h-11 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Fill Shift Plan for Month
                    </Button>
                  ) : (
                    <div className="p-4 bg-muted/40 rounded-xl border border-primary/30 space-y-3 animate-in fade-in">
                      <div className="text-xs font-semibold text-foreground">
                        Select Month & Year to populate:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Month
                          </label>
                          <select
                            value={fillPlanMonth}
                            onChange={(e) => setFillPlanMonth(Number(e.target.value))}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                              const d = new Date(2026, m - 1, 1);
                              return (
                                <option key={m} value={m}>
                                  {d.toLocaleString("default", { month: "long" })}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Year
                          </label>
                          <select
                            value={fillPlanYear}
                            onChange={(e) => setFillPlanYear(Number(e.target.value))}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {[2025, 2026, 2027, 2028].map((yr) => (
                              <option key={yr} value={yr}>
                                {yr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFillPlanConfirm(false)}
                          className="flex-1"
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleFillShiftPlan}
                          disabled={isFillingPlan}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isFillingPlan ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              Apply Fixed Shifts
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Sync Section */}
            {onExternalSync && (
              <div className="pt-4 mt-4 border-t border-border/50">
                <div className="space-y-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onExternalSync}
                    className="w-full h-11 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    {t("externalSync.manageTitle")}
                  </Button>
                </div>
              </div>
            )}

            {/* Export Section */}
            <div className="pt-4 mt-4 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExportDialog(true)}
                className="w-full h-11 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("export.exportCalendar")}
              </Button>
            </div>

            {/* Manage Sharing Section */}
            {isAuthEnabled && canShare && (
              <div className="pt-4 mt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowShareManagement(true)}
                  className="w-full h-11 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t("share.manageSharing")}
                </Button>
              </div>
            )}

            {/* Absence & Vacation Management */}
            {canManage && (
              <div className="pt-4 mt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAbsenceManagement(true)}
                  className="w-full h-11 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-foreground"
                >
                  <CalendarOff className="h-4 w-4 mr-2 text-primary" />
                  {t("absence.calendarAbsenceManagement", {
                    default: "Manage Absences & Vacations",
                  })}
                </Button>
              </div>
            )}

            {/* Delete Section */}
            {canDelete && (
              <div className="pt-4 mt-4 border-t border-border/50">
                <div className="space-y-3">
                  {!showDeleteConfirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full h-11 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("calendar.deleteCalendar")}
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                        <div className="flex items-start gap-2.5 text-destructive mb-2">
                          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold">
                              {t("common.deleteConfirm", {
                                item: t("calendar.title"),
                                name: calendarName,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("calendar.deleteWarning")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 h-11"
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                          className="flex-1 h-11 shadow-lg shadow-destructive/25"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-border/50 bg-muted/20 px-6 py-4 mt-auto">
            <div className="flex gap-2.5 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 h-11 border-border/50 hover:bg-muted/50"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isDirty}
                className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        calendarId={calendarId}
        availableCalendars={availableCalendars}
        calendarName={calendarName}
      />

      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmClose}
      />

      <CalendarShareManagementSheet
        open={showShareManagement}
        onOpenChange={setShowShareManagement}
        calendarId={calendarId}
        calendarName={calendarName}
        calendarGuestPermission={calendarGuestPermission}
        canManageShares={canShare}
      />

      <CalendarAbsencesSheet
        open={showAbsenceManagement}
        onOpenChange={setShowAbsenceManagement}
        calendarId={calendarId}
        calendarName={calendarName}
      />
    </>
  );
}
