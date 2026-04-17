import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  dashboardPathByRole,
  getRoleNavigation,
  USER_ROLES,
} from "@/lib/constants";
import ProtectedRoute from "@/routes/ProtectedRoute";
import PublicOnlyRoute from "@/routes/PublicOnlyRoute";
import RoleProtectedRoute from "@/routes/RoleProtectedRoute";
import PublicLayout from "@/layouts/PublicLayout";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath } from "@/utils/navigation";
import LoadingState from "@/components/shared/LoadingState";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const DesignDemoPage = lazy(() => import("@/pages/DesignDemoPage"));
const StudentDashboardPage = lazy(() => import("@/pages/StudentDashboardPage"));
const StaffDashboardPage = lazy(() => import("@/pages/StaffDashboardPage"));
const ProvostDashboardPage = lazy(() => import("@/pages/ProvostDashboardPage"));
const ProvostCreateStudentPage = lazy(() => import("@/pages/ProvostCreateStudentPage"));
const ProvostEditStudentPage = lazy(() => import("@/pages/ProvostEditStudentPage"));
const ProvostCreateStaffPage = lazy(() => import("@/pages/ProvostCreateStaffPage"));
const ProvostEditStaffPage = lazy(() => import("@/pages/ProvostEditStaffPage"));
const ProvostStudentDetailsPage = lazy(() => import("@/pages/ProvostStudentDetailsPage"));
const ProvostStudentManagementPage = lazy(() => import("@/pages/ProvostStudentManagementPage"));
const ProvostStaffDetailsPage = lazy(() => import("@/pages/ProvostStaffDetailsPage"));
const ProvostStaffManagementPage = lazy(() => import("@/pages/ProvostStaffManagementPage"));
const ProvostHallApplicationsPage = lazy(() => import("@/pages/ProvostHallApplicationsPage"));
const ProvostHallApplicationDetailsPage = lazy(() => import("@/pages/ProvostHallApplicationDetailsPage"));
const ProvostRoomManagementPage = lazy(() => import("@/pages/ProvostRoomManagementPage"));
const ProvostRoomDetailsPage = lazy(() => import("@/pages/ProvostRoomDetailsPage"));
const ProvostCreateRoomPage = lazy(() => import("@/pages/ProvostCreateRoomPage"));
const ProvostEditRoomPage = lazy(() => import("@/pages/ProvostEditRoomPage"));
const ProvostRoomAllocationsPage = lazy(() => import("@/pages/ProvostRoomAllocationsPage"));
const ProvostRoomAllocationDetailsPage = lazy(() => import("@/pages/ProvostRoomAllocationDetailsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const StaffProfilePage = lazy(() => import("@/pages/StaffProfilePage"));
const StudentRoomAvailabilityPage = lazy(() => import("@/pages/StudentRoomAvailabilityPage"));
const StudentRoomDetailsPage = lazy(() => import("@/pages/StudentRoomDetailsPage"));
const StudentRoomAllocationsPage = lazy(() => import("@/pages/StudentRoomAllocationsPage"));
const StudentRoomAllocationRequestPage = lazy(() => import("@/pages/StudentRoomAllocationRequestPage"));
const StudentRoomAllocationDetailsPage = lazy(() => import("@/pages/StudentRoomAllocationDetailsPage"));
const StudentHallApplicationsPage = lazy(() => import("@/pages/StudentHallApplicationsPage"));
const StudentHallApplicationDetailsPage = lazy(() => import("@/pages/StudentHallApplicationDetailsPage"));
const StudentHallApplicationSubmitPage = lazy(() => import("@/pages/StudentHallApplicationSubmitPage"));
const StudentProfilePage = lazy(() => import("@/pages/StudentProfilePage"));
const StudentDailyMenuPage = lazy(() => import("@/pages/StudentDailyMenuPage"));
const StudentMealItemDetailsPage = lazy(() => import("@/pages/StudentMealItemDetailsPage"));
const StudentPlaceMealOrderPage = lazy(() => import("@/pages/StudentPlaceMealOrderPage"));
const StudentMealOrdersPage = lazy(() => import("@/pages/StudentMealOrdersPage"));
const StudentMealTokenDetailsPage = lazy(() => import("@/pages/StudentMealTokenDetailsPage"));
const StudentWalletPage = lazy(() => import("@/pages/StudentWalletPage"));
const StudentDepositPage = lazy(() => import("@/pages/StudentDepositPage"));
const StudentDepositStatusPage = lazy(() => import("@/pages/StudentDepositStatusPage"));
const StudentPaymentResultPage = lazy(() => import("@/pages/StudentPaymentResultPage"));
const StudentTransactionHistoryPage = lazy(() => import("@/pages/StudentTransactionHistoryPage"));
const StaffMealManagementPage = lazy(() => import("@/pages/StaffMealManagementPage"));
const StaffMealItemFormPage = lazy(() => import("@/pages/StaffMealItemFormPage"));
const StaffMealOrdersPage = lazy(() => import("@/pages/StaffMealOrdersPage"));
const StaffMealStatsPage = lazy(() => import("@/pages/StaffMealStatsPage"));
const ProvostMealReportsPage = lazy(() => import("@/pages/ProvostMealReportsPage"));
const ProvostFinancialDashboardPage = lazy(() => import("@/pages/ProvostFinancialDashboardPage"));
const ProvostTransactionMonitoringPage = lazy(() => import("@/pages/ProvostTransactionMonitoringPage"));
const StudentComplaintsPage = lazy(() => import("@/pages/StudentComplaintsPage"));
const StudentCreateComplaintPage = lazy(() => import("@/pages/StudentCreateComplaintPage"));
const StudentComplaintDetailsPage = lazy(() => import("@/pages/StudentComplaintDetailsPage"));
const StudentMaintenancePage = lazy(() => import("@/pages/StudentMaintenancePage"));
const StudentCreateMaintenancePage = lazy(() => import("@/pages/StudentCreateMaintenancePage"));
const StudentMaintenanceDetailsPage = lazy(() => import("@/pages/StudentMaintenanceDetailsPage"));
const StudentSupportTicketsPage = lazy(() => import("@/pages/StudentSupportTicketsPage"));
const StudentCreateSupportTicketPage = lazy(() => import("@/pages/StudentCreateSupportTicketPage"));
const StudentSupportTicketDetailsPage = lazy(() => import("@/pages/StudentSupportTicketDetailsPage"));
const StudentNoticesPage = lazy(() => import("@/pages/StudentNoticesPage"));
const StudentNoticeDetailsPage = lazy(() => import("@/pages/StudentNoticeDetailsPage"));
const StaffComplaintsPage = lazy(() => import("@/pages/StaffComplaintsPage"));
const StaffComplaintWorkPage = lazy(() => import("@/pages/StaffComplaintWorkPage"));
const StaffMaintenancePage = lazy(() => import("@/pages/StaffMaintenancePage"));
const StaffMaintenanceWorkPage = lazy(() => import("@/pages/StaffMaintenanceWorkPage"));
const StaffSupportTicketsPage = lazy(() => import("@/pages/StaffSupportTicketsPage"));
const StaffSupportTicketWorkPage = lazy(() => import("@/pages/StaffSupportTicketWorkPage"));
const StaffNoticesPage = lazy(() => import("@/pages/StaffNoticesPage"));
const StaffNoticeDetailsPage = lazy(() => import("@/pages/StaffNoticeDetailsPage"));
const StaffAssignedTasksPage = lazy(() => import("@/pages/StaffAssignedTasksPage"));
const StaffTaskWorkPage = lazy(() => import("@/pages/StaffTaskWorkPage"));
const ProvostComplaintsPage = lazy(() => import("@/pages/ProvostComplaintsPage"));
const ProvostComplaintDetailsPage = lazy(() => import("@/pages/ProvostComplaintDetailsPage"));
const ProvostMaintenancePage = lazy(() => import("@/pages/ProvostMaintenancePage"));
const ProvostMaintenanceDetailsPage = lazy(() => import("@/pages/ProvostMaintenanceDetailsPage"));
const ProvostSupportTicketsPage = lazy(() => import("@/pages/ProvostSupportTicketsPage"));
const ProvostSupportTicketDetailsPage = lazy(() => import("@/pages/ProvostSupportTicketDetailsPage"));
const ProvostStaffTasksPage = lazy(() => import("@/pages/ProvostStaffTasksPage"));
const ProvostCreateTaskPage = lazy(() => import("@/pages/ProvostCreateTaskPage"));
const ProvostTaskDetailsPage = lazy(() => import("@/pages/ProvostTaskDetailsPage"));
const ProvostAnalyticsReportsPage = lazy(() => import("@/pages/ProvostAnalyticsReportsPage"));
const ProvostNoticesPage = lazy(() => import("@/pages/ProvostNoticesPage"));
const ProvostCreateNoticePage = lazy(() => import("@/pages/ProvostCreateNoticePage"));
const ProvostNoticeDetailsPage = lazy(() => import("@/pages/ProvostNoticeDetailsPage"));
const ProvostEditNoticePage = lazy(() => import("@/pages/ProvostEditNoticePage"));
const UnauthorizedPage = lazy(() => import("@/pages/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function RouterFallback() {
  return (
    <div className="min-h-screen p-4">
      <LoadingState label="Loading page..." />
    </div>
  );
}

function DashboardRedirect() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <RouterFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(user.role)} replace />;
}

const dashboardComponentByRole = {
  [USER_ROLES.STUDENT]: StudentDashboardPage,
  [USER_ROLES.STAFF]: StaffDashboardPage,
  [USER_ROLES.PROVOST]: ProvostDashboardPage,
};

const roleRouteGroups = [USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST];

function AppRouter() {
  const resolveRoleRouteElement = (role, item, DashboardComponent) => {
    if (item.path === dashboardPathByRole[role]) {
      return <DashboardComponent />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/profile") {
      return <StudentProfilePage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/general-application") {
      return <StudentHallApplicationsPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/room-availability") {
      return <StudentRoomAvailabilityPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/room-allocation") {
      return <StudentRoomAllocationsPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/menu") {
      return <StudentDailyMenuPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/my-meal-orders") {
      return <StudentMealOrdersPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/wallet") {
      return <StudentWalletPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/payment-history") {
      return <StudentTransactionHistoryPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/complaints") {
      return <StudentComplaintsPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/maintenance-requests") {
      return <StudentMaintenancePage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/support-tickets") {
      return <StudentSupportTicketsPage />;
    }

    if (role === USER_ROLES.STUDENT && item.path === "/student/notices") {
      return <StudentNoticesPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/profile") {
      return <StaffProfilePage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/meals") {
      return <StaffMealManagementPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/orders") {
      return <StaffMealOrdersPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/orders/stats") {
      return <StaffMealStatsPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/complaints") {
      return <StaffComplaintsPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/maintenance") {
      return <StaffMaintenancePage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/support-tickets") {
      return <StaffSupportTicketsPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/assigned-tasks") {
      return <StaffAssignedTasksPage />;
    }

    if (role === USER_ROLES.STAFF && item.path === "/staff/notices") {
      return <StaffNoticesPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/student-management") {
      return <ProvostStudentManagementPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/staff-management") {
      return <ProvostStaffManagementPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/general-applications") {
      return <ProvostHallApplicationsPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/room-management") {
      return <ProvostRoomManagementPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/room-allocation") {
      return <ProvostRoomAllocationsPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/meal-reports") {
      return <ProvostMealReportsPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/payments") {
      return <ProvostFinancialDashboardPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/complaints") {
      return <ProvostComplaintsPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/maintenance") {
      return <ProvostMaintenancePage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/support-tickets") {
      return <ProvostSupportTicketsPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/staff-tasks") {
      return <ProvostStaffTasksPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/notices") {
      return <ProvostNoticesPage />;
    }

    if (role === USER_ROLES.PROVOST && item.path === "/provost/analytics-reports") {
      return <ProvostAnalyticsReportsPage />;
    }

    return <Navigate to={dashboardPathByRole[role]} replace />;
  };

  return (
    <Suspense fallback={<RouterFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/design-demo" element={<DesignDemoPage />} />
        </Route>

        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>

        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {roleRouteGroups.map((role) => {
              const DashboardComponent = dashboardComponentByRole[role];
              const roleItems = getRoleNavigation(role);

              return (
                <Route key={role} element={<RoleProtectedRoute allow={[role]} />}>
                  {roleItems.map((item) => (
                    <Route
                      key={item.path}
                      path={item.path}
                      element={resolveRoleRouteElement(role, item, DashboardComponent)}
                    />
                  ))}
                </Route>
              );
            })}

            <Route element={<RoleProtectedRoute allow={[USER_ROLES.STUDENT]} />}>
              <Route path="/student/hall-application" element={<Navigate to="/student/general-application" replace />} />
              <Route path="/student/hall-application/new" element={<StudentHallApplicationSubmitPage />} />
              <Route path="/student/hall-application/:applicationId" element={<StudentHallApplicationDetailsPage />} />
              <Route path="/student/payment-history" element={<StudentTransactionHistoryPage />} />
              <Route path="/student/general-application/new" element={<StudentHallApplicationSubmitPage />} />
              <Route path="/student/general-application/:applicationId" element={<StudentHallApplicationDetailsPage />} />
              <Route path="/student/room-availability/:roomId" element={<StudentRoomDetailsPage />} />
              <Route path="/student/room-allocation/new" element={<StudentRoomAllocationRequestPage />} />
              <Route path="/student/room-allocation/transfer/new" element={<StudentRoomAllocationRequestPage requestType="transfer_request" />} />
              <Route path="/student/room-allocation/current" element={<StudentRoomAllocationDetailsPage useLatest />} />
              <Route path="/student/room-allocation/:allocationId" element={<StudentRoomAllocationDetailsPage />} />
              <Route path="/menu/item/:itemId" element={<StudentMealItemDetailsPage />} />
              <Route path="/student/meals/order/:itemId" element={<StudentPlaceMealOrderPage />} />
              <Route path="/my-meal-orders/:orderId" element={<StudentMealTokenDetailsPage />} />
              <Route path="/student/wallet/deposit" element={<StudentDepositPage />} />
              <Route path="/student/wallet/deposits/:transactionId" element={<StudentDepositStatusPage />} />
              <Route path="/student/wallet/payment/:status" element={<StudentPaymentResultPage />} />
              <Route path="/student/complaints/new" element={<StudentCreateComplaintPage />} />
              <Route path="/student/complaints/:complaintId" element={<StudentComplaintDetailsPage />} />
              <Route path="/student/maintenance-requests/new" element={<StudentCreateMaintenancePage />} />
              <Route path="/student/maintenance-requests/:maintenanceId" element={<StudentMaintenanceDetailsPage />} />
              <Route path="/student/support-tickets/new" element={<StudentCreateSupportTicketPage />} />
              <Route path="/student/support-tickets/:ticketId" element={<StudentSupportTicketDetailsPage />} />
              <Route path="/student/notices/:noticeId" element={<StudentNoticeDetailsPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allow={[USER_ROLES.STAFF]} />}>
              <Route path="/staff/meals/new" element={<StaffMealItemFormPage />} />
              <Route path="/staff/meals/:itemId/edit" element={<StaffMealItemFormPage />} />
              <Route path="/staff/complaints/:complaintId" element={<StaffComplaintWorkPage />} />
              <Route path="/staff/maintenance/:maintenanceId" element={<StaffMaintenanceWorkPage />} />
              <Route path="/staff/support-tickets/:ticketId" element={<StaffSupportTicketWorkPage />} />
              <Route path="/staff/assigned-tasks/:taskId" element={<StaffTaskWorkPage />} />
              <Route path="/staff/notices/:noticeId" element={<StaffNoticeDetailsPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allow={[USER_ROLES.PROVOST]} />}>
              <Route path="/provost/hall-applications" element={<Navigate to="/provost/general-applications" replace />} />
              <Route path="/provost/hall-applications/:applicationId" element={<ProvostHallApplicationDetailsPage />} />
              <Route path="/provost/student-management/create" element={<ProvostCreateStudentPage />} />
              <Route path="/provost/student-management/:studentId" element={<ProvostStudentDetailsPage />} />
              <Route path="/provost/student-management/:studentId/edit" element={<ProvostEditStudentPage />} />
              <Route path="/provost/staff-management/create" element={<ProvostCreateStaffPage />} />
              <Route path="/provost/staff-management/:staffRecordId" element={<ProvostStaffDetailsPage />} />
              <Route path="/provost/staff-management/:staffRecordId/edit" element={<ProvostEditStaffPage />} />
              <Route path="/provost/general-applications/:applicationId" element={<ProvostHallApplicationDetailsPage />} />
              <Route path="/provost/room-management/create" element={<ProvostCreateRoomPage />} />
              <Route path="/provost/room-management/:roomId" element={<ProvostRoomDetailsPage />} />
              <Route path="/provost/room-management/:roomId/edit" element={<ProvostEditRoomPage />} />
              <Route path="/provost/room-allocation/:allocationId" element={<ProvostRoomAllocationDetailsPage />} />
              <Route path="/provost/payments/transactions" element={<ProvostTransactionMonitoringPage />} />
              <Route path="/provost/complaints/:complaintId" element={<ProvostComplaintDetailsPage />} />
              <Route path="/provost/maintenance/:maintenanceId" element={<ProvostMaintenanceDetailsPage />} />
              <Route path="/provost/support-tickets/:ticketId" element={<ProvostSupportTicketDetailsPage />} />
              <Route path="/provost/staff-tasks/new" element={<ProvostCreateTaskPage />} />
              <Route path="/provost/staff-tasks/:taskId" element={<ProvostTaskDetailsPage />} />
              <Route path="/provost/notices/new" element={<ProvostCreateNoticePage />} />
              <Route path="/provost/notices/:noticeId" element={<ProvostNoticeDetailsPage />} />
              <Route path="/provost/notices/:noticeId/edit" element={<ProvostEditNoticePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
