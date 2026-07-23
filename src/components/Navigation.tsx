import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractPeriod, UserSettings } from "@/lib/employment";
import { SettingsDialog } from "@/components/SettingsDialog";

interface NavigationProps {
  settings?: UserSettings;
  activePeriod?: ContractPeriod;
  onSettingsUpdate?: () => void;
}

export const Navigation = ({
  settings,
  activePeriod,
  onSettingsUpdate,
}: NavigationProps) => {
  const location = useLocation();
  const links = [
    { to: "/", label: "Dzisiaj", icon: LayoutDashboard },
    { to: "/history", label: "Historia", icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <TimerReset className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-none">MoneyMeter</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Twój czas pod kontrolą</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center rounded-xl border border-border bg-card/60 p-1 md:flex">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === to
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <SettingsDialog
              settings={settings}
              activePeriod={activePeriod}
              onUpdate={onSettingsUpdate}
            />
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors",
                location.pathname === to
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};
