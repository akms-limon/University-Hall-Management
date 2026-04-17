import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { roomStatusOptions } from "@/features/room-management/constants";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function RoomFormFields({ register, errors }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm text-slate-300">Room Number</span>
          <Input className="mt-1" placeholder="A-201" {...register("roomNumber")} />
          <FieldError error={errors.roomNumber?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Wing</span>
          <Input className="mt-1" placeholder="North Wing" {...register("wing")} />
          <FieldError error={errors.wing?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Floor</span>
          <Input type="number" min="0" className="mt-1" {...register("floor")} />
          <FieldError error={errors.floor?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Capacity</span>
          <Input type="number" min="1" className="mt-1" {...register("capacity")} />
          <FieldError error={errors.capacity?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Status</span>
          <Select className="mt-1" {...register("status")}>
            {roomStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <FieldError error={errors.status?.message} />
        </label>

        <label>
          <span className="text-sm text-slate-300">Last Cleaned</span>
          <Input type="date" className="mt-1" {...register("lastCleaned")} />
          <FieldError error={errors.lastCleaned?.message} />
        </label>

        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Maintenance Notes</span>
          <Textarea
            className="mt-1"
            rows={3}
            placeholder="Optional notes about maintenance or operational issues..."
            {...register("maintenanceNotes")}
          />
          <FieldError error={errors.maintenanceNotes?.message} />
        </label>

        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Features</span>
          <Textarea
            className="mt-1"
            rows={3}
            placeholder="Comma or new line separated (e.g., Balcony, Study Desk)"
            {...register("featuresText")}
          />
          <FieldError error={errors.featuresText?.message} />
        </label>

        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Amenities</span>
          <Textarea
            className="mt-1"
            rows={3}
            placeholder="Comma or new line separated (e.g., WiFi, Attached Bathroom)"
            {...register("amenitiesText")}
          />
          <FieldError error={errors.amenitiesText?.message} />
        </label>

        <label className="inline-flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
            {...register("isActive")}
          />
          <span className="text-sm text-slate-300">Room is active</span>
        </label>
      </section>
    </div>
  );
}

export default RoomFormFields;
