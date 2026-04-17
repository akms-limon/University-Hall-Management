import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import NoticeHighlights from "@/components/shared/NoticeHighlights";
import PageActions from "@/components/shared/PageActions";
import { noticeApi } from "@/api/noticeApi";

const staffWorkspaces = [
  { label: "Assigned Tasks", description: "View and complete tasks assigned by provost.", path: "/staff/assigned-tasks" },
  { label: "Meal Management", description: "Maintain meal items and daily dining operations.", path: "/staff/meals" },
  { label: "Token Check", description: "Verify and manage purchased meal tokens.", path: "/staff/orders" },
  { label: "Dining Summary", description: "Track date-wise dining statistics.", path: "/staff/orders/stats" },
  { label: "Complaints", description: "Work on complaints assigned to your account.", path: "/staff/complaints" },
  { label: "Maintenance", description: "Update assigned maintenance requests.", path: "/staff/maintenance" },
  { label: "Support Tickets", description: "Reply to assigned support tickets.", path: "/staff/support-tickets" },
  { label: "Notices", description: "Read operational and administrative notices.", path: "/staff/notices" },
];

function StaffDashboardPage() {
  const fetchNoticeHighlights = useCallback(async () => {
    const result = await noticeApi.listMine({
      page: 1,
      limit: 4,
      sortBy: "publishedDate",
      sortOrder: "desc",
    });
    return result.items || [];
  }, []);

  return (
    <div className="space-y-5">
      <DetailPageShell
        eyebrow="Staff Dashboard"
        title="Operational task center"
        description="Manage assigned tasks, dining operations, complaints, and support work from one shell."
        actions={[
          <PageActions key="actions">
            <Link to="/staff/assigned-tasks">
              <Button>Open Assigned Tasks</Button>
            </Link>
            <Link to="/staff/orders/stats">
              <Button variant="secondary">Dining Summary</Button>
            </Link>
          </PageActions>,
        ]}
      >
        <NoticeHighlights
          title="Hall Notices"
          description="Latest notices for staff operations."
          detailsPathPrefix="/staff/notices"
          allNoticesPath="/staff/notices"
          fetcher={fetchNoticeHighlights}
        />

        <ContentSection title="Staff Workspaces" description="Open only fully available staff workflows from here.">
          <div className="grid gap-3 sm:grid-cols-2">
            {staffWorkspaces.map((workspace) => (
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

export default StaffDashboardPage;
