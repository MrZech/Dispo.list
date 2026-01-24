import { useEffect, useState } from "react";
import { useItems } from "@/hooks/use-items";
import LayoutShell from "@/components/layout-shell";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, Search, SlidersHorizontal, Loader2, Download } from "lucide-react";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [isExporting, setIsExporting] = useState(false);
  const [limit, setLimit] = useState(100);
  const debouncedSearch = useDebounce(search, 500);
  const { toast } = useToast();

  useEffect(() => {
    setLimit(100);
  }, [debouncedSearch, status]);

  const { data: items, isLoading } = useItems({
    search: debouncedSearch,
    status: status === "all" ? undefined : status,
    limit,
    page: 1,
  });

  const handleEbayExport = async () => {
    if (!items || items.length === 0) {
      toast({ title: "No items", description: "No items to export.", variant: "destructive" });
      return;
    }

    const readyItems = items.filter((item) => item.status === "ready");
    if (readyItems.length === 0) {
      toast({ title: "No ready items", description: "Only items marked Ready to List can be exported.", variant: "destructive" });
      return;
    }

    const itemIds = readyItems.map((item) => item.id);
    setIsExporting(true);

    try {
      const response = await fetch("/api/csv/ebay-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.skipped) {
          toast({ 
            title: "Export blocked", 
            description: `Items need Category ID and Condition ID: ${errorData.skipped.join(', ')}`, 
            variant: "destructive" 
          });
        } else {
          toast({ title: "Export failed", description: errorData.message || "Could not export items.", variant: "destructive" });
        }
        return;
      }

      const exportedCount = response.headers.get('X-Exported-Count');
      const skippedCount = response.headers.get('X-Skipped-Count');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebay-draft-listing-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      let message = `Exported ${exportedCount} items to eBay CSV.`;
      if (skippedCount && parseInt(skippedCount) > 0) {
        message += ` ${skippedCount} items skipped (missing Category or Condition).`;
      }
      toast({ title: "Export complete", description: message });
    } catch (error) {
      toast({ title: "Export failed", description: "Could not export items to CSV.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage and track all items in the system.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleEbayExport}
              disabled={isExporting || !items?.length}
              data-testid="button-ebay-export"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export to eBay CSV
            </Button>
            <Link href="/intake">
              <Button size="lg" className="shadow-lg shadow-primary/20" data-testid="button-add-item">
                <PackagePlus className="mr-2 h-5 w-5" />
                Add Item
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by SKU, Brand, Model..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Not Listed/Sold/Scrap)</SelectItem>
                <SelectItem value="archived">Archived (Listed/Sold/Scrap)</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="drafted">Drafted</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="ready">Ready to List</SelectItem>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="scrap">Scrap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items?.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
              {items?.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground">
                  No items found matching your criteria.
                </div>
              )}
            </div>
            {!!items?.length && (
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {items.length} items
                </div>
                {items.length === limit && (
                  <Button variant="outline" onClick={() => setLimit((prev) => prev + 100)}>
                    Load more
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </LayoutShell>
  );
}
