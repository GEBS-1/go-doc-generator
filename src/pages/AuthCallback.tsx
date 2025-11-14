import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

const TOKEN_STORAGE_KEY = "docugen_token";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    console.log("[AuthCallback] Обработка callback:", { 
      hasToken: !!token, 
      success, 
      error,
      tokenLength: token?.length,
    });

    if (error) {
      console.error("[AuthCallback] Ошибка авторизации:", error);
      navigate("/?error=" + encodeURIComponent(error));
      return;
    }

    if (success === "true" && token) {
      console.log("[AuthCallback] Токен получен, сохранение и загрузка профиля...");
      
      // Сохраняем токен в localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      console.log("[AuthCallback] Токен сохранен в localStorage");
      
      // Загружаем профиль пользователя для проверки
      apiFetch<{ user: AuthUser }>("/api/auth/me", {
        method: "GET",
        token: token,
      })
        .then((data) => {
          console.log("[AuthCallback] Профиль загружен:", {
            hasUser: !!data?.user,
            userId: data?.user?.id,
            userName: data?.user?.name,
          });
          
          // Перенаправляем на главную страницу
          // AuthContext автоматически подхватит токен из localStorage
          console.log("[AuthCallback] Перенаправление на главную страницу");
          navigate("/");
          
          // Небольшая задержка перед перезагрузкой, чтобы навигация успела
          setTimeout(() => {
            window.location.reload();
          }, 100);
        })
        .catch((error) => {
          console.error("[AuthCallback] Ошибка загрузки профиля:", error);
          // Удаляем невалидный токен
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          navigate("/?error=profile_load_failed");
        });
    } else {
      console.warn("[AuthCallback] Токен не найден в URL");
      navigate("/?error=no_token");
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Завершение авторизации...</p>
        <p className="text-sm text-muted-foreground">Пожалуйста, подождите</p>
      </div>
    </div>
  );
};

export default AuthCallback;

