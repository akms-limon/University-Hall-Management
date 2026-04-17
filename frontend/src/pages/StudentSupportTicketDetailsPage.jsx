import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import FilePickerField from "@/components/shared/FilePickerField";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { supportTicketApi } from "@/api/supportTicketApi";
import { uploadApi } from "@/api/uploadApi";
import {
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketPriorityTone,
  supportTicketStatusLabel,
  supportTicketStatusTone,
} from "@/features/support-ticket/constants";
import {
  buildSupportTicketMessagePayload,
  supportTicketMessageSchema,
} from "@/features/support-ticket/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentSupportTicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await supportTicketApi.getMyTicketById(ticketId);
      setTicket(result.ticket);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load ticket details."));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const summaryItems = useMemo(() => {
    if (!ticket) return [];
    return [
      {
        title: "Status",
        value: supportTicketStatusLabel(ticket.status),
        hint: "Current ticket status",
        tone: supportTicketStatusTone(ticket.status),
      },
      {
        title: "Category",
        value: supportTicketCategoryLabel(ticket.category),
        hint: "Support type",
        tone: "info",
      },
      {
        title: "Priority",
        value: supportTicketPriorityLabel(ticket.priority),
        hint: "Urgency level",
        tone: supportTicketPriorityTone(ticket.priority),
      },
      {
        title: "Assigned",
        value: ticket.assignedTo?.user?.name || "Unassigned",
        hint: ticket.assignedTo?.designation || "Pending review",
        tone: "primary",
      },
    ];
  }, [ticket]);

  const handleSendMessage = async () => {
    const parsed = supportTicketMessageSchema.safeParse({
      message,
      attachmentsText: "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid message.");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = buildSupportTicketMessagePayload(parsed.data);
      if (attachmentFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(attachmentFiles);
        payload.attachments = uploadResult.urls || [];
      }
      await supportTicketApi.addMyMessage(ticketId, payload);
      setMessage("");
      setAttachmentFiles([]);
      setAttachmentPreviewUrls([]);
      setSuccessMessage("Message sent successfully.");
      await loadTicket();
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, "Failed to send message."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Support Ticket Details"
      description="Follow updates and exchange messages on this ticket."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/support-tickets")}>
          Back to My Tickets
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading support ticket..." /> : null}

      {!isLoading && error && !ticket ? (
        <ErrorState title="Unable to load ticket" description={error} actionLabel="Retry" onAction={loadTicket} />
      ) : null}

      {!isLoading && ticket ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title={ticket.subject} description={`Submitted ${formatDate(ticket.createdAt)}`}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={supportTicketStatusTone(ticket.status)}>
                    {supportTicketStatusLabel(ticket.status)}
                  </StatusBadge>
                  <StatusBadge tone={supportTicketPriorityTone(ticket.priority)}>
                    {supportTicketPriorityLabel(ticket.priority)}
                  </StatusBadge>
                  <span className="text-slate-400">{supportTicketCategoryLabel(ticket.category)}</span>
                </div>

                <div>
                  <p className="text-slate-400">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div>
                  <p className="text-slate-400">Resolution Details</p>
                  <p className="mt-1">{ticket.resolution || "No resolution note yet."}</p>
                  <p className="mt-1 text-xs text-slate-500">Resolution Date: {formatDate(ticket.resolutionDate)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Attachments</p>
                  {ticket.attachments?.length ? (
                    <ul className="mt-2 space-y-1">
                      {ticket.attachments.map((item) => (
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

            <ContentSection title="Conversation" description="Messages between you and responders.">
              <div className="space-y-3">
                <div className="max-h-[24rem] space-y-3 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/30 p-3">
                  {!ticket.messages?.length ? (
                    <p className="text-xs text-slate-500">No messages yet.</p>
                  ) : (
                    ticket.messages.map((entry, index) => (
                      <article key={`${entry.sentAt || "message"}-${index}`} className="rounded-lg border border-slate-700/60 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                          <p className="font-medium text-slate-200">{entry.sender?.name || "Unknown sender"}</p>
                          <p>{formatDate(entry.sentAt)}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{entry.message}</p>
                        {entry.attachments?.length ? (
                          <ul className="mt-2 space-y-1">
                            {entry.attachments.map((item) => (
                              <li key={item}>
                                <a href={item} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline hover:text-cyan-200">
                                  {item}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm text-slate-300">Message</span>
                  <Textarea
                    rows={4}
                    className="mt-1"
                    placeholder="Write a message..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={isSending}
                  />
                </label>

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
                  helperText="Upload screenshots or files from your device."
                  previewUrls={attachmentPreviewUrls}
                  disabled={isSending}
                />

                <Button onClick={handleSendMessage} disabled={isSending}>
                  {isSending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentSupportTicketDetailsPage;
