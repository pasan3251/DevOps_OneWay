import { apiRequest, clearApiTokens, hasApiTokens, publicApiRequest, storeApiTokens, type ApiTokens } from "@/lib/api-client";
import { demoAccounts, isRole, type Role } from "./accounts";

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "dispatcher" | "loader" | "driver" | "store_manager";
  phone?: string | null;
  depotId?: string | null;
  outletId?: string | null;
  depot?: { id: string; name: string; code: string } | null;
  outlet?: { id: string; name: string; code: string } | null;
  driverProfile?: { id: string; licenseNumber: string } | null;
}

export type Session = {
  userId: string;
  role: Role;
  name: string;
  email: string;
  phone?: string | null;
  location: string;
  depotId?: string | null;
  outletId?: string | null;
  expiresAt: number;
};

export type SignInInput = { identifier: string; password: string; remember: boolean };
export interface AuthService {
  signIn(input: SignInInput): Promise<Session>;
  getSession(): Session | null;
  refreshProfile(): Promise<Session>;
  signOut(): void;
}

const SESSION_KEY = "waypoint.session.v1";

function frontendRole(role: Profile["role"]): Role {
  if (role === "store_manager") return "store-manager";
  if (role === "admin") return "dispatcher";
  return role;
}

function sessionExpiry(accessToken: string) {
  try {
    const encoded = accessToken.split(".")[1];
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Date.now() + 12 * 60 * 60 * 1000;
  } catch {
    return Date.now() + 12 * 60 * 60 * 1000;
  }
}

function toSession(profile: Profile, accessToken: string): Session {
  return {
    userId: profile.id,
    role: frontendRole(profile.role),
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    phone: profile.phone,
    location: profile.outlet?.name ?? profile.depot?.name ?? "Waypoint operations",
    depotId: profile.depotId,
    outletId: profile.outletId,
    expiresAt: sessionExpiry(accessToken),
  };
}

function storedSession(): { session: Session; storage: Storage } | null {
  if (typeof window === "undefined") return null;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) continue;
    try {
      const value: unknown = JSON.parse(raw);
      if (
        typeof value === "object" && value !== null &&
        "role" in value && isRole(value.role) &&
        "expiresAt" in value && typeof value.expiresAt === "number"
      ) {
        return { session: value as Session, storage };
      }
    } catch {
      storage.removeItem(SESSION_KEY);
    }
  }
  return null;
}

class ApiAuthService implements AuthService {
  async signIn({ identifier, password, remember }: SignInInput) {
    const normalized = identifier.trim().toLowerCase();
    const account = demoAccounts.find((candidate) => candidate.employeeId.toLowerCase() === normalized);
    const email = account?.email ?? normalized;
    const tokens = await publicApiRequest<ApiTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    storeApiTokens(tokens, remember);
    try {
      const profile = await apiRequest<Profile>("/auth/me");
      const session = toSession(profile, tokens.accessToken);
      (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch (error) {
      this.signOut();
      throw error;
    }
  }

  getSession() {
    const entry = storedSession();
    if (!entry || !hasApiTokens()) return null;
    if (entry.session.expiresAt <= Date.now()) {
      this.signOut();
      return null;
    }
    return entry.session;
  }

  async refreshProfile() {
    const entry = storedSession();
    if (!entry || !hasApiTokens()) throw new Error("Your session has expired. Sign in again.");
    const profile = await apiRequest<Profile>("/auth/me");
    const session = { ...toSession(profile, ""), expiresAt: entry.session.expiresAt };
    entry.storage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  signOut() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    clearApiTokens();
  }
}

export const authService: AuthService = new ApiAuthService();
