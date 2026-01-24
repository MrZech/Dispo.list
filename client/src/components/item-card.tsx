import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Item } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowRight, Edit, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateItem } from "@/hooks/use-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ItemCardProps {
  item: Item & { photos?: { url: string }[] };
}

export function ItemCard({ item }: ItemCardProps) {
  const thumbnail = item.photos?.[0]?.url;
  const updateItem = useUpdateItem();
  
  const statusColors: Record<string, string> = {
    intake: "bg-blue-100 text-blue-700 border-blue-200",
    processing: "bg-orange-100 text-orange-700 border-orange-200",
    drafted: "bg-purple-100 text-purple-700 border-purple-200",
    review: "bg-amber-100 text-amber-700 border-amber-200",
    ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
    listed: "bg-green-100 text-green-700 border-green-200",
    sold: "bg-gray-100 text-gray-700 border-gray-200",
    scrap: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  const statusFlow: Record<string, string | undefined> = {
    intake: "processing",
    processing: "drafted",
    drafted: "review",
    review: "ready",
    ready: "listed",
    listed: "sold",
  };

  const statusLabels: Record<string, string> = {
    intake: "Intake",
    processing: "Processing",
    drafted: "Drafted",
    review: "Review",
    ready: "Ready to List",
    listed: "Listed",
    sold: "Sold",
    scrap: "Scrap",
  };

  const nextStatus = statusFlow[item.status];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-border/60 bg-card/50 backdrop-blur-sm">
      <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={item.model || "Item"} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground/30 flex flex-col items-center">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge 
            variant="outline" 
            className={cn("capitalize font-semibold shadow-sm", statusColors[item.status] || "bg-gray-100")}
          >
            {item.status}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-display font-semibold text-lg leading-tight truncate" title={item.model || "Unknown Item"}>
            {item.brand} {item.model || "Unknown Model"}
          </h3>
        </div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {item.sku}
        </p>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 min-h-[80px]">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.cpu && <span className="px-2 py-1 bg-secondary rounded-md">{item.cpu}</span>}
          {item.ram && <span className="px-2 py-1 bg-secondary rounded-md">{item.ram}</span>}
          {item.storageSize && <span className="px-2 py-1 bg-secondary rounded-md">{item.storageSize} {item.storageType}</span>}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 border-t border-border/50 bg-secondary/20 mt-auto">
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-xs text-muted-foreground">
            {item.updatedAt && formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-2">
          {nextStatus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  disabled={updateItem.isPending}
                  onClick={() => updateItem.mutate({ id: item.id, status: nextStatus } as any)}
                  aria-label={`Next: ${statusLabels[nextStatus]}`}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next: {statusLabels[nextStatus]}</TooltipContent>
            </Tooltip>
          )}
          <Link href={`/items/${item.id}`}>
            <Button size="sm" variant="ghost" className="hover:bg-background shadow-none hover:shadow-sm">
              <Edit className="w-4 h-4 mr-2" />
              Manage
            </Button>
          </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
