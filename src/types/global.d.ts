import type { TelegramAuthPayload } from "./auth";

declare global {
  interface Window {
    handleTelegramAuth?: (payload: TelegramAuthPayload) => void;
    google?: {
      accounts?: {
        id?: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement | null, options: Record<string, unknown>) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export {};

