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
import { staffApi } from "@/api/staffApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Name (A-Z)", value: "name:asc" },
  { label: "Name (Z-A)", value: "name:desc" },
  { label: "Joining Date (New-Old)", value: "joiningDate:desc" },
  { label: "Joining Date (Old-New)", value: "joiningDate:asc" },
];

const defaultFilters = {
  search: "",
  department: "",
  designation: "",
  isActive: "",
  sort: "createdAt:desc",
};

function toneFromActive(isActive) {
  return isActive ? "success" : "danger";
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString();
}

function ProvostStaffManagementPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [staffItems, setStaffItems] = useState([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    byDepartment: [],
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await staffApi.listStaff({
        page,
        limit,
        search: filters.search,
        department: filters.department || undefined,
        designation: filters.designation || undefined,
        isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
        sortBy,
        sortOrder,
      });

      setStaffItems(result.items || []);
      setSummary(
        result.summary || {
          totalStaff: 0,
          activeStaff: 0,
          inactiveStaff: 0,
          byDepartment: [],
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch staff."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.department, filters.designation, filters.isActive, filters.search, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const leadingDepartment = summary.byDepartment?.[0];
  const summaryCards = [
    { title: "Total Staff", value: String(summary.totalStaff), hint: "Current filtered result", tone: "primary" },
    { title: "Active Staff", value: String(summary.activeStaff), hint: "Can access system", tone: "success" },
    { title: "Inactive Staff", value: String(summary.inactiveStaff), hint: "Currently disabled", tone: "warning" },
    {
      title: "Top Department",
      value: leadingDepartment?.department || "N/A",
      hint: leadingDepartment ? `${leadingDepartment.count} staff` : "No department data",
      tone: "info",
    },
  ];

  const hasRows = staffItems.length > 0;

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Staff Management"
      description="Manage staff accounts and employment records."
      actions={[
        <Button key="create" onClick={() => navigate("/provost/staff-management/create")}>
          <Plus size={16} className="mr-1" />
          Create Staff
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Staff Directory" description="Search, filter, and maintain staff records.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              placeholder="Search by name, email, or staff ID"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              className="xl:col-span-2"
            />

            <Input
              placeholder="Department"
              value={filters.department}
              onChange={(event) => handleFilterChange("department", event.target.value)}
            />

            <Input
              placeholder="Designation"
              value={filters.designation}
              onChange={(event) => handleFilterChange("designation", event.target.value)}
            />

            <Select value={filters.isActive} onChange={(event) => handleFilterChange("isActive", event.target.value)}>
              <option value="">All Account States</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[220px_auto] sm:items-center">
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">Showing {meta.total || 0} staff records</p>
          </div>

          {isLoading ? <LoadingState label="Loading staff..." /> : null}
          {!isLoading && error ? (
            <ErrorState
              title="Unable to load staff records"
              description={error}
              actionLabel="Retry"
              onAction={fetchStaff}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={[
                    "Name",
                    "Email",
                    "Phone",
                    "Staff ID",
                    "Department",
                    "Designation",
                    "Joining Date",
                    "Status",
                    "Actions",
                  ]}
                  rows={staffItems}
                  emptyTitle="No staff found"
                  emptyDescription="Try adjusting your search and filter criteria."
                  renderRow={(staff) => (
                    <tr key={staff.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium">{staff.user?.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{staff.user?.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{staff.user?.phone || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{staff.staffId}</td>
                      <td className="px-4 py-3 text-slate-300">{staff.department}</td>
                      <td className="px-4 py-3 text-slate-300">{staff.designation}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(staff.joiningDate)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneFromActive(staff.isActive)}>
                          {staff.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/provost/staff-management/${staff.id}`)}>
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
                  staffItems.map((staff) => (
                    <article key={staff.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{staff.user?.name || "-"}</h3>
                          <p className="text-xs text-slate-400">{staff.user?.email || "-"}</p>
                        </div>
                        <StatusBadge tone={toneFromActive(staff.isActive)}>
                          {staff.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-500">Staff ID</dt>
                          <dd>{staff.staffId}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Department</dt>
                          <dd>{staff.department}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Designation</dt>
                          <dd>{staff.designation}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Joining Date</dt>
                          <dd>{formatDate(staff.joiningDate)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/provost/staff-management/${staff.id}`)}>
                          View
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-700/60 bg-bg-card/70 p-5 text-sm text-slate-400">
                    No staff found.{" "}
                    <Link to="/provost/staff-management/create" className="text-cyan-300 hover:text-cyan-200">
                      Create a staff account
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

export default ProvostStaffManagementPage;
