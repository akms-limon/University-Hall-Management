import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
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
  complaintStatusLabel,
  complaintStatusTone,
} from "@/features/complaint-management/constants";
import { complaintFeedbackSchema } from "@/features/complaint-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentComplaintDetailsPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState("");

  const loadComplaint = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await complaintApi.getMyComplaintById(complaintId);
      setComplaint(result.complaint);
      setFeedback(result.complaint.feedback || "");
      setRating(result.complaint.rating ?? "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load complaint details."));
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    loadComplaint();
  }, [loadComplaint]);

  const canSubmitFeedback = useMemo(() => {
    return complaint && ["resolved", "closed"].includes(complaint.status);
  }, [complaint]);

  const summaryItems = useMemo(() => {
    if (!complaint) return [];

    return [
      {
        title: "Status",
        value: complaintStatusLabel(complaint.status),
        hint: "Current complaint status",
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
        hint: complaint.assignedTo?.designation || "No assignment yet",
        tone: "neutral",
      },
    ];
  }, [complaint]);

  const handleFeedbackSubmit = async () => {
    setError("");
    setSuccessMessage("");

    const parsed = complaintFeedbackSchema.safeParse({
      feedback,
      rating: rating === "" ? undefined : Number(rating),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid feedback data.");
      return;
    }

    setIsSaving(true);
    try {
      await complaintApi.addMyFeedback(complaintId, {
        feedback: parsed.data.feedback,
        rating: parsed.data.rating,
      });
      setSuccessMessage("Feedback submitted successfully.");
      await loadComplaint();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to submit feedback."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Complaint Details"
      description="Track progress and submit feedback after resolution."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/complaints")}>
          Back to My Complaints
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading complaint details..." /> : null}

      {!isLoading && error && !complaint ? (
        <ErrorState title="Unable to load complaint" description={error} actionLabel="Retry" onAction={loadComplaint} />
      ) : null}

      {!isLoading && complaint ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ContentSection title={complaint.title} description={`Submitted on ${formatDate(complaint.createdAt)}`}>
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
                  <p className="text-slate-400">Resolution Details</p>
                  <p className="mt-1">{complaint.resolution || "Resolution note not added yet."}</p>
                  <p className="mt-1 text-xs text-slate-500">Resolved/Updated: {formatDate(complaint.resolutionDate)}</p>
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

            <ContentSection title="Feedback and Rating" description="Share your experience after resolution.">
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
                  <span className="text-sm text-slate-300">Rating (0-5)</span>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    disabled={!canSubmitFeedback || isSaving}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">Feedback</span>
                  <Textarea
                    rows={4}
                    className="mt-1"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    disabled={!canSubmitFeedback || isSaving}
                  />
                </label>

                {!canSubmitFeedback ? (
                  <p className="text-xs text-slate-400">Feedback can be submitted only when complaint is resolved or closed.</p>
                ) : null}

                <Button onClick={handleFeedbackSubmit} disabled={!canSubmitFeedback || isSaving}>
                  {isSaving ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentComplaintDetailsPage;
