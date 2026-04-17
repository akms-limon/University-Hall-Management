import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import NoticeHighlights from "@/components/shared/NoticeHighlights";
import PageActions from "@/components/shared/PageActions";
import { noticeApi } from "@/api/noticeApi";

const provostWorkspaces = [
  { label: "Student Management", description: "Manage student records and lifecycle actions.", path: "/provost/student-management" },
  { label: "Staff Management", description: "Create, edit, and monitor staff records.", path: "/provost/staff-management" },
  { label: "General Application", description: "Review applications and update decisions.", path: "/provost/general-applications" },
  { label: "Room Management", description: "Control room inventory and room metadata.", path: "/provost/room-management" },
  { label: "Allocation Application", description: "Monitor and process room allocations.", path: "/provost/room-allocation" },
  { label: "Meal Reports", description: "Review dining operational reports.", path: "/provost/meal-reports" },
  { label: "Payments", description: "Track deposits and transaction health.", path: "/provost/payments" },
  { label: "Staff Tasks", description: "Create and monitor staff task assignments.", path: "/provost/staff-tasks" },
  { label: "Complaints", description: "Monitor complaint queue and resolutions.", path: "/provost/complaints" },
  { label: "Maintenance", description: "Assign and oversee maintenance requests.", path: "/provost/maintenance" },
  { label: "Support Tickets", description: "Track support ticket operations.", path: "/provost/support-tickets" },
  { label: "Notices", description: "Publish and manage hall notices.", path: "/provost/notices" },
  { label: "Analytics / Reports", description: "View role-level hall analytics.", path: "/provost/analytics-reports" },
];

function ProvostDashboardPage() {
  const fetchNoticeHighlights = useCallback(async () => {
    const result = await noticeApi.listNotices({
      page: 1,
      limit: 4,
      isActive: true,
      sortBy: "publishedDate",
      sortOrder: "desc",
    });
    return result.items || [];
  }, []);

  return (
    <div className="space-y-5">
      <DetailPageShell
        eyebrow="Provost Dashboard"
        title="Hall operations command center"
        description="Monitor student, staff, room, payment, and support workflows from a single executive shell."
        actions={[
          <PageActions key="actions">
            <Link to="/provost/notices/new">
              <Button>Publish Notice</Button>
            </Link>
            <Link to="/provost/analytics-reports">
              <Button variant="secondary">Open Reports</Button>
            </Link>
          </PageActions>,
        ]}
      >
        <NoticeHighlights
          title="Hall Notices"
          description="Latest published hall notices."
          detailsPathPrefix="/provost/notices"
          allNoticesPath="/provost/notices"
          fetcher={fetchNoticeHighlights}
        />

        <ContentSection title="Provost Workspaces" description="Direct access to active management modules.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {provostWorkspaces.map((workspace) => (
              <article key={workspace.path} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4">
                <p className="text-sm font-semibold text-slate-100">{workspace.label}</p>
                <p className="mt-2 text-sm text-slate-400">{workspace.description}</p>
                <Link to={workspace.path} className="mt-3 inline-flex items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                  Open
                  <ArrowRight size={13} className="ml-1" />
                </Link>
              </article>
            ))}
          </div>
        </ContentSection>
      </DetailPageShell>
    </div>
  );
}

export default ProvostDashboardPage;
