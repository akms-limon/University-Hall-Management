import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import DetailPageShell from "@/components/shared/DetailPageShell";
import FilePickerField from "@/components/shared/FilePickerField";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import { maintenanceApi } from "@/api/maintenanceApi";
import { roomApi } from "@/api/roomApi";
import { uploadApi } from "@/api/uploadApi";
import {
  maintenanceCategoryOptions,
  maintenanceSeverityOptions,
} from "@/features/maintenance/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultForm = {
  room: "",
  issue: "",
  description: "",
  category: "electrical",
  severity: "medium",
};

function StudentCreateMaintenancePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [beforePhotoFiles, setBeforePhotoFiles] = useState([]);
  const [beforePhotoPreviewUrls, setBeforePhotoPreviewUrls] = useState([]);

  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const result = await roomApi.listPublicRooms({ limit: 200, isActive: true });
      setRooms(result.items || []);
    } catch {
      // rooms load failure is non-critical; user can still type or retry
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.room) {
      setError("Please select a room.");
      return;
    }

    if (!form.issue.trim() || form.issue.trim().length < 4) {
      setError("Issue must be at least 4 characters.");
      return;
    }

    if (!form.description.trim() || form.description.trim().length < 12) {
      setError("Description must be at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      let beforePhotos = [];
      if (beforePhotoFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(beforePhotoFiles);
        beforePhotos = uploadResult.urls || [];
      }

      const result = await maintenanceApi.createMyMaintenance({
        room: form.room,
        issue: form.issue.trim(),
        description: form.description.trim(),
        category: form.category,
        severity: form.severity,
        beforePhotos: beforePhotos.length ? beforePhotos : undefined,
      });
      navigate(`/student/maintenance-requests/${result.maintenance.id}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to submit maintenance request."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Submit Maintenance Request"
      description="Report a maintenance issue in your room or common hall facility."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/maintenance-requests")}>
          Back to My Requests
        </Button>,
      ]}
    >
      <FormPageShell
        title="Maintenance Request Form"
        description="Provide clear details to help maintenance staff resolve the issue quickly."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm text-slate-300">Room</span>
            {isLoadingRooms ? (
              <div className="mt-1"><LoadingState label="Loading rooms..." /></div>
            ) : (
              <Select
                className="mt-1"
                value={form.room}
                onChange={(e) => updateField("room", e.target.value)}
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.roomNumber}{room.wing ? ` - ${room.wing} Wing` : ""}{room.floor ? `, Floor ${room.floor}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Issue</span>
            <Input
              className="mt-1"
              placeholder="Brief issue title (e.g. Broken light switch)"
              value={form.issue}
              onChange={(e) => updateField("issue", e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Description</span>
            <Textarea
              rows={5}
              className="mt-1"
              placeholder="Describe the issue in detail - location, symptoms, how long it has been present..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Category</span>
              <Select
                className="mt-1"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                {maintenanceCategoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Severity</span>
              <Select
                className="mt-1"
                value={form.severity}
                onChange={(e) => updateField("severity", e.target.value)}
              >
                {maintenanceSeverityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </label>
          </div>

          <FilePickerField
            label="Before Photos (optional)"
            accept="image/*"
            multiple
            onChange={(files) => {
              setBeforePhotoFiles(files);
              setBeforePhotoPreviewUrls(files.map((file) => URL.createObjectURL(file)));
            }}
            helperText="Upload room or facility issue photos from your device."
            previewUrls={beforePhotoPreviewUrls}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm(defaultForm);
                setBeforePhotoFiles([]);
                setBeforePhotoPreviewUrls([]);
              }}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </form>
      </FormPageShell>
    </DetailPageShell>
  );
}

export default StudentCreateMaintenancePage;
