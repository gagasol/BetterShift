"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { BaseSheet } from "@/components/ui/base-sheet";
import { ShiftWithCalendar } from "@/lib/types";
import { ShiftFormFields } from "@/components/shift-form-fields";
import { PresetSelect } from "@/components/preset-select";
import { ReadOnlyBanner } from "@/components/read-only-banner";
import { useShiftForm } from "@/hooks/useShiftForm";
import { useCalendarPermission } from "@/hooks/useCalendarPermission";
import { useCalendarMembers } from "@/hooks/useCalendarMembers";
import { formatDateToLocal } from "@/lib/date-utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

interface ShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (shift: ShiftFormData) => void | Promise<void>;
  selectedDate?: Date;
  shift?: ShiftWithCalendar;
  onPresetsChange?: () => void;
  calendarId?: string;
  readOnly?: boolean; // Explicitly set read-only mode
  enableEmployeeBasedInterface?: boolean; // Check if the new Interface should be used
  onDeleteShift?: (shiftId: string) => Promise<void>;
}

export interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color?: string;
  notes?: string;
  presetId?: string;
  isAllDay?: boolean;
}

export function ShiftSheet({
  open,
  onOpenChange,
  onSubmit,
  selectedDate,
  shift,
  onPresetsChange,
  calendarId,
  readOnly = false,
  enableEmployeeBasedInterface = FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE,
  onDeleteShift,
}: ShiftSheetProps) {
  const t = useTranslations();
  const permission = useCalendarPermission(calendarId);
  const [isSaving, setIsSaving] = useState(false);
  const initialFormDataRef = useRef<string | null>(null);

  const { members, isLoading: membersLoading } = useCalendarMembers(calendarId);
  console.log(members);
  // Determine if sheet should be in read-only mode
  const isReadOnly = readOnly || !permission.canEdit;

  const {
    formData,
    setFormData,
    presets,
    saveAsPreset,
    setSaveAsPreset,
    presetName,
    setPresetName,
    applyPreset,
    saveAsPresetHandler,
    resetForm,
  } = useShiftForm({ open, shift, selectedDate, calendarId });

  // Store initial form data when sheet opens
  useEffect(() => {
    if (open && shift) {
      // Store initial data matching formData structure
      const initialData: ShiftFormData = {
        date:
          shift.date && shift.date instanceof Date
            ? formatDateToLocal(shift.date)
            : formatDateToLocal(new Date()),
        startTime: shift.startTime,
        endTime: shift.endTime,
        title: shift.title,
        notes: shift.notes || "",
        color: shift.color,
        isAllDay: shift.isAllDay || false,
        presetId: shift.presetId || undefined,
      };
      initialFormDataRef.current = JSON.stringify(initialData);
    } else if (!open) {
      initialFormDataRef.current = null;
    }
  }, [open, shift]);

  const hasChanges = () => {
    // For existing shifts, compare with initial data
    if (shift && initialFormDataRef.current) {
      // Create comparable version of current formData
      const currentData: ShiftFormData = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        title: formData.title,
        notes: formData.notes || "",
        color: formData.color,
        isAllDay: formData.isAllDay || false,
        presetId: formData.presetId || undefined,
      };

      return JSON.stringify(currentData) !== initialFormDataRef.current;
    }

    // For new shifts, check if user has entered any data
    return (
      formData.title.trim() !== "" ||
      formData.notes?.trim() !== "" ||
      saveAsPreset ||
      presetName.trim() !== ""
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      // If all-day, set default times for backend
      const submitData = {
        ...formData,
        startTime: formData.isAllDay ? "00:00" : formData.startTime,
        endTime: formData.isAllDay ? "23:59" : formData.endTime,
      };

      await onSubmit(submitData);

      // Save as preset if enabled and it's a new shift
      if (!shift && saveAsPreset && presetName.trim()) {
        const success = await saveAsPresetHandler(submitData);
        if (success && onPresetsChange) {
          onPresetsChange();
        }
      }

      if (!shift) {
        resetForm();
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePresetSelect = async (
    preset: Parameters<typeof applyPreset>[0]
  ) => {
    applyPreset(preset);
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

        {/* Preset Selection */}
        {!shift && !isReadOnly && !enableEmployeeBasedInterface && (
          <PresetSelect presets={presets} onPresetSelect={handlePresetSelect} />
        )}



        <ShiftFormFields
          formData={formData}
          onFormDataChange={setFormData}
          saveAsPreset={saveAsPreset}
          onSaveAsPresetChange={setSaveAsPreset}
          presetName={presetName}
          onPresetNameChange={setPresetName}
          isEditing={!!shift}
          readOnly={isReadOnly}
          enableEmployeeBasedInterface={enableEmployeeBasedInterface}
          members={members}
          membersLoading={membersLoading}
        />
      
        {/* delete button */}
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
