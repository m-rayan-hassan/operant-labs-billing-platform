"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Link from "next/link";
import {
    Plus,
    Search,
    Building,
    MoreVertical,
    Loader2,
    Globe,
    Briefcase,
} from "lucide-react";

interface Client {
    id: string;
    name: string;
    country?: string;
    address?: string;
    industry?: string;
    createdAt: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await api.get("/clients");
                // Backend returns { data: [], pagination: {} }
                const clientsData = response.data.data ?? response.data;
                setClients(Array.isArray(clientsData) ? clientsData : []);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this client?")) {
            try {
                await api.delete(`/clients/${id}`);
                setClients(clients.filter((c) => c.id !== id));
            } catch (error: any) {
                alert(error.response?.data?.error || "Failed to delete client");
            }
        }
    };

    const filteredClients = clients.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.country ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (c.industry ?? "").toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <div className="section-number">Directory</div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Clients
                    </h1>
                </div>
                <Link
                    href="/clients/new"
                    className="btn-solid whitespace-nowrap"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                </Link>
            </div>

            <div className="glass-card flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[var(--surface-bright)] rounded-t-xl">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-variant)]" />
                        <input
                            type="text"
                            placeholder="Search clients..."
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
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                            <Building className="h-10 w-10 text-[var(--border-strong)] mb-3" />
                            <p className="text-[var(--foreground)] font-medium">
                                No clients found
                            </p>
                            <p className="text-sm text-[var(--foreground-variant)] mt-1">
                                Get started by adding a new client.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider text-[var(--foreground-variant)] bg-[var(--surface-dim)]/50">
                                    <th className="px-6 py-4 font-medium">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 font-medium hidden sm:table-cell">
                                        Country
                                    </th>
                                    <th className="px-6 py-4 font-medium hidden lg:table-cell">
                                        Industry
                                    </th>
                                    <th className="px-6 py-4 font-medium hidden xl:table-cell">
                                        Added
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-[var(--surface-dim)]/30 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-[var(--foreground)]">
                                                {client.name}
                                            </div>
                                            {client.address && (
                                                <div className="text-xs text-[var(--foreground-variant)] sm:hidden mt-1 truncate max-w-[200px]">
                                                    {client.address}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell text-sm text-[var(--foreground-variant)]">
                                            <div className="flex items-center gap-1.5">
                                                {client.country ? (
                                                    <>
                                                        <Globe className="h-3.5 w-3.5 shrink-0" />
                                                        {client.country}
                                                    </>
                                                ) : (
                                                    "—"
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell text-sm text-[var(--foreground-variant)]">
                                            <div className="flex items-center gap-1.5">
                                                {client.industry ? (
                                                    <>
                                                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                                        {client.industry}
                                                    </>
                                                ) : (
                                                    "—"
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden xl:table-cell text-sm text-[var(--foreground-variant)]">
                                            {new Date(
                                                client.createdAt,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() =>
                                                        setOpenMenuId(
                                                            openMenuId ===
                                                                client.id
                                                                ? null
                                                                : client.id,
                                                        )
                                                    }
                                                    className="p-2 rounded-md hover:bg-[var(--surface-dim)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title="Actions"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>

                                                {openMenuId === client.id && (
                                                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[var(--surface)] border border-[var(--border-subtle)] rounded-md shadow-md z-10">
                                                        <button
                                                            onClick={() => {
                                                                setOpenMenuId(
                                                                    null,
                                                                );
                                                                handleDelete(
                                                                    client.id,
                                                                );
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                            Delete client
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
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
