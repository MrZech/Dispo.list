import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateItem } from "@/hooks/use-items";
import { insertItemSchema } from "@shared/schema";
import { EBAY_COMPUTER_CATEGORIES } from "@shared/ebay-categories";
import { z } from "zod";
import LayoutShell from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PackagePlus, Printer, X } from "lucide-react";
import { useLocation } from "wouter";
import { PhotoUploader } from "@/components/PhotoUploader";
import { api, buildUrl } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formSchema = insertItemSchema.pick({
  sku: true,
  ebayCategoryId: true,
  brand: true,
  model: true,
  source: true,
  sourceLocation: true,
  dropoffType: true,
  intakeNotes: true,
});

type FormValues = z.infer<typeof formSchema>;

export default function Intake() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const createItem = useCreateItem();
  const [uploadedPhotos, setUploadedPhotos] = useState<{url: string, filename: string}[]>([]);

  const addPhotoMutation = useMutation({
    mutationFn: async ({ itemId, url, filename }: { itemId: number, url: string, filename: string }) => {
      return apiRequest("POST", buildUrl(api.photos.create.path, { itemId }), {
        url,
        storageKey: filename,
        type: "intake",
        sortOrder: uploadedPhotos.length
      });
    }
  });
  
  const form = useForm<FormValues & { confirmed: boolean, decision: "research" | "scrap" }>({
    resolver: zodResolver(formSchema.extend({
      confirmed: z.boolean().refine(val => val === true, {
        message: "You must confirm the information is correct"
      }),
      decision: z.enum(["research", "scrap"]).default("research")
    })),
    defaultValues: {
      sku: "",
      ebayCategoryId: "",
      brand: "",
      model: "",
      source: "",
      sourceLocation: "",
      dropoffType: "dropoff",
      intakeNotes: "",
      confirmed: false,
      decision: "research"
    },
  });

  const onSubmit = async (data: FormValues & { confirmed: boolean, decision: "research" | "scrap" }) => {
    try {
      const { confirmed, decision, ...itemData } = data;
      const newItem = await createItem.mutateAsync({
        ...itemData,
        status: decision === "scrap" ? "scrap" : "intake",
        quantity: 1,
        intakeConfirmedBy: user?.id
      });

      // Add uploaded photos to the new item
      for (const photo of uploadedPhotos) {
        await addPhotoMutation.mutateAsync({
          itemId: newItem.id,
          url: photo.url,
          filename: photo.filename
        });
      }

      // Important: Force a cache invalidation for the item list
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });

      setLocation(`/items/${newItem.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = () => {
    const values = form.getValues();
    const sku = (values.sku || "").trim();
    const sourceLocation = (values.sourceLocation || "").trim();
    const brand = (values.brand || "").trim();
    const model = (values.model || "").trim();

    if (!sku || !sourceLocation) {
      toast({
        title: "Missing info",
        description: "Enter SKU and Source Location before printing.",
        variant: "destructive",
      });
      return;
    }

    const intakeDate = new Date().toLocaleDateString();
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>DispoList Intake Sheet</title>
    <style>
      @page { size: landscape; margin: 0.5in; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111; }
      .sheet { border: 2px solid #111; padding: 24px; height: 7.5in; display: flex; flex-direction: column; gap: 18px; }
      .header { display: flex; align-items: center; justify-content: space-between; }
      .title { font-size: 20px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .meta { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.08em; }
      .sku-box { border: 3px solid #111; padding: 18px; }
      .sku-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #444; }
      .sku-value { font-size: 52px; font-weight: 700; letter-spacing: 0.02em; margin-top: 8px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .field { border: 2px solid #111; padding: 14px; min-height: 90px; }
      .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #444; }
      .value { font-size: 22px; font-weight: 600; margin-top: 10px; }
      .notes { border: 2px solid #111; padding: 14px; min-height: 180px; }
      .notes .value { margin-top: 14px; color: #777; font-weight: 400; }
      .footer { font-size: 12px; color: #555; border-top: 1px solid #999; padding-top: 8px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div class="title">DispoList Intake Sheet</div>
        <div class="meta">Internal Use</div>
      </div>
      <div class="sku-box">
        <div class="sku-label">SKU</div>
        <div class="sku-value">${escapeHtml(sku)}</div>
      </div>
      <div class="grid">
        <div class="field">
          <div class="label">Source Location</div>
          <div class="value">${escapeHtml(sourceLocation)}</div>
        </div>
        <div class="field">
          <div class="label">Intake Date</div>
          <div class="value">${escapeHtml(intakeDate)}</div>
        </div>
        <div class="field">
          <div class="label">Brand</div>
          <div class="value">${escapeHtml(brand || "________________")}</div>
        </div>
        <div class="field">
          <div class="label">Model</div>
          <div class="value">${escapeHtml(model || "________________")}</div>
        </div>
      </div>
      <div class="notes">
        <div class="label">Description / Condition Notes</div>
        <div class="value">Write notes here...</div>
      </div>
      <div class="footer">Tape this sheet to the item. No photos included.</div>
    </div>
  </body>
</html>`;

    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Allow popups to print the intake sheet.",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
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
                    name="ebayCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>eBay Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select eBay category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border shadow-md max-h-80">
                            {EBAY_COMPUTER_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name} ({cat.id})
                              </SelectItem>
                            ))}
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
                        <FormLabel>Source (Company/Person)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC Corp, John Doe" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sourceLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Warehouse 1, Site B" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dropoffType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dropoff Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border shadow-md">
                            <SelectItem value="dropoff">Dropoff</SelectItem>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="shipment">Shipment</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input placeholder="e.g. Dell, HP, Apple" {...field} value={field.value || ""} />
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
                          <Input placeholder="e.g. Latitude 5420" {...field} value={field.value || ""} />
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
                          value={field.value || ""}
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
                      <PhotoUploader
                        maxNumberOfFiles={10}
                        onComplete={(files) => {
                          files.forEach(file => {
                            setUploadedPhotos(prev => [...prev, {
                              url: file.url,
                              filename: file.filename
                            }]);
                          });
                        }}
                        buttonClassName="aspect-square w-full h-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 rounded-md"
                      >
                        <PackagePlus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Add Photos</span>
                      </PhotoUploader>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground italic">Add at least one photo showing the item's condition.</p>
                </FormItem>

                <FormField
                  control={form.control}
                  name="decision"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Decision</FormLabel>
                      <FormControl>
                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant={field.value === "research" ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => field.onChange("research")}
                          >
                            Research
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "scrap" ? "destructive" : "outline"}
                            className="flex-1"
                            onClick={() => field.onChange("scrap")}
                          >
                            Scrap
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          I confirm that I, <span className="font-bold underline text-primary">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}</span>, have put in this info correctly.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button type="button" variant="outline" size="lg" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Intake Sheet
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
