import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FilePickerField from "@/components/shared/FilePickerField";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { staffApi } from "@/api/staffApi";
import { uploadApi } from "@/api/uploadApi";
import { buildSelfStaffProfilePayload, staffSelfProfileSchema } from "@/features/staff-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { useAuth } from "@/hooks/useAuth";

function mapStaffToForm(staff) {
  return {
    name: staff.user?.name || "",
    email: staff.user?.email || "",
    phone: staff.user?.phone || "",
    profilePhoto: staff.profilePhoto || "",
  };
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString();
}

function StaffProfilePage() {
  const { refreshUser } = useAuth();
  const [staff, setStaff] = useState(null);
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
    resolver: zodResolver(staffSelfProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      profilePhoto: "",
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await staffApi.getMyProfile();
        if (!mounted) return;
        setStaff(result.staff);
        reset(mapStaffToForm(result.staff));
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
    if (!staff) return [];

    return [
      { title: "Staff ID", value: staff.staffId || "-", hint: "Unique identity", tone: "primary" },
      { title: "Department", value: staff.department || "-", hint: "Assigned department", tone: "info" },
      { title: "Designation", value: staff.designation || "-", hint: "Current role", tone: "warning" },
      {
        title: "Joining Date",
        value: formatDate(staff.joiningDate),
        hint: "Employment start date",
        tone: "success",
      },
    ];
  }, [staff]);

  const onSubmit = async (values) => {
    setSuccessMessage("");
    setError("");

    const payload = buildSelfStaffProfilePayload(values);
    if (profilePhotoFile) {
      payload.profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
    }
    if (!Object.keys(payload).length) {
      setError("Please update at least one editable field.");
      return;
    }

    try {
      const result = await staffApi.updateMyProfile(payload);
      setStaff(result.staff);
      reset(mapStaffToForm(result.staff));
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to update profile."));
    }
  };

  const currentProfilePhoto = staff?.profilePhoto || "";

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="My Profile"
      description="Manage your contact details. Employment fields are controlled by provost."
    >
      {isLoading ? <LoadingState label="Loading your profile..." /> : null}

      {!isLoading && error && !staff ? (
        <ErrorState title="Unable to load profile" description={error} actionLabel="Retry" onAction={() => window.location.reload()} />
      ) : null}

      {!isLoading && staff ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <ContentSection title="Account and Employment Details" description="Read-only profile and assignment information.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Name</dt>
                  <dd>{staff.user?.name || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{staff.user?.email || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Staff ID</dt>
                  <dd>{staff.staffId}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Joining Date</dt>
                  <dd>{formatDate(staff.joiningDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Department</dt>
                  <dd>{staff.department}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Designation</dt>
                  <dd>{staff.designation}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Account Status</dt>
                  <dd>
                    <StatusBadge tone={staff.isActive ? "success" : "danger"}>
                      {staff.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Editable Profile Fields" description="You can update phone and profile photo.">
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

export default StaffProfilePage;
