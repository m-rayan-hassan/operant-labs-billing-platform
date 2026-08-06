"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Loader2, Menu, X, FileEdit, Briefcase, CreditCard, RefreshCw, Receipt, LineChart, PieChart, Calculator } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--foreground-variant)]" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const navGroups = [
    {
      label: "Overview",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Clients", href: "/clients", icon: Users },
        { name: "Invoices", href: "/invoices", icon: FileText, badge: "12" },
        { name: "Quotes", href: "/quotes", icon: FileEdit, badge: "4" },
        { name: "Projects", href: "/projects", icon: Briefcase },
      ]
    },
    {
      label: "Finance",
      items: [
        { name: "Payments", href: "/payments", icon: CreditCard },
        { name: "Subscriptions", href: "/subscriptions", icon: RefreshCw },
        { name: "Expenses", href: "/expenses", icon: Receipt },
        { name: "Revenue", href: "/revenue", icon: LineChart },
        { name: "Reports", href: "/reports", icon: PieChart },
        { name: "Tax", href: "/tax", icon: Calculator },
      ]
    },
    {
      label: "System",
      items: [
        { name: "Settings", href: "/settings", icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-[var(--surface-bright)] border-r border-[var(--border-subtle)] transform transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--border-subtle)]">
          
          {/* Logo & Text Wrapper (Logo on the left, bigger size) */}
          <div className="flex items-center gap-0">
            <Image src="/logo.png" alt="Operant Labs Logo" width={47} height={47} className="object-contain" />
            <div className="font-bold text-xl tracking-tight">Operant<span className="text-[var(--color-electric-cyan)]">Billing</span></div>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5 text-[var(--foreground-variant)]" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
          <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-[var(--foreground-variant)] px-3 py-2 mt-2">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        isActive 
                          ? "bg-[var(--surface-dim)] text-[var(--foreground)] font-medium" 
                          : "text-[var(--foreground-variant)] hover:bg-[var(--surface-dim)] hover:text-[var(--foreground)]"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? "text-[var(--color-electric-cyan)]" : ""}`} />
                      <span className="flex-1 text-[13px]">{item.name}</span>
                      
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          
          <div className="border-t border-[var(--border-subtle)] pt-4 mt-auto">
            <div className="px-3 py-2 mb-2">
              <div className="text-sm font-medium text-[var(--foreground)]">{user.email}</div>
              <div className="text-xs text-[var(--foreground-variant)] uppercase tracking-wider mt-0.5">{user.role}</div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 text-[var(--foreground-variant)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center h-16 px-4 border-b border-[var(--border-subtle)] bg-[var(--surface-bright)] shrink-0">
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6 text-[var(--foreground)]" />
          </button>
          
          {/* Mobile Logo & Text Wrapper */}
          <div className="ml-4 flex items-center gap-2.5">
            <Image src="/logo.png" alt="Operant Labs Logo" width={32} height={32} className="object-contain" />
            <div className="font-bold text-lg tracking-tight">Operant<span className="text-[var(--color-electric-cyan)]">Billing</span></div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}