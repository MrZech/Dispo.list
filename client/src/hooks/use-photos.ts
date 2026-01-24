import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertPhoto } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function usePhotos(itemId: number) {
  return useQuery({
    queryKey: [api.photos.list.path, itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const url = buildUrl(api.photos.list.path, { itemId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch photos");
      return api.photos.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number } & Omit<InsertPhoto, "itemId">) => {
      const validated = api.photos.create.input.parse(data);
      const url = buildUrl(api.photos.create.path, { itemId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create photo");
      return api.photos.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.photos.list.path, variables.itemId] });
      queryClient.invalidateQueries({ queryKey: [api.items.get.path, variables.itemId] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, itemId }: { id: number; itemId: number }) => {
      const url = buildUrl(api.photos.delete.path, { id });
      const res = await fetch(url, { 
        method: "DELETE",
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.photos.list.path, variables.itemId] });
      queryClient.invalidateQueries({ queryKey: [api.items.get.path, variables.itemId] });
      toast({ title: "Deleted", description: "Photo removed" });
    },
  });
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, photoIds }: { itemId: number; photoIds: number[] }) => {
      const validated = api.photos.reorder.input.parse({ photoIds });
      const url = buildUrl(api.photos.reorder.path, { itemId });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to reorder photos");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.photos.list.path, variables.itemId] });
    },
  });
}
