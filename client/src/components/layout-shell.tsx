import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  PackagePlus, 
  Boxes, 
  LayoutGrid,
  Settings, 
  LogOut, 
  Menu,
  User,
  Sparkles,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Intake', href: '/intake', icon: PackagePlus },
    { name: 'Inventory', href: '/inventory', icon: Boxes },
    { name: 'Work Queue', href: '/work-queue', icon: LayoutGrid },
    { name: 'eBay Script', href: '/ebay-script', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
    ...(isAdmin ? [{ name: 'Admin', href: '/admin', icon: Shield }] : []),
  ];

  const handleGoHome = () => setLocation("/");

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 border-r border-border">
      <div className="p-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            className="text-left text-2xl font-display font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            onClick={handleGoHome}
            aria-label="Go to Dashboard"
          >
            DispoList
          </button>
          <p className="text-xs text-muted-foreground mt-1">Inventory Management</p>
        </div>
        <ThemeToggle />
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2 hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {user?.role === 'admin' ? 'Administrator' : user?.email || 'User'}
                  </p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 fixed inset-y-0 z-50">
        <SidebarContent />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4">
        <button
          type="button"
          className="text-left text-xl font-display font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          onClick={handleGoHome}
          aria-label="Go to Dashboard"
        >
          DispoList
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pt-16 md:pt-0 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
