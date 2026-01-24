import { useItems } from "@/hooks/use-items";
import { useAuth } from "@/hooks/use-auth";
import LayoutShell from "@/components/layout-shell";
import { StatsCard } from "@/components/stats-card";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { PackagePlus, Box, CheckCircle, Tag, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: items, isLoading } = useItems({ limit: 4 });
  const { data: intakeItems } = useItems({ status: "intake" });
  const { data: processingItems } = useItems({ status: "processing" });
  const { data: readyItems } = useItems({ status: "ready" });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Welcome back, {user?.firstName}</h1>
            <p className="text-muted-foreground mt-1">Here's what needs your attention today.</p>
          </div>
          <Link href="/intake">
            <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
              <PackagePlus className="mr-2 h-5 w-5" />
              New Intake
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/inventory?status=intake">
            <div className="cursor-pointer">
              <StatsCard 
                title="Pending Intake" 
                value={intakeItems?.length || 0} 
                icon={<Box className="h-6 w-6" />}
                className="border-l-4 border-l-blue-500"
              />
            </div>
          </Link>
          <Link href="/inventory?status=processing">
            <div className="cursor-pointer">
              <StatsCard 
                title="In Processing" 
                value={processingItems?.length || 0} 
                icon={<Tag className="h-6 w-6" />}
                className="border-l-4 border-l-orange-500"
              />
            </div>
          </Link>
          <Link href="/inventory?status=ready">
            <div className="cursor-pointer">
              <StatsCard 
                title="Ready to List" 
                value={readyItems?.length || 0} 
                icon={<CheckCircle className="h-6 w-6" />}
                className="border-l-4 border-l-emerald-500"
              />
            </div>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">Recent Items</h2>
            <Link href="/inventory">
              <Button variant="ghost" className="text-primary hover:text-primary/80">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items?.length === 0 ? (
              <div className="col-span-4 p-12 text-center bg-muted/30 rounded-2xl border border-dashed border-border">
                <Box className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg text-foreground">No items found</h3>
                <p className="text-muted-foreground mb-4">Start by adding inventory to the system.</p>
                <Link href="/intake">
                  <Button variant="outline">Start Intake</Button>
                </Link>
              </div>
            ) : (
              items?.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
