import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, History, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-primary hidden md:block">
              MoneyMeter
            </h1>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <Button
                variant={location.pathname === "/" ? "default" : "ghost"}
                className={`${location.pathname === "/" ? "gradient-primary" : ""} md:w-auto w-10`}
              >
                <LayoutDashboard className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>
            <Link to="/history">
              <Button
                variant={location.pathname === "/history" ? "default" : "ghost"}
                className={`${location.pathname === "/history" ? "gradient-primary" : ""} md:w-auto w-10`}
              >
                <History className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Historia</span>
              </Button>
            </Link>
            <Button variant="ghost" onClick={signOut} className="md:w-auto w-10">
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Wyloguj</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
