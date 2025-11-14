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

    console.log("[Auth] Обработка токена от бота:", {
      hasToken: !!token,
      tokenLength: token?.length,
    });

    if (!token) {
      console.warn("[Auth] Токен не найден в URL");
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

    console.log("[Auth] Отправка запроса на валидацию токена:", {
      backendUrl,
      apiPath,
      fullUrl,
      hasToken: !!token,
    });

    apiFetch<AuthResponse>(apiPath, {
      method: "POST",
      body: { token },
    })
      .then((data) => {
        console.log("[Auth] Токен валидирован, авторизация успешна:", {
          hasToken: !!data?.token,
          hasUser: !!data?.user,
          userId: data?.user?.id,
        });

        // Сохраняем токен в localStorage (для совместимости)
        if (data.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }

        // Применяем состояние авторизации
        if (data.token && data.user) {
          applyAuthState({
            token: data.token,
            user: data.user,
          });
        }

        setStatus("success");

        // Перенаправляем на главную страницу
        setTimeout(() => {
          navigate("/");
          // Перезагружаем страницу чтобы AuthContext подхватил изменения
          window.location.reload();
        }, 1000);
      })
      .catch((error) => {
        console.error("[Auth] Ошибка валидации токена:", error);
        setStatus("error");
        setErrorMessage(
          error?.data?.error || error?.message || "Токен недействителен или истек"
        );
        setTimeout(() => {
          navigate("/");
        }, 3000);
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

