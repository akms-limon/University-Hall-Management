import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import { roomApi } from "@/api/roomApi";
import {
  allocationYearOptions,
  roomAllocationRequestTypeLabel,
  roomAllocationRequestTypeOptions,
  roomAllocationStatusLabel,
  roomAllocationStatusOptions,
  roomAllocationStatusTone,
  semesterOptions,
} from "@/features/room-allocation/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "allocationDate:desc" },
  { label: "Oldest", value: "allocationDate:asc" },
  { label: "Status (A-Z)", value: "status:asc" },
  { label: "Status (Z-A)", value: "status:desc" },
];

const defaultFilters = {
  search: "",
  roomId: "",
  semester: "",
  allocationYear: "",
  requestType: "",
  status: "",
  sort: "allocationDate:desc",
};

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function quickActionForStatus(status) {
  if (status === "approved") return "activate";
  if (status === "active") return "complete";
  return null;
}

function quickActionLabel(action) {
  if (action === "approve") return "Approve";
  if (action === "activate") return "Activate";
  if (action === "complete") return "Complete";
  return "Action";
}

function quickActionDescription(action) {
  if (action === "activate") return "This will activate allocation and update room occupancy.";
  if (action === "complete") return "This will release the room and complete this allocation.";
  return "";
}

function ProvostRoomAllocationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalAllocations: 0,
    totalNewRequests: 0,
    totalTransferRequests: 0,
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
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    allocation: null,
    action: null,
  });
  const [isMutating, setIsMutating] = useState(false);

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchRooms = useCallback(async () => {
    try {
      const result = await roomApi.listRooms({
        limit: 100,
        sortBy: "roomNumber",
        sortOrder: "asc",
      });
      setRooms(result.items || []);
    } catch {
      setRooms([]);
    }
  }, []);

  const fetchAllocations = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await roomAllocationApi.listAllocations({
        page,
        limit,
        search: filters.search || undefined,
        roomId: filters.roomId || undefined,
        semester: filters.semester ? Number(filters.semester) : undefined,
        allocationYear: filters.allocationYear ? Number(filters.allocationYear) : undefined,
        requestType: filters.requestType || undefined,
        status: filters.status || undefined,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(
        result.summary || {
          totalAllocations: 0,
          totalNewRequests: 0,
          totalTransferRequests: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          active: 0,
          completed: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch room allocation records."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.allocationYear,
    filters.roomId,
    filters.requestType,
    filters.search,
    filters.semester,
    filters.status,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const summaryCards = [
    { title: "Total", value: String(summary.totalAllocations), hint: "All records", tone: "primary" },
    { title: "New Room Request", value: String(summary.totalNewRequests), hint: "Fresh requests", tone: "info" },
    { title: "Transfer Request", value: String(summary.totalTransferRequests), hint: "Room transfers", tone: "warning" },
    { title: "Pending", value: String(summary.pending), hint: "Awaiting review", tone: "warning" },
    { title: "Approved", value: String(summary.approved), hint: "Ready to activate", tone: "info" },
    { title: "Active", value: String(summary.active), hint: "Currently allocated", tone: "success" },
    { title: "Rejected", value: String(summary.rejected), hint: "Declined", tone: "danger" },
    { title: "Completed", value: String(summary.completed), hint: "Released", tone: "neutral" },
  ];

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openQuickActionConfirm = (allocation, action) => {
    setConfirmState({
      open: true,
      allocation,
      action,
    });
  };

  const runQuickAction = async () => {
    if (!confirmState.allocation || !confirmState.action) return;
    setIsMutating(true);
    setError("");
    try {
      if (confirmState.action === "activate") {
        await roomAllocationApi.activateAllocation(confirmState.allocation.id);
      }
      if (confirmState.action === "complete") {
        await roomAllocationApi.completeAllocation(confirmState.allocation.id);
      }
      setConfirmState({ open: false, allocation: null, action: null });
      await fetchAllocations();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "Failed to update allocation status."));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Room Allocation Management"
      description="Review requests, activate allocations, release assignments, and transfer students."
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Allocation Queue" description="Search, filter, and process room allocation records.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <Input
              className="xl:col-span-2"
              placeholder="Search by student name, email, reg no."
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

            <Select value={filters.roomId} onChange={(event) => handleFilterChange("roomId", event.target.value)}>
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber}
                </option>
              ))}
            </Select>

            <Select value={filters.semester} onChange={(event) => handleFilterChange("semester", event.target.value)}>
              <option value="">All Semesters</option>
              {semesterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              value={filters.allocationYear}
              onChange={(event) => handleFilterChange("allocationYear", event.target.value)}
            >
              <option value="">All Years</option>
              {allocationYearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {roomAllocationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.requestType} onChange={(event) => handleFilterChange("requestType", event.target.value)}>
              <option value="">All Request Types</option>
              {roomAllocationRequestTypeOptions.map((option) => (
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

          {isLoading ? <LoadingState label="Loading room allocations..." /> : null}
          {!isLoading && error ? (
            <ErrorState
              title="Unable to load room allocations"
              description={error}
              actionLabel="Retry"
              onAction={fetchAllocations}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={[
                    "Student",
                    "Registration",
                    "Room",
                    "Request Type",
                    "Semester",
                    "Year",
                    "Allocated",
                    "Status",
                    "Approved By",
                    "Actions",
                  ]}
                  rows={items}
                  emptyTitle="No allocation records found"
                  emptyDescription="Try adjusting filters."
                  renderRow={(allocation) => {
                    const quickAction = quickActionForStatus(allocation.status);
                    return (
                      <tr key={allocation.id} className="border-b border-slate-800/70 last:border-none align-top">
                        <td className="px-4 py-3 font-medium">{allocation.student?.user?.name || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.student?.registrationNumber || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.room?.roomNumber || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-300">{roomAllocationRequestTypeLabel(allocation.requestType)}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.semester}</td>
                        <td className="px-4 py-3 text-slate-300">{allocation.allocationYear}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(allocation.allocationDate)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                            {roomAllocationStatusLabel(allocation.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{allocation.approvedBy?.name || "N/A"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/provost/room-allocation/${allocation.id}`)}
                            >
                              View
                            </Button>
                            {quickAction ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openQuickActionConfirm(allocation, quickAction)}
                              >
                                {quickActionLabel(quickAction)}
                              </Button>
                            ) : null}
                            {["pending", "approved", "active"].includes(allocation.status) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/provost/room-allocation/${allocation.id}`)}
                              >
                                {allocation.status === "active" ? "Transfer" : "Reject"}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((allocation) => {
                  const quickAction = quickActionForStatus(allocation.status);
                  return (
                    <article key={allocation.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{allocation.student?.user?.name || "N/A"}</h3>
                          <p className="text-xs text-slate-400">
                            {roomAllocationRequestTypeLabel(allocation.requestType)} - Room {allocation.room?.roomNumber || "N/A"}
                          </p>
                        </div>
                        <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                          {roomAllocationStatusLabel(allocation.status)}
                        </StatusBadge>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>Year: {allocation.allocationYear}</span>
                        <span>Date: {formatDate(allocation.allocationDate)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/provost/room-allocation/${allocation.id}`)}
                        >
                          View
                        </Button>
                        {quickAction ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openQuickActionConfirm(allocation, quickAction)}
                          >
                            {quickActionLabel(quickAction)}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, allocation: null, action: null })}
        onConfirm={runQuickAction}
        title={`${quickActionLabel(confirmState.action)} this allocation?`}
        description={quickActionDescription(confirmState.action)}
        confirmLabel={isMutating ? "Processing..." : quickActionLabel(confirmState.action)}
        confirmDisabled={isMutating}
      />
    </DetailPageShell>
  );
}

export default ProvostRoomAllocationsPage;
