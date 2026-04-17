import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/shared/ErrorState";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import StudentFormFields from "@/features/student-management/components/StudentFormFields";
import { buildEditStudentPayload, editStudentSchema } from "@/features/student-management/validation";
import { studentApi } from "@/api/studentApi";
import { uploadApi } from "@/api/uploadApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function mapStudentToFormValues(student) {
  return {
    name: student.user?.name || "",
    email: student.user?.email || "",
    phone: student.user?.phone || "",
    registrationNumber: student.registrationNumber || "",
    department: student.department || "",
    semester: String(student.semester || 1),
    profilePhoto: student.profilePhoto || "",
    allocationStatus: student.allocationStatus || "none",
    isActive: Boolean(student.isActive),
    emergencyContactName: student.emergencyContact?.name || "",
    emergencyContactPhone: student.emergencyContact?.phone || "",
    emergencyContactRelation: student.emergencyContact?.relation || "",
  };
}

function ProvostEditStudentPage() {
  const { studentId } = useParams();
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
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: "",
      email: "",
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

  useEffect(() => {
    let mounted = true;

    const loadStudent = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await studentApi.getStudentById(studentId);
        if (mounted) {
          reset(mapStudentToFormValues(result.student));
        }
      } catch (error) {
        if (mounted) {
          setLoadError(getApiErrorMessage(error, "Failed to load student."));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadStudent();
    return () => {
      mounted = false;
    };
  }, [reset, studentId]);

  const handleProfilePhotoFileChange = (file) => {
    setProfilePhotoFile(file);
    if (!file) {
      setProfilePhotoPreviewUrl("");
      return;
    }
    setProfilePhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitWithUpload = async (values) => {
    setApiError("");
    try {
      const payload = buildEditStudentPayload(values);
      if (profilePhotoFile) {
        payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
      }
      await studentApi.updateStudentById(studentId, payload);
      navigate(`/provost/student-management/${studentId}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to update student."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Provost Control"
      title="Edit Student"
      description="Update account, academic, and allocation attributes for this student."
      formTitle="Student Details"
      formDescription="Changes are applied immediately to both student and linked user records."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate(`/provost/student-management/${studentId}`)}>
          Back to Details
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading student..." /> : null}

      {!isLoading && loadError ? (
        <ErrorState
          title="Unable to load student"
          description={loadError}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!isLoading && !loadError ? (
        <form onSubmit={handleSubmit(handleSubmitWithUpload)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {apiError}
            </div>
          ) : null}

          <StudentFormFields
            register={register}
            errors={errors}
            profilePhotoUrl={watch("profilePhoto")}
            profilePhotoPreviewUrl={profilePhotoPreviewUrl}
            onProfilePhotoFileChange={handleProfilePhotoFileChange}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/provost/student-management/${studentId}`)}>
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

export default ProvostEditStudentPage;
