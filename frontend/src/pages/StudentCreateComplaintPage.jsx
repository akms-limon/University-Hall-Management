import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DetailPageShell from "@/components/shared/DetailPageShell";
import FilePickerField from "@/components/shared/FilePickerField";
import FormPageShell from "@/components/shared/FormPageShell";
import { complaintApi } from "@/api/complaintApi";
import { uploadApi } from "@/api/uploadApi";
import {
  complaintCategoryOptions,
  complaintSeverityOptions,
} from "@/features/complaint-management/constants";
import {
  buildCreateComplaintPayload,
  complaintCreateSchema,
} from "@/features/complaint-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultForm = {
  title: "",
  description: "",
  category: "maintenance",
  severity: "medium",
  attachmentsText: "",
};

function StudentCreateComplaintPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const parsed = complaintCreateSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check your complaint details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildCreateComplaintPayload(parsed.data);
      if (attachmentFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(attachmentFiles);
        payload.attachments = uploadResult.urls || [];
      }
      const result = await complaintApi.createMyComplaint(payload);
      navigate(`/student/complaints/${result.complaint.id}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to submit complaint."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Submit Complaint"
      description="Report hall issues for administrative action and staff resolution."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/complaints")}>
          Back to My Complaints
        </Button>,
      ]}
    >
      <FormPageShell
        title="Complaint Form"
        description="Provide clear issue details to help faster resolution."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
          ) : null}

          <label className="block">
            <span className="text-sm text-slate-300">Title</span>
            <Input
              className="mt-1"
              placeholder="Short complaint title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Description</span>
            <Textarea
              rows={5}
              className="mt-1"
              placeholder="Describe the issue clearly..."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-300">Category</span>
              <Select className="mt-1" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                {complaintCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Severity</span>
              <Select className="mt-1" value={form.severity} onChange={(event) => updateField("severity", event.target.value)}>
                {complaintSeverityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
            helperText="Upload photos/documents from your device."
            previewUrls={attachmentPreviewUrls}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Complaint"}
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
      </FormPageShell>
    </DetailPageShell>
  );
}

export default StudentCreateComplaintPage;
