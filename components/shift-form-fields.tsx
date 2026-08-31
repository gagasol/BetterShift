import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { ShiftFormData } from "@/components/shift-sheet";
import { PRESET_COLORS } from "@/lib/constants";
import { CalendarLocation } from "@/lib/types";
import { MapPin } from "lucide-react";

interface ShiftFormFieldsProps {
  formData: ShiftFormData;
  onFormDataChange: (data: ShiftFormData) => void;
  locations?: CalendarLocation[];
  saveAsPreset: boolean;
  onSaveAsPresetChange: (value: boolean) => void;
  presetName: string;
  onPresetNameChange: (value: string) => void;
  isEditing: boolean;
  onBlur?: () => void;
  showSaved?: boolean;
  readOnly?: boolean;
}

export function ShiftFormFields({
  formData,
  onFormDataChange,
  locations = [],
  saveAsPreset,
  onSaveAsPresetChange,
  presetName,
  onPresetNameChange,
  isEditing,
  onBlur,
  readOnly = false,
}: ShiftFormFieldsProps) {
  const t = useTranslations();

  const selectedLoc = locations.find((l) => l.id === formData.locationId) || locations[0];

  return (
    <div className="space-y-5">
      {/* Location (on the top of form) */}
      {(locations.length > 0 || formData.locationId) && (
        <div className="space-y-2.5">
          <Label
            htmlFor="shift-location"
            className="text-sm font-medium flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-primary" />
            {t("location.location")}
          </Label>
          {locations.length > 1 ? (
            <select
              id="shift-location"
              value={formData.locationId || locations[0]?.id}
              disabled={readOnly}
              className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20"
              onChange={(e) => {
                onFormDataChange({ ...formData, locationId: e.target.value });
              }}
              onBlur={onBlur}
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-border/40 bg-muted/30 text-sm font-medium text-foreground">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedLoc?.color || "#3b82f6" }}
              />
              <span>{selectedLoc?.name || t("location.defaultLocation")}</span>
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <div className="space-y-2.5">
        <Label
          htmlFor="date"
          className="text-sm font-medium flex items-center gap-2"
        >
          <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          {t("shift.date")}
        </Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) =>
            onFormDataChange({ ...formData, date: e.target.value })
          }
          onBlur={onBlur}
          disabled={readOnly}
          className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
        />
      </div>

      {/* All Day Shift Checkbox */}
      <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border border-border/30">
        <Checkbox
          id="allDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => {
            onFormDataChange({ ...formData, isAllDay: !!checked });
            setTimeout(() => onBlur?.(), 10);
          }}
          disabled={readOnly}
        />
        <Label htmlFor="allDay" className="text-sm font-medium cursor-pointer">
          {t("shift.allDayShift")}
        </Label>
      </div>

      {/* Start / End Time */}
      {!formData.isAllDay && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-medium">
              {t("shift.startTime")}
            </Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) =>
                onFormDataChange({ ...formData, startTime: e.target.value })
              }
              onBlur={onBlur}
              disabled={readOnly}
              className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-sm font-medium">
              {t("shift.endTime")}
            </Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) =>
                onFormDataChange({ ...formData, endTime: e.target.value })
              }
              onBlur={onBlur}
              disabled={readOnly}
              className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
            />
          </div>
        </motion.div>
      )}

      {/* Shift Title */}
      <div className="space-y-2.5">
        <Label
          htmlFor="title"
          className="text-sm font-medium flex items-center gap-2"
        >
          <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          {t("shift.titleLabel")}
        </Label>
        <Input
          id="title"
          placeholder={t("shift.titlePlaceholder")}
          value={formData.title}
          onChange={(e) =>
            onFormDataChange({ ...formData, title: e.target.value })
          }
          onBlur={onBlur}
          disabled={readOnly}
          className="h-11 border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
          autoFocus={!readOnly}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2.5">
        <Label
          htmlFor="notes"
          className="text-sm font-medium flex items-center gap-2"
        >
          <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          {t("form.notesLabel")}
        </Label>
        <Textarea
          id="notes"
          placeholder={t("form.notesPlaceholder")}
          value={formData.notes}
          onChange={(e) =>
            onFormDataChange({ ...formData, notes: e.target.value })
          }
          onBlur={onBlur}
          disabled={readOnly}
          rows={3}
          className="border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 resize-none"
        />
      </div>

      {/* Color Picker */}
      <ColorPicker
        color={formData.color || "#3b82f6"}
        onChange={(color) => onFormDataChange({ ...formData, color })}
        label={t("form.colorLabel")}
        presetColors={PRESET_COLORS}
        disabled={readOnly}
      />

      {/* Auto-Save as Preset */}
      {!isEditing && !readOnly && (
        <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="savePreset"
              checked={saveAsPreset}
              onCheckedChange={(checked) =>
                onSaveAsPresetChange(checked as boolean)
              }
            />
            <Label
              htmlFor="savePreset"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
              {t("preset.saveAsPreset")}
            </Label>
          </div>
          {saveAsPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 pt-1"
            >
              <Label htmlFor="presetName" className="text-sm">
                {t("preset.presetName")}
              </Label>
              <Input
                id="presetName"
                placeholder={t("preset.presetNamePlaceholder")}
                value={presetName}
                onChange={(e) => onPresetNameChange(e.target.value)}
                className="h-10 border-primary/30 focus:border-primary/50 focus:ring-primary/20 bg-background/80"
              />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
