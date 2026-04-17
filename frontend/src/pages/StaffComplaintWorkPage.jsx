import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { complaintApi } from "@/api/complaintApi";
import {
  complaintCategoryLabel,
  complaintSeverityLabel,
  complaintSeverityTone,
  complaintStatusByStaffOptions,
  complaintStatusLabel,
  complaintStatusTone,
} from "@/features/complaint-management/constants";
import { complaintStaffUpdateSchema } from "@/features/complaint-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StaffComplaintWorkPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [status, setStatus] = useState("");
  const [resolution, setResolution] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadComplaint = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await complaintApi.getAssignedComplaintById(complaintId);
      setComplaint(result.complaint);
      setStatus(result.complaint.status === "open" ? "in-progress" : result.complaint.status);
      setResolution(result.complaint.resolution || "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load complaint details."));
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    loadComplaint();
  }, [loadComplaint]);

  const summaryItems = useMemo(() => {
    if (!complaint) return [];
    return [
      {
        title: "Status",
        value: complaintStatusLabel(complaint.status),
        hint: "Current workflow stage",
        tone: complaintStatusTone(complaint.status),
      },
      {
        title: "Severity",
        value: complaintSeverityLabel(complaint.severity),
        hint: "Priority level",
        tone: complaintSeverityTone(complaint.severity),
      },
      {
        title: "Category",
        value: complaintCategoryLabel(complaint.category),
        hint: "Issue type",
        tone: "info",
      },
      {
        title: "Student",
        value: complaint.student?.user?.name || "N/A",
        hint: complaint.student?.user?.email || "No email",
        tone: "primary",
      },
    ];
  }, [complaint]);

  const handleSave = async () => {
    if (!complaint) return;
    setError("");
    setSuccessMessage("");

    const parsed = complaintStaffUpdateSchema.safeParse({
      status,
      resolution,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid complaint update.");
      return;
    }

    setIsSaving(true);
    try {
      await complaintApi.updateAssignedComplaint(complaint.id, {
        status: parsed.data.status,
        resolution: parsed.data.resolution?.trim() || undefined,
      });
      setSuccessMessage("Complaint updated successfully.");
      await loadComplaint();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update complaint."));
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Complaint Work Panel"
      description="Update complaint progress, add resolution notes, and close assigned issues."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/complaints")}>
          Back to Complaints
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading complaint..." /> : null}

      {!isLoading && error && !complaint ? (
        <ErrorState title="Unable to load complaint" description={error} actionLabel="Retry" onAction={loadComplaint} />
      ) : null}

      {!isLoading && complaint ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ContentSection title={complaint.title} description={`Submitted ${formatDate(complaint.createdAt)}`}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={complaintStatusTone(complaint.status)}>
                    {complaintStatusLabel(complaint.status)}
                  </StatusBadge>
                  <StatusBadge tone={complaintSeverityTone(complaint.severity)}>
                    {complaintSeverityLabel(complaint.severity)}
                  </StatusBadge>
                  <span className="text-slate-400">{complaintCategoryLabel(complaint.category)}</span>
                </div>

                <div>
                  <p className="text-slate-400">Description</p>
                  <p className="mt-1">{complaint.description}</p>
                </div>

                <div>
                  <p className="text-slate-400">Current Resolution Note</p>
                  <p className="mt-1">{complaint.resolution || "No resolution note yet."}</p>
                  <p className="mt-1 text-xs text-slate-500">Updated: {formatDate(complaint.updatedAt)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Attachments</p>
                  {complaint.attachments?.length ? (
                    <ul className="mt-2 space-y-1">
                      {complaint.attachments.map((item) => (
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

            <ContentSection title="Update Workflow" description="Move status and add/modify resolution notes.">
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
                    {complaintStatusByStaffOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">Resolution Note</span>
                  <Textarea
                    rows={6}
                    className="mt-1"
                    placeholder="Describe work done, pending steps, or final resolution."
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    disabled={isSaving}
                  />
                </label>

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
        title="Apply complaint update?"
        description="This will update complaint status/resolution and notify the student."
        confirmLabel={isSaving ? "Saving..." : "Confirm Update"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default StaffComplaintWorkPage;
