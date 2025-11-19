"use client";

import { RiDashboardLine, RiSafeLine, RiPulseLine, RiShieldKeyholeLine, RiSettings3Line } from "react-icons/ri";

const navItems = [
  { id: "dashboard", label: "Home", icon: RiDashboardLine },
  { id: "guardians", label: "Guardians", icon: RiShieldKeyholeLine },
  { id: "heartbeat", label: "Heartbeat", icon: RiPulseLine },
  { id: "vaults", label: "Vaults", icon: RiSafeLine },
  { id: "settings", label: "Settings", icon: RiSettings3Line },
];

type Props = {
  activeTab?: string;
  onNavigate?: (id: string) => void;
};

export function MobileNav({ activeTab = "dashboard", onNavigate }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-deep-navy/95 pb-safe backdrop-blur lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
                isActive ? "text-icp-cyan" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="text-2xl" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

