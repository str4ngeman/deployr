import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuthStatus, login as apiLogin, logout as apiLogout, setupAuth } from "../lib/api";

interface AuthState {
  loading: boolean;
  enabled: boolean;
  needsSetup: boolean;
  username: string;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState("admin");
  const [authenticated, setAuthenticated] = useState(false);

  const refresh = async () => {
    try {
      const status = await getAuthStatus();
      setEnabled(status.enabled);
      setNeedsSetup(status.needsSetup);
      setUsername(status.username);
      if (!status.enabled) {
        setAuthenticated(true);
      } else {
        const res = await fetch("/api/settings", { credentials: "include" });
        setAuthenticated(res.ok);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (user: string, password: string) => {
    await apiLogin(user, password);
    setAuthenticated(true);
    await refresh();
  };

  const setup = async (user: string, password: string) => {
    await setupAuth(user, password);
    setAuthenticated(true);
    await refresh();
  };

  const logout = async () => {
    await apiLogout();
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ loading, enabled, needsSetup, username, authenticated, login, setup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
