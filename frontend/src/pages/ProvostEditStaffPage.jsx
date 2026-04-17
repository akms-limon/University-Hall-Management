import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/shared/ErrorState";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import StaffFormFields from "@/features/staff-management/components/StaffFormFields";
import { buildEditStaffPayload, editStaffSchema } from "@/features/staff-management/validation";
import { staffApi } from "@/api/staffApi";
import { uploadApi } from "@/api/uploadApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function mapStaffToFormValues(staff) {
  return {
    name: staff.user?.name || "",
    email: staff.user?.email || "",
    phone: staff.user?.phone || "",
    staffId: staff.staffId || "",
    department: staff.department || "",
    designation: staff.designation || "",
    profilePhoto: staff.profilePhoto || "",
    joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().slice(0, 10) : "",
    isActive: Boolean(staff.isActive),
  };
}

function ProvostEditStaffPage() {
  const { staffRecordId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [apiError, setApiError] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState("");

  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      staffId: "",
      department: "",
      designation: "",
      profilePhoto: "",
      joiningDate: "",
      isActive: true,
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadStaff = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await staffApi.getStaffById(staffRecordId);
        if (mounted) {
          reset(mapStaffToFormValues(result.staff));
        }
      } catch (error) {
        if (mounted) {
          setLoadError(getApiErrorMessage(error, "Failed to load staff details."));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadStaff();
    return () => {
      mounted = false;
    };
  }, [reset, staffRecordId]);

  const handleProfilePhotoFileChange = (file) => {
    setProfilePhotoFile(file);
    if (!file) {
      setProfilePhotoPreviewUrl("");
      return;
    }
    setProfilePhotoPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const payload = buildEditStaffPayload(values);
      if (profilePhotoFile) {
        payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
      }
      await staffApi.updateStaffById(staffRecordId, payload);
      navigate(`/provost/staff-management/${staffRecordId}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to update staff."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Edit Staff"
      description="Update account credentials and employment details for this staff record."
      formTitle="Staff Details"
      formDescription="Changes are applied to both staff and linked user records."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate(`/provost/staff-management/${staffRecordId}`)}>
          Back to Details
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading staff..." /> : null}

      {!isLoading && loadError ? (
        <ErrorState
          title="Unable to load staff details"
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

          <StaffFormFields
            register={register}
            errors={errors}
            profilePhotoUrl={watch("profilePhoto")}
            profilePhotoPreviewUrl={profilePhotoPreviewUrl}
            onProfilePhotoFileChange={handleProfilePhotoFileChange}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/provost/staff-management/${staffRecordId}`)}>
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

export default ProvostEditStaffPage;
