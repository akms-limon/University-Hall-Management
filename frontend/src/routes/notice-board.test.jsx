import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { authApi } from "@/api/authApi";
import { noticeApi } from "@/api/noticeApi";
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

vi.mock("@/api/noticeApi", () => ({
  noticeApi: {
    listMine: vi.fn(),
    getMyNoticeById: vi.fn(),
    createNotice: vi.fn(),
    listNotices: vi.fn(),
    getNoticeById: vi.fn(),
    updateNotice: vi.fn(),
    publishNotice: vi.fn(),
    setNoticeActive: vi.fn(),
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
    listStudents: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 0, total: 0 } }),
  },
}));

vi.mock("@/api/staffApi", () => ({
  staffApi: {
    listStaff: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 0, total: 0 } }),
  },
}));

vi.mock("@/api/roomApi", () => ({
  roomApi: {
    listRooms: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 0, total: 0 } }),
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

function mockUser(role) {
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

describe("Notice board routes", () => {
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

  it("renders student notice list and fetches role-scoped notices", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    noticeApi.listMine.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderApp("/student/notices");

    await waitFor(() => {
      expect(noticeApi.listMine).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("option", { name: /all categories/i }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("renders staff notice detail and fetches accessible notice", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STAFF) });
    noticeApi.getMyNoticeById.mockResolvedValue({
      notice: {
        id: "notice-1",
        title: "Maintenance Window",
        content: "Water line check in wing A.",
        category: "maintenance",
        isUrgent: false,
        publishedDate: new Date().toISOString(),
        expiryDate: null,
        publishedBy: { name: "Provost" },
        attachments: [],
      },
    });

    renderApp("/staff/notices/notice-1");

    await waitFor(() => {
      expect(noticeApi.getMyNoticeById).toHaveBeenCalledWith("notice-1");
    }, { timeout: 4000 });
    expect(await screen.findByText(/maintenance window/i)).toBeInTheDocument();
  });

  it("renders provost notice management and fetches all notices", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    noticeApi.listNotices.mockResolvedValue({
      items: [],
      summary: { total: 0, active: 0, urgent: 0, inactive: 0 },
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderApp("/provost/notices");

    await waitFor(() => {
      expect(noticeApi.listNotices).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByText(/notice management/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /create notice/i }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("renders provost notice edit form even when expiry date is invalid", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    noticeApi.getNoticeById.mockResolvedValue({
      notice: {
        id: "notice-1",
        title: "Semester Opening",
        content: "All students must complete seat confirmation this week.",
        category: "announcement",
        targetAudience: "all",
        targetUsers: [],
        applicableRooms: [],
        attachments: [],
        isUrgent: false,
        isActive: true,
        expiryDate: "N/A",
      },
    });

    renderApp("/provost/notices/notice-1/edit");

    await waitFor(() => {
      expect(noticeApi.getNoticeById).toHaveBeenCalledWith("notice-1");
    }, { timeout: 4000 });
    expect(await screen.findByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
