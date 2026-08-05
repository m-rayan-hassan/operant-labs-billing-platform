"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Link from "next/link";
import { Plus, Search, FileText, Loader2, ArrowRight } from "lucide-react";

interface Invoice {
  id: string;
  number: string;
  clientId: string;
  client?: { name: string };
  status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  total: string;    // backend field name
  currency: string;
  createdAt: string;
}

const STATUSES = ["ALL", "DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"] as const;
type TabStatus = typeof STATUSES[number];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabStatus>("ALL");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get("/invoices");
        // Backend returns { data: [], statusCounts: {}, pagination: {} }
        const data = response.data.data ?? response.data;
        setInvoices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch invoices", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatCurrency = (amount: string, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "PENDING": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "PAID": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "OVERDUE": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "CANCELLED": return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = activeTab === "ALL" || inv.status === activeTab;
    const matchesSearch = inv.client?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          inv.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <div className="section-number">Billing</div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        </div>
        <Link href="/invoices/new" className="btn-solid whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Link>
      </div>

      <div className="glass-card flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-4 p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-bright)] rounded-t-xl">
          {/* Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
            {STATUSES.map(status => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === status 
                    ? "bg-[var(--foreground)] text-[var(--background)]" 
                    : "bg-[var(--surface-dim)] text-[var(--foreground-variant)] hover:text-[var(--foreground)]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-variant)]" />
            <input
              type="text"
              placeholder="Search by client or invoice ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-dim)] border border-[var(--border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] text-sm transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="animate-spin h-6 w-6 text-[var(--foreground-variant)]" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <FileText className="h-10 w-10 text-[var(--border-strong)] mb-3" />
              <p className="text-[var(--foreground)] font-medium">No invoices found</p>
              <p className="text-sm text-[var(--foreground-variant)] mt-1">Try adjusting your filters or create a new one.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider text-[var(--foreground-variant)] bg-[var(--surface-dim)]/50">
                  <th className="px-6 py-4 font-medium">Invoice</th>
                  <th className="px-6 py-4 font-medium hidden sm:table-cell">Client</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Date</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[var(--surface-dim)]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)] font-mono text-sm">
                        {invoice.number}
                      </div>
                      <div className="text-xs text-[var(--foreground-variant)] sm:hidden mt-1">
                        {invoice.client?.name || "Unknown Client"}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-sm text-[var(--foreground)] font-medium">
                      {invoice.client?.name || "Unknown Client"}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-[var(--foreground-variant)]">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center p-2 text-[var(--foreground-variant)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
