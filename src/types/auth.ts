export type AuthProviderType = "telegram" | "google";

export interface SubscriptionInfo {
  planId: string;
  planName: string;
  status: "active" | "canceled";
  activatedAt: string;
  expiresAt: string | null;
  documentsLimit: number | null;
  type: "free" | "subscription" | "one-time";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  provider: AuthProviderType;
  username: string | null;
  telegram: {
    id: number;
    username: string | null;
  } | null;
  subscription: SubscriptionInfo | null;
}

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

