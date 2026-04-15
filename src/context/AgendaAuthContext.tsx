"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { awsConfig } from "@/lib/aws-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

interface AgendaAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AgendaAuthContext = createContext<AgendaAuthContextValue | null>(null);

const SESSION_KEY = "agenda_tokens";
const USERNAME_KEY = "agenda_username";
const COOKIE_NAME = "agenda_auth";

// ─── Cookie helpers (client-side only) ────────────────────────────────────────

function setAuthCookie(value: string) {
  // Secure cookie readable by Next.js middleware
  document.cookie = `${COOKIE_NAME}=${value}; path=/; SameSite=Strict; max-age=3600`;
}

function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgendaAuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const user = sessionStorage.getItem(USERNAME_KEY);
      if (stored) {
        const parsed: AuthTokens = JSON.parse(stored);
        setTokens(parsed);
        setUsername(user);
        setAuthCookie(parsed.idToken);
      }
    } catch {
      // Corrupted storage — start fresh
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (usernameVal: string, password: string) => {
    const client = new CognitoIdentityProviderClient({
      region: awsConfig.region,
    });

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: awsConfig.cognito.clientId,
      AuthParameters: {
        USERNAME: usernameVal,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    const result = response.AuthenticationResult;

    if (!result?.IdToken || !result.AccessToken || !result.RefreshToken) {
      throw new Error("Respuesta de autenticación incompleta.");
    }

    const newTokens: AuthTokens = {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
    };

    // Persist
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newTokens));
    sessionStorage.setItem(USERNAME_KEY, usernameVal);
    setAuthCookie(newTokens.idToken);

    setTokens(newTokens);
    setUsername(usernameVal);
  }, []);

  const logout = useCallback(async () => {
    if (tokens?.accessToken) {
      try {
        const client = new CognitoIdentityProviderClient({
          region: awsConfig.region,
        });
        await client.send(
          new GlobalSignOutCommand({ AccessToken: tokens.accessToken })
        );
      } catch {
        // Best-effort sign-out
      }
    }

    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    clearAuthCookie();
    setTokens(null);
    setUsername(null);
  }, [tokens]);

  const value = useMemo<AgendaAuthContextValue>(
    () => ({
      isAuthenticated: !!tokens,
      isLoading,
      tokens,
      username,
      login,
      logout,
    }),
    [tokens, isLoading, username, login, logout]
  );

  return (
    <AgendaAuthContext.Provider value={value}>
      {children}
    </AgendaAuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgendaAuth(): AgendaAuthContextValue {
  const ctx = useContext(AgendaAuthContext);
  if (!ctx) {
    throw new Error("useAgendaAuth must be used inside AgendaAuthProvider");
  }
  return ctx;
}
