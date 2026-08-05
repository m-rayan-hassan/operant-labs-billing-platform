"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

interface Stats {
  monthlyRevenue: number;
  annualRecurring: number;  // backend field name
  outstanding: number;
  collectedMTD: number;     // backend field name (capital MTD)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get("/dashboard/stats");
        setStats(statsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--foreground-variant)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="section-number">Overview</div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/invoices/new" className="btn-solid">
            New Invoice
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--foreground-variant)]">Monthly Revenue</h3>
            <div className="p-2 bg-[var(--surface-dim)] rounded-md">
              <DollarSign className="h-4 w-4 text-[var(--foreground)]" />
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyRevenue || 0)}</div>
          <div className="text-xs text-[var(--foreground-variant)] mt-2 flex items-center gap-1">
            <span className="text-green-500 flex items-center"><ArrowUpRight className="h-3 w-3" /> +12%</span> from last month
          </div>
        </div>

        {/* ARR */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--foreground-variant)]">Annual Recurring</h3>
            <div className="p-2 bg-[var(--surface-dim)] rounded-md">
              <Activity className="h-4 w-4 text-[var(--color-electric-cyan)]" />
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats?.annualRecurring || 0)}</div>
          <div className="text-xs text-[var(--foreground-variant)] mt-2 flex items-center gap-1">
            <span className="text-green-500 flex items-center"><ArrowUpRight className="h-3 w-3" /> +4.2%</span> from last year
          </div>
        </div>

        {/* Outstanding */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--foreground-variant)]">Outstanding</h3>
            <div className="p-2 bg-[var(--surface-dim)] rounded-md">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats?.outstanding || 0)}</div>
          <div className="text-xs text-[var(--foreground-variant)] mt-2 flex items-center gap-1">
            <span className="text-red-500 flex items-center"><ArrowDownRight className="h-3 w-3" /> Needs attention</span>
          </div>
        </div>

        {/* Collected MTD */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--foreground-variant)]">Collected (MTD)</h3>
            <div className="p-2 bg-[var(--surface-dim)] rounded-md">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats?.collectedMTD || 0)}</div>
          <div className="text-xs text-[var(--foreground-variant)] mt-2">
            This month
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="glass-card p-6 min-h-[400px] flex flex-col mt-8">
        <h3 className="text-lg font-bold mb-6">Cashflow Overview</h3>
        <div className="flex-1 border border-dashed border-[var(--border-strong)] rounded-lg flex items-center justify-center bg-[var(--surface-dim)]/50">
          <div className="text-center">
            <Activity className="h-8 w-8 text-[var(--foreground-variant)] mx-auto mb-2 opacity-50" />
            <p className="text-[var(--foreground-variant)] text-sm">Chart rendering will be integrated in the next sprint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
