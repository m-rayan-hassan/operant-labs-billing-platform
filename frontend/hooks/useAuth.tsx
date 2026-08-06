"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { api, setAccessToken, refreshAccessToken, clearAccessToken } from "../lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Prevents React Strict Mode's double-mount from firing two simultaneous
  // refresh requests. Two concurrent calls with the same cookie would trigger
  // token reuse detection on the backend, revoking the entire token family.
  const didRefresh = useRef(false);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;

    // On mount: the access token is memory-only and is lost on reload, but the
    // httpOnly refresh cookie survives. Exchange it for a fresh access token.
    const refreshAndFetchUser = async () => {
      try {
        await refreshAccessToken();

        const res = await api.get("/auth/me");
        setUser({
          id: res.data.id,
          email: res.data.email,
          role: res.data.role,
        });
      } catch {
        // No valid refresh cookie (fresh visit, logged out, or expired) —
        // expected. Just leave the user logged out.
      }
      setLoading(false);
    };

    refreshAndFetchUser();
  }, []);

  const login = (accessToken: string, loggedInUser: User) => {
    setAccessToken(accessToken);
    setUser(loggedInUser);
    router.push("/"); // Redirect to dashboard
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed on server", error);
    } finally {
      clearAccessToken();
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
