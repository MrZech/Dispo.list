import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Boxes, AlertCircle } from "lucide-react";

export default function Login() {
  const { user, isLoading, login, isLoggingIn, loginError } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (loginError) {
      setError(loginError);
    }
  }, [loginError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      <Card className="w-full max-w-md border-border/50 shadow-2xl relative z-10 backdrop-blur-sm bg-card/80">
        <CardContent className="pt-12 pb-12 px-8 space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary mb-2">
              <Boxes className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">DispoList</h1>
            <p className="text-muted-foreground text-lg">Internal Inventory System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isLoggingIn}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoggingIn}
              />
            </div>

            <Button 
              type="submit"
              size="lg" 
              data-testid="button-login"
              className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Authorized personnel only. All actions are logged.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
