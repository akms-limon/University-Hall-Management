import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { mealApi } from "@/api/mealApi";
import { notificationApi } from "@/api/notificationApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/mealApi", () => ({
  mealApi: {
    listDailyMenu: vi.fn(),
    getMealItemById: vi.fn(),
    createMealOrder: vi.fn(),
    listMyMealOrders: vi.fn(),
    getMyMealOrderById: vi.fn(),
    cancelMyMealOrder: vi.fn(),
    createMealItem: vi.fn(),
    listMealItemsForStaff: vi.fn(),
    getMealItemByIdForStaff: vi.fn(),
    updateMealItem: vi.fn(),
    deleteMealItem: vi.fn(),
    updateMealItemAvailability: vi.fn(),
    listMealOrdersForStaff: vi.fn(),
    getMealOrderByIdForStaff: vi.fn(),
    updateMealOrderStatus: vi.fn(),
    getTodayMealStats: vi.fn(),
    getDateWiseMealStats: vi.fn(),
    getProvostMealReports: vi.fn(),
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
    name: "Meal Test User",
    email: "meal-test@example.com",
    phone: "+8801700000000",
    profilePhoto: "",
    role,
    isEmailVerified: false,
    isActive: true,
    lastLogin: null,
  };
}

describe("Meal management routes", () => {
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

  it("renders student daily menu route and fetches menu data", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    mealApi.listDailyMenu.mockResolvedValue({
      items: [],
      summary: {
        totalItems: 0,
        availableItems: 0,
        unavailableItems: 0,
        outOfStockItems: 0,
        vegetarianItems: 0,
        veganItems: 0,
      },
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    renderApp("/menu");

    await waitFor(() => {
      expect(mealApi.listDailyMenu).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(
      await screen.findByPlaceholderText(/search by item name or description/i, {}, { timeout: 4000 })
    ).toBeInTheDocument();
  });

  it("renders staff meal management route and fetches menu records", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STAFF) });
    mealApi.listMealItemsForStaff.mockResolvedValue({
      items: [],
      summary: {
        totalItems: 0,
        availableItems: 0,
        unavailableItems: 0,
        outOfStockItems: 0,
        vegetarianItems: 0,
        veganItems: 0,
      },
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderApp("/staff/meals");

    await waitFor(() => {
      expect(mealApi.listMealItemsForStaff).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /meal management/i })).toBeInTheDocument();
  });

  it("renders provost meal reports route and fetches reports", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    mealApi.getProvostMealReports.mockResolvedValue({
      reports: {
        overview: {
          totalTokens: 0,
          totalAmount: 0,
          consumedTokens: 0,
          remainingTokens: 0,
          cancelledOrders: 0,
          paidOrders: 0,
        },
        paymentBreakdown: [],
        trend: [],
        groupedBy: "day",
      },
    });

    renderApp("/provost/meal-reports");

    await waitFor(() => {
      expect(mealApi.getProvostMealReports).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /dining token reports/i })).toBeInTheDocument();
  });
});
