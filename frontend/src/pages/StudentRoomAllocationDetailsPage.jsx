import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import {
  roomAllocationStatusLabel,
  roomAllocationStatusTone,
} from "@/features/room-allocation/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentRoomAllocationDetailsPage({ useLatest = false }) {
  const { allocationId } = useParams();
  const navigate = useNavigate();
  const [allocation, setAllocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAllocation = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      if (useLatest) {
        const latest = await roomAllocationApi.getMyLatestAllocation();
        setAllocation(latest.allocation || null);
      } else {
        const result = await roomAllocationApi.getMyAllocationById(allocationId);
        setAllocation(result.allocation);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load room allocation details."));
    } finally {
      setIsLoading(false);
    }
  }, [allocationId, useLatest]);

  useEffect(() => {
    loadAllocation();
  }, [loadAllocation]);

  const summaryItems = useMemo(() => {
    if (!allocation) return [];
    return [
      {
        title: "Room",
        value: allocation.room?.roomNumber || "N/A",
        hint: `Floor ${allocation.room?.floor || "-"} - ${allocation.room?.wing || "-"}`,
        tone: "primary",
      },
      {
        title: "Status",
        value: roomAllocationStatusLabel(allocation.status),
        hint: "Current allocation stage",
        tone: roomAllocationStatusTone(allocation.status),
      },
      {
        title: "Allocation Date",
        value: new Date(allocation.allocationDate).toLocaleDateString(),
        hint: "Start of request or assignment",
        tone: "info",
      },
      {
        title: "Release Date",
        value: allocation.releaseDate ? new Date(allocation.releaseDate).toLocaleDateString() : "N/A",
        hint: "Shown after completion",
        tone: "neutral",
      },
    ];
  }, [allocation]);

  const roommateEntries = useMemo(() => {
    if (!allocation?.room?.occupants?.length) return [];

    const currentStudentId = allocation.studentId;
    return allocation.room.occupants.filter((occupant) => occupant?.id && occupant.id !== currentStudentId);
  }, [allocation]);

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title={useLatest ? "Current Room Allocation" : "Room Allocation Details"}
      description="Review request reason, status updates, and assignment information."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/room-allocation")}>
          Back to Allocation History
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading room allocation..." /> : null}

      {!isLoading && error ? (
        <ErrorState
          title="Unable to load room allocation"
          description={error}
          actionLabel="Retry"
          onAction={loadAllocation}
        />
      ) : null}

      {!isLoading && !error && !allocation ? (
        <ErrorState
          title="No allocation record found"
          description="You do not have any room allocation record yet."
          actionLabel="Back to History"
          onAction={() => navigate("/student/room-allocation")}
        />
      ) : null}

      {!isLoading && !error && allocation ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Allocation Summary" description="Core allocation metadata.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Status</dt>
                  <dd>
                    <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                      {roomAllocationStatusLabel(allocation.status)}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Semester</dt>
                  <dd>{allocation.semester}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Allocation Year</dt>
                  <dd>{allocation.allocationYear}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Allocation Date</dt>
                  <dd>{formatDate(allocation.allocationDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Release Date</dt>
                  <dd>{formatDate(allocation.releaseDate)}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Room Details" description="Assigned room information.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Room Number</dt>
                  <dd>{allocation.room?.roomNumber || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Floor</dt>
                  <dd>{allocation.room?.floor ?? "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Wing</dt>
                  <dd>{allocation.room?.wing || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Room Status</dt>
                  <dd>{allocation.room?.status || "N/A"}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-slate-800/70 pt-3">
                <p className="text-sm text-slate-300">Roommates Contact No.</p>
                {roommateEntries.length ? (
                  <ul className="mt-2 space-y-2">
                    {roommateEntries.map((occupant) => (
                      <li
                        key={occupant.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-xs"
                      >
                        <span className="text-slate-300">
                          {occupant.user?.name || occupant.registrationNumber || "Roommate"}
                        </span>
                        <span className="text-cyan-300">{occupant.user?.phone || "Not provided"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No roommate contact available yet.</p>
                )}
              </div>
            </ContentSection>

            <ContentSection title="Request and Review Notes" description="Reason and decision context.">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-slate-400">Request Reason</dt>
                  <dd className="mt-1">{allocation.requestReason || "No request reason provided."}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Rejection Reason</dt>
                  <dd className="mt-1">{allocation.rejectionReason || "Not applicable."}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Approval Information" description="Reviewing authority and timeline.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Approved/Reviewed By</dt>
                  <dd>{allocation.approvedBy?.name || "Pending review"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Reviewer Email</dt>
                  <dd>{allocation.approvedBy?.email || "N/A"}</dd>
                </div>
              </dl>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentRoomAllocationDetailsPage;
