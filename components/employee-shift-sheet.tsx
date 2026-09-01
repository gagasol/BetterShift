"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { BaseSheet } from "@/components/ui/base-sheet";
import { ShiftWithCalendar } from "@/lib/types";
import { EmployeeShiftFormFields } from "@/components/employee-shift-form-fields";
import { ReadOnlyBanner } from "@/components/read-only-banner";
import { useCalendarPermission } from "@/hooks/useCalendarPermission";
import { useCalendarMembers } from "@/hooks/useCalendarMembers";
import { useCalendarLocations } from "@/hooks/useCalendarLocations";
import { useCalendarAbsences } from "@/hooks/useAbsences";
import { formatDateToLocal } from "@/lib/date-utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShiftFormData } from "@/components/shift-sheet";

interface EmployeeShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (shift: ShiftFormData) => void | Promise<void>;
  selectedDate?: Date;
  shift?: ShiftWithCalendar;
  calendarId?: string;
  selectedLocationId?: string;
  readOnly?: boolean;
  onDeleteShift?: (shiftId: string) => Promise<void>;
}

export function EmployeeShiftSheet({
  open,
  onOpenChange,
  onSubmit,
  selectedDate,
  shift,
  calendarId,
  selectedLocationId,
  readOnly = false,
  onDeleteShift,
}: EmployeeShiftSheetProps) {
  const t = useTranslations();
  const permission = useCalendarPermission(calendarId);
  const [isSaving, setIsSaving] = useState(false);
  const initialFormDataRef = useRef<string | null>(null);

  const { members, isLoading: membersLoading } = useCalendarMembers(calendarId);
  const { locations } = useCalendarLocations(calendarId || null);
  const { absences = [] } = useCalendarAbsences(calendarId);
  const isReadOnly = readOnly || !permission.canEdit;

  const defaultLocId =
    shift?.locationId ||
    selectedLocationId ||
    (locations.length > 0 ? locations[0].id : undefined);

  const [formData, setFormData] = useState<ShiftFormData>({
    date: formatDateToLocal(selectedDate || new Date()),
    startTime: "09:00",
    endTime: "17:00",
    title: "",
    color: "#3b82f6",
    notes: "",
    isAllDay: false,
    locationId: defaultLocId,
    userId: shift?.userId || null,
  });

  // Sync form data on open or shift change
  useEffect(() => {
    if (open) {
      const locId =
        shift?.locationId ||
        selectedLocationId ||
        (locations.length > 0 ? locations[0].id : undefined);

      if (shift) {
        const initialData: ShiftFormData = {
          date:
            shift.date && shift.date instanceof Date
              ? formatDateToLocal(shift.date)
              : formatDateToLocal(new Date()),
          startTime: shift.startTime || "09:00",
          endTime: shift.endTime || "17:00",
          title: shift.title || "",
          notes: shift.notes || "",
          color: shift.color || "#3b82f6",
          isAllDay: false,
          locationId: locId,
          userId: shift.userId || null,
        };
        setFormData(initialData);
        initialFormDataRef.current = JSON.stringify(initialData);
      } else {
        const initialData: ShiftFormData = {
          date: formatDateToLocal(selectedDate || new Date()),
          startTime: "09:00",
          endTime: "17:00",
          title: "",
          color: "#3b82f6",
          notes: "",
          isAllDay: false,
          locationId: locId,
          userId: null,
        };
        setFormData(initialData);
        initialFormDataRef.current = null;
      }
    } else {
      initialFormDataRef.current = null;
    }
  }, [open, shift, selectedDate, selectedLocationId, locations]);

  const hasChanges = (): boolean => {
    if (shift && initialFormDataRef.current) {
      const currentData: ShiftFormData = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        title: formData.title,
        notes: formData.notes || "",
        color: formData.color,
        isAllDay: false,
        locationId: formData.locationId,
        userId: formData.userId || null,
      };
      return JSON.stringify(currentData) !== initialFormDataRef.current;
    }
    return Boolean(
      formData.title.trim() !== "" ||
        (formData.notes && formData.notes.trim() !== "")
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSubmit({
        ...formData,
        isAllDay: false,
        locationId: formData.locationId,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title={shift ? t("shift.edit") : t("shift.create")}
      description={
        shift ? t("shift.editDescription") : t("shift.createDescription")
      }
      showSaveButton={!isReadOnly}
      showCancelButton
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!formData.title.trim() || (shift && !hasChanges())}
      hasUnsavedChanges={!isReadOnly && hasChanges()}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Read-only banner */}
        {isReadOnly && <ReadOnlyBanner message={t("guest.cannotEdit")} />}

        {/* Employee shift form fields */}
        <EmployeeShiftFormFields
          formData={formData}
          onFormDataChange={setFormData}
          locations={locations}
          readOnly={isReadOnly}
          members={members}
          membersLoading={membersLoading}
          absences={absences}
        />

        {/* Delete Shift Button */}
        {shift && !isReadOnly && onDeleteShift && (
          <div className="pt-6 mt-4 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={isSaving}
              onClick={async () => {
                if (window.confirm(t("admin.pleaseConfirmDeletion"))) {
                  setIsSaving(true);
                  try {
                    await onDeleteShift(shift.id);
                    onOpenChange(false);
                  } catch (error) {
                    console.error("Error while deleting:", error);
                  } finally {
                    setIsSaving(false);
                  }
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common.delete")}
            </Button>
          </div>
        )}
      </div>
    </BaseSheet>
  );
}
