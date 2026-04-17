import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { studentApi } from "@/api/studentApi";
import { allocationStatusOptions } from "@/features/student-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Name (A-Z)", value: "name:asc" },
  { label: "Name (Z-A)", value: "name:desc" },
];

const defaultFilters = {
  search: "",
  department: "",
  allocationStatus: "",
  isActive: "",
  sort: "createdAt:desc",
};

function toneFromAllocation(status) {
  if (status === "allocated") return "success";
  if (status === "pending") return "warning";
  if (status === "requested") return "info";
  return "neutral";
}

function toneFromActive(isActive) {
  return isActive ? "success" : "danger";
}

function formatBalance(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function ProvostStudentManagementPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    activeStudents: 0,
    pendingAllocation: 0,
    allocatedStudents: 0,
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await studentApi.listStudents({
        page,
        limit,
        search: filters.search,
        department: filters.department,
        allocationStatus: filters.allocationStatus || undefined,
        isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
        sortBy,
        sortOrder,
      });

      setStudents(result.items || []);
      setSummary(
        result.summary || {
          totalStudents: 0,
          activeStudents: 0,
          pendingAllocation: 0,
          allocatedStudents: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch students."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.allocationStatus, filters.department, filters.isActive, filters.search, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const summaryCards = [
    { title: "Total Students", value: String(summary.totalStudents), hint: "Current filtered result", tone: "primary" },
    { title: "Active Students", value: String(summary.activeStudents), hint: "Can access system", tone: "success" },
    { title: "Pending Allocation", value: String(summary.pendingAllocation), hint: "Awaiting room allocation", tone: "warning" },
    { title: "Allocated", value: String(summary.allocatedStudents), hint: "Already assigned", tone: "info" },
  ];

  const hasRows = students.length > 0;

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Student Management"
      description="Create, monitor, and maintain all student records from a single control center."
      actions={[
        <Button key="create" onClick={() => navigate("/provost/student-management/create")}>
          <Plus size={16} className="mr-1" />
          Create Student
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Student Directory" description="Search, filter, and manage student records.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              placeholder="Search by name, email, or registration number"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              className="xl:col-span-2"
            />

            <Input
              placeholder="Department"
              value={filters.department}
              onChange={(event) => handleFilterChange("department", event.target.value)}
            />

            <Select
              value={filters.allocationStatus}
              onChange={(event) => handleFilterChange("allocationStatus", event.target.value)}
            >
              <option value="">All Allocation Status</option>
              {allocationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.isActive} onChange={(event) => handleFilterChange("isActive", event.target.value)}>
              <option value="">All Account States</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[200px_auto] sm:items-center">
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">Showing {meta.total || 0} students</p>
          </div>

          {isLoading ? <LoadingState label="Loading students..." /> : null}
          {!isLoading && error ? (
            <ErrorState
              title="Unable to load student records"
              description={error}
              actionLabel="Retry"
              onAction={fetchStudents}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={[
                    "Name",
                    "Phone",
                    "Reg No",
                    "Department",
                    "Room",
                    "Allocation",
                    "Balance",
                    "Status",
                    "Actions",
                  ]}
                  rows={students}
                  emptyTitle="No students found"
                  emptyDescription="Try adjusting your search and filter criteria."
                  renderRow={(student) => (
                    <tr key={student.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium">{student.user?.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{student.user?.phone || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{student.registrationNumber || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{student.department}</td>
                      <td className="px-4 py-3 text-slate-300">{student.currentRoom || "N/A"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneFromAllocation(student.allocationStatus)}>
                          {student.allocationStatus}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatBalance(student.balance)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneFromActive(student.isActive)}>
                          {student.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/provost/student-management/${student.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {hasRows ? (
                  students.map((student) => (
                    <article key={student.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{student.user?.name || "-"}</h3>
                          <p className="text-xs text-slate-400">{student.registrationNumber || "-"}</p>
                        </div>
                        <StatusBadge tone={toneFromActive(student.isActive)}>
                          {student.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-slate-500">Reg No</dt>
                          <dd>{student.registrationNumber || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Department</dt>
                          <dd>{student.department}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Balance</dt>
                          <dd>{formatBalance(student.balance)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/provost/student-management/${student.id}`)}>
                          View
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-700/60 bg-bg-card/70 p-5 text-sm text-slate-400">
                    No students found.{" "}
                    <Link to="/provost/student-management/create" className="text-cyan-300 hover:text-cyan-200">
                      Create a student
                    </Link>
                    .
                  </p>
                )}
              </div>

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>
    </DetailPageShell>
  );
}

export default ProvostStudentManagementPage;
