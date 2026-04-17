import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import { noticeApi } from "@/api/noticeApi";
import { roomApi } from "@/api/roomApi";
import { staffApi } from "@/api/staffApi";
import { studentApi } from "@/api/studentApi";
import { noticeAudienceOptions, noticeCategoryOptions } from "@/features/notice-board/constants";
import { buildNoticePayload, noticeFormSchema } from "@/features/notice-board/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function optionLabelForUser(entry) {
  return `${entry.user?.name || "Unknown"} (${entry.user?.email || "N/A"})`;
}

function formatDateInput(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function ProvostEditNoticePage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [noticeResult, studentsResult, staffsResult, roomsResult] = await Promise.all([
        noticeApi.getNoticeById(noticeId),
        studentApi.listStudents({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        staffApi.listStaff({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        roomApi.listRooms({ page: 1, limit: 300, isActive: true, sortBy: "roomNumber", sortOrder: "asc" }),
      ]);
      const notice = noticeResult.notice;
      setStudentOptions(studentsResult.items || []);
      setStaffOptions(staffsResult.items || []);
      setRoomOptions(roomsResult.items || []);
      setForm({
        title: notice.title || "",
        content: notice.content || "",
        category: notice.category || "announcement",
        targetAudience: notice.targetAudience || "all",
        targetUsers: Array.isArray(notice.targetUsers) ? notice.targetUsers.map((entry) => entry.id).filter(Boolean) : [],
        applicableRooms: Array.isArray(notice.applicableRooms)
          ? notice.applicableRooms.map((entry) => entry.id).filter(Boolean)
          : [],
        attachmentsText: Array.isArray(notice.attachments) ? notice.attachments.join("\n") : "",
        isUrgent: Boolean(notice.isUrgent),
        expiryDate: formatDateInput(notice.expiryDate),
        isActive: Boolean(notice.isActive),
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load notice details."));
    } finally {
      setIsLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const selectableUsers = useMemo(
    () => [
      ...studentOptions.map((entry) => ({ id: entry.user?.id, label: optionLabelForUser(entry) })),
      ...staffOptions.map((entry) => ({ id: entry.user?.id, label: optionLabelForUser(entry) })),
    ].filter((entry) => entry.id),
    [staffOptions, studentOptions]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const exists = prev[field].includes(value);
      return {
        ...prev,
        [field]: exists ? prev[field].filter((entry) => entry !== value) : [...prev[field], value],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;
    setError("");

    const parsed = noticeFormSchema.safeParse({
      title: form.title,
      content: form.content,
      category: form.category,
      targetAudience: form.targetAudience,
      targetUsersText: form.targetUsers.join("\n"),
      applicableRoomsText: form.applicableRooms.join("\n"),
      isUrgent: form.isUrgent,
      expiryDate: form.expiryDate,
      attachmentsText: form.attachmentsText,
      isActive: form.isActive,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review notice details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildNoticePayload(parsed.data);
      await noticeApi.updateNotice(noticeId, payload);
      navigate(`/provost/notices/${noticeId}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to update notice."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Edit Notice"
      description="Update audience, content, visibility, and urgency settings."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate(`/provost/notices/${noticeId}`)}>
          Back to Notice
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading notice..." /> : null}
      {!isLoading && error && !form ? (
        <ErrorState title="Unable to load notice" description={error} actionLabel="Retry" onAction={loadPageData} />
      ) : null}

      {!isLoading && form ? (
        <FormPageShell title="Notice Form" description="Edit notice fields and save your changes.">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
            ) : null}

            <label className="block">
              <span className="text-sm text-slate-300">Title</span>
              <Input className="mt-1" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Content</span>
              <Textarea className="mt-1" rows={6} value={form.content} onChange={(event) => updateField("content", event.target.value)} />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Category</span>
                <Select className="mt-1" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  {noticeCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Target Audience</span>
                <Select className="mt-1" value={form.targetAudience} onChange={(event) => updateField("targetAudience", event.target.value)}>
                  {noticeAudienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            {form.targetAudience === "specific" ? (
              <section className="space-y-2">
                <p className="text-sm text-slate-300">Specific Target Users</p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-700/60 p-3">
                  {!selectableUsers.length ? <p className="text-xs text-slate-500">No active users found.</p> : null}
                  {selectableUsers.map((entry) => (
                    <label key={entry.id} className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                        checked={form.targetUsers.includes(entry.id)}
                        onChange={() => toggleArrayValue("targetUsers", entry.id)}
                      />
                      <span>{entry.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <p className="text-sm text-slate-300">Applicable Rooms (Optional)</p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-700/60 p-3">
                {!roomOptions.length ? <p className="text-xs text-slate-500">No rooms found.</p> : null}
                {roomOptions.map((room) => (
                  <label key={room.id} className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                      checked={form.applicableRooms.includes(room.id)}
                      onChange={() => toggleArrayValue("applicableRooms", room.id)}
                    />
                    <span>Room {room.roomNumber}{room.wing ? ` - ${room.wing}` : ""}</span>
                  </label>
                ))}
              </div>
            </section>

            <label className="block">
              <span className="text-sm text-slate-300">Attachments (Optional Links)</span>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.attachmentsText}
                onChange={(event) => updateField("attachmentsText", event.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Expiry Date (Optional)</span>
                <Input className="mt-1" type="date" value={form.expiryDate} onChange={(event) => updateField("expiryDate", event.target.value)} />
              </label>
              <div className="flex flex-col justify-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                    checked={form.isUrgent}
                    onChange={(event) => updateField("isUrgent", event.target.checked)}
                  />
                  Mark as urgent
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                    checked={form.isActive}
                    onChange={(event) => updateField("isActive", event.target.checked)}
                  />
                  Notice is active
                </label>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </FormPageShell>
      ) : null}
    </DetailPageShell>
  );
}

export default ProvostEditNoticePage;
