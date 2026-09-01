import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/ui/color-picker";
import { ShiftFormData } from "@/components/shift-sheet";
import { PRESET_COLORS } from "@/lib/constants";
import { CalendarMember } from "@/hooks/useCalendarMembers";
import { CalendarLocation, Absence } from "@/lib/types";
import { MapPin, AlertCircle, CalendarOff } from "lucide-react";
import { isDateInAbsence } from "@/lib/absence-utils";

interface EmployeeShiftFormFieldsProps {
  formData: ShiftFormData;
  onFormDataChange: (data: ShiftFormData) => void;
  locations?: CalendarLocation[];
  onBlur?: () => void;
  readOnly?: boolean;
  members?: CalendarMember[];
  membersLoading?: boolean;
  absences?: Absence[];
}

export function EmployeeShiftFormFields({
  formData,
  onFormDataChange,
  locations = [],
  onBlur,
  readOnly = false,
  members = [],
  membersLoading = false,
  absences = [],
}: EmployeeShiftFormFieldsProps) {
  const t = useTranslations();

  const selectedLoc = locations.find((l) => l.id === formData.locationId) || locations[0];

  // Determine absences active on the selected shift date
  const activeAbsencesOnDate = (absences || []).filter((absence) =>
    isDateInAbsence(formData.date, absence)
  );

  // Group members into available and absent
  const availableMembers: CalendarMember[] = [];
  const absentMembers: { member: CalendarMember; absence: Absence }[] = [];

  members.forEach((member) => {
    const memberName = (member.name || "").trim().toLowerCase();
    const absence = activeAbsencesOnDate.find((a) => {
      if (a.userId && a.userId === member.id) return true;
      if (a.userName && a.userName.trim().toLowerCase() === memberName) return true;
      return false;
    });

    if (absence) {
      absentMembers.push({ member, absence });
    } else {
      availableMembers.push(member);
    }
  });

  // Check if currently selected employee is absent
  const selectedIsAbsent = absentMembers.find(
    (item) => (item.member.name || "") === formData.title
  );

  return (
    <div className="space-y-5">
      {/* Location (on the top of form) */}
      {(locations.length > 0 || formData.locationId) && (
        <div className="space-y-2.5">
          <Label
            htmlFor="employee-shift-location"
            className="text-sm font-medium flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-primary" />
            {t("location.location")}
          </Label>
          {locations.length > 1 ? (
            <select
              id="employee-shift-location"
              value={formData.locationId || locations[0]?.id}
              disabled={readOnly}
              className="flex h-11 w-full rounded-md border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-primary/50 focus:ring-primary/20"
              onChange={(e) => {
                const targetLocId = e.target.value;
                const loc = locations.find((l) => l.id === targetLocId);
                onFormDataChange({
                  ...formData,
                  locationId: targetLocId,
                  startTime: loc?.defaultStartTime || formData.startTime,
                  endTime: loc?.defaultEndTime || formData.endTime,
                });
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

      {/* Employee Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="employee" className="text-sm font-medium flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
            {t("common.employee")}
          </Label>
          {absentMembers.length > 0 && (
            <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <CalendarOff className="w-3 h-3" />
              {absentMembers.length} {t("absence.absentCount", { default: "absent today" })}
            </span>
          )}
        </div>

        <select
          id="employee"
          value={formData.userId || formData.title}
          disabled={readOnly || membersLoading}
          className={`flex h-11 w-full rounded-md border bg-background/50 backdrop-blur-sm px-3 py-2 text-sm focus:ring-primary/20 ${
            selectedIsAbsent
              ? "border-rose-500/60 text-rose-600 dark:text-rose-400"
              : "border-border/50 focus:border-primary/50"
          }`}
          onChange={(e) => {
            const selectedId = e.target.value;

            if (selectedId === "") {
              onFormDataChange({ ...formData, title: "", userId: null });
            } else {
              const selectedMember = members.find(m => m.id === selectedId);

              if (selectedMember) {
                onFormDataChange({
                  ...formData,
                  title: selectedMember.name || "Unknown",
                  userId: selectedMember.id
                });
              } else {
              onFormDataChange({ ...formData, title: selectedId, userId: null });
              }
            }
          }}
          onBlur={onBlur}
        >
          <option value="">{t("common.select_employee")}</option>
          {membersLoading ? (
            <option value="" disabled>
              Loading...
            </option>
          ) : (
            <>
              {/* Available Employees (Top) */}
              {availableMembers.map((member) => (
                <option key={member.id} value={member.name || ""}>
                  {member.name || `Member (${member.id.slice(0, 6)})`}
                </option>
              ))}

              {/* Absent Employees (Bottom, Colored Red) */}
              {absentMembers.length > 0 && (
                <optgroup label={`── ${t("absence.absentEmployees", { default: "Absent / On Leave" })} ──`}>
                  {absentMembers.map(({ member, absence }) => (
                    <option
                      key={member.id}
                      value={member.name || ""}
                      style={{ color: "#ef4444", fontWeight: 600 }}
                      className="text-red-500 font-semibold"
                    >
                      ⚠️ {member.name || `Member (${member.id.slice(0, 6)})`} ({absence.type})
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          )}
        </select>

        {/* Warning if selected employee is absent */}
        {selectedIsAbsent && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{selectedIsAbsent.member.name}</span>{" "}
              {t("absence.warningEmployeeAbsent", {
                default: "is reported absent on this date",
              })}{" "}
              ({selectedIsAbsent.absence.type}
              {selectedIsAbsent.absence.isAllDay ? " - All day" : ` ${selectedIsAbsent.absence.startTime}-${selectedIsAbsent.absence.endTime}`})
              {selectedIsAbsent.absence.reason && `: "${selectedIsAbsent.absence.reason}"`}
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2.5">
        <Label
          htmlFor="employee-shift-date"
          className="text-sm font-medium flex items-center gap-2"
        >
          <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
          {t("shift.date")}
        </Label>
        <Input
          id="employee-shift-date"
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

      {/* Start and End Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="employee-start-time" className="text-sm font-medium">
            {t("shift.startTime")}
          </Label>
          <Input
            id="employee-start-time"
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
          <Label htmlFor="employee-end-time" className="text-sm font-medium">
            {t("shift.endTime")}
          </Label>
          <Input
            id="employee-end-time"
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
      </div>

      {/* Notes */}
      <div className="space-y-2.5">
        <Label
          htmlFor="employee-shift-notes"
          className="text-sm font-medium flex items-center gap-2"
        >
          <div className="w-1 h-4 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
          {t("form.notesLabel")}
        </Label>
        <Textarea
          id="employee-shift-notes"
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
    </div>
  );
}
