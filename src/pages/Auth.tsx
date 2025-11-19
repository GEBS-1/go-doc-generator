import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { AuthResponse } from "@/types/auth";

const TOKEN_STORAGE_KEY = "docugen_token";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { applyAuthState } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");

    console.log("[Auth] ===== НАЧАЛО ОБРАБОТКИ АВТОРИЗАЦИИ =====");
    console.log("[Auth] URL:", window.location.href);
    console.log("[Auth] Search params:", Object.fromEntries(searchParams.entries()));
    console.log("[Auth] Обработка токена от бота:", {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? token.substring(0, 8) + '...' : null,
    });

    if (!token) {
      console.error("[Auth] ❌ Токен не найден в URL");
      setStatus("error");
      setErrorMessage("Токен не найден в ссылке");
      setTimeout(() => {
        navigate("/");
      }, 3000);
      return;
    }

    // Отправляем токен на backend для валидации
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const apiPath = "/api/auth/telegram-token";
    const fullUrl = backendUrl 
      ? `${backendUrl.replace(/\/$/, '')}${apiPath}`
      : apiPath; // В development использует proxy

    console.log("[Auth] Конфигурация запроса:", {
      backendUrl,
      apiPath,
      fullUrl,
      hasToken: !!token,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      isProduction: import.meta.env.PROD,
    });

    if (!backendUrl && import.meta.env.PROD) {
      console.error("[Auth] ❌ VITE_BACKEND_URL не установлен в production!");
      setStatus("error");
      setErrorMessage("Ошибка конфигурации: backend URL не установлен");
      setTimeout(() => {
        navigate("/");
      }, 3000);
      return;
    }

    console.log("[Auth] Отправка POST запроса на:", fullUrl);
    
    apiFetch<{ success: boolean; token: string; user: AuthResponse['user'] }>(apiPath, {
      method: "POST",
      body: { token },
    })
      .then((data) => {
        console.log("[Auth] ✅ Ответ от сервера получен:", {
          success: data?.success,
          hasToken: !!data?.token,
          hasUser: !!data?.user,
          userId: data?.user?.id,
          userName: data?.user?.name,
          fullData: data,
        });

        if (!data.token || !data.user) {
          console.error("[Auth] ❌ Неполный ответ от сервера:", data);
          setStatus("error");
          setErrorMessage("Неполный ответ от сервера");
          setTimeout(() => {
            navigate("/");
          }, 3000);
          return;
        }

        console.log("[Auth] Применение состояния авторизации...");
        
        // Применяем состояние авторизации (сохраняет токен и пользователя)
        try {
          applyAuthState({
            token: data.token,
            user: data.user,
          });
          console.log("[Auth] ✅ Состояние авторизации применено успешно");
        } catch (error) {
          console.error("[Auth] ❌ Ошибка при применении состояния:", error);
          setStatus("error");
          setErrorMessage("Ошибка при сохранении авторизации");
          setTimeout(() => {
            navigate("/");
          }, 3000);
          return;
        }

        setStatus("success");
        console.log("[Auth] ✅ Авторизация успешна, перенаправление через 1 секунду...");

        // Перенаправляем на главную страницу (без перезагрузки, чтобы сохранить состояние)
        setTimeout(() => {
          console.log("[Auth] Перенаправление на главную страницу...");
          navigate("/", { replace: true });
        }, 1000);
      })
      .catch((error) => {
        console.error("[Auth] ❌ Ошибка валидации токена:", error);
        console.error("[Auth] Детали ошибки:", {
          message: error?.message,
          status: error?.status,
          data: error?.data,
          stack: error?.stack,
        });
        setStatus("error");
        const errorMsg = error?.data?.error || error?.message || "Токен недействителен или истек";
        setErrorMessage(errorMsg);
        console.error("[Auth] Показываем ошибку пользователю:", errorMsg);
        setTimeout(() => {
          navigate("/");
        }, 5000); // Увеличиваем время для чтения ошибки
      });
  }, [searchParams, navigate, applyAuthState]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Авторизация...</p>
            <p className="text-sm text-muted-foreground">Проверка токена</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xl">✓</span>
            </div>
            <p className="text-lg font-medium text-green-600">Авторизация успешна!</p>
            <p className="text-sm text-muted-foreground">Перенаправление...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xl">✗</span>
            </div>
            <p className="text-lg font-medium text-red-600">Ошибка авторизации</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Перенаправление на главную страницу...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;

