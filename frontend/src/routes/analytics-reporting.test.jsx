import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { analyticsApi } from "@/api/analyticsApi";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { USER_ROLES } from "@/lib/constants";
import AppRouter from "@/routes/AppRouter";

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

vi.mock("@/api/analyticsApi", () => ({
  analyticsApi: {
    getProvostSummary: vi.fn(),
    getStaffDiningSummary: vi.fn(),
  },
}));

function renderApp(pathname) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockUser(role) {
  return {
    id: "user-1",
    name: "Analytics User",
    email: "analytics@example.com",
    phone: "+8801700000000",
    profilePhoto: "",
    role,
    isEmailVerified: false,
    isActive: true,
    lastLogin: null,
  };
}

describe("Analytics reporting routes", () => {
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

  it("renders provost analytics page and loads summary", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    analyticsApi.getProvostSummary.mockResolvedValue({
      hallOverview: {
        totalStudents: 10,
        totalStaff: 3,
        totalRooms: 5,
        vacantRooms: 1,
        occupiedRooms: 3,
        maintenanceRooms: 1,
        closedRooms: 0,
        occupancyRate: 60,
      },
      hallApplications: { total: 2, pending: 1, approved: 1 },
      roomAllocations: { total: 1, active: 1, pending: 0, approved: 0, completed: 0 },
      dining: { today: { totalTokens: 3 }, trend: [] },
      financial: { totalDeposits: 1000, totalTokenPurchaseAmount: 300, completedTransactions: 2, failedTransactions: 0, totalRefunds: 0 },
      complaints: { total: 1, open: 1, byCategory: [] },
      maintenance: { total: 1, reported: 1, byCategory: [] },
      supportTickets: { total: 1, open: 1, byCategory: [] },
      tasks: { total: 1, pending: 1, byPriority: [], byType: [] },
      notices: { total: 1, active: 1, urgent: 0, inactive: 0 },
    });

    renderApp("/provost/analytics-reports");

    await waitFor(() => {
      expect(analyticsApi.getProvostSummary).toHaveBeenCalled();
    }, { timeout: 4000 });

    expect(await screen.findByRole("heading", { name: /analytics & reporting/i })).toBeInTheDocument();
  });
});
