import {
  render,
  screen,
  waitFor,
  act,
  renderHook,
} from "@testing-library/react";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "../auth-context";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the auth config
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    useDevAuth: true,
    devAuth: {
      autoLogin: false,
      defaultUser: null,
      availableUsers: [
        {
          id: "test-user-1",
          email: "owner@nself.org",
          username: "owner",
          displayName: "System Owner",
          role: "owner",
          avatarUrl: null,
        },
        {
          id: "test-user-2",
          email: "member@nself.org",
          username: "member",
          displayName: "Member User",
          role: "member",
          avatarUrl: null,
        },
        {
          id: "test-user-3",
          email: "admin@nself.org",
          username: "admin",
          displayName: "Admin User",
          role: "admin",
          avatarUrl: null,
        },
      ],
    },
    session: {
      maxAge: 30 * 24 * 60 * 60,
    },
  },
  // Required exports from auth-context.tsx import
  isTwoFactorRequired: jest.fn().mockReturnValue(false),
  verifySecurityConfiguration: jest.fn(),
}));

// Mock current user state - starts as null, reset in beforeEach
let mockCurrentUser: any = null;

// Mock the FauxAuthService to have full control over auth state
jest.mock("@/services/auth/faux-auth.service", () => {
  const availableUsers = [
    {
      id: "test-user-1",
      email: "owner@nself.org",
      username: "owner",
      displayName: "System Owner",
      role: "owner",
      avatarUrl: null,
    },
    {
      id: "test-user-2",
      email: "member@nself.org",
      username: "member",
      displayName: "Member User",
      role: "member",
      avatarUrl: null,
    },
    {
      id: "test-user-3",
      email: "admin@nself.org",
      username: "admin",
      displayName: "Admin User",
      role: "admin",
      avatarUrl: null,
    },
  ];

  return {
    FauxAuthService: jest.fn().mockImplementation(() => ({
      signIn: jest.fn().mockImplementation(async (email: string) => {
        const normalizedEmail = email.toLowerCase().trim();
        const predefinedUser = availableUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail,
        );
        const user = predefinedUser
          ? { ...predefinedUser, createdAt: new Date().toISOString() }
          : {
              id: `dev-user-${Date.now()}`,
              email: normalizedEmail,
              username: normalizedEmail.split("@")[0],
              displayName: normalizedEmail.split("@")[0],
              role: "member",
              avatarUrl: null,
              createdAt: new Date().toISOString(),
            };
        mockCurrentUser = user;
        return {
          user,
          accessToken: `dev-token-${Date.now()}`,
          refreshToken: `dev-refresh-${Date.now()}`,
        };
      }),
      signUp: jest
        .fn()
        .mockImplementation(
          async (email: string, _password: string, username: string) => {
            const user = {
              id: `dev-user-${Date.now()}`,
              email,
              username,
              displayName: username,
              role: "member",
              avatarUrl: null,
              createdAt: new Date().toISOString(),
            };
            mockCurrentUser = user;
            return {
              user,
              accessToken: `dev-token-${Date.now()}`,
              refreshToken: `dev-refresh-${Date.now()}`,
            };
          },
        ),
      signOut: jest.fn().mockImplementation(async () => {
        mockCurrentUser = null;
      }),
      getCurrentUser: jest.fn().mockImplementation(async () => {
        return mockCurrentUser;
      }),
      isUserAuthenticated: jest.fn().mockImplementation(() => {
        return mockCurrentUser !== null;
      }),
      switchUser: jest.fn().mockImplementation(async (userId: string) => {
        const user = availableUsers.find((u) => u.id === userId);
        if (!user) return null;
        mockCurrentUser = { ...user, createdAt: new Date().toISOString() };
        return {
          user: mockCurrentUser,
          accessToken: `dev-token-${Date.now()}`,
          refreshToken: `dev-refresh-${Date.now()}`,
        };
      }),
      refreshToken: jest.fn().mockImplementation(async () => {
        if (!mockCurrentUser) return null;
        return {
          user: mockCurrentUser,
          accessToken: `dev-token-${Date.now()}`,
          refreshToken: `dev-refresh-${Date.now()}`,
        };
      }),
    })),
  };
});

