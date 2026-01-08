import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useItem, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { usePhotos, useCreatePhoto, useDeletePhoto } from "@/hooks/use-photos";
import LayoutShell from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Save, Trash2, Camera, AlertCircle, 
  CheckCircle2, Laptop, HardDrive, ShoppingBag, 
  Loader2, Maximize2
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function ItemDetail() {
  const [, params] = useRoute("/items/:id");
  const [, setLocation] = useLocation();
  const itemId = Number(params?.id);
  const { data: item, isLoading } = useItem(itemId);
  const { data: photos } = usePhotos(itemId);
  
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const createPhoto = useCreatePhoto();
  const deletePhoto = useDeletePhoto();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("specs");

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  if (!item) {
    return (
      <LayoutShell>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Item Not Found</h2>
          <Button onClick={() => setLocation("/inventory")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </LayoutShell>
    );
  }

  const handleUpdate = (field: string, value: any) => {
    updateItem.mutate({ id: itemId, [field]: value });
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(itemId);
      setLocation("/inventory");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-border pb-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold">
                  {item.brand} {item.model || "Untitled Item"}
                </h1>
                <Badge variant="outline" className="text-sm px-3 py-1 font-mono uppercase">
                  {item.sku}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Select 
                  defaultValue={item.status} 
                  onValueChange={(val) => handleUpdate("status", val)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs font-semibold uppercase tracking-wider bg-secondary/50 border-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="drafted">Drafted</SelectItem>
                    <SelectItem value="ready">Ready to List</SelectItem>
                    <SelectItem value="listed">Listed</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Added on {new Date(item.intakeDate || item.createdAt || "").toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item and all associated photos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="specs" className="rounded-lg">
              <Laptop className="w-4 h-4 mr-2" /> Specs & Testing
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-lg">
              <Camera className="w-4 h-4 mr-2" /> Photos
            </TabsTrigger>
            <TabsTrigger value="listing" className="rounded-lg">
              <ShoppingBag className="w-4 h-4 mr-2" /> eBay Listing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hardware Specs */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    Hardware Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input 
                      defaultValue={item.brand || ""} 
                      onBlur={(e) => handleUpdate("brand", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input 
                      defaultValue={item.model || ""} 
                      onBlur={(e) => handleUpdate("model", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPU / Processor</Label>
                    <Input 
                      defaultValue={item.cpu || ""} 
                      onBlur={(e) => handleUpdate("cpu", e.target.value)} 
                      placeholder="e.g. Intel Core i7-1185G7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RAM</Label>
                    <Input 
                      defaultValue={item.ram || ""} 
                      onBlur={(e) => handleUpdate("ram", e.target.value)} 
                      placeholder="e.g. 16GB DDR4"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Storage Type</Label>
                      <Select 
                        defaultValue={item.storageType || ""} 
                        onValueChange={(val) => handleUpdate("storageType", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSD">SSD</SelectItem>
                          <SelectItem value="HDD">HDD</SelectItem>
                          <SelectItem value="NVMe">NVMe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input 
                        defaultValue={item.storageSize || ""} 
                        onBlur={(e) => handleUpdate("storageSize", e.target.value)} 
                        placeholder="e.g. 512GB"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Battery Health</Label>
                    <Input 
                      defaultValue={item.batteryHealth || ""} 
                      onBlur={(e) => handleUpdate("batteryHealth", e.target.value)} 
                      placeholder="e.g. Excellent / 89%"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Testing Status */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Testing Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <Label className="cursor-pointer" htmlFor="power-test">Power Test</Label>
                      <Switch 
                        id="power-test"
                        checked={!!item.powerTest}
                        onCheckedChange={(val) => handleUpdate("powerTest", val)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <Label className="cursor-pointer" htmlFor="bench-tested">Bench Tested</Label>
                      <Switch 
                        id="bench-tested"
                        checked={!!item.benchTested}
                        onCheckedChange={(val) => handleUpdate("benchTested", val)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <Label className="cursor-pointer" htmlFor="data-wipe">Data Wiped</Label>
                      <Switch 
                        id="data-wipe"
                        checked={!!item.dataDestruction}
                        onCheckedChange={(val) => handleUpdate("dataDestruction", val)}
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label>Testing Notes</Label>
                      <Textarea 
                        defaultValue={item.benchNotes || ""}
                        onBlur={(e) => handleUpdate("benchNotes", e.target.value)}
                        placeholder="Any issues found during testing..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Item Photos</CardTitle>
                  <CardDescription>Upload and manage images for eBay.</CardDescription>
                </div>
                <ObjectUploader
                  onGetUploadParameters={async (file) => {
                    const res = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                      }),
                    });
                    const { uploadURL, objectPath } = await res.json();
                    
                    // Store the object path to create the photo record later
                    // We attach it to the file object temporarily if needed, 
                    // but onComplete is safer
                    (file as any).meta = { ...file.meta, objectPath };
                    
                    return {
                      method: "PUT",
                      url: uploadURL,
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={async (result) => {
                    // Create photo records for successful uploads
                    for (const file of result.successful) {
                      // We need the objectPath we got during getUploadParameters
                      // Since Uppy might not persist custom meta easily across async boundaries in all versions,
                      // we can re-derive or use what we stored. 
                      // For this implementation, let's assume the backend generates a predictable path
                      // OR, better, use the uploadURL response.
                      
                      // For simplicity in this demo, we'll assume the URL is publicly accessible 
                      // via the proxy route /objects/...
                      
                      // Note: In a real app, we'd want to robustly pass the objectPath.
                      // Here we'll reconstruct the likely path based on the logic in routes.ts
                      // But actually, Uppy's result.uploadURL is the GCS signed URL, not our internal one.
                      
                      // Let's rely on the file.meta.objectPath we set above!
                      const objectPath = (file as any).meta.objectPath;
                      if (objectPath) {
                        await createPhoto.mutateAsync({
                          type: "listing",
                          url: `/objects${objectPath}`,
                          storageKey: objectPath,
                          sortOrder: (photos?.length || 0) + 1
                        });
                      }
                    }
                    toast({ title: "Upload Complete", description: "Photos added successfully." });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Add Photos
                  </div>
                </ObjectUploader>
              </CardHeader>
              <CardContent>
                {photos?.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">No photos yet. Click "Add Photos" to upload.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {photos?.map((photo) => (
                      <div key={photo.id} className="group relative aspect-square bg-muted rounded-xl overflow-hidden shadow-sm border border-border">
                        <img 
                          src={photo.url} 
                          alt="Item" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="icon" variant="secondary" onClick={() => window.open(photo.url, '_blank')}>
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="destructive"
                            onClick={() => deletePhoto.mutate({ id: photo.id, itemId })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listing" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader>
                <CardTitle>eBay Listing Details</CardTitle>
                <CardDescription>Prepare this item for export to eBay CSV.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>List Price ($)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      defaultValue={item.listPrice?.toString() || ""} 
                      onBlur={(e) => handleUpdate("listPrice", e.target.value)} 
                      className="font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition ID</Label>
                    <Select 
                      defaultValue={item.ebayConditionId || ""} 
                      onValueChange={(val) => handleUpdate("ebayConditionId", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">New</SelectItem>
                        <SelectItem value="3000">Used</SelectItem>
                        <SelectItem value="7000">For Parts / Not Working</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Listing Format</Label>
                    <Select 
                      defaultValue={item.listingFormat || "FixedPrice"} 
                      onValueChange={(val) => handleUpdate("listingFormat", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FixedPrice">Fixed Price</SelectItem>
                        <SelectItem value="Auction">Auction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number"
                      defaultValue={item.quantity?.toString() || "1"} 
                      onBlur={(e) => handleUpdate("quantity", Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Ready to List?</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Ensure all fields are filled before changing status to "Ready". This item will be included in the next CSV export.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}
