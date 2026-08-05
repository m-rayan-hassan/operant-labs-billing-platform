"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";
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

  useEffect(() => {
    // On mount, if we have an access token, try to fetch the user profile
    // Note: The context says `GET /auth/me` is planned. If it's not implemented yet,
    // we could rely on checking if token exists and decodes, but let's assume we can fetch it,
    // or just rely on a simpler check. For now, if we have a token we'll assume logged in.
    // If we get a 401 later, the interceptor will handle refresh and redirect to login if it fails.
    
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const res = await api.get("/auth/me");
          setUser({
            id: res.data.id,
            email: res.data.email,
            role: res.data.role
          });
        } catch (e) {
          console.error("Failed to fetch user profile", e);
          localStorage.removeItem("access_token");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (accessToken: string, loggedInUser: User) => {
    localStorage.setItem("access_token", accessToken);
    setUser(loggedInUser);
    router.push("/"); // Redirect to dashboard
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed on server", error);
    } finally {
      localStorage.removeItem("access_token");
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
