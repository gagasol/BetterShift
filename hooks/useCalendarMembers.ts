import { useQuery } from "@tanstack/react-query";

export type CalendarMember = {
  id: string;
  name: string | null;
  role: "admin" | "write" | "read";
};

export function useCalendarMembers(calendarId?: string) {
  console.log(calendarId);
  const { data: members, isLoading, error } = useQuery<CalendarMember[]>({
    queryKey: ["calendar-members", calendarId],
    queryFn: async () => {
      const res = await fetch (`/api/calendars/${calendarId}/members`);
      if (!res.ok) {
        throw new Error("Error while loading Employees");
      }
      return res.json();
    },
    enabled: !!calendarId,
  });

  console.log(members);
  return {
    members: members || [],
    isLoading,
    error
  };
}
