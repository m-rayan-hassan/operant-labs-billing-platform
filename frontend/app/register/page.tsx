"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { Loader2, Mail, Lock, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const registerSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["CEO", "HR"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: "HR",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setError(null);
        try {
            const response = await api.post("/auth/register", data);
            const { accessToken, user } = response.data;
            login(accessToken, user);
            router.push("/");
        } catch (err: unknown) {
            if (typeof err === "object" && err !== null && "response" in err) {
                const response = err.response as {
                    data?: { error?: string; message?: string };
                };

                setError(
                    response.data?.error ||
                        response.data?.message ||
                        "Failed to create account.",
                );
                return;
            }

            setError("Failed to create account.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-dim p-4">
            <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-(--color-electric-cyan) opacity-20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">
                            Create Account
                        </h1>
                        <p className="text-on-surface-variant">
                            Join Operant Labs Billing Platform
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-md bg-red-50 text-red-600 border border-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                className="block text-sm font-medium mb-2 text-(--foreground)"
                                htmlFor="email"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-on-surface-variant" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    className={`block w-full pl-10 pr-3 py-2 border ${
                                        errors.email
                                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                            : "border-border-strong focus:ring-(--foreground) focus:border-(--foreground)"
                                    } rounded-md bg-surface-bright text-(--foreground) placeholder-on-surface-variant focus:outline-none focus:ring-1 transition-colors`}
                                    placeholder="you@operantlabs.com"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium mb-2 text-(--foreground)"
                                htmlFor="role"
                            >
                                Account Role
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserCircle className="h-5 w-5 text-on-surface-variant" />
                                </div>
                                <select
                                    id="role"
                                    className="block w-full pl-10 pr-3 py-2 border border-border-strong focus:ring-(--foreground) focus:border-(--foreground) rounded-md bg-surface-bright text-(--foreground) focus:outline-none focus:ring-1 transition-colors appearance-none"
                                    {...register("role")}
                                >
                                    <option value="HR">HR</option>
                                    <option value="CEO">CEO</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium mb-2 text-(--foreground)"
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-on-surface-variant" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    className={`block w-full pl-10 pr-3 py-2 border ${
                                        errors.password
                                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                            : "border-border-strong focus:ring-(--foreground) focus:border-(--foreground)"
                                    } rounded-md bg-surface-bright text-(--foreground) placeholder-on-surface-variant focus:outline-none focus:ring-1 transition-colors`}
                                    placeholder="••••••••"
                                    {...register("password")}
                                />
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full btn-solid py-2.5 mt-2 flex justify-center"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                "Create Account"
                            )}
                        </button>

                        <div className="text-center mt-6 text-sm text-on-surface-variant">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="text-(--foreground) font-medium hover:underline"
                            >
                                Sign In
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
