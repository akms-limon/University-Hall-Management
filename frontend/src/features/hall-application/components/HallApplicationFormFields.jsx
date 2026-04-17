import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { semesterOptions } from "@/features/hall-application/constants";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function HallApplicationFormFields({ register, errors, showHints = true }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
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
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm text-slate-300">Contact Phone (Optional)</span>
          <Input className="mt-1" {...register("contactPhone")} />
          <FieldError error={errors.contactPhone?.message} />
        </label>

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
          <span className="text-sm text-slate-300">Emergency Contact Relation</span>
          <Input className="mt-1" {...register("emergencyContactRelation")} />
          <FieldError error={errors.emergencyContactRelation?.message} />
        </label>
      </section>

      <section className="grid gap-4">
        <label>
          <span className="text-sm text-slate-300">Reason for Application</span>
          <Textarea
            rows={6}
            className="mt-1"
            placeholder="Explain why you need hall accommodation."
            {...register("reason")}
          />
          {showHints ? (
            <p className="mt-1 text-xs text-slate-500">Provide clear academic and commuting reasons for faster review.</p>
          ) : null}
          <FieldError error={errors.reason?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Supporting Document Links (Optional)</span>
          <Textarea
            rows={4}
            className="mt-1"
            placeholder="One link per line or comma-separated."
            {...register("attachmentsText")}
          />
          <FieldError error={errors.attachmentsText?.message} />
        </label>
      </section>
    </div>
  );
}

export default HallApplicationFormFields;
