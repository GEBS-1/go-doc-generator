import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { AuthDialog } from "@/components/auth/AuthDialog";
import type { AuthUser, TelegramAuthPayload } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  promptLogin: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "docugen_token";

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const telegramBotName = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  const applyAuthState = useCallback((auth: AuthResponse) => {
    setToken(auth.token);
    setUser(auth.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
  }, []);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const fetchProfile = useCallback(
    async (currentToken: string) => {
      try {
        const data = await apiFetch<{ user: AuthUser }>("/api/auth/me", {
          method: "GET",
          token: currentToken,
        });

        if (data?.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth profile fetch error:", error);
        clearAuthState();
      } finally {
        setInitializing(false);
      }
    },
    [clearAuthState],
  );

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setInitializing(false);
    }
  }, [fetchProfile]);

  const handleAuthError = useCallback((error: unknown, fallbackMessage: string) => {
    if (error instanceof ApiError) {
      toast.error(error.message);
    } else if (error instanceof Error) {
      toast.error(error.message || fallbackMessage);
    } else {
      toast.error(fallbackMessage);
    }
  }, []);

  const authenticate = useCallback(
    async (path: string, payload: unknown) => {
      setLoading(true);
      try {
        const auth = await apiFetch<AuthResponse>(path, {
          method: "POST",
          body: payload,
        });
        applyAuthState(auth);
        setAuthDialogOpen(false);
        toast.success("Авторизация прошла успешно");
      } catch (error) {
        handleAuthError(error, "Не удалось выполнить авторизацию");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [applyAuthState, handleAuthError],
  );

  const handleTelegramAuth = useCallback(
    async (payload: TelegramAuthPayload) => {
      if (!payload?.hash) {
        toast.error("Некорректный ответ от Telegram");
        return;
      }

      await authenticate("/api/auth/telegram", payload);
    },
    [authenticate],
  );

  const logout = useCallback(() => {
    clearAuthState();
    toast.success("Вы вышли из аккаунта");
  }, [clearAuthState]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      return;
    }
    await fetchProfile(token);
  }, [fetchProfile, token]);

  const effectiveLoading = loading || initializing;

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading: effectiveLoading,
      isAuthenticated: Boolean(user),
      openAuthDialog: () => setAuthDialogOpen(true),
      closeAuthDialog: () => setAuthDialogOpen(false),
      logout,
      refreshProfile,
      promptLogin: () => setAuthDialogOpen(true),
    }),
    [user, token, effectiveLoading, logout, refreshProfile],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        loading={effectiveLoading}
        telegramBotName={telegramBotName}
        onTelegramAuth={handleTelegramAuth}
      />
    </AuthContext.Provider>
  );
};

