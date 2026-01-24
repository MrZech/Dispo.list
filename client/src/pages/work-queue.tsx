import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { Item } from "@shared/schema";
import LayoutShell from "@/components/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useItems, useUpdateItem } from "@/hooks/use-items";
import { useDebounce } from "@/hooks/use-debounce";

const WORKFLOW_STAGES = [
  { status: "intake", label: "Intake" },
  { status: "processing", label: "Processing" },
  { status: "drafted", label: "Drafted" },
  { status: "review", label: "Review" },
  { status: "ready", label: "Ready to List" },
];

const statusFlow: Record<string, string | undefined> = {
  intake: "processing",
  processing: "drafted",
  drafted: "review",
  review: "ready",
  ready: "listed",
};

export default function WorkQueue() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const updateItem = useUpdateItem();

  const { data: items, isLoading } = useItems({
    search: debouncedSearch,
    limit: 500,
    page: 1,
  });

  const grouped = useMemo(() => {
    const buckets: Record<string, Item[]> = {};
    for (const stage of WORKFLOW_STAGES) {
      buckets[stage.status] = [];
    }
    (items || []).forEach((item) => {
      if (buckets[item.status]) {
        buckets[item.status].push(item);
      }
    });
    return buckets;
  }, [items]);

  const totalInQueue = WORKFLOW_STAGES.reduce(
    (sum, stage) => sum + (grouped[stage.status]?.length || 0),
    0
  );

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Work Queue</h1>
            <p className="text-muted-foreground mt-1">
              Move items through the pipeline without opening each record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{totalInQueue} items in flow</Badge>
            <Link href="/intake">
              <Button>New Intake</Button>
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
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading queue...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {WORKFLOW_STAGES.map((stage) => {
              const stageItems = grouped[stage.status] || [];
              return (
                <div
                  key={stage.status}
                  className="rounded-2xl border border-border bg-card/40 p-4 space-y-4 min-h-[220px]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {stage.label}
                    </h2>
                    <Badge variant="outline">{stageItems.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {stageItems.map((item) => {
                      const nextStatus = statusFlow[item.status];
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/70 bg-background p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold leading-tight">
                                {item.brand} {item.model || "Unknown Model"}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-1">
                                {item.sku}
                              </p>
                            </div>
                            {nextStatus && (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={updateItem.isPending}
                                onClick={() =>
                                  updateItem.mutate({ id: item.id, status: nextStatus } as any)
                                }
                                aria-label={`Move to ${nextStatus}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">
                              {item.updatedAt
                                ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })
                                : "No updates yet"}
                            </span>
                            <Link href={`/items/${item.id}`}>
                              <Button size="sm" variant="secondary">
                                Open
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                    {stageItems.length === 0 && (
                      <div className="text-xs text-muted-foreground italic">
                        Nothing in this stage.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
