import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormPageShell from "@/components/shared/FormPageShell";
import StaffFormFields from "@/features/staff-management/components/StaffFormFields";
import { buildCreateStaffPayload, createStaffSchema } from "@/features/staff-management/validation";
import { staffApi } from "@/api/staffApi";
import { uploadApi } from "@/api/uploadApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function ProvostCreateStaffPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState("");

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      staffId: "",
      department: "",
      designation: "",
      profilePhoto: "",
      joiningDate: "",
      isActive: true,
    },
  });

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
      const payload = buildCreateStaffPayload(values);
      if (profilePhotoFile) {
        payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
      }
      const result = await staffApi.createStaff(payload);
      navigate(`/provost/staff-management/${result.staff.id}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to create staff account."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Create Staff"
      description="Provision a secure staff account and employment profile in one workflow."
      formTitle="Staff Account Setup"
      formDescription="Provide account credentials and employment details."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/staff-management")}>
          Back to List
        </Button>,
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
        ) : null}

        <StaffFormFields
          register={register}
          errors={errors}
          includePassword
          profilePhotoUrl={watch("profilePhoto")}
          profilePhotoPreviewUrl={profilePhotoPreviewUrl}
          onProfilePhotoFileChange={handleProfilePhotoFileChange}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/provost/staff-management")} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Staff"}
          </Button>
        </div>
      </form>
    </FormPageShell>
  );
}

export default ProvostCreateStaffPage;
