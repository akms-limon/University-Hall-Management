import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { noticeApi } from "@/api/noticeApi";
import { noticeCategoryLabel, noticeCategoryTone } from "@/features/notice-board/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StaffNoticeDetailsPage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotice = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await noticeApi.getMyNoticeById(noticeId);
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

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Notice Details"
      description="Read complete notice information and attachments."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/notices")}>
          Back to Notices
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading notice details..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load notice" description={error} actionLabel="Retry" onAction={loadNotice} />
      ) : null}

      {!isLoading && notice ? (
        <ContentSection title={notice.title} description={`Published ${formatDate(notice.publishedDate)}`}>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={noticeCategoryTone(notice.category)}>{noticeCategoryLabel(notice.category)}</StatusBadge>
              {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : <StatusBadge tone="neutral">Regular</StatusBadge>}
            </div>

            <div>
              <p className="text-slate-400">Content</p>
              <p className="mt-1 whitespace-pre-wrap">{notice.content}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-slate-400">Expiry Date</p>
                <p className="mt-1">{formatDate(notice.expiryDate)}</p>
              </div>
              <div>
                <p className="text-slate-400">Published By</p>
                <p className="mt-1">{notice.publishedBy?.name || "Provost"}</p>
              </div>
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
      ) : null}
    </DetailPageShell>
  );
}

export default StaffNoticeDetailsPage;
