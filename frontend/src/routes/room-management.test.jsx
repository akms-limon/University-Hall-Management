import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { roomApi } from "@/api/roomApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/roomApi", () => ({
  roomApi: {
    listRooms: vi.fn(),
    getRoomById: vi.fn(),
    createRoom: vi.fn(),
    updateRoomById: vi.fn(),
    updateRoomStatus: vi.fn(),
    listPublicRooms: vi.fn(),
    getPublicRoomById: vi.fn(),
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

describe("Room management routes", () => {
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

  it("renders provost room management page and loads room list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    roomApi.listRooms.mockResolvedValue({
      items: [],
      summary: {
        totalRooms: 0,
        vacantRooms: 0,
        occupiedRooms: 0,
        maintenanceRooms: 0,
        closedRooms: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/provost/room-management");

    await waitFor(() => {
      expect(roomApi.listRooms).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByRole("heading", { name: /room management/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create room/i })).toBeInTheDocument();
  });

  it("renders student room availability page and loads public room list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    roomApi.listPublicRooms.mockResolvedValue({
      items: [],
      summary: {
        totalRooms: 0,
        vacantRooms: 0,
        occupiedRooms: 0,
        maintenanceRooms: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/student/room-availability");

    await waitFor(() => {
      expect(roomApi.listPublicRooms).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(
      await screen.findByRole("heading", { name: /room availability/i }, { timeout: 4000 })
    ).toBeInTheDocument();
  });
});
