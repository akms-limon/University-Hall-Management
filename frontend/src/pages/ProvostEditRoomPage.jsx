import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/shared/ErrorState";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import RoomFormFields from "@/features/room-management/components/RoomFormFields";
import { buildRoomPayload, roomFormSchema } from "@/features/room-management/validation";
import { roomApi } from "@/api/roomApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function mapRoomToFormValues(room) {
  return {
    roomNumber: room.roomNumber || "",
    floor: room.floor ?? "",
    wing: room.wing || "",
    capacity: room.capacity ?? 4,
    status: room.status || "vacant",
    maintenanceNotes: room.maintenanceNotes || "",
    lastCleaned: room.lastCleaned ? new Date(room.lastCleaned).toISOString().slice(0, 10) : "",
    featuresText: room.features?.join(", ") || "",
    amenitiesText: room.amenities?.join(", ") || "",
    isActive: Boolean(room.isActive),
  };
}

function ProvostEditRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      roomNumber: "",
      floor: "",
      wing: "",
      capacity: 4,
      status: "vacant",
      maintenanceNotes: "",
      lastCleaned: "",
      featuresText: "",
      amenitiesText: "",
      isActive: true,
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadRoom = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await roomApi.getRoomById(roomId);
        if (mounted) {
          reset(mapRoomToFormValues(result.room));
        }
      } catch (error) {
        if (mounted) {
          setLoadError(getApiErrorMessage(error, "Failed to load room details."));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadRoom();
    return () => {
      mounted = false;
    };
  }, [reset, roomId]);

  const onSubmit = async (values) => {
    setApiError("");
    try {
      await roomApi.updateRoomById(roomId, buildRoomPayload(values));
      navigate(`/provost/room-management/${roomId}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to update room."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Edit Room"
      description="Update room metadata, availability state, and amenities."
      formTitle="Room Details"
      formDescription="Changes are reflected immediately in room listings."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate(`/provost/room-management/${roomId}`)}>
          Back to Details
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading room..." /> : null}

      {!isLoading && loadError ? (
        <ErrorState
          title="Unable to load room details"
          description={loadError}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!isLoading && !loadError ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
          ) : null}

          <RoomFormFields register={register} errors={errors} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/provost/room-management/${roomId}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : null}
    </FormPageShell>
  );
}

export default ProvostEditRoomPage;
