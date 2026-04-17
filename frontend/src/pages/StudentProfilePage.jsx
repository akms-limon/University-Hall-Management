import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FilePickerField from "@/components/shared/FilePickerField";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { studentApi } from "@/api/studentApi";
import { uploadApi } from "@/api/uploadApi";
import { semesterOptions } from "@/features/student-management/constants";
import {
  buildSelfProfilePayload,
  studentSelfProfileSchema,
} from "@/features/student-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { useAuth } from "@/hooks/useAuth";

function allocationTone(status) {
  if (status === "allocated") return "success";
  if (status === "pending") return "warning";
  if (status === "requested") return "info";
  return "neutral";
}

function formatBalance(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function mapStudentToForm(student) {
  return {
    name: student.user?.name || "",
    email: student.user?.email || "",
    phone: student.user?.phone || "",
    profilePhoto: student.profilePhoto || "",
    semester: student.semester ? String(student.semester) : "",
    emergencyContactName: student.emergencyContact?.name || "",
    emergencyContactPhone: student.emergencyContact?.phone || "",
    emergencyContactRelation: student.emergencyContact?.relation || "",
  };
}

function StudentProfilePage() {
  const { refreshUser } = useAuth();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentSelfProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      profilePhoto: "",
      semester: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await studentApi.getMyProfile();
        if (!mounted) return;
        setStudent(result.student);
        reset(mapStudentToForm(result.student));
      } catch (loadError) {
        if (mounted) {
          setError(getApiErrorMessage(loadError, "Failed to fetch your profile."));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [reset]);

  const summaryItems = useMemo(() => {
    if (!student) return [];

    return [
      {
        title: "Department",
        value: student.department || "-",
        hint: "Current academic department",
        tone: "primary",
      },
      {
        title: "Semester",
        value: String(student.semester || "-"),
        hint: "Editable by student profile policy",
        tone: "info",
      },
      {
        title: "Allocation",
        value: student.allocationStatus || "none",
        hint: "Room allocation status",
        tone: allocationTone(student.allocationStatus),
      },
      {
        title: "Balance",
        value: formatBalance(student.balance),
        hint: "Read-only billing balance",
        tone: "warning",
      },
    ];
  }, [student]);

  const onSubmit = async (values) => {
    setSuccessMessage("");
    setError("");

    const payload = buildSelfProfilePayload(values);
    if (profilePhotoFile) {
      payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
    }
    if (!Object.keys(payload).length) {
      setError("Please update at least one editable field.");
      return;
    }

    try {
      const result = await studentApi.updateMyProfile(payload);
      setStudent(result.student);
      reset(mapStudentToForm(result.student));
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to update profile."));
    }
  };

  const currentProfilePhoto = student?.profilePhoto || "";

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="My Profile"
      description="Manage your personal and emergency profile details. Protected account and allocation fields are read-only."
    >
      {isLoading ? <LoadingState label="Loading your profile..." /> : null}

      {!isLoading && error && !student ? (
        <ErrorState
          title="Unable to load profile"
          description={error}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!isLoading && student ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <ContentSection title="Account and Hall Details" description="Read-only account, room, and allocation information.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Name</dt>
                  <dd>{student.user?.name || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{student.user?.email || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Registration Number</dt>
                  <dd>{student.registrationNumber || "Not assigned"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Current Room</dt>
                  <dd>{student.currentRoom || "Not allocated"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Allocation Status</dt>
                  <dd>
                    <StatusBadge tone={allocationTone(student.allocationStatus)}>
                      {student.allocationStatus || "none"}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Editable Profile Fields" description="You can update phone, profile photo, semester, and emergency contact.">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <label>
                  <span className="text-sm text-slate-300">Full Name</span>
                  <Input className="mt-1" {...register("name")} />
                  {errors.name ? <p className="mt-1 text-xs text-red-300">{errors.name.message}</p> : null}
                </label>

                <label>
                  <span className="text-sm text-slate-300">Email</span>
                  <Input className="mt-1" {...register("email")} disabled />
                  <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
                  {errors.email ? <p className="mt-1 text-xs text-red-300">{errors.email.message}</p> : null}
                </label>

                <label>
                  <span className="text-sm text-slate-300">Phone</span>
                  <Input className="mt-1" {...register("phone")} />
                  {errors.phone ? <p className="mt-1 text-xs text-red-300">{errors.phone.message}</p> : null}
                </label>

                <div>
                  <input type="hidden" {...register("profilePhoto")} />
                  <FilePickerField
                    label="Profile Photo"
                    accept="image/*"
                    onChange={(files) => {
                      const file = files[0] || null;
                      setProfilePhotoFile(file);
                      setProfilePhotoPreviewUrl(file ? URL.createObjectURL(file) : "");
                    }}
                    helperText={currentProfilePhoto ? "Current photo is set. Upload a new file to replace it." : "Upload a profile photo (optional)."}
                    error={errors.profilePhoto?.message}
                    previewUrls={profilePhotoPreviewUrl ? [profilePhotoPreviewUrl] : currentProfilePhoto ? [currentProfilePhoto] : []}
                  />
                </div>

                <label>
                  <span className="text-sm text-slate-300">Semester</span>
                  <Select className="mt-1" {...register("semester")}>
                    <option value="">Keep current</option>
                    {semesterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.semester ? <p className="mt-1 text-xs text-red-300">{errors.semester.message}</p> : null}
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="text-sm text-slate-300">Emergency Name</span>
                    <Input className="mt-1" {...register("emergencyContactName")} />
                    {errors.emergencyContactName ? (
                      <p className="mt-1 text-xs text-red-300">{errors.emergencyContactName.message}</p>
                    ) : null}
                  </label>

                  <label>
                    <span className="text-sm text-slate-300">Emergency Phone</span>
                    <Input className="mt-1" {...register("emergencyContactPhone")} />
                    {errors.emergencyContactPhone ? (
                      <p className="mt-1 text-xs text-red-300">{errors.emergencyContactPhone.message}</p>
                    ) : null}
                  </label>

                  <label>
                    <span className="text-sm text-slate-300">Relation</span>
                    <Input className="mt-1" {...register("emergencyContactRelation")} />
                    {errors.emergencyContactRelation ? (
                      <p className="mt-1 text-xs text-red-300">{errors.emergencyContactRelation.message}</p>
                    ) : null}
                  </label>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentProfilePage;
