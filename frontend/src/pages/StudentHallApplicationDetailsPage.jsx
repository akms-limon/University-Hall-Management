import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import ProgressTimeline from "@/components/shared/ProgressTimeline";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import {
  hallApplicationStatusLabel,
  hallApplicationStatusTone,
} from "@/features/hall-application/constants";
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

function StudentHallApplicationDetailsPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await hallApplicationApi.getMyApplicationById(applicationId);
      setApplication(result.application);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load application details."));
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
        title: "Application Date",
        value: new Date(application.applicationDate).toLocaleDateString(),
        hint: "Submission date",
        tone: "primary",
      },
      {
        title: "Status",
        value: hallApplicationStatusLabel(application.status),
        hint: "Current review stage",
        tone: hallApplicationStatusTone(application.status),
      },
      {
        title: "Department",
        value: application.department,
        hint: "Academic department",
        tone: "info",
      },
      {
        title: "Semester",
        value: String(application.semester),
        hint: "Current semester",
        tone: "warning",
      },
    ];
  }, [application]);

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="General Application Details"
      description="Review your submitted information and monitor status updates from provost."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/general-application")}>
          Back to Tracking
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading hall application..." /> : null}

      {!isLoading && error ? (
        <ErrorState
          title="Unable to load hall application"
          description={error}
          actionLabel="Retry"
          onAction={loadApplication}
        />
      ) : null}

      {!isLoading && !error && application ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ContentSection title="Submitted Information" description="Application form details you submitted.">
              <dl className="grid gap-3 text-sm">
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
                <div className="grid gap-1 rounded-lg border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Reason</dt>
                  <dd className="text-slate-200">{application.reason}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Status and Timeline" description="Progress through review milestones.">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-400">Current Status</p>
                  <div className="mt-2">
                    <StatusBadge tone={hallApplicationStatusTone(application.status)}>
                      {hallApplicationStatusLabel(application.status)}
                    </StatusBadge>
                  </div>
                </div>
                <ProgressTimeline steps={buildTimeline(application)} />
              </div>
            </ContentSection>

            <ContentSection title="Emergency Contact" description="Emergency contact shared for this application.">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Name</dt>
                  <dd>{application.emergencyContact?.name || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Phone</dt>
                  <dd>{application.emergencyContact?.phone || "N/A"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Relation</dt>
                  <dd>{application.emergencyContact?.relation || "N/A"}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Review Notes" description="Comments and decisions shared by provost office.">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-slate-400">General Review Note</dt>
                  <dd className="mt-1">{application.reviewNote || "No review note yet."}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Meeting</dt>
                  <dd className="mt-1">
                    {application.meetingDate ? `${formatDate(application.meetingDate)} • ${application.meetingNote || "No note"}` : "No meeting scheduled yet."}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Approval Note</dt>
                  <dd className="mt-1">{application.approvalNote || "Not available."}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Rejection Reason</dt>
                  <dd className="mt-1">{application.rejectionReason || "Not available."}</dd>
                </div>
              </dl>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentHallApplicationDetailsPage;
