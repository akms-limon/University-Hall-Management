import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { roomApi } from "@/api/roomApi";
import { roomStatusLabel, roomStatusOptions, roomStatusTone } from "@/features/room-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Room Number (A-Z)", value: "roomNumber:asc" },
  { label: "Room Number (Z-A)", value: "roomNumber:desc" },
  { label: "Floor (Low-High)", value: "floor:asc" },
  { label: "Floor (High-Low)", value: "floor:desc" },
];

const defaultFilters = {
  search: "",
  floor: "",
  wing: "",
  status: "",
  isActive: "",
  sort: "createdAt:desc",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function toneFromActive(isActive) {
  return isActive ? "success" : "danger";
}

function ProvostRoomManagementPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rooms, setRooms] = useState([]);
  const [summary, setSummary] = useState({
    totalRooms: 0,
    vacantRooms: 0,
    occupiedRooms: 0,
    maintenanceRooms: 0,
    closedRooms: 0,
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    room: null,
  });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await roomApi.listRooms({
        page,
        limit,
        search: filters.search || undefined,
        floor: filters.floor === "" ? undefined : Number(filters.floor),
        wing: filters.wing || undefined,
        status: filters.status || undefined,
        isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
        sortBy,
        sortOrder,
      });

      setRooms(result.items || []);
      setSummary(
        result.summary || {
          totalRooms: 0,
          vacantRooms: 0,
          occupiedRooms: 0,
          maintenanceRooms: 0,
          closedRooms: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch rooms."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.floor,
    filters.isActive,
    filters.search,
    filters.status,
    filters.wing,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryCards = [
    { title: "Total Rooms", value: String(summary.totalRooms), hint: "Current filtered result", tone: "primary" },
    { title: "Vacant", value: String(summary.vacantRooms), hint: "Ready for occupancy", tone: "success" },
    { title: "Occupied", value: String(summary.occupiedRooms), hint: "Currently in use", tone: "info" },
    { title: "Maintenance", value: String(summary.maintenanceRooms), hint: "Temporarily unavailable", tone: "warning" },
    { title: "Closed", value: String(summary.closedRooms), hint: "Out of operation", tone: "danger" },
  ];

  const openStatusDialog = (room) => setStatusDialog({ open: true, room });

  const handleStatusUpdate = async () => {
    if (!statusDialog.room) return;

    setIsStatusUpdating(true);
    try {
      await roomApi.updateRoomStatus(statusDialog.room.id, !statusDialog.room.isActive);
      setStatusDialog({ open: false, room: null });
      await fetchRooms();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "Failed to update room status."));
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const hasRows = rooms.length > 0;

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Room Management"
      description="Manage room inventory, occupancy state, and operational readiness."
      actions={[
        <Button key="create" onClick={() => navigate("/provost/room-management/create")}>
          <Plus size={16} className="mr-1" />
          Create Room
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Room Directory" description="Search, filter, and maintain all hall rooms.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              className="xl:col-span-2"
              placeholder="Search by room number"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

            <Input
              type="number"
              min="0"
              placeholder="Floor"
              value={filters.floor}
              onChange={(event) => handleFilterChange("floor", event.target.value)}
            />

            <Input placeholder="Wing" value={filters.wing} onChange={(event) => handleFilterChange("wing", event.target.value)} />

            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {roomStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.isActive} onChange={(event) => handleFilterChange("isActive", event.target.value)}>
              <option value="">All Room States</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[230px_auto] sm:items-center">
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">Showing {meta.total || 0} rooms</p>
          </div>

          {isLoading ? <LoadingState label="Loading rooms..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load room records" description={error} actionLabel="Retry" onAction={fetchRooms} />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={[
                    "Room",
                    "Floor",
                    "Wing",
                    "Capacity",
                    "Occupants",
                    "Available",
                    "Status",
                    "Active",
                    "Last Cleaned",
                    "Actions",
                  ]}
                  rows={rooms}
                  emptyTitle="No rooms found"
                  emptyDescription="Try adjusting your search and filters."
                  renderRow={(room) => (
                    <tr key={room.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium">{room.roomNumber}</td>
                      <td className="px-4 py-3 text-slate-300">{room.floor}</td>
                      <td className="px-4 py-3 text-slate-300">{room.wing}</td>
                      <td className="px-4 py-3 text-slate-300">{room.capacity}</td>
                      <td className="px-4 py-3 text-slate-300">{room.occupantCount}</td>
                      <td className="px-4 py-3 text-slate-300">{room.availableSeatCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={roomStatusTone(room.status)}>{roomStatusLabel(room.status)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneFromActive(room.isActive)}>{room.isActive ? "Active" : "Inactive"}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(room.lastCleaned)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/provost/room-management/${room.id}`)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/provost/room-management/${room.id}/edit`)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openStatusDialog(room)}>
                            {room.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {hasRows ? (
                  rooms.map((room) => (
                    <article key={room.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{room.roomNumber}</h3>
                          <p className="text-xs text-slate-400">
                            Floor {room.floor} • {room.wing}
                          </p>
                        </div>
                        <StatusBadge tone={roomStatusTone(room.status)}>{roomStatusLabel(room.status)}</StatusBadge>
                      </div>

                      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-500">Capacity</dt>
                          <dd>{room.capacity}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Occupants</dt>
                          <dd>{room.occupantCount}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Available</dt>
                          <dd>{room.availableSeatCount}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">State</dt>
                          <dd>{room.isActive ? "Active" : "Inactive"}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/provost/room-management/${room.id}`)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/provost/room-management/${room.id}/edit`)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openStatusDialog(room)}>
                          {room.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-700/60 bg-bg-card/70 p-5 text-sm text-slate-400">
                    No rooms found.{" "}
                    <Link to="/provost/room-management/create" className="text-cyan-300 hover:text-cyan-200">
                      Create a room
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

      <ConfirmDialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, room: null })}
        onConfirm={handleStatusUpdate}
        title={statusDialog.room?.isActive ? "Deactivate this room?" : "Activate this room?"}
        description={
          statusDialog.room?.isActive
            ? "This room will be hidden from student availability listings until activated again."
            : "This room will become visible in availability listings if its status allows."
        }
        confirmLabel={isStatusUpdating ? "Updating..." : statusDialog.room?.isActive ? "Deactivate" : "Activate"}
        confirmDisabled={isStatusUpdating}
      />
    </DetailPageShell>
  );
}

export default ProvostRoomManagementPage;
