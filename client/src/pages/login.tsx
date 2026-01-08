import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Boxes } from "lucide-react";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      <Card className="w-full max-w-md border-border/50 shadow-2xl relative z-10 backdrop-blur-sm bg-card/80">
        <CardContent className="pt-12 pb-12 px-8 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary mb-2">
              <Boxes className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">DispoList</h1>
            <p className="text-muted-foreground text-lg">Internal Inventory System</p>
          </div>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign In with Replit
            </Button>
            <p className="text-xs text-muted-foreground">
              Authorized personnel only. All actions are logged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
