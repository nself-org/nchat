import { authConfig } from "@/config/auth.config";

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export class FauxAuthService {
  private currentUser: any = null;
  private isAuthenticated = false;

  constructor() {
    // Auto-login in dev mode if configured
    if (authConfig.devAuth.autoLogin && typeof window !== "undefined") {
      this.currentUser = authConfig.devAuth.defaultUser;
      this.isAuthenticated = true;
      this.persistSession();
    } else if (typeof window !== "undefined") {
      this.loadSession();
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    // In dev mode, accept any credentials or use predefined users
    const normalizedEmail = email.toLowerCase().trim();

    // Find user from predefined list
    const predefinedUser = authConfig.devAuth.availableUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail,
    );

    const user = predefinedUser
      ? {
          ...predefinedUser,
          createdAt: new Date().toISOString(),
        }
      : {
          id: `dev-user-${Date.now()}`,
          email: normalizedEmail,
          username: normalizedEmail.split("@")[0],
          displayName: normalizedEmail.split("@")[0],
          role: "member" as const,
          avatarUrl: null,
          createdAt: new Date().toISOString(),
        };

    this.currentUser = user;
    this.isAuthenticated = true;
    this.persistSession();

    return {
      user,
      accessToken: `dev-token-${Date.now()}`,
      refreshToken: `dev-refresh-${Date.now()}`,
    };
  }

  async signUp(
    email: string,
    password: string,
    username: string,
  ): Promise<AuthResponse> {
    const user = {
      id: `dev-user-${Date.now()}`,
      email,
      username,
      displayName: username,
      role: "member" as const,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };

    this.currentUser = user;
    this.isAuthenticated = true;
    this.persistSession();

    return {
      user,
      accessToken: `dev-token-${Date.now()}`,
      refreshToken: `dev-refresh-${Date.now()}`,
    };
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.clearSession();
  }

  async refreshToken(): Promise<AuthResponse | null> {
    if (!this.isAuthenticated) return null;

    return {
      user: this.currentUser,
      accessToken: `dev-token-${Date.now()}`,
      refreshToken: `dev-refresh-${Date.now()}`,
    };
  }

  async getCurrentUser(): Promise<any | null> {
    return this.currentUser;
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  async updateProfile(data: Partial<any>): Promise<AuthResponse> {
    if (!this.currentUser) {
      throw new Error("Not authenticated");
    }

    // Update current user with new data
    this.currentUser = {
      ...this.currentUser,
      ...data,
    };

    this.persistSession();

    return {
      user: this.currentUser,
      accessToken: `dev-token-${Date.now()}`,
      refreshToken: `dev-refresh-${Date.now()}`,
    };
  }

  // Quick user switching for dev mode
  async switchUser(userId: string): Promise<AuthResponse | null> {
    const user = authConfig.devAuth.availableUsers.find((u) => u.id === userId);
    if (!user) return null;

    this.currentUser = { ...user, createdAt: new Date().toISOString() };
    this.isAuthenticated = true;
    this.persistSession();

    return {
      user: this.currentUser,
      accessToken: `dev-token-${Date.now()}`,
      refreshToken: `dev-refresh-${Date.now()}`,
    };
  }

  private persistSession(): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      "nchat-dev-session",
      JSON.stringify({
        user: this.currentUser,
        isAuthenticated: this.isAuthenticated,
        timestamp: Date.now(),
      }),
    );
  }

  private loadSession(): void {
    if (typeof window === "undefined") return;

    const session = localStorage.getItem("nchat-dev-session");
    if (session) {
      try {
        const data = JSON.parse(session);
        // Check if session is less than 30 days old
        if (Date.now() - data.timestamp < authConfig.session.maxAge * 1000) {
          this.currentUser = data.user;
          this.isAuthenticated = data.isAuthenticated;
        } else {
          this.clearSession();
        }
      } catch {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-dev-session");
  }
}
