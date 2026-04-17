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
import { staffApi } from "@/api/staffApi";
import { supportTicketApi } from "@/api/supportTicketApi";
import { uploadApi } from "@/api/uploadApi";
import {
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketPriorityTone,
  supportTicketStatusLabel,
  supportTicketStatusOptions,
  supportTicketStatusTone,
} from "@/features/support-ticket/constants";
import {
  buildSupportTicketMessagePayload,
  supportTicketMessageSchema,
  supportTicketStatusUpdateSchema,
} from "@/features/support-ticket/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function ProvostSupportTicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [status, setStatus] = useState("open");
  const [resolution, setResolution] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [ticketResult, staffResult] = await Promise.all([
        supportTicketApi.getTicketById(ticketId),
        staffApi.listStaff({
          page: 1,
          limit: 100,
          isActive: true,
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);

      const currentTicket = ticketResult.ticket;
      setTicket(currentTicket);
      setSelectedStaffId(currentTicket.assignedTo?.id || "");
      setStatus(currentTicket.status || "open");
      setResolution(currentTicket.resolution || "");
      setStaffOptions(staffResult.items || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load support ticket details."));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

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
        title: "Assigned Staff",
        value: ticket.assignedTo?.user?.name || "Unassigned",
        hint: ticket.assignedTo?.designation || "No assignment",
        tone: "primary",
      },
    ];
  }, [ticket]);

  const handleAssign = async () => {
    if (!ticket || !selectedStaffId) {
      setError("Please select a staff member.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await supportTicketApi.assignTicket(ticket.id, selectedStaffId);
      setSuccessMessage("Support ticket assigned successfully.");
      await loadPageData();
    } catch (assignError) {
      setError(getApiErrorMessage(assignError, "Failed to assign support ticket."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const handleStatusUpdate = async () => {
    if (!ticket) return;

    const parsed = supportTicketStatusUpdateSchema.safeParse({
      status,
      resolution,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid status update.");
      setConfirmState({ open: false, action: "" });
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await supportTicketApi.updateTicketStatus(ticket.id, {
        status: parsed.data.status,
        resolution: parsed.data.resolution?.trim() || undefined,
      });
      setSuccessMessage("Support ticket status updated successfully.");
      await loadPageData();
    } catch (statusError) {
      setError(getApiErrorMessage(statusError, "Failed to update support ticket status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
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
      await supportTicketApi.addProvostMessage(ticketId, payload);
      setMessage("");
      setAttachmentFiles([]);
      setAttachmentPreviewUrls([]);
      setSuccessMessage("Reply sent successfully.");
      await loadPageData();
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, "Failed to send reply."));
    } finally {
      setIsSending(false);
    }
  };

  const confirmTitle = confirmState.action === "assign" ? "Assign support ticket?" : "Update ticket status?";
  const confirmDescription =
    confirmState.action === "assign"
      ? "This will assign the ticket and notify the selected staff member."
      : "This will update ticket status/resolution and notify the student.";

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Support Ticket Details & Assignment"
      description="Review ticket details, manage assignment, and supervise conversation flow."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/support-tickets")}>
          Back to Support Tickets
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading support ticket details..." /> : null}

      {!isLoading && error && !ticket ? (
        <ErrorState title="Unable to load support ticket" description={error} actionLabel="Retry" onAction={loadPageData} />
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
                  <p className="text-slate-400">Student</p>
                  <p className="mt-1 font-medium">{ticket.student?.user?.name || "N/A"}</p>
                  <p className="text-xs text-slate-400">{ticket.student?.user?.email || "N/A"}</p>
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
              </div>
            </ContentSection>

            <ContentSection title="Action Panel" description="Assign ticket, update status, and reply if required.">
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
                    Assign Ticket
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Status Update</p>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)} disabled={isSaving}>
                    {supportTicketStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    rows={4}
                    placeholder="Add/update resolution details"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    disabled={isSaving}
                  />
                  <Button onClick={() => setConfirmState({ open: true, action: "status" })} disabled={isSaving}>
                    Update Status
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Reply in Thread</p>
                  <Textarea
                    rows={4}
                    placeholder="Write a message..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={isSending}
                  />
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
                  <Button variant="secondary" onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? "Sending..." : "Send Reply"}
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

export default ProvostSupportTicketDetailsPage;
