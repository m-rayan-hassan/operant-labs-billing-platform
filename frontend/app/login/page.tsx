"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { Loader2, Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const response = await api.post("/auth/login", data);
      const { accessToken, user } = response.data;
      login(accessToken, user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to login. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-dim)] p-4">
      <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-electric-cyan)] opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Finance & Billing</h1>
            <p className="text-[var(--foreground-variant)]">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-md bg-red-50 text-red-600 border border-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[var(--foreground-variant)]" />
                </div>
                <input
                  id="email"
                  type="email"
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                  } rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="you@operantlabs.io"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--foreground-variant)]" />
                </div>
                <input
                  id="password"
                  type="password"
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.password ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                  } rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] placeholder-[var(--foreground-variant)] focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="••••••••"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
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
                "Sign In"
              )}
            </button>

            <div className="text-center mt-6 text-sm text-[var(--foreground-variant)]">
              Don't have an account?{" "}
              <Link href="/register" className="text-[var(--foreground)] font-medium hover:underline">
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
