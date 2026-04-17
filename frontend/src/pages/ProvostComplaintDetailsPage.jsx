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
import { staffApi } from "@/api/staffApi";
import {
  complaintCategoryLabel,
  complaintSeverityLabel,
  complaintSeverityTone,
  complaintStatusLabel,
  complaintStatusOptions,
  complaintStatusTone,
} from "@/features/complaint-management/constants";
import { complaintStatusUpdateSchema } from "@/features/complaint-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function ProvostComplaintDetailsPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [status, setStatus] = useState("open");
  const [resolution, setResolution] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [complaintResult, staffResult] = await Promise.all([
        complaintApi.getComplaintById(complaintId),
        staffApi.listStaff({
          page: 1,
          limit: 100,
          isActive: true,
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);

      const currentComplaint = complaintResult.complaint;
      setComplaint(currentComplaint);
      setSelectedStaffId(currentComplaint.assignedTo?.id || "");
      setStatus(currentComplaint.status || "open");
      setResolution(currentComplaint.resolution || "");
      setStaffOptions(staffResult.items || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load complaint details."));
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

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
        title: "Category",
        value: complaintCategoryLabel(complaint.category),
        hint: "Issue type",
        tone: "info",
      },
      {
        title: "Severity",
        value: complaintSeverityLabel(complaint.severity),
        hint: "Priority level",
        tone: complaintSeverityTone(complaint.severity),
      },
      {
        title: "Assigned Staff",
        value: complaint.assignedTo?.user?.name || "Unassigned",
        hint: complaint.assignedTo?.designation || "No assignment",
        tone: "primary",
      },
    ];
  }, [complaint]);

  const handleAssign = async () => {
    if (!complaint || !selectedStaffId) {
      setError("Please select a staff member.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await complaintApi.assignComplaint(complaint.id, selectedStaffId);
      setSuccessMessage("Complaint assigned successfully.");
      await loadPageData();
    } catch (assignError) {
      setError(getApiErrorMessage(assignError, "Failed to assign complaint."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const handleStatusUpdate = async () => {
    if (!complaint) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    const parsed = complaintStatusUpdateSchema.safeParse({
      status,
      resolution,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid status update.");
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
      return;
    }

    try {
      await complaintApi.updateComplaintStatus(complaint.id, {
        status: parsed.data.status,
        resolution: parsed.data.resolution?.trim() || undefined,
      });
      setSuccessMessage("Complaint status updated successfully.");
      await loadPageData();
    } catch (statusError) {
      setError(getApiErrorMessage(statusError, "Failed to update complaint status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const confirmTitle = confirmState.action === "assign" ? "Assign complaint?" : "Update complaint status?";
  const confirmDescription =
    confirmState.action === "assign"
      ? "This will assign the complaint and notify the selected staff member."
      : "This will update complaint status/resolution and notify the student.";

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Complaint Details & Assignment"
      description="Review complaint details, assign staff, and update progress."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/complaints")}>
          Back to Complaints
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading complaint details..." /> : null}

      {!isLoading && error && !complaint ? (
        <ErrorState title="Unable to load complaint" description={error} actionLabel="Retry" onAction={loadPageData} />
      ) : null}

      {!isLoading && complaint ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
                  <p className="text-slate-400">Student</p>
                  <p className="mt-1 font-medium">{complaint.student?.user?.name || "N/A"}</p>
                  <p className="text-xs text-slate-400">{complaint.student?.user?.email || "N/A"}</p>
                  {complaint.student?.registrationNumber ? (
                    <p className="text-xs text-slate-500">Reg: {complaint.student.registrationNumber}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-slate-400">Description</p>
                  <p className="mt-1">{complaint.description}</p>
                </div>

                <div>
                  <p className="text-slate-400">Resolution Details</p>
                  <p className="mt-1">{complaint.resolution || "No resolution note yet."}</p>
                  <p className="mt-1 text-xs text-slate-500">Resolution Date: {formatDate(complaint.resolutionDate)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Student Feedback</p>
                  <p className="mt-1">{complaint.feedback || "Feedback not submitted yet."}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Rating: {complaint.rating === null || complaint.rating === undefined ? "N/A" : complaint.rating}
                  </p>
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

            <ContentSection title="Action Panel" description="Assign complaint and manage status workflow.">
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
                  <p className="text-sm font-medium">Assign to Staff</p>
                  <Select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={isSaving}>
                    <option value="">Select staff</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.user?.name || "Unknown"} ({staff.designation || "Staff"})
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => setConfirmState({ open: true, action: "assign" })} disabled={isSaving}>
                    Assign Complaint
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Status Update</p>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)} disabled={isSaving}>
                    {complaintStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    rows={5}
                    placeholder="Add or update resolution details"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    disabled={isSaving}
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
        onConfirm={confirmState.action === "assign" ? handleAssign : handleStatusUpdate}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={isSaving ? "Saving..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostComplaintDetailsPage;
