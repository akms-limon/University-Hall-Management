import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomApi } from "@/api/roomApi";
import { roomStatusLabel, roomStatusTone } from "@/features/room-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function toneFromActive(isActive) {
  return isActive ? "success" : "danger";
}

function ProvostRoomDetailsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadRoom = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await roomApi.getRoomById(roomId);
      setRoom(result.room);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch room details."));
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const summaryItems = useMemo(() => {
    if (!room) return [];
    return [
      {
        title: "Room Number",
        value: room.roomNumber || "-",
        hint: `Floor ${room.floor || "-"} • ${room.wing || "-"}`,
        tone: "primary",
      },
      {
        title: "Status",
        value: roomStatusLabel(room.status),
        hint: "Operational state",
        tone: roomStatusTone(room.status),
      },
      {
        title: "Capacity",
        value: String(room.capacity || 0),
        hint: `${room.occupantCount || 0} currently assigned`,
        tone: "info",
      },
      {
        title: "Available Seats",
        value: String(room.availableSeatCount || 0),
        hint: "Open beds",
        tone: "success",
      },
    ];
  }, [room]);

  const handleStatusUpdate = async () => {
    if (!room) return;
    setIsUpdatingStatus(true);
    setError("");
    try {
      const result = await roomApi.updateRoomStatus(room.id, !room.isActive);
      setRoom(result.room);
      setStatusDialogOpen(false);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "Failed to update room status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title={room ? `Room ${room.roomNumber}` : "Room Details"}
      description="Detailed room inventory profile with occupancy and maintenance context."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/room-management")}>
          Back to List
        </Button>,
        <Button key="edit" onClick={() => navigate(`/provost/room-management/${roomId}/edit`)} disabled={!room}>
          Edit Room
        </Button>,
        <Button key="status" variant="danger" onClick={() => setStatusDialogOpen(true)} disabled={!room}>
          {room?.isActive ? "Deactivate" : "Activate"}
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading room details..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load room details" description={error} actionLabel="Retry" onAction={loadRoom} />
      ) : null}

      {!isLoading && !error && room ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Room Metadata" description="Core inventory and state information.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Room Number</dt>
                  <dd>{room.roomNumber}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Floor</dt>
                  <dd>{room.floor}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Wing</dt>
                  <dd>{room.wing}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Status</dt>
                  <dd>
                    <StatusBadge tone={roomStatusTone(room.status)}>{roomStatusLabel(room.status)}</StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Active State</dt>
                  <dd>
                    <StatusBadge tone={toneFromActive(room.isActive)}>{room.isActive ? "Active" : "Inactive"}</StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Last Cleaned</dt>
                  <dd>{formatDate(room.lastCleaned)}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Capacity and Occupancy" description="Current occupancy distribution for this room.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Capacity</dt>
                  <dd>{room.capacity}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Occupant Count</dt>
                  <dd>{room.occupantCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Available Seats</dt>
                  <dd>{room.availableSeatCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Occupancy Label</dt>
                  <dd>{room.occupancyLabel}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Features and Amenities" description="Configured room capabilities and facilities.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Features</p>
                  {room.features?.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {room.features.map((feature) => (
                        <li
                          key={feature}
                          className="rounded-full border border-slate-700/70 bg-slate-900/50 px-2 py-1 text-xs text-slate-200"
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">No features listed.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-400">Amenities</p>
                  {room.amenities?.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {room.amenities.map((amenity) => (
                        <li
                          key={amenity}
                          className="rounded-full border border-slate-700/70 bg-slate-900/50 px-2 py-1 text-xs text-slate-200"
                        >
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">No amenities listed.</p>
                  )}
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Maintenance Notes" description="Operational notes and follow-up details.">
              {room.maintenanceNotes ? (
                <p className="text-sm leading-6 text-slate-200">{room.maintenanceNotes}</p>
              ) : (
                <p className="text-sm text-slate-400">No maintenance notes provided.</p>
              )}
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleStatusUpdate}
        title={room?.isActive ? "Deactivate this room?" : "Activate this room?"}
        description={
          room?.isActive
            ? "This room will be hidden from student room availability pages."
            : "This room will be visible to students if status allows."
        }
        confirmLabel={isUpdatingStatus ? "Updating..." : room?.isActive ? "Deactivate" : "Activate"}
        confirmDisabled={isUpdatingStatus}
      />
    </DetailPageShell>
  );
}

export default ProvostRoomDetailsPage;
