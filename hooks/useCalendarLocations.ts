import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarLocation } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

async function fetchLocationsApi(
  calendarId: string
): Promise<CalendarLocation[]> {
  const response = await fetch(`/api/calendars/${calendarId}/locations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }
  return response.json();
}

async function createLocationApi({
  calendarId,
  name,
  color,
  defaultStartTime,
  defaultEndTime,
}: {
  calendarId: string;
  name: string;
  color?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}): Promise<CalendarLocation> {
  const response = await fetch(`/api/calendars/${calendarId}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color, defaultStartTime, defaultEndTime }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create location");
  }
  return response.json();
}

async function updateLocationApi({
  calendarId,
  locationId,
  name,
  color,
  order,
  defaultStartTime,
  defaultEndTime,
}: {
  calendarId: string;
  locationId: string;
  name?: string;
  color?: string | null;
  order?: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
}): Promise<CalendarLocation> {
  const response = await fetch(`/api/calendars/${calendarId}/locations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locationId,
      name,
      color,
      order,
      defaultStartTime,
      defaultEndTime,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update location");
  }
  return response.json();
}

async function deleteLocationApi({
  calendarId,
  locationId,
}: {
  calendarId: string;
  locationId: string;
}): Promise<void> {
  const response = await fetch(
    `/api/calendars/${calendarId}/locations?locationId=${locationId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete location");
  }
}

export function useCalendarLocations(calendarId: string | null) {
  const queryClient = useQueryClient();
  const t = useTranslations();

  const {
    data: locations = [],
    isLoading,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: calendarId ? queryKeys.locations.byCalendar(calendarId) : ["locations", "none"],
    queryFn: () => (calendarId ? fetchLocationsApi(calendarId) : Promise.resolve([])),
    enabled: !!calendarId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) => {
      if (!calendarId) throw new Error("No calendar selected");
      return createLocationApi({ calendarId, ...data });
    },
    onSuccess: () => {
      if (calendarId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.locations.byCalendar(calendarId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.calendars.all,
        });
      }
      toast.success(t("common.created", { item: t("location.location") }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("common.createError", { item: t("location.location") }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { locationId: string; name?: string; color?: string | null; order?: number }) => {
      if (!calendarId) throw new Error("No calendar selected");
      return updateLocationApi({ calendarId, ...data });
    },
    onSuccess: () => {
      if (calendarId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.locations.byCalendar(calendarId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.shifts.byCalendar(calendarId),
        });
      }
      toast.success(t("common.updated", { item: t("location.location") }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("common.updateError", { item: t("location.location") }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (locationId: string) => {
      if (!calendarId) throw new Error("No calendar selected");
      return deleteLocationApi({ calendarId, locationId });
    },
    onSuccess: () => {
      if (calendarId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.locations.byCalendar(calendarId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.shifts.byCalendar(calendarId),
        });
      }
      toast.success(t("common.deleted", { item: t("location.location") }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("common.deleteError", { item: t("location.location") }));
    },
  });

  return {
    locations,
    loading: isLoading,
    hasLoadedOnce: isFetched,
    createLocation: (
      name: string,
      color?: string,
      defaultStartTime?: string,
      defaultEndTime?: string
    ) =>
      createMutation.mutateAsync({
        name,
        color,
        defaultStartTime,
        defaultEndTime,
      }),
    updateLocation: (
      locationId: string,
      name?: string,
      color?: string | null,
      order?: number,
      defaultStartTime?: string,
      defaultEndTime?: string
    ) =>
      updateMutation.mutateAsync({
        locationId,
        name,
        color,
        order,
        defaultStartTime,
        defaultEndTime,
      }),
    deleteLocation: (locationId: string) => deleteMutation.mutateAsync(locationId),
    refetchLocations: refetch,
  };
}
