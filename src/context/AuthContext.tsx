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
  applyAuthState: (auth: AuthResponse) => void;
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
    console.log('[AuthContext] Сохранение токена и пользователя:', {
      hasToken: !!auth.token,
      hasUser: !!auth.user,
      userId: auth.user?.id,
      userName: auth.user?.name,
    });
    
    // Устанавливаем состояние синхронно
    setToken(auth.token);
    setUser(auth.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
    
    console.log('[AuthContext] Токен сохранен в localStorage и состояние обновлено:', {
      tokenSet: !!auth.token,
      userSet: !!auth.user,
      userId: auth.user?.id,
    });
    
    // Убеждаемся, что initializing сброшен
    setInitializing(false);
  }, []);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const fetchProfile = useCallback(
    async (currentToken: string) => {
      console.log('[AuthContext] Запрос профиля пользователя...');
      try {
        const data = await apiFetch<{ user: AuthUser }>("/api/auth/me", {
          method: "GET",
          token: currentToken,
        });

        console.log('[AuthContext] Профиль получен:', {
          hasUser: !!data?.user,
          userId: data?.user?.id,
          userName: data?.user?.name,
        });

        if (data?.user) {
          setUser(data.user);
          console.log('[AuthContext] Пользователь установлен в состояние');
        } else {
          console.warn('[AuthContext] Профиль не содержит пользователя');
          clearAuthState();
        }
      } catch (error) {
        console.error("[AuthContext] Ошибка загрузки профиля:", error);
        if (error instanceof ApiError) {
          console.error("[AuthContext] API Error:", {
            status: error.status,
            message: error.message,
          });
        }
        clearAuthState();
      } finally {
        setInitializing(false);
        console.log('[AuthContext] Инициализация завершена');
      }
    },
    [clearAuthState],
  );

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    console.log('[AuthContext] Инициализация - проверка токена:', {
      hasSavedToken: !!savedToken,
      tokenLength: savedToken?.length,
    });
    if (savedToken) {
      setToken(savedToken);
      console.log('[AuthContext] Загрузка профиля с сохраненным токеном...');
      fetchProfile(savedToken);
    } else {
      console.log('[AuthContext] Токен не найден в localStorage');
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
      console.log('[AuthContext] Начало авторизации:', { path, hasPayload: !!payload });
      setLoading(true);
      try {
        const auth = await apiFetch<AuthResponse>(path, {
          method: "POST",
          body: payload as BodyInit,
        });
        console.log('[AuthContext] Авторизация успешна:', {
          hasToken: !!auth.token,
          hasUser: !!auth.user,
        });
        applyAuthState(auth);
        setAuthDialogOpen(false);
        toast.success("Авторизация прошла успешно");
      } catch (error) {
        console.error('[AuthContext] Ошибка авторизации:', error);
        if (error instanceof ApiError) {
          console.error('[AuthContext] API Error details:', {
            status: error.status,
            message: error.message,
            data: error.data,
          });
        }
        handleAuthError(error, "Не удалось выполнить авторизацию");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [applyAuthState, handleAuthError],
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
      applyAuthState,
    }),
    [user, token, effectiveLoading, logout, refreshProfile, applyAuthState],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        loading={effectiveLoading}
        telegramBotName={telegramBotName}
      />
    </AuthContext.Provider>
  );
};
