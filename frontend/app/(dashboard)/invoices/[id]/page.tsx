"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { api } from "../../../../lib/api";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    FileText,
    Send,
    XCircle,
    CheckCircle2,
    History,
    X,
} from "lucide-react";

interface InvoiceItem {
    id: string;
    description: string;
    quantity: string;
    rate: string; // backend field name
    amount: string;
}

interface Invoice {
    id: string;
    number: string;
    clientId: string;
    client?: { name: string; address?: string };
    status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
    issueDate: string;
    dueDate: string;
    total: string; // backend field name (not 'amount')
    subtotal: string;
    discount: string;
    tax: string;
    currency: string;
    notes?: string;
    service?: string;
    createdAt: string;
    items?: InvoiceItem[];
}

export default function InvoiceDetailsPage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const fetchInvoice = useCallback(async () => {
        try {
            const res = await api.get(`/invoices/${id}`);
            // Backend returns the invoice object directly
            setInvoice(res.data);
        } catch (err: unknown) {
            console.error("Failed to fetch invoice", err);
            setError("Failed to load invoice details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const timeoutId = window.setTimeout(() => {
            void fetchInvoice();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [id, fetchInvoice]);

    const handleAction = async (
        action: string,
        endpoint: string,
        method: "post" | "put" = "post",
        data?: unknown,
    ) => {
        setActionLoading(action);
        setError(null);
        try {
            if (method === "post") {
                await api.post(endpoint, data);
            } else {
                await api.put(endpoint, data);
            }
            await fetchInvoice();
        } catch (err: unknown) {
            const fallback = `Failed to perform action: ${action}`;

            if (axios.isAxiosError(err)) {
                const message = err.response?.data?.message;
                setError(typeof message === "string" ? message : fallback);
                return;
            }

            setError(fallback);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "DRAFT":
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
            case "PENDING":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "PAID":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "OVERDUE":
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            case "CANCELLED":
                return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatCurrency = (amount: string, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
        }).format(parseFloat(amount));
    };

    const openEmailModal = () => {
        if (!invoice) return;
        setEmailSubject(`Invoice ${invoice.number} from Operant Labs`);
        setEmailMessage(
            `Dear ${invoice.client?.name},\n\nI hope this email finds you well.\n\nPlease find attached the invoice (${invoice.number}). The total amount is ${formatCurrency(invoice.total, invoice.currency)} and is due by ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nIf you have any questions, please let us know.\n\nBest regards,\nOperant Labs Billing`,
        );
        setEmailModalOpen(true);
    };

    const handleFinalize = async () => {
        setActionLoading("finalize");
        setError(null);
        try {
            await api.post(`/invoices/${id}/finalize`, {
                subject: emailSubject,
                message: emailMessage,
            });
            await fetchInvoice();
            setEmailModalOpen(false);
        } catch (err: unknown) {
            const fallback = "Failed to finalize invoice";

            if (axios.isAxiosError(err)) {
                const responseError = err.response?.data?.error;
                const responseMessage = err.response?.data?.message;
                setError(
                    typeof responseError === "string"
                        ? responseError
                        : typeof responseMessage === "string"
                          ? responseMessage
                          : fallback,
                );
                return;
            }

            setError(fallback);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin h-8 w-8 text-[var(--foreground-variant)]" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-12">
                <FileText className="h-12 w-12 text-[var(--border-strong)] mx-auto mb-4" />
                <h2 className="text-xl font-medium">Invoice Not Found</h2>
                <p className="text-[var(--foreground-variant)] mt-2 mb-6">
                    The requested invoice does not exist or you don't have
                    access.
                </p>
                <Link href="/invoices" className="btn-solid">
                    Back to Invoices
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/invoices"
                        className="p-2 hover:bg-[var(--surface-dim)] rounded-md transition-colors text-[var(--foreground-variant)] hover:text-[var(--foreground)]"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="section-number">
                            Invoice {invoice.number}
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">
                                Details
                            </h1>
                            <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(invoice.status)}`}
                            >
                                {invoice.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons based on status */}
                <div className="flex flex-wrap gap-3">
                    {invoice.status === "DRAFT" && (
                        <>
                            <button
                                className="btn-solid"
                                onClick={openEmailModal}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === "finalize" ? (
                                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Finalize & Send
                            </button>
                        </>
                    )}

                    {invoice.status !== "CANCELLED" &&
                        invoice.status !== "PAID" && (
                            <button
                                className="btn-outline text-red-500 border-red-200 hover:bg-red-50 hover:border-red-500 dark:hover:bg-red-900/20"
                                onClick={() =>
                                    handleAction(
                                        "cancel",
                                        `/invoices/${id}/status`,
                                        "put",
                                        { status: "CANCELLED" },
                                    )
                                }
                                disabled={!!actionLoading}
                            >
                                {actionLoading === "cancel" ? (
                                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Cancel
                            </button>
                        )}
                    {(invoice.status === "PENDING" ||
                        invoice.status === "OVERDUE") && (
                        <button
                            className="btn-outline text-green-500 border-green-200 hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-900/20"
                            onClick={() =>
                                handleAction(
                                    "paid",
                                    `/invoices/${id}/status`,
                                    "put",
                                    { status: "PAID" },
                                )
                            }
                            disabled={!!actionLoading}
                        >
                            {actionLoading === "paid" ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Mark as Paid
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-600 border border-red-200 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Invoice Document */}
                <div className="lg:col-span-2 glass-card p-6 md:p-8 relative overflow-hidden">
                    {/* Watermark for cancelled */}
                    {invoice.status === "CANCELLED" && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-15deg]">
                            <span className="text-8xl font-black text-red-500 tracking-widest uppercase">
                                CANCELLED
                            </span>
                        </div>
                    )}
                    {/* Watermark for paid */}
                    {invoice.status === "PAID" && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-15deg]">
                            <span className="text-8xl font-black text-green-500 tracking-widest uppercase">
                                PAID
                            </span>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between gap-6 mb-12">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">INVOICE</h2>
                            <div className="text-[var(--foreground-variant)] text-sm space-y-1">
                                <p>
                                    No:{" "}
                                    <span className="text-[var(--foreground)] font-medium font-mono">
                                        {invoice.id.split("-")[0].toUpperCase()}
                                    </span>
                                </p>
                                <p>
                                    Issue Date:{" "}
                                    <span className="text-[var(--foreground)] font-medium">
                                        {new Date(
                                            invoice.issueDate,
                                        ).toLocaleDateString()}
                                    </span>
                                </p>
                                <p>
                                    Due Date:{" "}
                                    <span className="text-[var(--foreground)] font-medium">
                                        {new Date(
                                            invoice.dueDate,
                                        ).toLocaleDateString()}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-sm text-[var(--foreground-variant)] mb-1">
                                Billed To:
                            </div>
                            <div className="font-bold text-lg">
                                {invoice.client?.name}
                            </div>
                            {invoice.client?.address && (
                                <div className="text-[var(--foreground-variant)] text-sm whitespace-pre-wrap max-w-xs mt-1">
                                    {invoice.client.address}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto mb-8">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-[var(--border-strong)] text-sm text-[var(--foreground-variant)]">
                                    <th className="py-3 font-semibold">
                                        Description
                                    </th>
                                    <th className="py-3 font-semibold text-right w-24">
                                        Qty
                                    </th>
                                    <th className="py-3 font-semibold text-right w-32">
                                        Price
                                    </th>
                                    <th className="py-3 font-semibold text-right w-32">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {invoice.items?.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-4 text-[var(--foreground)]">
                                            {item.description}
                                        </td>
                                        <td className="py-4 text-right text-[var(--foreground-variant)]">
                                            {item.quantity}
                                        </td>
                                        <td className="py-4 text-right text-[var(--foreground-variant)]">
                                            {formatCurrency(
                                                item.rate,
                                                invoice.currency,
                                            )}
                                        </td>
                                        <td className="py-4 text-right font-medium text-[var(--foreground)]">
                                            {formatCurrency(
                                                (
                                                    parseFloat(item.quantity) *
                                                    parseFloat(item.rate)
                                                ).toString(),
                                                invoice.currency,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!invoice.items ||
                                    invoice.items.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 text-center text-[var(--foreground-variant)] italic"
                                        >
                                            No items found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full sm:w-1/2 md:w-1/3">
                            <div className="flex justify-between items-center py-4 border-t-2 border-[var(--border-strong)]">
                                <span className="font-bold text-lg">Total</span>
                                <span className="font-bold text-xl">
                                    {formatCurrency(
                                        invoice.total,
                                        invoice.currency,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <History className="h-5 w-5 text-[var(--color-electric-cyan)]" />
                            Activity Timeline
                        </h3>

                        <div className="relative border-l-2 border-[var(--border-subtle)] ml-3 pl-4 space-y-6 mt-2">
                            {/* Dummy Timeline Data for now - the context said it reads from /activity-logs but we'll mock it for UI completeness until hooked up */}
                            <div className="relative">
                                <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[var(--color-electric-cyan)]"></div>
                                <p className="text-sm font-medium">
                                    Invoice Created
                                </p>
                                <p className="text-xs text-[var(--foreground-variant)] mt-0.5">
                                    {new Date(
                                        invoice.createdAt,
                                    ).toLocaleString()}
                                </p>
                            </div>

                            {invoice.status !== "DRAFT" && (
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-blue-500"></div>
                                    <p className="text-sm font-medium">
                                        Finalized & Sent
                                    </p>
                                    <p className="text-xs text-[var(--foreground-variant)] mt-0.5">
                                        Status changed to PENDING
                                    </p>
                                </div>
                            )}

                            {invoice.status === "PAID" && (
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-green-500"></div>
                                    <p className="text-sm font-medium">
                                        Payment Recorded
                                    </p>
                                    <p className="text-xs text-[var(--foreground-variant)] mt-0.5">
                                        Invoice marked as PAID
                                    </p>
                                </div>
                            )}

                            {invoice.status === "CANCELLED" && (
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-red-500"></div>
                                    <p className="text-sm font-medium">
                                        Invoice Cancelled
                                    </p>
                                    <p className="text-xs text-[var(--foreground-variant)] mt-0.5">
                                        Status changed to CANCELLED
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {emailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col bg-[var(--surface-bright)]">
                        <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)]">
                            <h3 className="font-bold text-lg">Send Invoice</h3>
                            <button
                                onClick={() => setEmailModalOpen(false)}
                                className="text-[var(--foreground-variant)] hover:text-[var(--foreground)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) =>
                                        setEmailSubject(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-[var(--surface-dim)] border border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] text-sm transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                                    Message
                                </label>
                                <textarea
                                    rows={8}
                                    value={emailMessage}
                                    onChange={(e) =>
                                        setEmailMessage(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-[var(--surface-dim)] border border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] text-sm transition-colors"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 bg-[var(--surface)]">
                            <button
                                className="btn-outline"
                                onClick={() => setEmailModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-solid min-w-[120px]"
                                onClick={handleFinalize}
                                disabled={actionLoading === "finalize"}
                            >
                                {actionLoading === "finalize" ? (
                                    <Loader2 className="animate-spin h-4 w-4" />
                                ) : (
                                    "Send Invoice"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
