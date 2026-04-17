import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/app/providers/AuthProvider";
import AppRouter from "@/routes/AppRouter";
import { USER_ROLES } from "@/lib/constants";
import { authApi } from "@/api/authApi";
import { notificationApi } from "@/api/notificationApi";
import { studentApi } from "@/api/studentApi";

vi.mock("@/api/authApi", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/studentApi", () => ({
  studentApi: {
    listStudents: vi.fn(),
    getStudentById: vi.fn(),
    createStudent: vi.fn(),
    updateStudentById: vi.fn(),
    updateStudentStatus: vi.fn(),
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

function mockStudent() {
  return {
    id: "student-1",
    userId: "user-1",
    user: mockUser(USER_ROLES.STUDENT),
    registrationNumber: "CSE-24-001",
    department: "CSE",
    semester: 2,
    profilePhoto: "",
    currentRoom: null,
    balance: 0,
    emergencyContact: {
      name: "Guardian",
      phone: "+8801700000011",
      relation: "Father",
    },
    allocationStatus: "pending",
    isActive: true,
  };
}

describe("Student management routes", () => {
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

  it("renders provost student management page and loads student list", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.PROVOST) });
    studentApi.listStudents.mockResolvedValue({
      items: [],
      summary: {
        totalStudents: 0,
        activeStudents: 0,
        pendingAllocation: 0,
        allocatedStudents: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    renderApp("/provost/student-management");

    await waitFor(() => {
      expect(studentApi.listStudents).toHaveBeenCalled();
    }, { timeout: 4000 });
    expect(screen.getByRole("button", { name: /create student/i })).toBeInTheDocument();
  });

  it("renders student self-profile page and loads my profile", async () => {
    authApi.me.mockResolvedValue({ user: mockUser(USER_ROLES.STUDENT) });
    studentApi.getMyProfile.mockResolvedValue({ student: mockStudent() });

    renderApp("/student/profile");

    await waitFor(() => {
      expect(studentApi.getMyProfile).toHaveBeenCalled();
    }, { timeout: 4000 });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /my profile/i })).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.getByText(/editable profile fields/i)).toBeInTheDocument();
  });
});
