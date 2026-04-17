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
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import { studentApi } from "@/api/studentApi";
import {
  roomAllocationStatusLabel,
  roomAllocationStatusOptions,
  roomAllocationStatusTone,
} from "@/features/room-allocation/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "allocationDate:desc" },
  { label: "Oldest", value: "allocationDate:asc" },
  { label: "Status (A-Z)", value: "status:asc" },
  { label: "Status (Z-A)", value: "status:desc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StudentRoomAllocationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "",
    sort: "allocationDate:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalAllocations: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    completed: 0,
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isAllocatedStudent, setIsAllocatedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const latest = items[0] || null;
  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchAllocations = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [result, profileResult] = await Promise.all([
        roomAllocationApi.listMyAllocations({
          page,
          limit,
          status: filters.status || undefined,
          sortBy,
          sortOrder,
        }),
        studentApi.getMyProfile(),
      ]);

      const allocationItems = result.items || [];
      setItems(allocationItems);

      const allocationStatus = String(profileResult?.student?.allocationStatus || "").toLowerCase();
      const hasTransferEligibilityByProfile =
        ["allocated", "requested"].includes(allocationStatus) || Boolean(profileResult?.student?.currentRoom);

      const hasTransferEligibilityByItems = allocationItems.some((allocation) =>
        ["approved", "active"].includes(String(allocation?.status || "").toLowerCase())
      );
      const hasTransferEligibilityBySummary =
        Number(result?.summary?.approved || 0) > 0 || Number(result?.summary?.active || 0) > 0;

      setIsAllocatedStudent(
        hasTransferEligibilityByProfile || hasTransferEligibilityByItems || hasTransferEligibilityBySummary
      );
      setSummary(
        result.summary || {
          totalAllocations: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          active: 0,
          completed: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch room allocations."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const summaryItems = [
    { title: "Total", value: String(summary.totalAllocations), hint: "All requests and assignments", tone: "primary" },
    { title: "Pending", value: String(summary.pending), hint: "Awaiting review", tone: "warning" },
    { title: "Approved", value: String(summary.approved), hint: "Ready for activation", tone: "info" },
    { title: "Active", value: String(summary.active), hint: "Current room assignments", tone: "success" },
    { title: "Rejected", value: String(summary.rejected), hint: "Declined requests", tone: "danger" },
    { title: "Completed", value: String(summary.completed), hint: "Past allocations", tone: "neutral" },
  ];
  const isRequestTypeResolved = typeof isAllocatedStudent === "boolean";

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="My Room Allocations"
      description="Track your request history and current room assignment status."
      actions={
        isRequestTypeResolved
          ? [
              <Button
                key="new"
                onClick={() =>
                  navigate(
                    isAllocatedStudent
                      ? "/student/room-allocation/transfer/new"
                      : "/student/room-allocation/new"
                  )
                }
              >
                <Plus size={16} className="mr-1" />
                {isAllocatedStudent ? "Transfer Request" : "New Room Request"}
              </Button>,
            ]
          : []
      }
    >
      <SummaryGrid items={summaryItems} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ContentSection title="Allocation Records" description="Full request and assignment history.">
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
                {roomAllocationStatusOptions.map((option) => (
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

            {isLoading ? <LoadingState label="Loading room allocations..." /> : null}
            {!isLoading && error ? (
              <ErrorState
                title="Unable to load room allocations"
                description={error}
                actionLabel="Retry"
                onAction={fetchAllocations}
              />
            ) : null}

            {!isLoading && !error && items.length === 0 && isRequestTypeResolved ? (
              <EmptyState
                title="No room allocation records yet"
                description="Submit your first room allocation request to begin."
                actionLabel={isAllocatedStudent ? "Submit Transfer Request" : "Request Room Allocation"}
                onAction={() =>
                  navigate(
                    isAllocatedStudent
                      ? "/student/room-allocation/transfer/new"
                      : "/student/room-allocation/new"
                  )
                }
              />
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <DataTableShell
                    columns={["Room", "Semester", "Year", "Allocated", "Released", "Status", "Actions"]}
                    rows={items}
                    renderRow={(allocation) => (
                      <tr key={allocation.id} className="border-b border-slate-800/70 last:border-none">
                        <td className="px-4 py-3 text-slate-200">{allocation.room?.roomNumber || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.semester}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.allocationYear}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(allocation.allocationDate)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(allocation.releaseDate)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                            {roomAllocationStatusLabel(allocation.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/student/room-allocation/${allocation.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    )}
                  />
                </div>

                <div className="grid gap-3 md:hidden">
                  {items.map((allocation) => (
                    <article key={allocation.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{allocation.room?.roomNumber || "N/A"}</p>
                          <p className="text-xs text-slate-400">
                            Semester {allocation.semester} - {allocation.allocationYear}
                          </p>
                        </div>
                        <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                          {roomAllocationStatusLabel(allocation.status)}
                        </StatusBadge>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>Allocated: {formatDate(allocation.allocationDate)}</span>
                        <span>Released: {formatDate(allocation.releaseDate)}</span>
                      </div>

                      <Button
                        className="mt-3"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/student/room-allocation/${allocation.id}`)}
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

        <ContentSection title="Current Allocation Snapshot" description="Latest assignment and status update.">
          {latest ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">Current Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge tone={roomAllocationStatusTone(latest.status)}>
                    {roomAllocationStatusLabel(latest.status)}
                  </StatusBadge>
                  <span className="text-xs text-slate-400">
                    Room {latest.room?.roomNumber || "N/A"}
                  </span>
                </div>
              </div>

              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Allocation Date</dt>
                  <dd>{formatDate(latest.allocationDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Release Date</dt>
                  <dd>{formatDate(latest.releaseDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Semester</dt>
                  <dd>{latest.semester}</dd>
                </div>
              </dl>

              <Link
                to="/student/room-allocation/current"
                className="inline-flex text-sm text-cyan-300 hover:text-cyan-200"
              >
                Open current allocation details
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No allocation records yet. Submit a room request to get started.
            </p>
          )}
        </ContentSection>
      </section>
    </DetailPageShell>
  );
}

export default StudentRoomAllocationsPage;
