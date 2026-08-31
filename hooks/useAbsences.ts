import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AbsenceWithDetails } from "@/lib/types";

export function useCalendarAbsences(calendarId?: string) {
  const { data: absences = [], isLoading, error, refetch } = useQuery<AbsenceWithDetails[]>({
    queryKey: ["absences", "calendar", calendarId],
    queryFn: async () => {
      if (!calendarId) return [];
      const res = await fetch(`/api/absences?calendarId=${calendarId}`);
      if (!res.ok) {
        throw new Error("Failed to load absences");
      }
      return res.json();
    },
    enabled: !!calendarId,
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    absences,
    isLoading,
    error,
    refetch,
  };
}

export function useUserAbsences() {
  const { data: absences = [], isLoading, error, refetch } = useQuery<AbsenceWithDetails[]>({
    queryKey: ["absences", "user", "me"],
    queryFn: async () => {
      const res = await fetch("/api/absences?myAbsences=true");
      if (!res.ok) {
        throw new Error("Failed to load your absences");
      }
      return res.json();
    },
    staleTime: 1000 * 60,
  });

  return {
    absences,
    isLoading,
    error,
    refetch,
  };
}

export function useAbsenceMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create absence");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/absences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update absence");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/absences/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete absence");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });

  return {
    createAbsence: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAbsence: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAbsence: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
