import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { walletApi } from "@/api/walletApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/walletApi", () => ({
  walletApi: {
    getMyBalance: vi.fn(),
    listMyTransactions: vi.fn(),
    createDepositRequest: vi.fn(),
    getMyDepositStatus: vi.fn(),
    getDiningTodaySummary: vi.fn(),
    getDiningDateSummary: vi.fn(),
    listProvostTransactions: vi.fn(),
    getProvostFinancialSummary: vi.fn(),
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
    name: "Wallet Test User",
    email: "wallet-test@example.com",
    phone: "+8801700000000",
    profilePhoto: "",
    role,
    isEmailVerified: false,
    isActive: true,
    lastLogin: null,
  };
}

describe("Wallet and finance routes", () => {
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

  it("renders student wallet page and loads balance/history", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    walletApi.getMyBalance.mockResolvedValue({
      balance: {
        studentId: "student-1",
        balance: 1500,
        currency: "BDT",
      },
    });
    walletApi.listMyTransactions.mockResolvedValue({
      items: [],
      summary: {
        totalTransactions: 0,
        totalDeposits: 0,
        totalMealTokenSpend: 0,
        totalRefunds: 0,
        currentBalance: 1500,
      },
      meta: { page: 1, limit: 6, total: 0, totalPages: 0 },
    });

    renderApp("/student/wallet");

    await waitFor(() => {
      expect(walletApi.getMyBalance).toHaveBeenCalled();
      expect(walletApi.listMyTransactions).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(screen.getByRole("button", { name: /deposit money/i })).toBeInTheDocument();
  });

  it("renders provost financial dashboard route", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    walletApi.getProvostFinancialSummary.mockResolvedValue({
      overview: {
        totalDeposits: 0,
        totalTokenSales: 0,
        totalRefunds: 0,
        netRevenue: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
      },
      dailyRevenue: [],
      range: {},
    });

    renderApp("/provost/payments");

    await waitFor(() => {
      expect(walletApi.getProvostFinancialSummary).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /financial dashboard/i })).toBeInTheDocument();
  });

  it("renders provost transaction monitoring route", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    walletApi.listProvostTransactions.mockResolvedValue({
      items: [],
      summary: {
        totalTransactions: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
        totalDeposits: 0,
        totalTokenSales: 0,
        totalRefunds: 0,
      },
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderApp("/provost/payments/transactions");

    await waitFor(() => {
      expect(walletApi.listProvostTransactions).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /transaction monitoring/i })).toBeInTheDocument();
  });
});
