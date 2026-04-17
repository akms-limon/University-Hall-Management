import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { allocationYearOptions, semesterOptions } from "@/features/room-allocation/constants";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function RoomAllocationRequestFields({ register, errors, rooms = [] }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Select Room</span>
          <Select className="mt-1" {...register("roomId")}>
            <option value="">Choose a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.roomNumber} - Floor {room.floor} - {room.wing} ({room.availableSeatCount} seats)
              </option>
            ))}
          </Select>
          <FieldError error={errors.roomId?.message} />
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
          <span className="text-sm text-slate-300">Allocation Year</span>
          <Select className="mt-1" {...register("allocationYear")}>
            {allocationYearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError error={errors.allocationYear?.message} />
        </label>

        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Request Reason (Optional)</span>
          <Textarea
            className="mt-1"
            rows={4}
            placeholder="Add context for your room allocation request..."
            {...register("requestReason")}
          />
          <FieldError error={errors.requestReason?.message} />
        </label>

        <label className="sm:col-span-2">
          <span className="text-sm text-slate-300">Preferred Contact (Read-only)</span>
          <Input className="mt-1" disabled value="Use profile phone number for allocation communication." />
        </label>
      </section>
    </div>
  );
}

export default RoomAllocationRequestFields;
