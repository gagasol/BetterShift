import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { ShiftWithCalendar, CalendarLocation } from "@/lib/types";
import { CalendarNote, ExternalSync } from "@/lib/db/schema";
import { isToday } from "date-fns";
import { useTranslations } from "next-intl";
import { useRef, useEffect } from "react";
import { formatDateToLocal } from "@/lib/date-utils";
import { CalendarShiftCard } from "./calendar-shift-card";
import { findNotesForDate } from "@/lib/event-utils";

interface CalendarGridProps {
  calendarDays: Date[];
  currentDate: Date;
  shifts: ShiftWithCalendar[];
  notes: CalendarNote[];
  locations?: CalendarLocation[];
  selectedPresetId: string | undefined;
  togglingDates: Set<string>;
  externalSyncs: ExternalSync[];
  maxShiftsToShow?: number; // undefined = show all (regular shifts)
  maxExternalShiftsToShow?: number; // undefined = show all (external shifts)
  showShiftNotes?: boolean; // show notes in shift cards
  showFullTitles?: boolean; // show full titles without truncation
  shiftSortType?: "startTime" | "createdAt" | "title"; // sort type
  shiftSortOrder?: "asc" | "desc"; // sort order
  combinedSortMode?: boolean; // sort all shifts together or separately
  highlightedWeekdays?: number[]; // weekdays to highlight (0=Sunday, 6=Saturday)
  highlightColor?: string; // color for highlighted days
  onDayClick: (date: Date, locationId?: string) => void;
  onDayRightClick?: (e: React.MouseEvent, date: Date) => void;
  onNoteIconClick?: (e: React.MouseEvent, date: Date) => void;
  onLongPress?: (date: Date) => void;
  onShowAllShifts?: (date: Date, shifts: ShiftWithCalendar[]) => void;
  onShowSyncedShifts?: (date: Date, shifts: ShiftWithCalendar[]) => void;
  onEditShift?: (shift: ShiftWithCalendar) => void;
}

