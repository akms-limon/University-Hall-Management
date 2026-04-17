import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import FilePickerField from "@/components/shared/FilePickerField";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roomApi } from "@/api/roomApi";
import { staffApi } from "@/api/staffApi";
import { taskApi } from "@/api/taskApi";
import { uploadApi } from "@/api/uploadApi";
import {
  taskPriorityLabel,
  taskPriorityOptions,
  taskPriorityTone,
  taskStatusLabel,
  taskStatusOptions,
  taskStatusTone,
  taskTypeLabel,
  taskTypeOptions,
} from "@/features/staff-task/constants";
import {
  buildTaskStatusUpdatePayload,
  buildTaskUpdatePayload,
  taskStatusUpdateSchema,
  taskUpdateSchema,
} from "@/features/staff-task/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ProvostTaskDetailsPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    room: "",
    taskType: "cleaning",
    priority: "medium",
    dueDate: "",
    attachmentsText: "",
  });
  const [statusForm, setStatusForm] = useState({
    status: "pending",
    completionNotes: "",
    completionPhotosText: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [completionPhotoFiles, setCompletionPhotoFiles] = useState([]);
  const [completionPhotoPreviewUrls, setCompletionPhotoPreviewUrls] = useState([]);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [taskResult, staffResult, roomResult] = await Promise.all([
        taskApi.getTaskById(taskId),
        staffApi.listStaff({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        roomApi.listPublicRooms({ page: 1, limit: 300, isActive: true, sortBy: "roomNumber", sortOrder: "asc" }),
      ]);

      const currentTask = taskResult.task;
      setTask(currentTask);
      setStaffOptions(staffResult.items || []);
      setRoomOptions(roomResult.items || []);
      setForm({
        title: currentTask.title || "",
        description: currentTask.description || "",
        assignedTo: currentTask.assignedTo?.id || "",
        room: currentTask.room?.id || "",
        taskType: currentTask.taskType || "cleaning",
        priority: currentTask.priority || "medium",
        dueDate: formatDateInput(currentTask.dueDate),
        attachmentsText: "",
      });
      setStatusForm({
        status: currentTask.status || "pending",
        completionNotes: currentTask.completionNotes || "",
        completionPhotosText: "",
      });
      setAttachmentFiles([]);
      setAttachmentPreviewUrls([]);
      setCompletionPhotoFiles([]);
      setCompletionPhotoPreviewUrls([]);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load task details."));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const summaryItems = useMemo(() => {
    if (!task) return [];
    return [
      {
        title: "Status",
        value: taskStatusLabel(task.status),
        hint: "Current workflow stage",
        tone: taskStatusTone(task.status),
      },
      {
        title: "Priority",
        value: taskPriorityLabel(task.priority),
        hint: "Urgency level",
        tone: taskPriorityTone(task.priority),
      },
      {
        title: "Task Type",
        value: taskTypeLabel(task.taskType),
        hint: "Work category",
        tone: "info",
      },
      {
        title: "Assignee",
        value: task.assignedTo?.user?.name || "N/A",
        hint: task.assignedTo?.designation || "No designation",
        tone: "primary",
      },
    ];
  }, [task]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateStatusForm = (field, value) => {
    setStatusForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTask = async () => {
    const parsed = taskUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid task update.");
      setConfirmState({ open: false, action: "" });
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = buildTaskUpdatePayload(parsed.data);
      if (attachmentFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(attachmentFiles);
        const uploadedUrls = uploadResult.urls || [];
        if (uploadedUrls.length) {
          payload.attachments = [...(task?.attachments || []), ...uploadedUrls];
        }
      }
      await taskApi.updateTask(taskId, payload);
      setSuccessMessage("Task details updated successfully.");
      await loadPageData();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update task."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const handleSaveStatus = async () => {
    const parsed = taskStatusUpdateSchema.safeParse(statusForm);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid status update.");
      setConfirmState({ open: false, action: "" });
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = buildTaskStatusUpdatePayload(parsed.data);
      if (completionPhotoFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(completionPhotoFiles);
        const uploadedUrls = uploadResult.urls || [];
        if (uploadedUrls.length) {
          payload.completionPhotos = [...(task?.completionPhotos || []), ...uploadedUrls];
        }
      }
      await taskApi.updateTaskStatus(taskId, payload);
      setSuccessMessage("Task status updated successfully.");
      await loadPageData();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update task status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const confirmTitle =
    confirmState.action === "status"
      ? "Update task status?"
      : "Save task changes?";

  const confirmDescription =
    confirmState.action === "status"
      ? "This will update workflow status and notify the assignee."
      : "This will apply task detail changes, including assignment if modified.";

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Task Details & Edit"
      description="Review task progress, edit details, reassign staff, and control status."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/staff-tasks")}>
          Back to Task Monitoring
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading task details..." /> : null}
      {!isLoading && error && !task ? (
        <ErrorState title="Unable to load task" description={error} actionLabel="Retry" onAction={loadPageData} />
      ) : null}

      {!isLoading && task ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title={task.title} description={`Created ${formatDate(task.createdAt)}`}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge>
                  <StatusBadge tone={taskPriorityTone(task.priority)}>{taskPriorityLabel(task.priority)}</StatusBadge>
                  <span className="text-slate-400">{taskTypeLabel(task.taskType)}</span>
                </div>

                <div>
                  <p className="text-slate-400">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">{task.description}</p>
                </div>

                <div>
                  <p className="text-slate-400">Due Date</p>
                  <p className="mt-1">{formatDate(task.dueDate)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Completion Date</p>
                  <p className="mt-1">{formatDate(task.completionDate)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Completion Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{task.completionNotes || "No completion notes."}</p>
                </div>

                <div>
                  <p className="text-slate-400">Completion Photos</p>
                  {task.completionPhotos?.length ? (
                    <ul className="mt-2 space-y-1">
                      {task.completionPhotos.map((item) => (
                        <li key={item}>
                          <a href={item} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No completion photos.</p>
                  )}
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Action Panel" description="Edit task details and status workflow.">
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Edit Task Details</p>
                  <Input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Title" />
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    placeholder="Description"
                  />
                  <Select value={form.assignedTo} onChange={(event) => updateForm("assignedTo", event.target.value)}>
                    <option value="">Select staff</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.user?.name || "Unknown"} ({staff.designation || "Staff"})
                      </option>
                    ))}
                  </Select>
                  <Select value={form.room} onChange={(event) => updateForm("room", event.target.value)}>
                    <option value="">No room</option>
                    {roomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber}{room.wing ? ` - ${room.wing}` : ""}
                      </option>
                    ))}
                  </Select>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select value={form.taskType} onChange={(event) => updateForm("taskType", event.target.value)}>
                      {taskTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Select value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
                      {taskPriorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input type="datetime-local" value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} />
                  <FilePickerField
                    label="Attachment Files"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(files) => {
                      setAttachmentFiles(files);
                      setAttachmentPreviewUrls(
                        files.filter((file) => file.type.startsWith("image/")).map((file) => URL.createObjectURL(file))
                      );
                    }}
                    helperText="Upload files to append with existing attachments."
                    previewUrls={attachmentPreviewUrls}
                  />
                  <Button variant="secondary" onClick={() => setConfirmState({ open: true, action: "task" })} disabled={isSaving}>
                    Save Task Details
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Update Status</p>
                  <Select value={statusForm.status} onChange={(event) => updateStatusForm("status", event.target.value)}>
                    {taskStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    rows={3}
                    value={statusForm.completionNotes}
                    onChange={(event) => updateStatusForm("completionNotes", event.target.value)}
                    placeholder="Completion notes"
                  />
                  <FilePickerField
                    label="Completion Photos"
                    accept="image/*"
                    multiple
                    onChange={(files) => {
                      setCompletionPhotoFiles(files);
                      setCompletionPhotoPreviewUrls(files.map((file) => URL.createObjectURL(file)));
                    }}
                    helperText="Upload photos to append with existing completion photos."
                    previewUrls={completionPhotoPreviewUrls}
                  />
                  <Button onClick={() => setConfirmState({ open: true, action: "status" })} disabled={isSaving}>
                    Update Status
                  </Button>
                </div>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, action: "" })}
        onConfirm={confirmState.action === "status" ? handleSaveStatus : handleSaveTask}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={isSaving ? "Saving..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostTaskDetailsPage;
