import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import NoticeHighlights from "@/components/shared/NoticeHighlights";
import PageActions from "@/components/shared/PageActions";
import { noticeApi } from "@/api/noticeApi";

const studentWorkspaces = [
  { label: "General Application", description: "Submit and monitor your hall application lifecycle.", path: "/student/general-application" },
  { label: "Allocation Application", description: "Request room allocation and track allocation status.", path: "/student/room-allocation" },
  { label: "Meals and Tokens", description: "Browse daily menu and manage your meal tokens.", path: "/my-meal-orders" },
  { label: "Wallet and Payments", description: "Review wallet balance and transaction history.", path: "/student/wallet" },
  { label: "Complaints", description: "Create and monitor complaint progress.", path: "/student/complaints" },
  { label: "Maintenance Requests", description: "Report room and facility issues.", path: "/student/maintenance-requests" },
  { label: "Support Tickets", description: "Open support tickets and continue conversations.", path: "/student/support-tickets" },
  { label: "Notices", description: "Read latest hall and university notices.", path: "/student/notices" },
];

function StudentDashboardPage() {
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
        eyebrow="Student Dashboard"
        title="Your hall services overview"
        description="Track your application, room, meals, and support activities from one place."
        actions={[
          <PageActions key="actions">
            <Link to="/student/profile">
              <Button variant="secondary">Open Profile</Button>
            </Link>
          </PageActions>,
        ]}
      >
        <NoticeHighlights
          title="Hall Notices"
          description="Latest notices for students and residents."
          detailsPathPrefix="/student/notices"
          allNoticesPath="/student/notices"
          fetcher={fetchNoticeHighlights}
        />

        <ContentSection title="Student Workspaces" description="Open active modules that are currently available in your account.">
          <div className="grid gap-3 sm:grid-cols-2">
            {studentWorkspaces.map((workspace) => (
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

export default StudentDashboardPage;
