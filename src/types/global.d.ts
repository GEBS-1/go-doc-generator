import type { TelegramAuthPayload } from "./auth";

declare global {
  interface Window {
    handleTelegramAuth?: (payload: TelegramAuthPayload) => void;
  }
}

export {};

