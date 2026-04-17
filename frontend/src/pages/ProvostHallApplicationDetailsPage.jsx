import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import ProgressTimeline from "@/components/shared/ProgressTimeline";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import {
  hallApplicationRequestTypeLabel,
  hallApplicationStatusLabel,
  hallApplicationStatusTone,
} from "@/features/hall-application/constants";
import {
  approveSchema,
  meetingScheduleSchema,
  rejectSchema,
  reviewNoteSchema,
  waitlistSchema,
} from "@/features/hall-application/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function buildTimeline(application) {
  const status = application?.status;
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isWaitlisted = status === "waitlisted";
  const isMeeting = status === "meeting_scheduled" || isApproved || isRejected || isWaitlisted;
  const isUnderReview = status === "under_review" || isMeeting;

  return [
    { label: "Submitted", status: "completed", note: formatDate(application?.applicationDate) },
    { label: "Under Review", status: isUnderReview ? "completed" : "pending", note: application?.reviewNote || "" },
    { label: "Meeting", status: isMeeting ? "completed" : "pending", note: formatDate(application?.meetingDate) },
    {
      label: "Final Decision",
      status: isApproved || isRejected || isWaitlisted ? "completed" : "pending",
      note: hallApplicationStatusLabel(status),
    },
  ];
}

function ProvostHallApplicationDetailsPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reviewNoteText, setReviewNoteText] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [waitlistNote, setWaitlistNote] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: null });

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await hallApplicationApi.getHallApplicationById(applicationId);
      const entry = result.application;
      setApplication(entry);
      setReviewNoteText(entry.reviewNote || "");
      setMeetingDate(entry.meetingDate ? new Date(entry.meetingDate).toISOString().slice(0, 16) : "");
      setMeetingNote(entry.meetingNote || "");
      setApprovalNote(entry.approvalNote || "");
      setRejectionReason(entry.rejectionReason || "");
      setWaitlistNote(entry.reviewNote || "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load hall application details."));
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const summaryItems = useMemo(() => {
    if (!application) return [];
    return [
      {
        title: "Student",
        value: application.student?.user?.name || "N/A",
        hint: application.student?.user?.email || "No email",
        tone: "primary",
      },
      {
        title: "Status",
        value: hallApplicationStatusLabel(application.status),
        hint: "Current review stage",
        tone: hallApplicationStatusTone(application.status),
      },
      {
        title: "Applied On",
        value: new Date(application.applicationDate).toLocaleDateString(),
        hint: "Submission date",
        tone: "info",
      },
      {
        title: "Request Type",
        value: hallApplicationRequestTypeLabel(application.requestType),
        hint: "Application category",
        tone: "warning",
      },
      {
        title: "Meeting",
        value: application.meetingDate ? new Date(application.meetingDate).toLocaleDateString() : "Not Scheduled",
        hint: "Interview scheduling",
        tone: "warning",
      },
    ];
  }, [application]);

  const openConfirm = (action) => {
    setConfirmState({ open: true, action });
  };

  const closeConfirm = () => {
    setConfirmState({ open: false, action: null });
  };

  const runAction = async (action) => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      if (action === "under_review") {
        await hallApplicationApi.updateHallApplicationStatus(applicationId, {
          status: "under_review",
          reviewNote: reviewNoteText.trim(),
        });
        setSuccessMessage("Application moved to under review.");
      }

      if (action === "save_review") {
        const parsed = reviewNoteSchema.safeParse({ reviewNote: reviewNoteText });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Review note is invalid.");
          return;
        }

        await hallApplicationApi.updateHallApplicationReview(applicationId, {
          reviewNote: parsed.data.reviewNote.trim(),
        });
        setSuccessMessage("Review note saved.");
      }

      if (action === "schedule") {
        const parsed = meetingScheduleSchema.safeParse({
          meetingDate,
          meetingNote,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Meeting details are invalid.");
          return;
        }

        await hallApplicationApi.scheduleMeeting(applicationId, {
          meetingDate: parsed.data.meetingDate,
          meetingNote: parsed.data.meetingNote.trim(),
        });
        setSuccessMessage("Meeting scheduled successfully.");
      }

      if (action === "approve") {
        const parsed = approveSchema.safeParse({ approvalNote });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Approval note is invalid.");
          return;
        }

        await hallApplicationApi.approveApplication(applicationId, {
          approvalNote: parsed.data.approvalNote.trim(),
        });
        setSuccessMessage("Application approved successfully.");
      }

      if (action === "reject") {
        const parsed = rejectSchema.safeParse({ rejectionReason });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Rejection reason is invalid.");
          return;
        }

        await hallApplicationApi.rejectApplication(applicationId, {
          rejectionReason: parsed.data.rejectionReason.trim(),
        });
        setSuccessMessage("Application rejected successfully.");
      }

      if (action === "waitlist") {
        const parsed = waitlistSchema.safeParse({ reviewNote: waitlistNote });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message || "Waitlist note is invalid.");
          return;
        }

        await hallApplicationApi.waitlistApplication(applicationId, {
          reviewNote: parsed.data.reviewNote.trim(),
        });
        setSuccessMessage("Application moved to waitlist.");
      }
      await loadApplication();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, "Failed to update hall application."));
    } finally {
      setIsSaving(false);
      closeConfirm();
    }
  };

  const confirmTitleMap = {
    under_review: "Mark as under review?",
    approve: "Approve this application?",
    reject: "Reject this application?",
    waitlist: "Waitlist this application?",
  };

  const confirmDescriptionMap = {
    under_review: "This indicates the application has entered the review phase.",
    approve: "This decision will mark the application as approved.",
    reject: "This decision will mark the application as rejected.",
    waitlist: "This will place the applicant on waitlist.",
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="General Application Details"
      description="Review full application profile, set notes, schedule meeting, and finalize decision."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/general-applications")}>
          Back to List
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading hall application..." /> : null}

      {!isLoading && error && !application ? (
        <ErrorState
          title="Unable to load hall application"
          description={error}
          actionLabel="Retry"
          onAction={loadApplication}
        />
      ) : null}

      {!isLoading && application ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title="Student and Academic Information" description="Applicant and academic basics.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Name</dt>
                  <dd>{application.student?.user?.name || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{application.student?.user?.email || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Registration Number</dt>
                  <dd>{application.registrationNumber}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Department</dt>
                  <dd>{application.department}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Semester</dt>
                  <dd>{application.semester}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Contact Phone</dt>
                  <dd>{application.contactPhone || "N/A"}</dd>
                </div>
                {application.requestType === "transfer_request" ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Current Room</dt>
                      <dd>{application.currentRoomNumber || "N/A"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Desired Room</dt>
                      <dd>{application.desiredRoomNumber || application.desiredRoom?.roomNumber || "N/A"}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </ContentSection>

            <ContentSection title="Status Timeline" description="Visual progress across review stages.">
              <div className="space-y-4">
                <StatusBadge tone={hallApplicationStatusTone(application.status)}>
                  {hallApplicationStatusLabel(application.status)}
                </StatusBadge>
                <ProgressTimeline steps={buildTimeline(application)} />
              </div>
            </ContentSection>

            <ContentSection title="Reason and Attachments" description="Submitted justification and supporting references.">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400">Reason</p>
                  <p className="mt-1">{application.reason}</p>
                </div>

                <div>
                  <p className="text-slate-400">Attachments</p>
                  {application.attachments?.length ? (
                    <ul className="mt-2 space-y-2">
                      {application.attachments.map((entry) => (
                        <li key={entry}>
                          <a
                            href={entry}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-300 hover:text-cyan-200 underline"
                          >
                            {entry}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No attachments provided.</p>
                  )}
                </div>

                <div className="grid gap-1 rounded-lg border border-slate-700/60 bg-slate-900/45 p-3">
                  <p className="text-slate-400">Emergency Contact</p>
                  <p>{application.emergencyContact?.name || "N/A"}</p>
                  <p>{application.emergencyContact?.phone || "N/A"}</p>
                  <p>{application.emergencyContact?.relation || "N/A"}</p>
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Review Action Panel" description="Update review notes, schedule meeting, or finalize outcome.">
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm text-slate-300">Review Note</span>
                  <Textarea
                    rows={3}
                    className="mt-1"
                    value={reviewNoteText}
                    onChange={(event) => setReviewNoteText(event.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" disabled={isSaving} onClick={() => runAction("save_review")}>
                    Save Note
                  </Button>
                  <Button variant="secondary" disabled={isSaving} onClick={() => openConfirm("under_review")}>
                    Mark Under Review
                  </Button>
                </div>

                <div className="grid gap-3 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Meeting Scheduling</p>
                  <Input
                    type="datetime-local"
                    value={meetingDate}
                    onChange={(event) => setMeetingDate(event.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Meeting note"
                    value={meetingNote}
                    onChange={(event) => setMeetingNote(event.target.value)}
                  />
                  <Button variant="secondary" disabled={isSaving} onClick={() => runAction("schedule")}>
                    Schedule Meeting
                  </Button>
                </div>

                <div className="grid gap-3 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Decision Actions</p>
                  <Textarea
                    rows={2}
                    placeholder="Approval note (optional)"
                    value={approvalNote}
                    onChange={(event) => setApprovalNote(event.target.value)}
                  />
                  <Button disabled={isSaving} onClick={() => openConfirm("approve")}>
                    Approve Application
                  </Button>

                  <Textarea
                    rows={2}
                    placeholder="Rejection reason (required)"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                  <Button variant="danger" disabled={isSaving} onClick={() => openConfirm("reject")}>
                    Reject Application
                  </Button>

                  <Textarea
                    rows={2}
                    placeholder="Waitlist note (optional)"
                    value={waitlistNote}
                    onChange={(event) => setWaitlistNote(event.target.value)}
                  />
                  <Button variant="secondary" disabled={isSaving} onClick={() => openConfirm("waitlist")}>
                    Move to Waitlist
                  </Button>
                </div>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onClose={closeConfirm}
        onConfirm={() => runAction(confirmState.action)}
        title={confirmTitleMap[confirmState.action] || "Confirm action?"}
        description={confirmDescriptionMap[confirmState.action] || "This action will update application state."}
        confirmLabel={isSaving ? "Processing..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostHallApplicationDetailsPage;
