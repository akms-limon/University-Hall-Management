import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
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
  supportTicketStatusByStaffOptions,
  supportTicketStatusLabel,
  supportTicketStatusTone,
} from "@/features/support-ticket/constants";
import {
  buildSupportTicketMessagePayload,
  supportTicketMessageSchema,
  supportTicketStaffUpdateSchema,
} from "@/features/support-ticket/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StaffSupportTicketWorkPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("in-progress");
  const [resolution, setResolution] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await supportTicketApi.getAssignedTicketById(ticketId);
      setTicket(result.ticket);
      setStatus(result.ticket.status === "open" ? "in-progress" : result.ticket.status);
      setResolution(result.ticket.resolution || "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load support ticket."));
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
        hint: "Current workflow stage",
        tone: supportTicketStatusTone(ticket.status),
      },
      {
        title: "Priority",
        value: supportTicketPriorityLabel(ticket.priority),
        hint: "Urgency level",
        tone: supportTicketPriorityTone(ticket.priority),
      },
      {
        title: "Category",
        value: supportTicketCategoryLabel(ticket.category),
        hint: "Support type",
        tone: "info",
      },
      {
        title: "Student",
        value: ticket.student?.user?.name || "N/A",
        hint: ticket.student?.user?.email || "No email",
        tone: "primary",
      },
    ];
  }, [ticket]);

  const handleSaveUpdate = async () => {
    if (!ticket) return;
    setError("");
    setSuccessMessage("");

    const parsed = supportTicketStaffUpdateSchema.safeParse({
      status,
      resolution,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid ticket update.");
      return;
    }

    setIsSaving(true);
    try {
      await supportTicketApi.updateAssignedTicket(ticket.id, {
        status: parsed.data.status,
        resolution: parsed.data.resolution?.trim() || undefined,
      });
      setSuccessMessage("Support ticket updated successfully.");
      await loadTicket();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update support ticket."));
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

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
      await supportTicketApi.addAssignedMessage(ticketId, payload);
      setMessage("");
      setAttachmentFiles([]);
      setAttachmentPreviewUrls([]);
      setSuccessMessage("Reply sent successfully.");
      await loadTicket();
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, "Failed to send reply."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Support Ticket Work Panel"
      description="Reply to the student, update workflow, and add resolution details."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/support-tickets")}>
          Back to Assigned Tickets
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
                  <p className="text-slate-400">Conversation</p>
                  <div className="mt-2 max-h-[18rem] space-y-2 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/30 p-3">
                    {!ticket.messages?.length ? (
                      <p className="text-xs text-slate-500">No messages yet.</p>
                    ) : (
                      ticket.messages.map((entry, index) => (
                        <article key={`${entry.sentAt || "message"}-${index}`} className="rounded-lg border border-slate-700/60 p-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <p className="font-medium text-slate-200">{entry.sender?.name || "Unknown sender"}</p>
                            <p>{formatDate(entry.sentAt)}</p>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm">{entry.message}</p>
                        </article>
                      ))
                    )}
                  </div>
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

            <ContentSection title="Action Panel" description="Reply and move ticket status through workflow.">
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
                    {supportTicketStatusByStaffOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">Resolution Note</span>
                  <Textarea
                    rows={5}
                    className="mt-1"
                    placeholder="Add work summary or final resolution details..."
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    disabled={isSaving}
                  />
                </label>

                <Button onClick={() => setConfirmOpen(true)} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Update"}
                </Button>

                <div className="border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Reply to Student</p>
                  <Textarea
                    rows={4}
                    className="mt-2"
                    placeholder="Write your reply..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={isSending}
                  />
                  <div className="mt-2">
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
                  </div>
                  <Button className="mt-2" variant="secondary" onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSaveUpdate}
        title="Apply ticket update?"
        description="This will update ticket status/resolution and notify the student."
        confirmLabel={isSaving ? "Saving..." : "Confirm Update"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default StaffSupportTicketWorkPage;
