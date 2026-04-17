import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import FilePickerField from "@/components/shared/FilePickerField";
import LoadingState from "@/components/shared/LoadingState";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/api/userApi";
import { uploadApi } from "@/api/uploadApi";
import { roleLabels, USER_ROLES } from "@/lib/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number must be at least 8 characters")
    .max(20, "Phone number must be at most 20 characters")
    .regex(/^[0-9+\-()\s]+$/, "Phone number contains invalid characters"),
  profilePhoto: z.string().trim().max(500, "Profile photo is too long").optional(),
});

function mapUserToForm(user) {
  return {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    profilePhoto: user?.profilePhoto || "",
  };
}

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: mapUserToForm(user),
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await userApi.getMyProfile();
        if (!mounted) return;
        setCurrentUser(result.user);
        reset(mapUserToForm(result.user));
      } catch (loadError) {
        if (mounted) {
          setError(getApiErrorMessage(loadError, "Failed to load your profile."));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [reset]);

  if (user.role === USER_ROLES.STUDENT) {
    return <Navigate to="/student/profile" replace />;
  }

  if (user.role === USER_ROLES.STAFF) {
    return <Navigate to="/staff/profile" replace />;
  }

  const onSubmit = async (values) => {
    setError("");
    setSuccessMessage("");

    try {
      let profilePhoto = values.profilePhoto?.trim() || "";
      if (profilePhotoFile) {
        profilePhoto = await uploadApi.uploadSingleFile(profilePhotoFile);
      }

      const result = await userApi.updateMyProfile({
        name: values.name.trim(),
        phone: values.phone.trim(),
        profilePhoto,
      });

      setCurrentUser(result.user);
      reset(mapUserToForm(result.user));
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to update your profile."));
    }
  };

  return (
    <DetailPageShell
      eyebrow="Account"
      title="My Profile"
      description="Manage your personal account details. Email and role are protected."
    >
      {isLoading ? <LoadingState label="Loading profile..." /> : null}

      {!isLoading && error && !currentUser ? (
        <ErrorState title="Unable to load profile" description={error} actionLabel="Retry" onAction={() => window.location.reload()} />
      ) : null}

      {!isLoading && currentUser ? (
        <>
          <SummaryGrid
            items={[
              { title: "Role", value: roleLabels[currentUser.role], hint: "Account role", tone: "primary" },
              { title: "Email", value: currentUser.email, hint: "Read-only identity", tone: "info" },
            ]}
          />

          <ContentSection title="Edit Profile" description="Update your name, phone, and profile photo.">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {error ? <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}
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

              <input type="hidden" {...register("profilePhoto")} />
              <FilePickerField
                label="Profile Photo"
                accept="image/*"
                onChange={(files) => {
                  const file = files[0] || null;
                  setProfilePhotoFile(file);
                  setProfilePhotoPreviewUrl(file ? URL.createObjectURL(file) : "");
                }}
                helperText={currentUser.profilePhoto ? "Current photo is set. Upload a new file to replace it." : "Upload a profile photo (optional)."}
                previewUrls={profilePhotoPreviewUrl ? [profilePhotoPreviewUrl] : currentUser.profilePhoto ? [currentUser.profilePhoto] : []}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => reset(mapUserToForm(currentUser))} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </ContentSection>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default ProfilePage;
