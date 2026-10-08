"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Settings, FileText, Megaphone, Menu, PenTool } from "lucide-react";

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const tabs = [
    { name: "Builder", href: "/dashboard/website/builder", icon: PenTool },
    { name: "Settings", href: "/dashboard/website/settings", icon: Settings },
    { name: "Pages", href: "/dashboard/website/pages", icon: FileText },
    { name: "Announcements", href: "/dashboard/website/announcements", icon: Megaphone },
    { name: "Navigation", href: "/dashboard/website/navigation", icon: Menu },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-indigo-400" />
          School Website / CMS
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your public-facing website, pages, announcements, and navigation.
        </p>
      </div>
      
      <div className="flex gap-4 border-b border-slate-800 overflow-x-auto pb-[-1px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="py-4">
        {children}
      </div>
    </div>
  );
}