import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getAuthStatus,
  getAuthSession,
  login as apiLogin,
  logout as apiLogout,
  setupAuth,
} from "../lib/api";

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
        return;
      }

      try {
        const session = await getAuthSession();
        setAuthenticated(session.authenticated);
        if (session.authenticated) {
          setUsername(session.username);
        }
      } catch {
        setAuthenticated(false);
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
    const session = await getAuthSession();
    if (!session.authenticated) {
      throw new Error(
        "Login succeeded but the session cookie was not saved. Clear cookies for this site and try again.",
      );
    }
    setAuthenticated(true);
    setUsername(session.username);
  };

  const setup = async (user: string, password: string) => {
    await setupAuth(user, password);
    const session = await getAuthSession();
    if (!session.authenticated) {
      throw new Error("Account created but session could not be established. Try signing in.");
    }
    setEnabled(true);
    setNeedsSetup(false);
    setAuthenticated(true);
    setUsername(session.username);
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
