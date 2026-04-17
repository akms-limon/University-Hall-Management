import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import ProgressTimeline from "@/components/shared/ProgressTimeline";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import {
  hallApplicationStatusLabel,
  hallApplicationStatusOptions,
  hallApplicationStatusTone,
} from "@/features/hall-application/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "applicationDate:desc" },
  { label: "Oldest", value: "applicationDate:asc" },
  { label: "Status (A-Z)", value: "status:asc" },
  { label: "Status (Z-A)", value: "status:desc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function buildTimeline(application) {
  const status = application?.status;
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isWaitlisted = status === "waitlisted";
  const isMeeting = status === "meeting_scheduled" || isApproved || isRejected || isWaitlisted;
  const isUnderReview = status === "under_review" || isMeeting;

  return [
    { label: "Submitted", status: "completed", note: formatDate(application?.applicationDate) },
    { label: "Under Review", status: isUnderReview ? "completed" : "pending" },
    { label: "Meeting", status: isMeeting ? "completed" : "pending", note: formatDate(application?.meetingDate) },
    {
      label: "Decision",
      status: isApproved || isRejected || isWaitlisted ? "completed" : "pending",
      note: hallApplicationStatusLabel(status),
    },
  ];
}

function StudentHallApplicationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "",
    sort: "applicationDate:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalApplications: 0,
    pending: 0,
    underReview: 0,
    meetingScheduled: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0,
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const latest = items[0] || null;
  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await hallApplicationApi.listMyApplications({
        page,
        limit,
        status: filters.status || undefined,
        sortBy,
        sortOrder,
      });

      const applicationItems = result.items || [];
      setItems(applicationItems);
      setSummary(
        result.summary || {
          totalApplications: 0,
          pending: 0,
          underReview: 0,
          meetingScheduled: 0,
          approved: 0,
          rejected: 0,
          waitlisted: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch hall applications."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const summaryItems = [
    { title: "Total", value: String(summary.totalApplications), hint: "Submitted applications", tone: "primary" },
    { title: "Pending", value: String(summary.pending), hint: "Waiting for review", tone: "warning" },
    { title: "Under Review", value: String(summary.underReview), hint: "Currently reviewed", tone: "info" },
    { title: "Meeting Scheduled", value: String(summary.meetingScheduled), hint: "Interview pending", tone: "info" },
    { title: "Approved", value: String(summary.approved), hint: "Finalized approvals", tone: "success" },
    { title: "Rejected", value: String(summary.rejected), hint: "Finalized rejections", tone: "danger" },
    { title: "Waitlisted", value: String(summary.waitlisted), hint: "On waitlist", tone: "warning" },
  ];

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="General Application Tracking"
      description="Track your submitted general applications and monitor each review stage."
      actions={[
        <Button
          key="new"
          onClick={() => navigate("/student/general-application/new")}
        >
          <Plus size={16} className="mr-1" />
          New Application
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ContentSection title="My General Applications" description="Latest applications with current review status.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={filters.status}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, status: event.target.value }));
                }}
              >
                <option value="">All Statuses</option>
                {hallApplicationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                value={filters.sort}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, sort: event.target.value }));
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {isLoading ? <LoadingState label="Loading applications..." /> : null}
            {!isLoading && error ? (
              <ErrorState
                title="Unable to load applications"
                description={error}
                actionLabel="Retry"
                onAction={fetchApplications}
              />
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <EmptyState
                title="No hall application yet"
                description="Submit your first hall accommodation request to begin the review process."
                actionLabel="Submit Application"
                onAction={() => navigate("/student/general-application/new")}
              />
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <DataTableShell
                    columns={["Reg No", "Department", "Semester", "Applied", "Meeting", "Status", "Actions"]}
                    rows={items}
                    renderRow={(application) => (
                      <tr key={application.id} className="border-b border-slate-800/70 last:border-none">
                        <td className="px-4 py-3 text-slate-200">{application.registrationNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{application.department}</td>
                        <td className="px-4 py-3 text-slate-300">{application.semester}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(application.applicationDate)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(application.meetingDate)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={hallApplicationStatusTone(application.status)}>
                            {hallApplicationStatusLabel(application.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/student/general-application/${application.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    )}
                  />
                </div>

                <div className="grid gap-3 md:hidden">
                  {items.map((application) => (
                    <article key={application.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{application.registrationNumber}</p>
                          <p className="text-xs text-slate-400">
                            {application.department} • Semester {application.semester}
                          </p>
                        </div>
                        <StatusBadge tone={hallApplicationStatusTone(application.status)}>
                          {hallApplicationStatusLabel(application.status)}
                        </StatusBadge>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>Applied: {formatDate(application.applicationDate)}</span>
                        <span>Meeting: {formatDate(application.meetingDate)}</span>
                      </div>

                      <Button
                        className="mt-3"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/student/general-application/${application.id}`)}
                      >
                        View Details
                      </Button>
                    </article>
                  ))}
                </div>

                <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
              </>
            ) : null}
          </div>
        </ContentSection>

        <ContentSection title="Latest Progress" description="Quick timeline of your most recent hall application.">
          {latest ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">Current Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge tone={hallApplicationStatusTone(latest.status)}>
                    {hallApplicationStatusLabel(latest.status)}
                  </StatusBadge>
                  <span className="text-xs text-slate-400">Applied {formatDate(latest.applicationDate)}</span>
                </div>
              </div>

              <ProgressTimeline steps={buildTimeline(latest)} />

              <Link
                to={`/student/general-application/${latest.id}`}
                className="inline-flex text-sm text-cyan-300 hover:text-cyan-200"
              >
                Open latest application details
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No applications yet. Start by submitting a new application.</p>
          )}
        </ContentSection>
      </section>
    </DetailPageShell>
  );
}

export default StudentHallApplicationsPage;
