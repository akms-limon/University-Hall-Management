import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/notificationApi", () => ({
  notificationApi: {
    listMine: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

function renderApp(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockUser(role = USER_ROLES.STUDENT) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    phone: "+8801700000000",
    profilePhoto: "",
    role,
    isEmailVerified: false,
    isActive: true,
    lastLogin: null,
  };
}

describe("Frontend auth foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.me.mockRejectedValue(new Error("No session"));
    notificationApi.unreadCount.mockResolvedValue({ unreadCount: 0 });
    notificationApi.listMine.mockResolvedValue({
      items: [],
      summary: { unreadCount: 0 },
      meta: { page: 1, limit: 8, total: 0, totalPages: 0, sortOrder: "desc" },
    });
    notificationApi.markRead.mockResolvedValue({});
    notificationApi.markAllRead.mockResolvedValue({ updatedCount: 0 });
  });

  it("logs in and redirects to role dashboard", async () => {
    authApi.me.mockRejectedValue(new Error("No session"));
    authApi.login.mockResolvedValueOnce({ user: mockUser(USER_ROLES.STUDENT) });

    renderApp("/login");

    await screen.findByRole("heading", { name: /sign in to your account/i }, { timeout: 4000 });
    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();

    await userEvent.type(emailInput, "student@example.com");
    await userEvent.type(passwordInput, "StrongPass#123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "StrongPass#123",
      });
    });

    await waitFor(
      () => {
        expect(screen.queryByRole("heading", { name: /sign in to your account/i })).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("registers a student and redirects to student dashboard", async () => {
    authApi.me.mockRejectedValue(new Error("No session"));
    authApi.register.mockResolvedValueOnce({ user: mockUser(USER_ROLES.STUDENT) });

    renderApp("/register");

    await screen.findByRole("heading", { name: /create your account/i }, { timeout: 4000 });
    const nameInput = document.querySelector('input[name="name"]');
    const emailInput = document.querySelector('input[name="email"]');
    const phoneInput = document.querySelector('input[name="phone"]');
    const passwordInput = document.querySelector('input[name="password"]');
    expect(nameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    expect(phoneInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();

    await userEvent.type(nameInput, "Student User");
    await userEvent.type(emailInput, "student@example.com");
    await userEvent.type(phoneInput, "+8801700000001");
    await userEvent.type(passwordInput, "StrongPass#123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: "Student User",
        email: "student@example.com",
        phone: "+8801700000001",
        password: "StrongPass#123",
      });
    });

    await waitFor(
      () => {
        expect(screen.queryByRole("heading", { name: /create your account/i })).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("redirects unauthenticated users from protected route to login", async () => {
    authApi.me.mockRejectedValueOnce(new Error("No session"));

    renderApp("/staff/dashboard");

    expect(await screen.findByRole("heading", { name: /sign in to your account/i }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("redirects unauthorized role access to unauthorized page", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });

    renderApp("/provost/dashboard");

    expect(await screen.findByText(/unauthorized access/i, {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("redirects authenticated users away from login page", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });

    renderApp("/login");

    expect(await screen.findByText(/general application/i, {}, { timeout: 10000 })).toBeInTheDocument();
  });

});
