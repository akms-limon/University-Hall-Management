import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import { roomApi } from "@/api/roomApi";
import { studentApi } from "@/api/studentApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/roomAllocationApi", () => ({
  roomAllocationApi: {
    createMyRequest: vi.fn(),
    listMyAllocations: vi.fn(),
    getMyLatestAllocation: vi.fn(),
    getMyAllocationById: vi.fn(),
    listAllocations: vi.fn(),
    getAllocationById: vi.fn(),
    approveAllocation: vi.fn(),
    rejectAllocation: vi.fn(),
    activateAllocation: vi.fn(),
    completeAllocation: vi.fn(),
    transferAllocation: vi.fn(),
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

vi.mock("@/api/studentApi", () => ({
  studentApi: {
    getMyProfile: vi.fn(),
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

describe("Room allocation routes", () => {
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

  it("renders student room allocation page and loads my allocations", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    roomAllocationApi.listMyAllocations.mockResolvedValue({
      items: [],
      summary: {
        totalAllocations: 0,
        totalNewRequests: 0,
        totalTransferRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        active: 0,
        completed: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/student/room-allocation");

    await waitFor(() => {
      expect(roomAllocationApi.listMyAllocations).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(screen.getByRole("button", { name: /new room request/i })).toBeInTheDocument();
  });

  it("renders provost room allocation management page and loads allocation queue", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    roomAllocationApi.listAllocations.mockResolvedValue({
      items: [],
      summary: {
        totalAllocations: 0,
        totalNewRequests: 0,
        totalTransferRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        active: 0,
        completed: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
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
        limit: 100,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/provost/room-allocation");

    await waitFor(() => {
      expect(roomAllocationApi.listAllocations).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(await screen.findByText(/room allocation management/i, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it("renders transfer request form under room allocation route and shows current room", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    roomAllocationApi.getMyLatestAllocation.mockResolvedValue({
      allocation: {
        id: "alloc-1",
        status: "active",
        requestType: "new_room_request",
        room: { id: "room-1", roomNumber: "A-101" },
        allocationDate: "2026-04-17T00:00:00.000Z",
      },
    });
    roomAllocationApi.listMyAllocations.mockImplementation(async (params) => {
      if (params?.status === "active") {
        return {
          items: [
            {
              id: "alloc-1",
              status: "active",
              room: { id: "room-1", roomNumber: "A-101" },
            },
          ],
          summary: { totalAllocations: 1, totalNewRequests: 1, totalTransferRequests: 0, pending: 0, approved: 0, rejected: 0, active: 1, completed: 0 },
          meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
        };
      }
      return {
        items: [],
        summary: { totalAllocations: 0, totalNewRequests: 0, totalTransferRequests: 0, pending: 0, approved: 0, rejected: 0, active: 0, completed: 0 },
        meta: { page: 1, limit: 1, total: 0, totalPages: 0 },
      };
    });
    roomApi.listPublicRooms.mockResolvedValue({
      items: [
        {
          id: "room-2",
          roomNumber: "B-201",
          floor: 2,
          wing: "East",
          status: "vacant",
          availableSeatCount: 1,
        },
      ],
      summary: {},
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    studentApi.getMyProfile.mockResolvedValue({
      student: { currentRoom: "" },
    });

    renderApp("/student/room-allocation/transfer/new");

    expect(await screen.findByText(/transfer request form/i)).toBeInTheDocument();
    expect(await screen.findByText(/current room/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue("A-101")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit transfer request/i })).toBeInTheDocument();
  });
});
