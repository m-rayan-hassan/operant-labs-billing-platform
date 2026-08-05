"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../../../lib/api";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Building,
    Globe,
    MapPin,
    Briefcase,
} from "lucide-react";

const clientSchema = z.object({
    name: z.string().min(2, "Company name is required"),
    email: z
        .string()
        .min(1, "Email address is required")
        .email("Valid email is required"),
    country: z.string().optional(),
    address: z.string().optional(),
    industry: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClientPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
    });

    const onSubmit = async (data: ClientFormValues) => {
        setError(null);
        try {
            await api.post("/clients", data);
            router.push("/clients");
            router.refresh();
        } catch (err: any) {
            const apiError =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to create client";
            setError(apiError);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/clients"
                    className="p-2 hover:bg-[var(--surface-dim)] rounded-md transition-colors text-[var(--foreground-variant)] hover:text-[var(--foreground)]"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <div className="section-number">New Client</div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Add Client
                    </h1>
                </div>
            </div>

            <div className="glass-card p-6 md:p-8">
                {error && (
                    <div className="mb-6 p-4 rounded-md bg-red-50 text-red-600 border border-red-200 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Name */}
                        <div className="col-span-1 md:col-span-2">
                            <label
                                className="block text-sm font-medium mb-2 text-[var(--foreground)]"
                                htmlFor="name"
                            >
                                Company Name *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building className="h-4 w-4 text-[var(--foreground-variant)]" />
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                                        errors.name
                                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                            : "border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                                    } rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors`}
                                    placeholder="Acme Corp"
                                    {...register("name")}
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="col-span-1 md:col-span-2">
                            <label
                                className="block text-sm font-medium mb-2 text-[var(--foreground)]"
                                htmlFor="email"
                            >
                                Email Address *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg
                                        className="h-4 w-4 text-[var(--foreground-variant)]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect
                                            width="20"
                                            height="16"
                                            x="2"
                                            y="4"
                                            rx="2"
                                        />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                                        errors.email
                                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                            : "border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                                    } rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors`}
                                    placeholder="billing@acme.com"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Country */}
                        <div className="col-span-1">
                            <label
                                className="block text-sm font-medium mb-2 text-[var(--foreground)]"
                                htmlFor="country"
                            >
                                Country
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Globe className="h-4 w-4 text-[var(--foreground-variant)]" />
                                </div>
                                <input
                                    id="country"
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors"
                                    placeholder="United States"
                                    {...register("country")}
                                />
                            </div>
                        </div>

                        {/* Industry */}
                        <div className="col-span-1">
                            <label
                                className="block text-sm font-medium mb-2 text-[var(--foreground)]"
                                htmlFor="industry"
                            >
                                Industry
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase className="h-4 w-4 text-[var(--foreground-variant)]" />
                                </div>
                                <input
                                    id="industry"
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors"
                                    placeholder="Technology"
                                    {...register("industry")}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="col-span-1 md:col-span-2">
                            <label
                                className="block text-sm font-medium mb-2 text-[var(--foreground)]"
                                htmlFor="address"
                            >
                                Address
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <MapPin className="h-4 w-4 text-[var(--foreground-variant)]" />
                                </div>
                                <textarea
                                    id="address"
                                    rows={3}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors"
                                    placeholder="123 Business Rd, City, State 12345"
                                    {...register("address")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                        <Link href="/clients" className="btn-outline">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-solid min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                                "Save Client"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
