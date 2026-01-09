import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateItem } from "@/hooks/use-items";
import { insertItemSchema } from "@shared/schema";
import { z } from "zod";
import LayoutShell from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PackagePlus, X } from "lucide-react";
import { useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useUpload } from "@/hooks/use-upload";
import { api, buildUrl } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";

const formSchema = insertItemSchema.pick({
  sku: true,
  category: true,
  brand: true,
  model: true,
  source: true,
  intakeNotes: true,
});

type FormValues = z.infer<typeof formSchema>;

export default function Intake() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createItem = useCreateItem();
  const { getUploadParameters } = useUpload();
  const [uploadedPhotos, setUploadedPhotos] = useState<{url: string, storageKey: string}[]>([]);

  const addPhotoMutation = useMutation({
    mutationFn: async ({ itemId, url, storageKey }: { itemId: number, url: string, storageKey: string }) => {
      return apiRequest("POST", buildUrl(api.photos.create.path, { itemId }), {
        url,
        storageKey,
        type: "intake",
        sortOrder: uploadedPhotos.length
      });
    }
  });
  
  const form = useForm<FormValues & { confirmed: boolean }>({
    resolver: zodResolver(formSchema.extend({
      confirmed: z.boolean().refine(val => val === true, {
        message: "You must confirm the information is correct"
      })
    })),
    defaultValues: {
      sku: "",
      category: "",
      brand: "",
      model: "",
      source: "",
      intakeNotes: "",
      confirmed: false,
    },
  });

  const onSubmit = async (data: FormValues & { confirmed: boolean }) => {
    try {
      const { confirmed, ...itemData } = data;
      const newItem = await createItem.mutateAsync({
        ...itemData,
        status: "intake",
        quantity: 1,
        intakeConfirmedBy: user?.id
      });

      // Add uploaded photos to the new item
      for (const photo of uploadedPhotos) {
        await addPhotoMutation.mutateAsync({
          itemId: newItem.id,
          url: photo.url,
          storageKey: photo.storageKey
        });
      }

      // Important: Force a cache invalidation for the item list
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });

      setLocation(`/items/${newItem.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <LayoutShell>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">New Intake</h1>
          <p className="text-muted-foreground mt-1">Quickly add new inventory to the system.</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Item Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Scan or enter SKU..." className="font-mono text-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Laptop">Laptop</SelectItem>
                            <SelectItem value="Desktop">Desktop</SelectItem>
                            <SelectItem value="Monitor">Monitor</SelectItem>
                            <SelectItem value="Component">Component</SelectItem>
                            <SelectItem value="Accessory">Accessory</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Donation, Purchase" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Dell, HP, Apple" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Latitude 5420" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="intakeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Condition notes, included accessories, visible damage..." 
                          className="min-h-[100px]"
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem className="space-y-4">
                  <FormLabel>Intake Photos</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="aspect-square rounded-md border border-border overflow-hidden relative group">
                          <img src={photo.url} alt={`Intake ${index}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <ObjectUploader
                        onGetUploadParameters={getUploadParameters}
                        maxNumberOfFiles={10}
                        onComplete={(result) => {
                          const successful = result.successful || [];
                          successful.forEach(file => {
                            const meta = file.meta as any;
                            if (meta.objectPath) {
                              setUploadedPhotos(prev => [...prev, {
                                url: meta.objectPath,
                                storageKey: file.name
                              }]);
                            }
                          });
                        }}
                        buttonClassName="aspect-square w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 rounded-md"
                      >
                        <PackagePlus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Add Photos</span>
                      </ObjectUploader>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground italic">Add at least one photo showing the item's condition.</p>
                </FormItem>

                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          I confirm that I, <span className="font-bold underline text-primary">{user?.firstName} {user?.lastName}</span>, have put in this info correctly.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                  disabled={createItem.isPending || addPhotoMutation.isPending}
                >
                  {createItem.isPending || addPhotoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {createItem.isPending ? "Creating Record..." : "Uploading Photos..."}
                    </>
                  ) : (
                    "Create Item & Continue"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
