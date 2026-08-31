"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCalendarLocations } from "@/hooks/useCalendarLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { CalendarLocation } from "@/lib/types";

interface CalendarLocationsManagerProps {
  calendarId: string;
}

export function CalendarLocationsManager({
  calendarId,
}: CalendarLocationsManagerProps) {
  const t = useTranslations();
  const {
    locations,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
  } = useCalendarLocations(calendarId);

  const [isAdding, setIsAdding] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationColor, setNewLocationColor] = useState("#3b82f6");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewLocationName("");
    setNewLocationColor("#3b82f6");
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewLocationName("");
  };

  const handleSaveAdd = async () => {
    if (!newLocationName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createLocation(newLocationName.trim(), newLocationColor);
      setIsAdding(false);
      setNewLocationName("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (loc: CalendarLocation) => {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditColor(loc.color || "#3b82f6");
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (locId: string) => {
    if (!editName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateLocation(locId, editName.trim(), editColor);
      setEditingId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (loc: CalendarLocation) => {
    if (locations.length <= 1) {
      alert(t("location.cannotDeleteLast"));
      return;
    }

    if (window.confirm(t("location.deleteConfirm", { name: loc.name }))) {
      setIsSubmitting(true);
      try {
        await deleteLocation(loc.id);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {t("location.locations")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("location.manageLocationsDescription")}
          </p>
        </div>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartAdd}
            className="h-8 gap-1.5 border-primary/30 hover:bg-primary/10"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("location.addLocation")}
          </Button>
        )}
      </div>

      {/* Add New Location Form */}
      {isAdding && (
        <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2.5 animate-in fade-in duration-200">
          <div className="text-xs font-semibold text-foreground">
            {t("location.addLocation")}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newLocationColor}
              onChange={(e) => setNewLocationColor(e.target.value)}
              className="w-8 h-8 rounded border border-border/50 cursor-pointer bg-transparent p-0.5"
              title={t("location.locationColor")}
            />
            <Input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder={t("location.locationNamePlaceholder")}
              className="h-9 text-sm flex-1 bg-background"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveAdd();
                } else if (e.key === "Escape") {
                  handleCancelAdd();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAdd}
              disabled={!newLocationName.trim() || isSubmitting}
              className="h-9 px-3"
            >
              <Check className="w-4 h-4 mr-1" />
              {t("common.add")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelAdd}
              className="h-9 px-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="space-y-2">
        {loading && locations.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">
            {t("common.loading")}
          </div>
        ) : (
          locations.map((loc) => {
            const isEditing = editingId === loc.id;
            return (
              <div
                key={loc.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/20 transition-colors"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-7 h-7 rounded border border-border/50 cursor-pointer bg-transparent p-0.5"
                    />
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm flex-1 bg-background"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(loc.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveEdit(loc.id)}
                      disabled={!editName.trim() || isSubmitting}
                      className="h-8 px-2.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-8 px-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: loc.color || "#3b82f6" }}
                      />
                      <span className="text-sm font-medium truncate">
                        {loc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(loc)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title={t("common.edit")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={locations.length <= 1 || isSubmitting}
                        onClick={() => handleDelete(loc)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        title={
                          locations.length <= 1
                            ? t("location.cannotDeleteLast")
                            : t("location.deleteLocation")
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
