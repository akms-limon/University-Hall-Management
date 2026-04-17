import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import { studentApi } from "@/api/studentApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/hallApplicationApi", () => ({
  hallApplicationApi: {
    submitMyApplication: vi.fn(),
    listMyApplications: vi.fn(),
    getMyLatestApplication: vi.fn(),
    getMyApplicationById: vi.fn(),
    updateMyApplication: vi.fn(),
    listHallApplications: vi.fn(),
    getHallApplicationById: vi.fn(),
    updateHallApplicationReview: vi.fn(),
    updateHallApplicationStatus: vi.fn(),
    scheduleMeeting: vi.fn(),
    approveApplication: vi.fn(),
    rejectApplication: vi.fn(),
    waitlistApplication: vi.fn(),
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

vi.mock("@/api/studentApi", () => ({
  studentApi: {
    getMyProfile: vi.fn(),
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

describe("Hall application routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    studentApi.getMyProfile.mockResolvedValue({
      student: {
        allocationStatus: "none",
      },
    });
    notificationApi.unreadCount.mockResolvedValue({ unreadCount: 0 });
    notificationApi.listMine.mockResolvedValue({
      items: [],
      summary: { unreadCount: 0 },
      meta: { page: 1, limit: 8, total: 0, totalPages: 0, sortOrder: "desc" },
    });
    notificationApi.markRead.mockResolvedValue({});
    notificationApi.markAllRead.mockResolvedValue({ updatedCount: 0 });
  });

  it("renders student hall tracking page and loads list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    hallApplicationApi.listMyApplications.mockResolvedValue({
      items: [],
      summary: {
        totalApplications: 0,
        pending: 0,
        underReview: 0,
        meetingScheduled: 0,
        approved: 0,
        rejected: 0,
        waitlisted: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/student/general-application");

    await waitFor(() => {
      expect(hallApplicationApi.listMyApplications).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(
      await screen.findByRole("heading", { name: /general application tracking/i }, { timeout: 8000 })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new application/i })).toBeInTheDocument();
  }, 12000);

  it("renders provost hall review page and loads list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    hallApplicationApi.listHallApplications.mockResolvedValue({
      items: [],
      summary: {
        totalApplications: 0,
        pending: 0,
        underReview: 0,
        meetingScheduled: 0,
        approved: 0,
        rejected: 0,
        waitlisted: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/provost/general-applications");

    await waitFor(() => {
      expect(hallApplicationApi.listHallApplications).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /general application review/i }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("renders student general application submit page", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    hallApplicationApi.listMyApplications.mockResolvedValue({
      items: [],
      summary: {
        totalApplications: 0,
        pending: 0,
        underReview: 0,
        meetingScheduled: 0,
        approved: 0,
        rejected: 0,
        waitlisted: 0,
      },
      meta: {
        page: 1,
        limit: 1,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/student/general-application/new");

    expect(await screen.findByText(/general application form/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /submit application/i }, { timeout: 10000 })).toBeInTheDocument();
  });
});
