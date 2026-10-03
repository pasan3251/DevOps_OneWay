import { demoAccounts, DEMO_PASSWORD, isRole, type Role } from "./accounts";

export type Session = { role: Role; name: string; expiresAt: number };
export type SignInInput = {
  identifier: string;
  password: string;
  remember: boolean;
};
export interface AuthService {
  signIn(input: SignInInput): Promise<Session>;
  getSession(): Session | null;
  signOut(): void;
}

const SESSION_KEY = "waypoint.demo.session.v1";

/** Frontend-only adapter. Replace with server authentication before deployment. */
class DemoAuthService implements AuthService {
  async signIn({
    identifier,
    password,
    remember,
  }: SignInInput): Promise<Session> {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const normalized = identifier.trim().toLowerCase();
    const account = demoAccounts.find(
      (entry) =>
        entry.email === normalized ||
        entry.employeeId.toLowerCase() === normalized,
    );
    if (!account || password !== DEMO_PASSWORD) {
      throw new Error(
        "These details don’t match a demo account. Check your details or choose a demo role below.",
      );
    }
    const session: Session = {
      role: account.role,
      name: account.name,
      expiresAt: Date.now() + (remember ? 7 * 24 : 12) * 60 * 60 * 1000,
    };
    try {
      this.signOut();
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      throw new Error(
        "Your browser couldn’t save this session. Allow site storage, then try again.",
      );
    }
    return session;
  }

  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    try {
      for (const storage of [window.sessionStorage, window.localStorage]) {
        const raw = storage.getItem(SESSION_KEY);
        if (!raw) continue;
        const value: unknown = JSON.parse(raw);
        if (
          typeof value === "object" &&
          value !== null &&
          "role" in value &&
          isRole(value.role) &&
          "name" in value &&
          typeof value.name === "string" &&
          "expiresAt" in value &&
          typeof value.expiresAt === "number" &&
          value.expiresAt > Date.now()
        ) {
          return value as Session;
        }
        storage.removeItem(SESSION_KEY);
      }
    } catch {
      return null;
    }
    return null;
  }

  signOut(): void {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export const authService: AuthService = new DemoAuthService();