// Test component factory - creates a new component for each test
function createTestComponent() {
  return function TestComponent() {
    const {
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      isAuthenticated,
      isDevMode,
      switchUser,
    } = useAuth();
    return (
      <div>
        <div data-testid="loading">{loading.toString()}</div>
        <div data-testid="user">{user ? user.email : "no user"}</div>
        <div data-testid="user-role">{user ? user.role : "no role"}</div>
        <div data-testid="user-display-name">
          {user ? user.displayName : "no name"}
        </div>
        <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
        <div data-testid="is-dev-mode">{isDevMode.toString()}</div>
        <div data-testid="has-switch-user">{(!!switchUser).toString()}</div>
        <button onClick={() => signIn("owner@nself.org", "password")}>
          Sign In Owner
        </button>
        <button onClick={() => signIn("member@nself.org", "password")}>
          Sign In Member
        </button>
        <button onClick={() => signIn("invalid@nself.org", "password")}>
          Sign In Invalid
        </button>
        <button
          onClick={() =>
            signUp("new@example.com", "password", "newuser", "New User")
          }
        >
          Sign Up
        </button>
        <button onClick={() => signOut()}>Sign Out</button>
        <button onClick={() => updateProfile({ displayName: "Updated Name" })}>
          Update Profile
        </button>
        <button onClick={() => switchUser?.("test-user-3")}>
          Switch to Admin
        </button>
      </div>
    );
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    localStorage.clear();
    localStorage.removeItem("nchat-dev-session");
    // Reset mock user state to ensure tests start with no user logged in
    mockCurrentUser = null;
  });

  it("provides auth context to children", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.getByTestId("user")).toBeInTheDocument();
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    const TestComponent = createTestComponent();
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );

    consoleSpy.mockRestore();
  });

  it("initially shows loading state then completes", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("handles sign in successfully with predefined user", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signInButton = screen.getByText("Sign In Owner");

    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("owner@nself.org");
      expect(mockPush).toHaveBeenCalledWith("/chat");
    });
  });

  it("handles sign in with member role", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signInButton = screen.getByText("Sign In Member");

    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("member@nself.org");
      expect(screen.getByTestId("user-role")).toHaveTextContent("member");
      expect(mockPush).toHaveBeenCalledWith("/chat");
    });
  });

  it("handles sign up successfully", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signUpButton = screen.getByText("Sign Up");

    await act(async () => {
      signUpButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("new@example.com");
      expect(mockPush).toHaveBeenCalledWith("/chat");
    });
  });

  it("handles sign out after sign in", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // First sign in
    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("owner@nself.org");
    });

    // Then sign out
    const signOutButton = screen.getByText("Sign Out");
    await act(async () => {
      signOutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("no user");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("handles profile update in dev mode", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // First sign in
    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("owner@nself.org");
    });

    // Then update profile
    const updateButton = screen.getByText("Update Profile");
    await act(async () => {
      updateButton.click();
    });

    // Profile update should work without error in dev mode
    // The user should still be logged in
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("owner@nself.org");
    });
  });

  it("shows isAuthenticated state correctly after sign out", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // Sign in first
    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    // Sign out
    const signOutButton = screen.getByText("Sign Out");
    await act(async () => {
      signOutButton.click();
    });

    // After sign out, isAuthenticated should be false
    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    });
  });

  it("shows isAuthenticated as true when user is logged in", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });
  });

  it("shows isDevMode correctly", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("is-dev-mode")).toHaveTextContent("true");
  });

  it("provides switchUser function in dev mode", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("has-switch-user")).toHaveTextContent("true");
  });

  it("switches user in dev mode", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // First sign in as owner
    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("owner@nself.org");
    });

    // Switch to admin
    const switchButton = screen.getByText("Switch to Admin");
    await act(async () => {
      switchButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("admin@nself.org");
      expect(screen.getByTestId("user-role")).toHaveTextContent("admin");
    });
  });

  it("updates displayName on profile update", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // First sign in
    const signInButton = screen.getByText("Sign In Owner");
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-display-name")).toHaveTextContent(
        "System Owner",
      );
    });

    // Update profile
    const updateButton = screen.getByText("Update Profile");
    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-display-name")).toHaveTextContent(
        "Updated Name",
      );
    });
  });

  it("allows calling updateProfile without crashing", async () => {
    const TestComponent = createTestComponent();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // Test that updateProfile can be called without crashing
    // (this verifies the context provides the function correctly)
    const updateButton = screen.getByText("Update Profile");
    await act(async () => {
      updateButton.click();
    });

    // If we get here without error, the test passes
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});

describe("useAuth hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    localStorage.clear();
    localStorage.removeItem("nchat-dev-session");
    // Reset mock user state to ensure tests start with no user logged in
    mockCurrentUser = null;
  });

  it("returns auth context values", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isDevMode).toBe(true);
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.signOut).toBe("function");
    expect(typeof result.current.updateProfile).toBe("function");
    expect(typeof result.current.switchUser).toBe("function");
  });

  it("signs in user through hook", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("owner@nself.org", "password");
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.email).toBe("owner@nself.org");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("signs out user through hook", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("owner@nself.org", "password");
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
