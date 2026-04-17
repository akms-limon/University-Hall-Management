import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DetailPageShell from "@/components/shared/DetailPageShell";
import FilePickerField from "@/components/shared/FilePickerField";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import { roomApi } from "@/api/roomApi";
import { staffApi } from "@/api/staffApi";
import { taskApi } from "@/api/taskApi";
import { uploadApi } from "@/api/uploadApi";
import {
  taskPriorityOptions,
  taskTypeOptions,
} from "@/features/staff-task/constants";
import {
  buildTaskCreatePayload,
  taskCreateSchema,
} from "@/features/staff-task/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultForm = {
  title: "",
  description: "",
  assignedTo: "",
  room: "",
  taskType: "cleaning",
  priority: "medium",
  dueDate: "",
  attachmentsText: "",
};

function ProvostCreateTaskPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [staffOptions, setStaffOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffResult, roomResult] = await Promise.all([
        staffApi.listStaff({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        roomApi.listPublicRooms({ page: 1, limit: 300, isActive: true, sortBy: "roomNumber", sortOrder: "asc" }),
      ]);
      setStaffOptions(staffResult.items || []);
      setRoomOptions(roomResult.items || []);
    } catch {
      setStaffOptions([]);
      setRoomOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const parsed = taskCreateSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check task details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildTaskCreatePayload(parsed.data);
      if (attachmentFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(attachmentFiles);
        payload.attachments = uploadResult.urls || [];
      }
      const result = await taskApi.createTask(payload);
      navigate(`/provost/staff-tasks/${result.task.id}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to create task."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Create Staff Task"
      description="Create and assign a new operational task for hall staff."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/staff-tasks")}>
          Back to Task Monitoring
        </Button>,
      ]}
    >
      <FormPageShell title="Task Form" description="Provide clear task details and assign responsible staff.">
        {isLoading ? <LoadingState label="Loading staff and room options..." /> : null}
        {!isLoading ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
            ) : null}

            <label className="block">
              <span className="text-sm text-slate-300">Title</span>
              <Input className="mt-1" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Description</span>
              <Textarea
                rows={5}
                className="mt-1"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Assign Staff</span>
                <Select className="mt-1" value={form.assignedTo} onChange={(event) => updateField("assignedTo", event.target.value)}>
                  <option value="">Select staff</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.user?.name || "Unknown"} ({staff.designation || "Staff"})
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Room (Optional)</span>
                <Select className="mt-1" value={form.room} onChange={(event) => updateField("room", event.target.value)}>
                  <option value="">No room</option>
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber}{room.wing ? ` - ${room.wing}` : ""}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm text-slate-300">Task Type</span>
                <Select className="mt-1" value={form.taskType} onChange={(event) => updateField("taskType", event.target.value)}>
                  {taskTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Priority</span>
                <Select className="mt-1" value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
                  {taskPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Due Date</span>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                />
              </label>
            </div>

            <FilePickerField
              label="Attachments (optional)"
              accept="image/*,application/pdf"
              multiple
              onChange={(files) => {
                setAttachmentFiles(files);
                setAttachmentPreviewUrls(
                  files.filter((file) => file.type.startsWith("image/")).map((file) => URL.createObjectURL(file))
                );
              }}
              helperText="Upload photos or documents from your device."
              previewUrls={attachmentPreviewUrls}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm(defaultForm);
                  setAttachmentFiles([]);
                  setAttachmentPreviewUrls([]);
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </div>
          </form>
        ) : null}
      </FormPageShell>
    </DetailPageShell>
  );
}

export default ProvostCreateTaskPage;
