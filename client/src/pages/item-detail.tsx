import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Item, Photo, InsertPhoto, User } from "@shared/schema";
import { EBAY_COMPUTER_CATEGORIES, EBAY_CONDITION_IDS, getCategoryName, getConditionName } from "@shared/ebay-categories";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LayoutShell from "@/components/layout-shell";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Package, Trash2, Camera, Maximize2, 
  CheckCircle2, AlertCircle, ArrowLeft, Save, 
  ExternalLink, FileOutput, Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const itemId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: item, isLoading: itemLoading } = useQuery<Item>({
    queryKey: ["/api/items", itemId],
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: ["/api/items", itemId, "photos"],
  });

  const updateItem = useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      const res = await apiRequest("PATCH", `/api/items/${itemId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId] });
      toast({ title: "Updated", description: "Item changes saved successfully." });
    },
  });

  const createPhoto = useMutation({
    mutationFn: async (photo: InsertPhoto) => {
      const res = await apiRequest("POST", "/api/photos", photo);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId, "photos"] });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async ({ id, itemId }: { id: number; itemId: number }) => {
      await apiRequest("DELETE", `/api/photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items", itemId, "photos"] });
      toast({ title: "Deleted", description: "Photo removed." });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Item removed from inventory." });
      setLocation("/inventory");
    },
  });

  const handleUpdate = (field: keyof Item, value: any) => {
    updateItem.mutate({ [field]: value });
  };

  if (itemLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  if (!item) {
    return (
      <LayoutShell>
        <div className="text-center py-20">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="text-2xl font-bold">Item not found</h2>
          <Button onClick={() => setLocation("/inventory")} variant="link">
            Back to Inventory
          </Button>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLocation("/inventory")}
              className="rounded-full h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono">{item.sku}</Badge>
                <Badge className="capitalize">{item.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold">{item.brand} {item.model}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileOutput className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (confirm("Are you sure you want to delete this item?")) {
                  deleteItem.mutate();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        <Tabs defaultValue="specs" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="specs" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Specs & Testing</TabsTrigger>
            <TabsTrigger value="photos" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Photos</TabsTrigger>
            <TabsTrigger value="listing" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">eBay Listing</TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hardware Specs */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Hardware Specifications</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>CPU / Processor</Label>
                    <Input 
                      defaultValue={item.cpu || ""} 
                      onBlur={(e) => handleUpdate("cpu", e.target.value)} 
                      placeholder="e.g. Core i7-1185G7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RAM / Memory</Label>
                    <Input 
                      defaultValue={item.ram || ""} 
                      onBlur={(e) => handleUpdate("ram", e.target.value)} 
                      placeholder="e.g. 16GB DDR4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Type & Size</Label>
                    <Input 
                      defaultValue={item.storageType || ""} 
                      onBlur={(e) => handleUpdate("storageType", e.target.value)} 
                      placeholder="e.g. 512GB NVMe SSD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GPU / Graphics</Label>
                    <Input 
                      defaultValue={item.gpu || ""} 
                      onBlur={(e) => handleUpdate("gpu", e.target.value)} 
                      placeholder="e.g. Intel Iris Xe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Resolution</Label>
                    <Input 
                      defaultValue={item.resolution || ""} 
                      onBlur={(e) => handleUpdate("resolution", e.target.value)} 
                      placeholder="e.g. 1920x1080"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operating System</Label>
                    <Input 
                      defaultValue={item.os || ""} 
                      onBlur={(e) => handleUpdate("os", e.target.value)} 
                      placeholder="e.g. Windows 10 Pro"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Source Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Intake Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Source Vendor</Label>
                    <p className="font-medium">{item.sourceVendor || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Source Location</Label>
                    <p className="font-medium">{item.sourceLocation || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Dropoff Type</Label>
                    <p className="font-medium capitalize">{item.dropoffType || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Testing Status */}
              <div className="space-y-6 lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Testing Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="space-y-2">
                        <Label>Test Tool Used</Label>
                        <Input 
                          defaultValue={item.testTool || ""} 
                          onBlur={(e) => handleUpdate("testTool", e.target.value)} 
                          placeholder="e.g. Magic Octopus, Dell ePSA"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <Label className="cursor-pointer" htmlFor="magic-octopus">Magic Octopus Run</Label>
                        <Switch 
                          id="magic-octopus"
                          checked={!!item.magicOctopusRun}
                          onCheckedChange={(val) => handleUpdate("magicOctopusRun", val)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <Label className="cursor-pointer" htmlFor="data-wipe">Data Wiped</Label>
                        <div className="flex items-center gap-2">
                          {item.storageType && !item.dataDestruction && (
                            <Badge variant="destructive" className="text-[10px] h-4">Required</Badge>
                          )}
                          <Switch 
                            id="data-wipe"
                            checked={!!item.dataDestruction}
                            onCheckedChange={(val) => handleUpdate("dataDestruction", val)}
                          />
                        </div>
                      </div>
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

                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                  <Checkbox
                    id="specs-confirmed"
                    checked={item.processingConfirmedBy !== null}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateItem.mutate({ id: item.id, processingConfirmedBy: user?.id || "" });
                      } else {
                        updateItem.mutate({ id: item.id, processingConfirmedBy: null });
                      }
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="specs-confirmed" className="text-sm font-medium leading-none cursor-pointer">
                      I confirm that I, <span className="font-bold underline text-primary">{user?.firstName} {user?.lastName}</span>, have verified these specs.
                    </Label>
                  </div>
                </div>
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
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Add Photos
                </div>
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
                <div className="space-y-2">
                  <Label>Listing Title (max 80 chars)</Label>
                  <Input 
                    defaultValue={item.listingTitle || ""} 
                    onBlur={(e) => handleUpdate("listingTitle", e.target.value)} 
                    placeholder="Generated from specs if left empty"
                    maxLength={80}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Listing Description (HTML)</Label>
                  <Textarea 
                    defaultValue={item.listingDescription || ""} 
                    onBlur={(e) => handleUpdate("listingDescription", e.target.value)} 
                    placeholder="Auto-generated from specs if left empty. Supports HTML."
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>

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
                    <Label>Research Price / Sold Comps ($)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      defaultValue={item.researchPrice?.toString() || ""} 
                      onBlur={(e) => handleUpdate("researchPrice", e.target.value)} 
                      className="font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>eBay Category</Label>
                    <Select 
                      defaultValue={item.ebayCategoryId || ""} 
                      onValueChange={(val) => handleUpdate("ebayCategoryId", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select eBay Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-popover-border max-h-80">
                        {EBAY_COMPUTER_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select 
                      defaultValue={item.ebayConditionId || ""} 
                      onValueChange={(val) => handleUpdate("ebayConditionId", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-popover-border">
                        {EBAY_CONDITION_IDS.map((cond) => (
                          <SelectItem key={cond.id} value={cond.id}>
                            {cond.name}
                          </SelectItem>
                        ))}
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
                      <SelectContent className="bg-popover border-popover-border">
                        <SelectItem value="FixedPrice">Fixed Price</SelectItem>
                        <SelectItem value="Auction">Auction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>UPC (Optional)</Label>
                    <Input 
                      defaultValue={item.upc || ""} 
                      onBlur={(e) => handleUpdate("upc", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Location</Label>
                    <Input 
                      defaultValue={item.storageLocation || ""} 
                      onBlur={(e) => handleUpdate("storageLocation", e.target.value)} 
                      placeholder="Box / Letter / Shelf"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <Label className="cursor-pointer" htmlFor="template-drafted">eBay Template Drafted</Label>
                    <Switch 
                      id="template-drafted"
                      checked={!!item.isTemplateDrafted}
                      onCheckedChange={(val) => handleUpdate("isTemplateDrafted", val)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <Label className="cursor-pointer" htmlFor="second-review">Second Review Completed</Label>
                    <Switch 
                      id="second-review"
                      checked={!!item.isSecondReviewCompleted}
                      onCheckedChange={(val) => handleUpdate("isSecondReviewCompleted", val)}
                    />
                  </div>
                </div>

                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30 mt-6">
                  <Checkbox
                    id="listing-confirmed"
                    checked={item.listingConfirmedBy !== null}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateItem.mutate({ id: item.id, listingConfirmedBy: user?.id || "" });
                      } else {
                        updateItem.mutate({ id: item.id, listingConfirmedBy: null });
                      }
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="listing-confirmed" className="text-sm font-medium leading-none cursor-pointer">
                      I confirm that I, <span className="font-bold underline text-primary">{user?.firstName} {user?.lastName}</span>, have completed this listing draft.
                    </Label>
                  </div>
                </div>

                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30 mt-6">
                  <Checkbox
                    id="review-confirmed"
                    checked={item.reviewConfirmedBy !== null}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateItem.mutate({ id: item.id, reviewConfirmedBy: user?.id || "" });
                      } else {
                        updateItem.mutate({ id: item.id, reviewConfirmedBy: null });
                      }
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="review-confirmed" className="text-sm font-medium leading-none cursor-pointer">
                      I confirm that I, <span className="font-bold underline text-primary">{user?.firstName} {user?.lastName}</span>, have completed the second review of this item.
                    </Label>
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

// Helper components that were missing in previous attempt but are used in shadcn
function Select({ children, defaultValue, onValueChange }: any) {
  return (
    <div className="relative">
      <select 
        defaultValue={defaultValue} 
        onChange={(e) => onValueChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  );
}

function SelectTrigger({ children }: any) { return <>{children}</>; }
function SelectValue({ placeholder }: any) { return <>{placeholder}</>; }
function SelectContent({ children }: any) { return <>{children}</>; }
function SelectItem({ value, children }: any) {
  return <option value={value}>{children}</option>;
}
