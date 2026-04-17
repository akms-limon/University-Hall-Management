import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { roomAllocationApi } from "@/api/roomAllocationApi";
import { roomApi } from "@/api/roomApi";
import { studentApi } from "@/api/studentApi";
import RoomAllocationRequestFields from "@/features/room-allocation/components/RoomAllocationRequestFields";
import TransferRoomRequestFields from "@/features/room-allocation/components/TransferRoomRequestFields";
import {
  allocationYearOptions,
  roomAllocationOpenStatuses,
  roomAllocationRequestTypeLabel,
  roomAllocationStatusLabel,
  roomAllocationStatusTone,
} from "@/features/room-allocation/constants";
import { buildRequestPayload, roomAllocationRequestSchema } from "@/features/room-allocation/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultValues = {
  roomId: "",
  requestType: "new_room_request",
  requestReason: "",
  semester: "1",
  allocationYear:
    allocationYearOptions.find((option) => option.value === String(new Date().getFullYear()))?.value ||
    allocationYearOptions[0]?.value ||
    String(new Date().getFullYear()),
};

function StudentRoomAllocationRequestPage({ requestType: forcedRequestType }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apiError, setApiError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [latestAllocation, setLatestAllocation] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoomNumber, setCurrentRoomNumber] = useState("");

  const requestTypeFromQuery =
    searchParams.get("requestType") === "transfer_request" ? "transfer_request" : "new_room_request";
  const requestType = forcedRequestType || requestTypeFromQuery;
  const isTransferRequest = requestType === "transfer_request";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roomAllocationRequestSchema),
    defaultValues: {
      ...defaultValues,
      requestType,
    },
  });

  useEffect(() => {
    setValue("requestType", requestType);
  }, [requestType, setValue]);

  const resolveCurrentRoomNumber = useCallback(async () => {
    const [activeResult, approvedResult, latestResult, profileResult] = await Promise.all([
      roomAllocationApi.listMyAllocations({
        status: "active",
        page: 1,
        limit: 1,
        sortBy: "allocationDate",
        sortOrder: "desc",
      }),
      roomAllocationApi.listMyAllocations({
        status: "approved",
        page: 1,
        limit: 1,
        sortBy: "allocationDate",
        sortOrder: "desc",
      }),
      roomAllocationApi.getMyLatestAllocation(),
      studentApi.getMyProfile(),
    ]);

    return (
      activeResult?.items?.[0]?.room?.roomNumber ||
      profileResult?.student?.currentRoom ||
      approvedResult?.items?.[0]?.room?.roomNumber ||
      latestResult?.allocation?.room?.roomNumber ||
      ""
    );
  }, []);

  const loadBootstrapData = useCallback(async () => {
    setIsBootstrapping(true);
    setApiError("");
    try {
      const [latestResult, roomsResult, resolvedCurrentRoomNumber] = await Promise.all([
        roomAllocationApi.getMyLatestAllocation(),
        roomApi.listPublicRooms({
          limit: 100,
          sortBy: "roomNumber",
          sortOrder: "asc",
        }),
        isTransferRequest ? resolveCurrentRoomNumber() : Promise.resolve(""),
      ]);

      setLatestAllocation(latestResult.allocation || null);
      setCurrentRoomNumber(resolvedCurrentRoomNumber || "");

      setAvailableRooms(
        (roomsResult.items || []).filter(
          (room) =>
            room.availableSeatCount > 0 &&
            room.status !== "maintenance" &&
            room.status !== "closed" &&
            (!isTransferRequest || room.roomNumber !== resolvedCurrentRoomNumber)
        )
      );
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to load room allocation request data."));
    } finally {
      setIsBootstrapping(false);
    }
  }, [isTransferRequest, resolveCurrentRoomNumber]);

  useEffect(() => {
    loadBootstrapData();
  }, [loadBootstrapData]);

  const hasOpenAllocation =
    latestAllocation && roomAllocationOpenStatuses.includes(latestAllocation.status);
  const hasBlockingOpenAllocationForNew = hasOpenAllocation;
  const hasBlockingOpenAllocationForTransfer =
    latestAllocation &&
    (String(latestAllocation.status || "").toLowerCase() === "pending" ||
      (String(latestAllocation.status || "").toLowerCase() === "approved" &&
        latestAllocation.requestType === "transfer_request"));
  const shouldBlockByActiveFlow = isTransferRequest
    ? hasBlockingOpenAllocationForTransfer
    : hasBlockingOpenAllocationForNew;

  const noRoomOptions = useMemo(
    () => !isBootstrapping && availableRooms.length === 0,
    [availableRooms.length, isBootstrapping]
  );

  const onSubmit = async (values) => {
    setApiError("");
    if (isTransferRequest && !currentRoomNumber) {
      setApiError("Current room assignment is missing. Please contact the provost office.");
      return;
    }

    try {
      const result = await roomAllocationApi.createMyRequest(
        buildRequestPayload({
          ...values,
          requestType,
        })
      );
      navigate(`/student/room-allocation/${result.allocation.id}`, { replace: true });
    } catch (error) {
      setApiError(
        getApiErrorMessage(
          error,
          isTransferRequest
            ? "Failed to submit transfer request."
            : "Failed to submit room allocation request."
        )
      );
    }
  };

  return (
    <FormPageShell
      eyebrow="Student Workspace"
      title={isTransferRequest ? "Transfer Room Request" : "Request Room Allocation"}
      description={
        isTransferRequest
          ? "Request room transfer by choosing a desired room."
          : "Choose an available room and submit your allocation request for review."
      }
      formTitle={isTransferRequest ? "Transfer Request Form" : "Room Allocation Request Form"}
      formDescription="Requests are reviewed and finalized by the provost office."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/room-allocation")}>
          Back to Allocation History
        </Button>,
      ]}
    >
      {isBootstrapping ? <LoadingState label="Preparing request form..." /> : null}

      {!isBootstrapping && shouldBlockByActiveFlow ? (
        <div className="rounded-2xl border border-[rgb(var(--accent-warning)/0.4)] bg-[rgb(var(--accent-warning)/0.14)] p-4 text-sm text-[rgb(var(--text-base))]">
          <p className="font-semibold text-[rgb(var(--accent-primary))]">
            You already have an active room allocation flow.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge tone={roomAllocationStatusTone(latestAllocation.status)}>
              {roomAllocationStatusLabel(latestAllocation.status)}
            </StatusBadge>
            <span className="text-[rgb(var(--text-soft))]">
              {roomAllocationRequestTypeLabel(latestAllocation.requestType)} - Room{" "}
              {latestAllocation.room?.roomNumber || "N/A"}
            </span>
          </div>
          <p className="mt-3 text-[rgb(var(--text-soft))]">
            Open the{" "}
            <Link
              className="font-semibold text-[rgb(var(--accent-primary))] underline underline-offset-2 hover:text-[rgb(var(--accent-secondary))]"
              to={`/student/room-allocation/${latestAllocation.id}`}
            >
              allocation details page
            </Link>{" "}
            for updates.
          </p>
        </div>
      ) : null}

      {!isBootstrapping && !shouldBlockByActiveFlow ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {apiError}
            </div>
          ) : null}

          {isTransferRequest && !currentRoomNumber ? (
            <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Current room assignment was not found.
            </div>
          ) : null}

          {noRoomOptions ? (
            <div className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4 text-sm text-slate-300">
              No rooms are currently available for request. Please check again later.
            </div>
          ) : isTransferRequest ? (
            <TransferRoomRequestFields
              register={register}
              errors={errors}
              rooms={availableRooms}
              currentRoomNumber={currentRoomNumber}
            />
          ) : (
            <RoomAllocationRequestFields register={register} errors={errors} rooms={availableRooms} />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => navigate("/student/room-allocation")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || noRoomOptions || (isTransferRequest && !currentRoomNumber)}>
              {isSubmitting
                ? "Submitting..."
                : isTransferRequest
                  ? "Submit Transfer Request"
                  : "Submit Request"}
            </Button>
          </div>
        </form>
      ) : null}
    </FormPageShell>
  );
}

export default StudentRoomAllocationRequestPage;
