import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertExportProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useExportProfiles() {
  return useQuery({
    queryKey: [api.exportProfiles.list.path],
    queryFn: async () => {
      const res = await fetch(api.exportProfiles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch export profiles");
      return api.exportProfiles.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExportProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertExportProfile) => {
      const validated = api.exportProfiles.create.input.parse(data);
      const res = await fetch(api.exportProfiles.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create export profile");
      return api.exportProfiles.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.exportProfiles.list.path] });
      toast({ title: "Success", description: "Export profile created" });
    },
  });
}

export function useGenerateCsv() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { profileId: number; itemIds: number[] }) => {
      const validated = api.csv.generate.input.parse(data);
      const res = await fetch(api.csv.generate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate CSV");
      
      // Handle file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    },
    onSuccess: () => {
      toast({ title: "Download Started", description: "Your CSV is downloading" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate CSV", variant: "destructive" });
    }
  });
}
