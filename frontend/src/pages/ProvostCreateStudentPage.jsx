import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormPageShell from "@/components/shared/FormPageShell";
import StudentFormFields from "@/features/student-management/components/StudentFormFields";
import {
  buildCreateStudentPayload,
  createStudentSchema,
} from "@/features/student-management/validation";
import { studentApi } from "@/api/studentApi";
import { uploadApi } from "@/api/uploadApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function ProvostCreateStudentPage() {
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
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      registrationNumber: "",
      department: "",
      semester: "1",
      profilePhoto: "",
      allocationStatus: "none",
      isActive: true,
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
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
      const payload = buildCreateStudentPayload(values);
      if (profilePhotoFile) {
        payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
      }
      const result = await studentApi.createStudent(payload);
      navigate(`/provost/student-management/${result.student.id}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to create student."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Create Student"
      description="Provision a new student account and student profile in one secure workflow."
      formTitle="Student Account Setup"
      formDescription="All required account and academic fields must be provided."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/student-management")}>
          Back to List
        </Button>,
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{apiError}</div>
        ) : null}

        <StudentFormFields
          register={register}
          errors={errors}
          includePassword
          profilePhotoUrl={watch("profilePhoto")}
          profilePhotoPreviewUrl={profilePhotoPreviewUrl}
          onProfilePhotoFileChange={handleProfilePhotoFileChange}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/provost/student-management")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Student"}
          </Button>
        </div>
      </form>
    </FormPageShell>
  );
}

export default ProvostCreateStudentPage;
