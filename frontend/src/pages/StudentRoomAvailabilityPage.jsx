import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomApi } from "@/api/roomApi";
import { roomStatusLabel, roomStatusOptions, roomStatusTone } from "@/features/room-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
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
  sort: "roomNumber:asc",
};

function StudentRoomAvailabilityPage() {
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
  });
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await roomApi.listPublicRooms({
        page,
        limit,
        search: filters.search || undefined,
        floor: filters.floor === "" ? undefined : Number(filters.floor),
        wing: filters.wing || undefined,
        status: filters.status || undefined,
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
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch room availability."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.floor, filters.search, filters.status, filters.wing, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryCards = [
    { title: "Visible Rooms", value: String(summary.totalRooms || 0), hint: "Active room inventory", tone: "primary" },
    { title: "Vacant", value: String(summary.vacantRooms || 0), hint: "Available now", tone: "success" },
    { title: "Occupied", value: String(summary.occupiedRooms || 0), hint: "In use", tone: "info" },
    { title: "Maintenance", value: String(summary.maintenanceRooms || 0), hint: "Temporarily unavailable", tone: "warning" },
  ];

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Room Availability"
      description="Browse hall rooms with seat availability and current status."
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Available Room Listings" description="Filter rooms by floor, wing, and current status.">
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

            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading room availability..." /> : null}
          {!isLoading && error ? (
            <ErrorState
              title="Unable to load room availability"
              description={error}
              actionLabel="Retry"
              onAction={fetchRooms}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Room", "Floor", "Wing", "Capacity", "Available", "Status", "Features", "Actions"]}
                  rows={rooms}
                  emptyTitle="No rooms found"
                  emptyDescription="No rooms match your current filters."
                  renderRow={(room) => (
                    <tr key={room.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium">{room.roomNumber}</td>
                      <td className="px-4 py-3 text-slate-300">{room.floor}</td>
                      <td className="px-4 py-3 text-slate-300">{room.wing}</td>
                      <td className="px-4 py-3 text-slate-300">{room.capacity}</td>
                      <td className="px-4 py-3 text-slate-300">{room.availableSeatCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={roomStatusTone(room.status)}>{roomStatusLabel(room.status)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {room.features?.length ? room.features.slice(0, 2).join(", ") : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/student/room-availability/${room.id}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {!rooms.length ? (
                  <EmptyState title="No rooms found" description="Try adjusting your filters to find available rooms." />
                ) : null}

                {rooms.map((room) => (
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

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Capacity</dt>
                        <dd>{room.capacity}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Available</dt>
                        <dd>{room.availableSeatCount}</dd>
                      </div>
                    </dl>

                    <Button className="mt-3" variant="secondary" size="sm" onClick={() => navigate(`/student/room-availability/${room.id}`)}>
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
    </DetailPageShell>
  );
}

export default StudentRoomAvailabilityPage;
