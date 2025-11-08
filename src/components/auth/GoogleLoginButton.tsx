import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

interface GoogleLoginButtonProps {
  clientId: string;
  onCredential: (credential: string) => Promise<void>;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export const GoogleLoginButton = ({
  clientId,
  onCredential,
  containerRef,
  disabled,
}: GoogleLoginButtonProps) => {
  useEffect(() => {
    if (!clientId || !containerRef.current || disabled) {
      return;
    }

    const initialize = () => {
      if (!window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          if (!response.credential) {
            return;
          }
          try {
            await onCredential(response.credential);
          } catch (error) {
            console.error("Google auth failed", error);
          }
        },
        ux_mode: "popup",
        auto_select: false,
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
        locale: "ru",
      });
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => initialize();
    script.addEventListener("load", handleLoad);

    return () => {
      script?.removeEventListener("load", handleLoad);
    };
  }, [clientId, onCredential, containerRef, disabled]);

  if (!clientId) {
    return (
      <Button type="button" variant="outline" disabled className="w-full justify-center gap-2 text-muted-foreground">
        <Chrome className="h-4 w-4" />
        Google не настроен
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="flex justify-center" />
      <p className="text-center text-xs text-muted-foreground">Войдите через Google, чтобы синхронизировать работу на любых устройствах.</p>
    </div>
  );
};

