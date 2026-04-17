import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FilePickerField from "@/components/shared/FilePickerField";
import { allocationStatusOptions, semesterOptions } from "@/features/student-management/constants";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function StudentFormFields({
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
          <span className="text-sm text-slate-300">Registration Number</span>
          <Input className="mt-1" {...register("registrationNumber")} />
          <FieldError error={errors.registrationNumber?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Department</span>
          <Input className="mt-1" {...register("department")} />
          <FieldError error={errors.department?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Semester</span>
          <Select className="mt-1" {...register("semester")}>
            {semesterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError error={errors.semester?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Allocation Status</span>
          <Select className="mt-1" {...register("allocationStatus")}>
            {allocationStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError error={errors.allocationStatus?.message} />
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
          <span className="text-sm text-slate-300">Student account is active</span>
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="text-sm text-slate-300">Emergency Contact Name</span>
          <Input className="mt-1" {...register("emergencyContactName")} />
          <FieldError error={errors.emergencyContactName?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Emergency Contact Phone</span>
          <Input className="mt-1" {...register("emergencyContactPhone")} />
          <FieldError error={errors.emergencyContactPhone?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Relation</span>
          <Input className="mt-1" {...register("emergencyContactRelation")} />
          <FieldError error={errors.emergencyContactRelation?.message} />
        </label>
      </section>
    </div>
  );
}

export default StudentFormFields;
