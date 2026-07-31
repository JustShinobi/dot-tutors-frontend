"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@/lib/api/client";
import { getProfile, login as loginRequest } from "@/lib/api/admin";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin authentication.
 *
 * The token lives in `sessionStorage`, not in a cookie: this app also serves the embed widget,
 * and keeping every credential out of cookies means no request ever carries ambient authority
 * across origins. The trade-off is that a closed tab ends the session, which is acceptable for
 * an internal panel.
 */

const STORAGE_KEY = "dot-tutors.admin-token";

interface AuthState {
  token: string | null;
  profile: AdminProfile | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface Session {
  token: string | null;
  profile: AdminProfile | null;
  status: AuthState["status"];
}

const ANONYMOUS: Session = { token: null, profile: null, status: "anonymous" };

/**
 * Restore a stored token and confirm it is still valid.
 *
 * Always asynchronous, including the "no token" path, so the caller can apply the result in a
 * promise callback and never call setState synchronously inside an effect.
 */
async function restoreSession(): Promise<Session> {
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return ANONYMOUS;

  try {
    // An expired or revoked token in storage must not leave the UI pretending to be logged in.
    const profile = await getProfile(stored);
    return { token: stored, profile, status: "authenticated" };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return ANONYMOUS;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session>({
    token: null,
    profile: null,
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    restoreSession().then((restored) => {
      if (!cancelled) setSession(restored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginRequest(email, password);
    const profile = await getProfile(access_token);

    window.sessionStorage.setItem(STORAGE_KEY, access_token);
    setSession({ token: access_token, profile, status: "authenticated" });
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setSession(ANONYMOUS);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthState>(() => ({ ...session, login, logout }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return context;
}

/**
 * Token for an authenticated screen, plus a handler that logs out on a 401.
 *
 * Any admin request can fail with 401 if the token expired mid-session; funnelling that through
 * one helper keeps every screen from re-implementing the same recovery.
 */
export function useAuthenticatedRequest() {
  const { token, logout } = useAuth();

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.isUnauthenticated) {
        logout();
        return true;
      }
      return false;
    },
    [logout],
  );

  return { token, handleError };
}
