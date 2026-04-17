import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import {
  hallApplicationStatusLabel,
  hallApplicationStatusOptions,
  hallApplicationStatusTone,
  semesterOptions,
} from "@/features/hall-application/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "applicationDate:desc" },
  { label: "Oldest", value: "applicationDate:asc" },
  { label: "Status (A-Z)", value: "status:asc" },
  { label: "Status (Z-A)", value: "status:desc" },
];

const defaultFilters = {
  search: "",
  department: "",
  semester: "",
  status: "",
  sort: "applicationDate:desc",
};

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function ProvostHallApplicationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalApplications: 0,
    totalNewRequests: 0,
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

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await hallApplicationApi.listHallApplications({
        page,
        limit,
        search: filters.search || undefined,
        department: filters.department || undefined,
        semester: filters.semester ? Number(filters.semester) : undefined,
        status: filters.status || undefined,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(
        result.summary || {
          totalApplications: 0,
          totalNewRequests: 0,
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
  }, [
    filters.department,
    filters.search,
    filters.semester,
    filters.status,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const summaryCards = [
    { title: "Total", value: String(summary.totalApplications), hint: "All records", tone: "primary" },
    { title: "New Applications", value: String(summary.totalNewRequests || 0), hint: "General applications", tone: "info" },
    { title: "Pending", value: String(summary.pending), hint: "Awaiting review", tone: "warning" },
    { title: "Under Review", value: String(summary.underReview), hint: "In progress", tone: "info" },
    { title: "Meeting Scheduled", value: String(summary.meetingScheduled), hint: "Interview set", tone: "info" },
    { title: "Approved", value: String(summary.approved), hint: "Finalized approvals", tone: "success" },
    { title: "Rejected", value: String(summary.rejected), hint: "Finalized rejections", tone: "danger" },
    { title: "Waitlisted", value: String(summary.waitlisted), hint: "Awaiting vacancy", tone: "warning" },
  ];

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="General Application Review"
      description="Review, schedule meetings, and finalize general application outcomes."
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Application Queue" description="Search, filter, and take action on submitted applications.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              className="xl:col-span-2"
              placeholder="Search by student name, email, or registration no."
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

            <Input
              placeholder="Department"
              value={filters.department}
              onChange={(event) => handleFilterChange("department", event.target.value)}
            />

            <Select value={filters.semester} onChange={(event) => handleFilterChange("semester", event.target.value)}>
              <option value="">All Semesters</option>
              {semesterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {hallApplicationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading hall applications..." /> : null}
          {!isLoading && error ? (
            <ErrorState
              title="Unable to load applications"
              description={error}
              actionLabel="Retry"
              onAction={fetchApplications}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={[
                    "Student",
                    "Email",
                    "Reg No",
                    "Department",
                    "Semester",
                    "Applied",
                    "Meeting",
                    "Status",
                    "Actions",
                  ]}
                  rows={items}
                  emptyTitle="No general applications found"
                  emptyDescription="Try adjusting filters."
                  renderRow={(application) => (
                    <tr key={application.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium">{application.student?.user?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{application.student?.user?.email || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{application.registrationNumber}</td>
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
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/general-applications/${application.id}`)}>
                              View
                            </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((application) => (
                  <article key={application.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{application.student?.user?.name || "N/A"}</h3>
                        <p className="text-xs text-slate-400">{application.student?.user?.email || "N/A"}</p>
                      </div>
                      <StatusBadge tone={hallApplicationStatusTone(application.status)}>
                        {hallApplicationStatusLabel(application.status)}
                      </StatusBadge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Reg No</dt>
                        <dd>{application.registrationNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Department</dt>
                        <dd>{application.department}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Semester</dt>
                        <dd>{application.semester}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Applied</dt>
                        <dd>{formatDate(application.applicationDate)}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/general-applications/${application.id}`)}>
                        View
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>
    </DetailPageShell>
  );
}

export default ProvostHallApplicationsPage;
