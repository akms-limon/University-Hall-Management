import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
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
import { taskApi } from "@/api/taskApi";
import { uploadApi } from "@/api/uploadApi";
import {
  taskPriorityLabel,
  taskPriorityTone,
  taskStatusByStaffOptions,
  taskStatusLabel,
  taskStatusTone,
  taskTypeLabel,
} from "@/features/staff-task/constants";
import {
  buildTaskStaffUpdatePayload,
  taskStaffUpdateSchema,
} from "@/features/staff-task/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StaffTaskWorkPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState("in-progress");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotoFiles, setCompletionPhotoFiles] = useState([]);
  const [completionPhotoPreviewUrls, setCompletionPhotoPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await taskApi.getAssignedTaskById(taskId);
      setTask(result.task);
      setStatus(result.task.status === "pending" ? "in-progress" : result.task.status);
      setCompletionNotes(result.task.completionNotes || "");
      setCompletionPhotoFiles([]);
      setCompletionPhotoPreviewUrls([]);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load task details."));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

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
        title: "Due Date",
        value: formatDate(task.dueDate),
        hint: task.completionDate ? `Completed ${formatDate(task.completionDate)}` : "Pending completion",
        tone: "primary",
      },
    ];
  }, [task]);

  const handleSave = async () => {
    const parsed = taskStaffUpdateSchema.safeParse({
      status,
      completionNotes,
      completionPhotosText: "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid task update.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = buildTaskStaffUpdatePayload(parsed.data);
      if (completionPhotoFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(completionPhotoFiles);
        const uploadedUrls = uploadResult.urls || [];
        if (uploadedUrls.length) {
          payload.completionPhotos = [...(task?.completionPhotos || []), ...uploadedUrls];
        }
      }
      await taskApi.updateAssignedTask(taskId, payload);
      setSuccessMessage("Task updated successfully.");
      await loadTask();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update task."));
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Task Work Panel"
      description="Update status, add completion notes, and mark assigned tasks complete."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/assigned-tasks")}>
          Back to Assigned Tasks
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading task details..." /> : null}
      {!isLoading && error && !task ? (
        <ErrorState title="Unable to load task" description={error} actionLabel="Retry" onAction={loadTask} />
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
                  <p className="text-slate-400">Room</p>
                  <p className="mt-1">
                    {task.room?.roomNumber
                      ? `Room ${task.room.roomNumber}${task.room.wing ? ` - ${task.room.wing}` : ""}`
                      : "No room assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Attachments</p>
                  {task.attachments?.length ? (
                    <ul className="mt-2 space-y-1">
                      {task.attachments.map((item) => (
                        <li key={item}>
                          <a href={item} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No attachments provided.</p>
                  )}
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Update Progress" description="Update task status and completion details.">
              <div className="space-y-3">
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm text-slate-300">Status</span>
                  <Select className="mt-1" value={status} onChange={(event) => setStatus(event.target.value)} disabled={isSaving}>
                    {taskStatusByStaffOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">Completion Notes</span>
                  <Textarea
                    rows={5}
                    className="mt-1"
                    placeholder="Describe work progress or completion details..."
                    value={completionNotes}
                    onChange={(event) => setCompletionNotes(event.target.value)}
                    disabled={isSaving}
                  />
                </label>

                <FilePickerField
                  label="Completion Photos"
                  accept="image/*"
                  multiple
                  onChange={(files) => {
                    setCompletionPhotoFiles(files);
                    setCompletionPhotoPreviewUrls(files.map((file) => URL.createObjectURL(file)));
                  }}
                  helperText="Upload completion photos from your device."
                  previewUrls={completionPhotoPreviewUrls}
                  disabled={isSaving}
                />

                <Button onClick={() => setConfirmOpen(true)} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Update"}
                </Button>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        title="Apply task update?"
        description="This will update task progress and notify the provost."
        confirmLabel={isSaving ? "Saving..." : "Confirm Update"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default StaffTaskWorkPage;
