import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { staffApi } from "@/api/staffApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/staffApi", () => ({
  staffApi: {
    listStaff: vi.fn(),
    getStaffById: vi.fn(),
    createStaff: vi.fn(),
    updateStaffById: vi.fn(),
    updateStaffStatus: vi.fn(),
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
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

function mockUser(role = USER_ROLES.STAFF) {
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

function mockStaff() {
  return {
    id: "staff-1",
    userId: "user-1",
    user: mockUser(USER_ROLES.STAFF),
    staffId: "STF-2026-001",
    department: "Dining",
    designation: "Dining Manager",
    profilePhoto: "",
    joiningDate: "2025-01-05T00:00:00.000Z",
    isActive: true,
  };
}

describe("Staff management routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.unreadCount.mockResolvedValue({ unreadCount: 0 });
    notificationApi.listMine.mockResolvedValue({
      items: [],
      summary: { unreadCount: 0 },
      meta: { page: 1, limit: 8, total: 0, totalPages: 0, sortOrder: "desc" },
    });
    notificationApi.markRead.mockResolvedValue({});
    notificationApi.markAllRead.mockResolvedValue({ updatedCount: 0 });
  });

  it("renders provost staff management page and loads staff list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    staffApi.listStaff.mockResolvedValue({
      items: [],
      summary: {
        totalStaff: 0,
        activeStaff: 0,
        inactiveStaff: 0,
        byDepartment: [],
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/provost/staff-management");

    await waitFor(() => {
      expect(staffApi.listStaff).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(screen.getByRole("button", { name: /create staff/i })).toBeInTheDocument();
  });

  it("renders staff self-profile page and loads my profile", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STAFF) });
    staffApi.getMyProfile.mockResolvedValue({ staff: mockStaff() });

    renderApp("/staff/profile");

    await waitFor(() => {
      expect(staffApi.getMyProfile).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /my profile/i }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/editable profile fields/i)).toBeInTheDocument();
  });
});
