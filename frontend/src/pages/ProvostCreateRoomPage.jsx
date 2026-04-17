import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormPageShell from "@/components/shared/FormPageShell";
import RoomFormFields from "@/features/room-management/components/RoomFormFields";
import { buildRoomPayload, roomFormSchema } from "@/features/room-management/validation";
import { roomApi } from "@/api/roomApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function ProvostCreateRoomPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
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

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const result = await roomApi.createRoom(buildRoomPayload(values));
      navigate(`/provost/room-management/${result.room.id}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to create room."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Create Room"
      description="Register a new hall room with operational and facility details."
      formTitle="Room Setup"
      formDescription="Add room metadata, status, and amenities."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/room-management")}>
          Back to List
        </Button>,
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
        ) : null}

        <RoomFormFields register={register} errors={errors} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/provost/room-management")} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </form>
    </FormPageShell>
  );
}

export default ProvostCreateRoomPage;
