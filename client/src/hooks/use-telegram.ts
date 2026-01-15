import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

// --- Types derived from API Schema ---
// We can assume the API returns the types defined in the contract
type User = z.infer<typeof api.users.list.responses[200]>[number];
type Message = z.infer<typeof api.messages.list.responses[200]>[number];

// --- Hooks ---

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
    // Refresh every minute to keep list somewhat fresh without websockets
    refetchInterval: 60000, 
  });
}

export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const res = await fetch(api.messages.list.path);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    // Shorter polling for messages to feel more "live"
    refetchInterval: 5000, 
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: [api.users.get.path, id],
    queryFn: async () => {
      // In a real app we'd use buildUrl, but here we can just construct string since id is simple
      const res = await fetch(api.users.get.path.replace(":id", id.toString()));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.users.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
