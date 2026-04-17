import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { noticeApi } from "@/api/noticeApi";
import {
  noticeAudienceLabel,
  noticeCategoryLabel,
  noticeCategoryTone,
} from "@/features/notice-board/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function ProvostNoticeDetailsPage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });

  const loadNotice = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await noticeApi.getNoticeById(noticeId);
      setNotice(result.notice);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load notice details."));
    } finally {
      setIsLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    loadNotice();
  }, [loadNotice]);

  const handlePublish = async () => {
    if (!notice) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await noticeApi.publishNotice(notice.id);
      setSuccessMessage("Notice published successfully.");
      await loadNotice();
    } catch (publishError) {
      setError(getApiErrorMessage(publishError, "Failed to publish notice."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const handleToggleActive = async () => {
    if (!notice) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await noticeApi.setNoticeActive(notice.id, !notice.isActive);
      setSuccessMessage(!notice.isActive ? "Notice activated successfully." : "Notice deactivated successfully.");
      await loadNotice();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError, "Failed to update notice status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Notice Details"
      description="Review notice visibility, targeting, and publication metadata."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/notices")}>
          Back to Notice Management
        </Button>,
        <Button key="edit" variant="secondary" onClick={() => navigate(`/provost/notices/${noticeId}/edit`)}>
          Edit Notice
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading notice..." /> : null}
      {!isLoading && error && !notice ? (
        <ErrorState title="Unable to load notice" description={error} actionLabel="Retry" onAction={loadNotice} />
      ) : null}

      {!isLoading && notice ? (
        <>
          <SummaryGrid
            items={[
              {
                title: "Audience",
                value: noticeAudienceLabel(notice.targetAudience),
                hint: "Target visibility",
                tone: "info",
              },
              {
                title: "Status",
                value: notice.isActive ? "Active" : "Inactive",
                hint: "Feed visibility",
                tone: notice.isActive ? "success" : "neutral",
              },
              {
                title: "Urgency",
                value: notice.isUrgent ? "Urgent" : "Regular",
                hint: "Priority level",
                tone: notice.isUrgent ? "danger" : "primary",
              },
              {
                title: "Views",
                value: String(notice.views || 0),
                hint: "Opened count",
                tone: "warning",
              },
            ]}
          />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title={notice.title} description={`Published ${formatDate(notice.publishedDate)}`}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={noticeCategoryTone(notice.category)}>{noticeCategoryLabel(notice.category)}</StatusBadge>
                  {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : <StatusBadge tone="neutral">Regular</StatusBadge>}
                  {notice.isActive ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
                </div>

                <div>
                  <p className="text-slate-400">Content</p>
                  <p className="mt-1 whitespace-pre-wrap">{notice.content}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-400">Published By</p>
                    <p className="mt-1">{notice.publishedBy?.name || "N/A"}</p>
                    <p className="text-xs text-slate-500">{notice.publishedBy?.email || ""}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Expiry Date</p>
                    <p className="mt-1">{formatDate(notice.expiryDate)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400">Applicable Rooms</p>
                  {notice.applicableRooms?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {notice.applicableRooms.map((room) => (
                        <StatusBadge key={room.id} tone="info">
                          Room {room.roomNumber || room.id}
                        </StatusBadge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-400">No room targeting.</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">Specific Target Users</p>
                  {notice.targetUsers?.length ? (
                    <ul className="mt-2 space-y-1">
                      {notice.targetUsers.map((user) => (
                        <li key={user.id} className="text-slate-300">
                          {user.name || user.email || user.id}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No specific users configured.</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">Attachments</p>
                  {notice.attachments?.length ? (
                    <ul className="mt-2 space-y-1">
                      {notice.attachments.map((item) => (
                        <li key={item}>
                          <a href={item} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No attachments.</p>
                  )}
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Action Panel" description="Control publish and active visibility state.">
              <div className="space-y-3">
                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <Button disabled={isSaving} onClick={() => setConfirmState({ open: true, action: "publish" })}>
                  Publish Notice
                </Button>
                <Button
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setConfirmState({ open: true, action: "toggle" })}
                >
                  {notice.isActive ? "Deactivate Notice" : "Activate Notice"}
                </Button>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, action: "" })}
        onConfirm={confirmState.action === "publish" ? handlePublish : handleToggleActive}
        title={confirmState.action === "publish" ? "Publish notice?" : "Update active status?"}
        description={
          confirmState.action === "publish"
            ? "This will republish and send notifications according to audience and urgency."
            : "This will change visibility in regular user feeds."
        }
        confirmLabel={isSaving ? "Saving..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostNoticeDetailsPage;
