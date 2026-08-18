import { useQuery } from "@tanstack/react-query";
import {
  getFollowUps,
  getFollowUpsRaw,
  getProperties,
  getReminders,
  getVisits,
  clientsFromVisits,
  type PropertyKind,
  type ReminderKind,
} from "@/lib/sheets";

const COMMON = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  placeholderData: (prev: unknown) => prev as never,
};

export function useFollowUps() {
  return useQuery({ queryKey: ["followups"], queryFn: getFollowUps, ...COMMON });
}

export function useFollowUpsRaw() {
  return useQuery({ queryKey: ["followups-raw"], queryFn: getFollowUpsRaw, ...COMMON });
}

export function useVisits() {
  return useQuery({ queryKey: ["visits"], queryFn: getVisits, ...COMMON });
}

export function useRegistos(kind: PropertyKind) {
  return useQuery({
    queryKey: ["registos", kind],
    queryFn: () => getProperties(kind),
    ...COMMON,
  });
}

export function useReminders(kind: ReminderKind) {
  return useQuery({ queryKey: ["reminders", kind], queryFn: () => getReminders(kind), ...COMMON });
}

export function useActiveRegistosCount() {
  const ap = useRegistos("apartamentos");
  const ca = useRegistos("casas");
  const total = (ap.data?.data.length ?? 0) + (ca.data?.data.length ?? 0);
  return { total, isLoading: ap.isLoading || ca.isLoading };
}

export function useClientes() {
  const visits = useVisits();
  return {
    ...visits,
    data: visits.data
      ? { data: clientsFromVisits(visits.data.data), error: visits.data.error }
      : undefined,
  };
}
