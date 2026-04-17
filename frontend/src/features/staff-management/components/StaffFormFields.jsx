import Input from "@/components/ui/Input";
import FilePickerField from "@/components/shared/FilePickerField";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function StaffFormFields({
  register,
  errors,
  includePassword = false,
  profilePhotoUrl = "",
  profilePhotoPreviewUrl = "",
  onProfilePhotoFileChange,
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm text-slate-300">Full Name</span>
          <Input className="mt-1" {...register("name")} />
          <FieldError error={errors.name?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Email</span>
          <Input type="email" className="mt-1" {...register("email")} />
          <FieldError error={errors.email?.message} />
        </label>

        {includePassword ? (
          <label>
            <span className="text-sm text-slate-300">Temporary Password</span>
            <Input type="password" className="mt-1" {...register("password")} />
            <FieldError error={errors.password?.message} />
          </label>
        ) : null}

        <label>
          <span className="text-sm text-slate-300">Phone</span>
          <Input className="mt-1" {...register("phone")} />
          <FieldError error={errors.phone?.message} />
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm text-slate-300">Staff ID</span>
          <Input className="mt-1" {...register("staffId")} />
          <FieldError error={errors.staffId?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Joining Date</span>
          <Input type="date" className="mt-1" {...register("joiningDate")} />
          <FieldError error={errors.joiningDate?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Department</span>
          <Input className="mt-1" {...register("department")} />
          <FieldError error={errors.department?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Designation</span>
          <Input className="mt-1" {...register("designation")} />
          <FieldError error={errors.designation?.message} />
        </label>

        <div className="sm:col-span-2">
          <input type="hidden" {...register("profilePhoto")} />
          <FilePickerField
            label="Profile Photo"
            accept="image/*"
            onChange={(files) => onProfilePhotoFileChange?.(files[0] || null)}
            helperText={profilePhotoUrl ? "Current photo is set. Upload a new file to replace it." : "Upload a profile photo (optional)."}
            error={errors.profilePhoto?.message}
            previewUrls={profilePhotoPreviewUrl ? [profilePhotoPreviewUrl] : profilePhotoUrl ? [profilePhotoUrl] : []}
          />
        </div>

        <label className="inline-flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
            {...register("isActive")}
          />
          <span className="text-sm text-slate-300">Staff account is active</span>
        </label>
      </section>
    </div>
  );
}

export default StaffFormFields;
