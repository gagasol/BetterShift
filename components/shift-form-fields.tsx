import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { ShiftFormData } from "@/components/shift-sheet";
import { PRESET_COLORS } from "@/lib/constants";
import { CalendarMember } from "@/hooks/useCalendarMembers";

interface ShiftFormFieldsProps {
  formData: ShiftFormData;
  onFormDataChange: (data: ShiftFormData) => void;
  saveAsPreset: boolean;
  onSaveAsPresetChange: (value: boolean) => void;
  presetName: string;
  onPresetNameChange: (value: string) => void;
  isEditing: boolean;
  onBlur?: () => void;
  showSaved?: boolean;
  readOnly?: boolean;
  enableEmployeeBasedInterface?: boolean;
  members?: CalendarMember[];
  membersLoading?: boolean;
}

export function ShiftFormFields({
  formData,
  onFormDataChange,
  saveAsPreset,
  onSaveAsPresetChange,
  presetName,
  onPresetNameChange,
  isEditing,
  onBlur,
  readOnly = false,
  enableEmployeeBasedInterface = false,
  members,
  membersLoading,
}: ShiftFormFieldsProps) {
  const t = useTranslations();
  console.log(members);

  return (
    <div className="space-y-5">
        {enableEmployeeBasedInterface && (
          <>
        <label htmlFor="employee" className="text-sm font-medium">
          {t("common.employee")}
        </label>
        <select
          id="employee"
          value={formData.title}
          disabled={membersLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={(e) => {
            const selectedIndex = e.target.selectedIndex;
            const selectedName = e.target.options[selectedIndex].text;
            const selectedValue = e.target.value;

            if (selectedValue !== "") {
              onFormDataChange({ ...formData, title: selectedName });
            }
          }}
        >
          <option value="">{t("common.select_employee")}</option>
          {membersLoading ? ( 
            <option value="" disabled>Loading...</option>
                            ) : (
                            members?.map((member) => (
                              <option key={member.id} value={member.name}>
                              {member.name}
                              </option>
                            ))
                            )}
        </select>
        </>
        )}
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

      {!enableEmployeeBasedInterface && (
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
      )}

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

      {!enableEmployeeBasedInterface && (
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
      )}

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

      <ColorPicker
        color={formData.color || "#3b82f6"}
        onChange={(color) => onFormDataChange({ ...formData, color })}
        label={t("form.colorLabel")}
        presetColors={PRESET_COLORS}
        disabled={readOnly}
      />

      {/* Auto-Save as Preset */}
      {!isEditing && !readOnly && !enableEmployeeBasedInterface && (
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
