import { useState } from "react";
import { useItems } from "@/hooks/use-items";
import LayoutShell from "@/components/layout-shell";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 500);

  const { data: items, isLoading } = useItems({
    search: debouncedSearch,
    status: status === "all" ? undefined : status,
  });

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage and track all items in the system.</p>
          </div>
          <Link href="/intake">
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <PackagePlus className="mr-2 h-5 w-5" />
              Add Item
            </Button>
          </Link>
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
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="drafted">Drafted</SelectItem>
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
        )}
      </div>
    </LayoutShell>
  );
}
