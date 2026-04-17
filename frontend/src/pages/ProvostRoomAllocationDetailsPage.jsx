import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import { roomApi } from "@/api/roomApi";
import {
  allocationYearOptions,
  roomAllocationRequestTypeLabel,
  roomAllocationStatusLabel,
  roomAllocationStatusTone,
  semesterOptions,
} from "@/features/room-allocation/constants";
import {
  activateAllocationSchema,
  completeAllocationSchema,
  rejectAllocationSchema,
  transferAllocationSchema,
} from "@/features/room-allocation/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function ProvostRoomAllocationDetailsPage() {
  const { allocationId } = useParams();
  const navigate = useNavigate();
  const [allocation, setAllocation] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalRoomId, setApprovalRoomId] = useState("");
  const [allocationDate, setAllocationDate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [toRoomId, setToRoomId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSemester, setTransferSemester] = useState(String(new Date().getMonth() + 1));
  const [transferYear, setTransferYear] = useState(String(new Date().getFullYear()));
  const [confirmState, setConfirmState] = useState({ open: false, action: null });

  const loadAllocation = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [allocationResult, roomsResult] = await Promise.all([
        roomAllocationApi.getAllocationById(allocationId),
        roomApi.listRooms({ limit: 100, sortBy: "roomNumber", sortOrder: "asc" }),
      ]);
      const fetchedAllocation = allocationResult.allocation;
      setAllocation(fetchedAllocation);
      setRooms(roomsResult.items || []);
      setRejectionReason(fetchedAllocation.rejectionReason || "");
      setApprovalRoomId(fetchedAllocation.room?.id || "");
      setAllocationDate(
        fetchedAllocation.allocationDate
          ? new Date(fetchedAllocation.allocationDate).toISOString().slice(0, 16)
          : ""
      );
      setReleaseDate(
        fetchedAllocation.releaseDate ? new Date(fetchedAllocation.releaseDate).toISOString().slice(0, 16) : ""
      );
      setTransferSemester(String(fetchedAllocation.semester || 1));
      setTransferYear(String(fetchedAllocation.allocationYear || new Date().getFullYear()));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load allocation details."));
    } finally {
      setIsLoading(false);
    }
  }, [allocationId]);

  useEffect(() => {
    loadAllocation();
  }, [loadAllocation]);

  const transferRoomOptions = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.id !== allocation?.room?.id &&
          room.isActive &&
          room.availableSeatCount > 0 &&
          room.status !== "maintenance" &&
          room.status !== "closed"
      ),
    [allocation?.room?.id, rooms]
  );

  const approvalRoomOptions = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.isActive &&
          room.status !== "maintenance" &&
          room.status !== "closed" &&
          (room.id === allocation?.room?.id || room.availableSeatCount > 0)
      ),
    [allocation?.room?.id, rooms]
  );

  const summaryItems = useMemo(() => {
    if (!allocation) return [];
    return [
      {
        title: "Student",
        value: allocation.student?.user?.name || "N/A",
        hint: allocation.student?.user?.email || "No email",
        tone: "primary",
      },
      {
        title: allocation.requestType === "transfer_request" ? "Requested Room" : "Assigned Room",
        value: allocation.room?.roomNumber || "N/A",
        hint: `Floor ${allocation.room?.floor || "-"} - ${allocation.room?.wing || "-"}`,
        tone: "info",
      },
      {
        title: "Request Type",
        value: roomAllocationRequestTypeLabel(allocation.requestType),
        hint: "Allocation request category",
        tone: allocation.requestType === "transfer_request" ? "warning" : "primary",
      },
      {
        title: "Status",
        value: roomAllocationStatusLabel(allocation.status),
        hint: "Current workflow stage",
        tone: roomAllocationStatusTone(allocation.status),
      },
      {
        title: "Allocation Date",
        value: allocation.allocationDate
          ? new Date(allocation.allocationDate).toLocaleDateString()
          : "N/A",
        hint: "Effective date",
        tone: "success",
      },
    ];
  }, [allocation]);

  const runAction = async (action) => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (action === "approve") {
        if (!approvalRoomId) {
          setError("Please assign a room number before approving.");
          return;
        }
        await roomAllocationApi.approveAllocation(allocationId, {
          roomId: approvalRoomId,
        });
        setSuccessMessage("Allocation approved successfully.");
      }

      if (action === "reject") {
        const parsed = rejectAllocationSchema.safeParse({ rejectionReason });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Rejection reason is invalid.");
          return;
        }
        await roomAllocationApi.rejectAllocation(allocationId, {
          rejectionReason: parsed.data.rejectionReason.trim(),
        });
        setSuccessMessage("Allocation rejected successfully.");
      }

      if (action === "activate") {
        const parsed = activateAllocationSchema.safeParse({ allocationDate });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Allocation date is invalid.");
          return;
        }
        await roomAllocationApi.activateAllocation(allocationId, {
          allocationDate: parsed.data.allocationDate || undefined,
        });
        setSuccessMessage("Allocation activated successfully.");
      }

      if (action === "complete") {
        const parsed = completeAllocationSchema.safeParse({ releaseDate });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Release date is invalid.");
          return;
        }
        await roomAllocationApi.completeAllocation(allocationId, {
          releaseDate: parsed.data.releaseDate || undefined,
        });
        setSuccessMessage("Allocation completed successfully.");
      }

      if (action === "transfer") {
        const parsed = transferAllocationSchema.safeParse({
          toRoomId,
          transferReason,
          semester: Number(transferSemester),
          allocationYear: Number(transferYear),
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Transfer form is invalid.");
          return;
        }
        await roomAllocationApi.transferAllocation(allocationId, {
          toRoomId: parsed.data.toRoomId,
          transferReason: parsed.data.transferReason.trim(),
          semester: Number(parsed.data.semester),
          allocationYear: Number(parsed.data.allocationYear),
        });
        setSuccessMessage("Allocation transferred successfully.");
        setToRoomId("");
        setTransferReason("");
      }

      await loadAllocation();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "Failed to update room allocation."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: null });
    }
  };

  const confirmTitleMap = {
    approve: "Approve this allocation?",
    reject: "Reject this allocation?",
    activate: "Activate this allocation?",
    complete: "Complete this allocation?",
    transfer: "Transfer this allocation?",
  };

  const confirmDescriptionMap = {
    approve: "This will assign the selected room number and move the request to approved state.",
    reject: "This will reject the request and notify the student.",
    activate: "This will assign the room and update occupancy.",
    complete: "This will release the student from the room.",
    transfer: "This will move the student to another room.",
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Room Allocation Details"
      description="Review allocation metadata and run approval, activation, completion, and transfer actions."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/room-allocation")}>
          Back to List
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading room allocation..." /> : null}

      {!isLoading && error && !allocation ? (
        <ErrorState
          title="Unable to load room allocation"
          description={error}
          actionLabel="Retry"
          onAction={loadAllocation}
        />
      ) : null}

      {!isLoading && allocation ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title="Student and Allocation Information" description="Student profile and allocation metadata.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Student Name</dt>
                  <dd>{allocation.student?.user?.name || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{allocation.student?.user?.email || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Registration Number</dt>
                  <dd>{allocation.student?.registrationNumber || "N/A"}</dd>
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
                  <dt className="text-slate-400">Status</dt>
                  <dd>
                    <StatusBadge tone={roomAllocationStatusTone(allocation.status)}>
                      {roomAllocationStatusLabel(allocation.status)}
                    </StatusBadge>
                  </dd>
                </div>
                {allocation.requestType === "transfer_request" ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-400">Current Room (Student)</dt>
                    <dd>{allocation.currentRoomNumber || allocation.currentRoom?.roomNumber || "N/A"}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Approved By</dt>
                  <dd>{allocation.approvedBy?.name || "Pending review"}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Room Summary" description="Current room and assignment timing.">
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

            <ContentSection title="Request Context" description="Reason and decision notes.">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-slate-400">Request Reason</dt>
                  <dd className="mt-1">{allocation.requestReason || "No reason provided."}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Rejection Reason</dt>
                  <dd className="mt-1">{allocation.rejectionReason || "Not applicable."}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Action Panel" description="Approve, reject, activate, complete, or transfer.">
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Assign Room Before Approval</p>
                  <Select
                    value={approvalRoomId}
                    onChange={(event) => setApprovalRoomId(event.target.value)}
                    disabled={isSaving || allocation.status !== "pending"}
                  >
                    <option value="">Select room number</option>
                    {approvalRoomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} - Floor {room.floor} ({room.availableSeatCount} seats)
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    disabled={isSaving || allocation.status !== "pending" || !approvalRoomId}
                    onClick={() => setConfirmState({ open: true, action: "approve" })}
                  >
                    Approve Allocation
                  </Button>
                  <Textarea
                    rows={2}
                    placeholder="Rejection reason (required for reject action)"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                  <Button
                    variant="danger"
                    disabled={isSaving || !["pending", "approved"].includes(allocation.status)}
                    onClick={() => setConfirmState({ open: true, action: "reject" })}
                  >
                    Reject Allocation
                  </Button>
                </div>

                <div className="grid gap-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Activation / Completion</p>
                  <Input
                    type="datetime-local"
                    value={allocationDate}
                    onChange={(event) => setAllocationDate(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={isSaving || allocation.status !== "approved"}
                    onClick={() => setConfirmState({ open: true, action: "activate" })}
                  >
                    Activate Allocation
                  </Button>

                  <Input
                    type="datetime-local"
                    value={releaseDate}
                    onChange={(event) => setReleaseDate(event.target.value)}
                  />
                  <Button
                    variant="ghost"
                    disabled={isSaving || allocation.status !== "active"}
                    onClick={() => setConfirmState({ open: true, action: "complete" })}
                  >
                    Complete / Release
                  </Button>
                </div>

                <div className="grid gap-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Transfer Student</p>
                  <p className="text-xs text-slate-400">
                    Current room: {allocation.room?.roomNumber || "N/A"}
                  </p>
                  <Select value={toRoomId} onChange={(event) => setToRoomId(event.target.value)}>
                    <option value="">Select destination room</option>
                    {transferRoomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} - Floor {room.floor} ({room.availableSeatCount} seats)
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    rows={2}
                    placeholder="Transfer reason (optional)"
                    value={transferReason}
                    onChange={(event) => setTransferReason(event.target.value)}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select value={transferSemester} onChange={(event) => setTransferSemester(event.target.value)}>
                      {semesterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Select value={transferYear} onChange={(event) => setTransferYear(event.target.value)}>
                      {allocationYearOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    disabled={isSaving || allocation.status !== "active"}
                    onClick={() => setConfirmState({ open: true, action: "transfer" })}
                  >
                    Transfer Allocation
                  </Button>
                </div>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, action: null })}
        onConfirm={() => runAction(confirmState.action)}
        title={confirmTitleMap[confirmState.action] || "Confirm action?"}
        description={confirmDescriptionMap[confirmState.action] || "This action will update the allocation."}
        confirmLabel={isSaving ? "Processing..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostRoomAllocationDetailsPage;
