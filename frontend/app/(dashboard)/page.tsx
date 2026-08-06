"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

interface Stats {
  monthlyRevenue: number;
  prevMonthRevenue: number;
  annualRecurring: number;  // backend field name
  prevYearRecurring: number;
  outstanding: number;
  collectedMTD: number;     // backend field name (capital MTD)
  totalCollected: number;
  overdueCount: number;
  pendingCount: number;
  totalInvoices: number;
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

    const REFRESH_INTERVAL = 30000;
    const intervalId = setInterval(fetchDashboardData, REFRESH_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchDashboardData();
    };
    const handleFocus = () => fetchDashboardData();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // Percent change vs previous period. Returns null when the previous period
  // had no revenue (meaningful % would be undefined), otherwise the delta.
  const getChangePct = (current: number, previous: number): number | null => {
    if (previous <= 0) return current > 0 ? null : 0;
    return ((current - previous) / previous) * 100;
  };

  const pctMonthly = getChangePct(stats?.monthlyRevenue ?? 0, stats?.prevMonthRevenue ?? 0);
  const pctAnnual = getChangePct(stats?.annualRecurring ?? 0, stats?.prevYearRecurring ?? 0);

  const renderDelta = (pct: number | null, periodLabel: string) => {
    if (pct === null) {
      return (
        <span className="text-green-500 flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" /> New this {periodLabel}
        </span>
      );
    }
    const up = pct >= 0;
    return (
      <span className={`flex items-center gap-1 ${up ? "text-green-500" : "text-red-500"}`}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {up ? "+" : ""}{pct.toFixed(1)}% {periodLabel === "month" ? "from last month" : "from last year"}
      </span>
    );
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
            {renderDelta(pctMonthly, "month")}
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
            {renderDelta(pctAnnual, "year")}
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
          <div className="text-xs text-[var(--foreground-variant)] mt-2">
            {stats?.overdueCount ?? 0} overdue · {stats?.pendingCount ?? 0} pending
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
            {formatCurrency(stats?.totalCollected ?? 0)} collected all time
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