export function CalendarGrid({
  calendarDays,
  currentDate,
  shifts,
  notes,
  locations = [],
  selectedPresetId,
  togglingDates,
  externalSyncs,
  maxShiftsToShow,
  maxExternalShiftsToShow,
  showShiftNotes = false,
  showFullTitles = false,
  shiftSortType = "createdAt",
  shiftSortOrder = "asc",
  combinedSortMode = false,
  highlightedWeekdays = [],
  highlightColor = "#fbbf24",
  onDayClick,
  onDayRightClick,
  onNoteIconClick,
  onLongPress,
  onShowAllShifts,
  onShowSyncedShifts,
  onEditShift,
}: CalendarGridProps) {
  const t = useTranslations();
  const pressTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const hasMultipleLocations = locations && locations.length > 1;

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pressTimerRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      pressTimerRef.current = {};
    };
  }, []);

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(
      (shift) => shift.date && isSameDay(shift.date as Date, date),
    );
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const sortShifts = (shiftsToSort: ShiftWithCalendar[]) => {
    return [...shiftsToSort].sort((a, b) => {
      let comparison = 0;

      switch (shiftSortType) {
        case "startTime":
          comparison = a.startTime.localeCompare(b.startTime);
          break;
        case "createdAt": {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aTime - bTime;
          break;
        }
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return shiftSortOrder === "asc" ? comparison : -comparison;
    });
  };

  // Helper to render shifts for a column/day
  const renderShiftsGroup = (
    dayShiftsToRender: ShiftWithCalendar[],
    day: Date
  ) => {
    const syncedShiftsByMode: { [key: string]: ShiftWithCalendar[] } = {};

    dayShiftsToRender.forEach((shift) => {
      if (shift.syncedFromExternal && shift.externalSyncId) {
        const sync = externalSyncs.find((s) => s.id === shift.externalSyncId);
        const displayMode = sync?.displayMode || "normal";

        if (displayMode === "minimal") {
          if (!syncedShiftsByMode[shift.externalSyncId]) {
            syncedShiftsByMode[shift.externalSyncId] = [];
          }
          syncedShiftsByMode[shift.externalSyncId].push(shift);
        }
      }
    });

    const regularShifts = dayShiftsToRender.filter(
      (s) => !s.syncedFromExternal
    );
    const externalNormalShifts = dayShiftsToRender.filter((s) => {
      if (!s.syncedFromExternal) return false;
      if (!s.externalSyncId) return false;
      const sync = externalSyncs.find((sync) => sync.id === s.externalSyncId);
      return sync && sync.displayMode === "normal";
    });

    let sortedRegularShifts: ShiftWithCalendar[];
    let sortedExternalNormalShifts: ShiftWithCalendar[];
    let allSortedShifts: ShiftWithCalendar[];

    if (combinedSortMode) {
      const allNormalShifts = [...regularShifts, ...externalNormalShifts];
      allSortedShifts = sortShifts(allNormalShifts);
      sortedRegularShifts = sortShifts(regularShifts);
      sortedExternalNormalShifts = sortShifts(externalNormalShifts);
    } else {
      sortedRegularShifts = sortShifts(regularShifts);
      sortedExternalNormalShifts = sortShifts(externalNormalShifts);
      allSortedShifts = [];
    }

    const regularIndexMap = new Map<string, number>();
    const externalIndexMap = new Map<string, number>();

    if (combinedSortMode) {
      sortedRegularShifts.forEach((shift, index) => {
        regularIndexMap.set(shift.id, index);
      });
      sortedExternalNormalShifts.forEach((shift, index) => {
        externalIndexMap.set(shift.id, index);
      });
    }

    const hiddenRegularCount =
      maxShiftsToShow !== undefined
        ? Math.max(0, sortedRegularShifts.length - maxShiftsToShow)
        : 0;
    const hiddenExternalCount =
      maxExternalShiftsToShow !== undefined
        ? Math.max(0, sortedExternalNormalShifts.length - maxExternalShiftsToShow)
        : 0;
    const totalHiddenCount = hiddenRegularCount + hiddenExternalCount;

    const displayableShifts = dayShiftsToRender.filter(
      (s) =>
        !s.syncedFromExternal ||
        (s.externalSyncId &&
          externalSyncs.find((sync) => sync.id === s.externalSyncId)?.displayMode === "normal")
    );

    return (
      <div className="space-y-0.5 sm:space-y-1">
        {combinedSortMode ? (
          <>
            {allSortedShifts.map((shift) => {
              const isRegular = !shift.syncedFromExternal;
              const regularIndex = isRegular
                ? (regularIndexMap.get(shift.id) ?? -1)
                : -1;
              const externalIndex = !isRegular
                ? (externalIndexMap.get(shift.id) ?? -1)
                : -1;

              const shouldDisplay =
                (isRegular &&
                  (maxShiftsToShow === undefined || regularIndex < maxShiftsToShow)) ||
                (!isRegular &&
                  (maxExternalShiftsToShow === undefined ||
                    externalIndex < maxExternalShiftsToShow));

              if (!shouldDisplay) return null;

              return (
                <CalendarShiftCard
                  key={shift.id}
                  shift={shift}
                  showShiftNotes={showShiftNotes}
                  showFullTitles={showFullTitles}
                  onEditShift={!selectedPresetId ? onEditShift : undefined}
                />
              );
            })}

            {totalHiddenCount > 0 && (
              <div
                onClick={(e) => {
                  if (selectedPresetId) return;
                  e.stopPropagation();
                  onShowAllShifts?.(day, displayableShifts);
                }}
                className={`text-[9px] sm:text-[10px] text-primary font-semibold text-center pt-0.5 transition-colors ${
                  selectedPresetId
                    ? "cursor-not-allowed opacity-50"
                    : "hover:text-primary/80 hover:underline cursor-pointer"
                }`}
              >
                +{totalHiddenCount}{" "}
                {totalHiddenCount === 1 ? t("shift.shift_one") : t("common.shifts")}
              </div>
            )}
          </>
        ) : (
          <>
            {(maxShiftsToShow === undefined
              ? sortedRegularShifts
              : sortedRegularShifts.slice(0, maxShiftsToShow)
            ).map((shift) => (
              <CalendarShiftCard
                key={shift.id}
                shift={shift}
                showShiftNotes={showShiftNotes}
                showFullTitles={showFullTitles}
                onEditShift={!selectedPresetId ? onEditShift : undefined}
              />
            ))}

            {(maxExternalShiftsToShow === undefined
              ? sortedExternalNormalShifts
              : sortedExternalNormalShifts.slice(0, maxExternalShiftsToShow)
            ).map((shift) => (
              <CalendarShiftCard
                key={shift.id}
                shift={shift}
                showShiftNotes={showShiftNotes}
                showFullTitles={showFullTitles}
                onEditShift={!selectedPresetId ? onEditShift : undefined}
              />
            ))}

            {totalHiddenCount > 0 && (
              <div
                onClick={(e) => {
                  if (selectedPresetId) return;
                  e.stopPropagation();
                  onShowAllShifts?.(day, displayableShifts);
                }}
                className={`text-[9px] sm:text-[10px] text-primary font-semibold text-center pt-0.5 transition-colors ${
                  selectedPresetId
                    ? "cursor-not-allowed opacity-50"
                    : "hover:text-primary/80 hover:underline cursor-pointer"
                }`}
              >
                +{totalHiddenCount}{" "}
                {totalHiddenCount === 1 ? t("shift.shift_one") : t("common.shifts")}
              </div>
            )}
          </>
        )}

        {Object.entries(syncedShiftsByMode).map(([syncId, syncShifts]) => {
          const sync = externalSyncs.find((s) => s.id === syncId);
          if (!sync || syncShifts.length === 0) return null;

          return (
            <div
              key={syncId}
              onClick={(e) => {
                if (selectedPresetId) return;
                e.stopPropagation();
                onShowSyncedShifts?.(day, syncShifts);
              }}
              className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-muted/50 border border-border/50 text-muted-foreground transition-colors text-center ${
                selectedPresetId
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-muted hover:text-foreground cursor-pointer"
              }`}
              style={{
                borderLeftColor: sync.color,
                borderLeftWidth: "2px",
              }}
            >
              <span className="flex items-center justify-center gap-1">
                <span>+{syncShifts.length}</span>
                <RefreshCw className="h-2.5 w-2.5" />
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-7 gap-0 sm:gap-1.5 mb-6">
      {[
        t("common.weekday.monday"),
        t("common.weekday.tuesday"),
        t("common.weekday.wednesday"),
        t("common.weekday.thursday"),
        t("common.weekday.friday"),
        t("common.weekday.saturday"),
        t("common.weekday.sunday"),
      ].map((day) => (
        <div
          key={day}
          className="text-center text-[11px] sm:text-xs font-semibold text-muted-foreground p-1 sm:p-2"
        >
          {day}
        </div>
      ))}
      {calendarDays.map((day, idx) => {
        const dayShifts = getShiftsForDate(day);

        // Find all notes/events for this day (including recurring)
        const allDayNotes = findNotesForDate(notes, day);

        // Count events and regular notes separately
        const dayEvents = allDayNotes.filter((n) => n.type === "event");
        const dayRegularNotes = allDayNotes.filter((n) => n.type !== "event");
        const totalNotesCount = allDayNotes.length;

        // Get first event and note for display
        const dayEvent = dayEvents[0];
        const dayNote = dayRegularNotes[0];

        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const isTodayDate = isToday(day);

        const dayKey = formatDateToLocal(day);
        const isToggling = togglingDates.has(dayKey);

        const handleTouchStart = () => {
          if (onLongPress) {
            pressTimerRef.current[dayKey] = setTimeout(
              () => onLongPress(day),
              500
            );
          }
        };
        const handleTouchEnd = () => {
          if (pressTimerRef.current[dayKey]) {
            clearTimeout(pressTimerRef.current[dayKey]);
            delete pressTimerRef.current[dayKey];
          }
        };

        const isHighlighted =
          highlightedWeekdays.length > 0 &&
          highlightedWeekdays.includes(day.getDay());

        const hasMultiEventBorder = dayEvents.length > 1 && !isTodayDate;
        const eventBorderStyle =
          dayEvents.length === 1 && !isTodayDate
            ? {
                borderColor: dayEvents[0].color || "#3b82f6",
                borderWidth: "2px",
              }
            : {};

        const defaultLocationId = locations.length > 0 ? locations[0].id : undefined;

        return (
          <motion.div
            key={idx}
            onClick={() => {
              if (!hasMultipleLocations) {
                onDayClick(day, defaultLocationId);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (onDayRightClick) {
                onDayRightClick(e, day);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
              ...(isHighlighted &&
                !isTodayDate && {
                  backgroundColor: `${highlightColor}15`,
                  borderColor: `${highlightColor}40`,
                }),
              ...eventBorderStyle,
              ...(hasMultiEventBorder && {
                backgroundImage: `linear-gradient(var(--background), var(--background)), linear-gradient(to right, ${dayEvents
                  .map((e) => e.color || "#3b82f6")
                  .join(", ")})`,
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
                border: "2px solid transparent",
              }),
            }}
            className={`
              min-h-25 sm:min-h-28 px-1 py-1.5 sm:p-2 rounded-md sm:rounded-lg text-sm transition-all relative flex flex-col border sm:border-2
              ${isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}
              ${
                isTodayDate
                  ? "border-primary shadow-lg shadow-primary/20 bg-primary/5 ring-2 ring-primary/20"
                  : dayEvent
                    ? ""
                    : "border-border/30 sm:border-border/50"
              }
              ${
                isCurrentMonth
                  ? hasMultipleLocations
                    ? "hover:border-border"
                    : "hover:bg-accent cursor-pointer active:bg-accent/80 hover:border-border"
                  : selectedPresetId
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
              }
              ${!isCurrentMonth ? "opacity-40" : ""}
              ${isToggling ? "opacity-50 cursor-wait pointer-events-none" : ""}
            `}
          >
            {/* Header: Date number & note/event labels */}
            <div
              className={`text-sm sm:text-sm font-semibold mb-1 flex items-center justify-between gap-1 shrink-0 ${
                isTodayDate ? "text-primary" : ""
              }`}
            >
              <span className="shrink-0">{day.getDate()}</span>
              <div className="flex items-center gap-1 min-w-0">
                {totalNotesCount > 1 && (
                  <span
                    className={`inline-flex items-center justify-center text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 ${
                      !selectedPresetId && onNoteIconClick
                        ? "cursor-pointer hover:bg-primary/30 transition-colors"
                        : ""
                    }`}
                    title={t("note.multipleEntries", { count: totalNotesCount })}
                    onClick={(e) => {
                      if (!selectedPresetId && onNoteIconClick) {
                        e.stopPropagation();
                        onNoteIconClick(e, day);
                      }
                    }}
                  >
                    {totalNotesCount}
                  </span>
                )}
                {dayEvent && totalNotesCount === 1 && (
                  <span
                    className={`text-[10px] sm:text-xs font-medium truncate opacity-75 min-w-0 ${
                      !selectedPresetId && onNoteIconClick
                        ? "cursor-pointer hover:opacity-100 transition-opacity"
                        : ""
                    }`}
                    style={{ color: dayEvent.color || "#3b82f6" }}
                    title={dayEvent.note}
                    onClick={(e) => {
                      if (!selectedPresetId && onNoteIconClick) {
                        e.stopPropagation();
                        onNoteIconClick(e, day);
                      }
                    }}
                  >
                    {dayEvent.note}
                  </span>
                )}
                {!dayEvent && dayNote && totalNotesCount === 1 && (
                  <span
                    className={`text-[10px] sm:text-xs font-medium text-orange-500 truncate opacity-75 min-w-0 ${
                      !selectedPresetId && onNoteIconClick
                        ? "cursor-pointer hover:opacity-100 transition-opacity"
                        : ""
                    }`}
                    title={dayNote.note}
                    onClick={(e) => {
                      if (!selectedPresetId && onNoteIconClick) {
                        e.stopPropagation();
                        onNoteIconClick(e, day);
                      }
                    }}
                  >
                    {dayNote.note}
                  </span>
                )}
              </div>
            </div>

            {/* Grid Field Content: Vertical splitting for each location */}
            {hasMultipleLocations ? (
              <div
                className="flex-1 grid divide-x divide-border/40 -mx-1 sm:-mx-1.5 -mb-1"
                style={{
                  gridTemplateColumns: `repeat(${locations.length}, minmax(0, 1fr))`,
                }}
              >
                {locations.map((loc, locIndex) => {
                  // Filter shifts for this specific location
                  const locShifts = dayShifts.filter((s) => {
                    if (s.locationId) {
                      return s.locationId === loc.id;
                    }
                    // If shift has no locationId, assign to first location
                    return locIndex === 0;
                  });

                  return (
                    <div
                      key={loc.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDayClick(day, loc.id);
                      }}
                      className="px-1 sm:px-1.5 py-0.5 flex flex-col min-h-full cursor-pointer hover:bg-primary/5 transition-colors rounded-sm group/loc"
                    >
                      {/* Name of location on top of each split grid field as a label */}
                      <div
                        className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 mb-1 rounded bg-muted/60 text-foreground/80 group-hover/loc:bg-primary/15 group-hover/loc:text-primary transition-colors flex items-center justify-center gap-1 border-b border-border/30"
                        title={loc.name}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: loc.color || "#3b82f6" }}
                        />
                        <span className="truncate">{loc.name}</span>
                      </div>

                      {/* Shifts for this location */}
                      <div className="flex-1">
                        {renderShiftsGroup(locShifts, day)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-visible">
                {renderShiftsGroup(dayShifts, day)}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
