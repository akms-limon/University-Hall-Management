import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DetailPageShell from "@/components/shared/DetailPageShell";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import { noticeApi } from "@/api/noticeApi";
import { roomApi } from "@/api/roomApi";
import { staffApi } from "@/api/staffApi";
import { studentApi } from "@/api/studentApi";
import { noticeAudienceOptions, noticeCategoryOptions } from "@/features/notice-board/constants";
import { buildNoticePayload, noticeFormSchema } from "@/features/notice-board/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultForm = {
  title: "",
  content: "",
  category: "announcement",
  targetAudience: "all",
  targetUsers: [],
  applicableRooms: [],
  attachmentsText: "",
  isUrgent: false,
  expiryDate: "",
  isActive: true,
};

function optionLabelForUser(entry) {
  return `${entry.user?.name || "Unknown"} (${entry.user?.email || "N/A"})`;
}

function ProvostCreateNoticePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [studentOptions, setStudentOptions] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsResult, staffsResult, roomsResult] = await Promise.all([
        studentApi.listStudents({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        staffApi.listStaff({ page: 1, limit: 200, isActive: true, sortBy: "name", sortOrder: "asc" }),
        roomApi.listRooms({ page: 1, limit: 300, isActive: true, sortBy: "roomNumber", sortOrder: "asc" }),
      ]);
      setStudentOptions(studentsResult.items || []);
      setStaffOptions(staffsResult.items || []);
      setRoomOptions(roomsResult.items || []);
    } catch {
      setStudentOptions([]);
      setStaffOptions([]);
      setRoomOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

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
      const result = await noticeApi.createNotice(payload);
      navigate(`/provost/notices/${result.notice.id}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to create notice."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Create Notice"
      description="Publish announcements and targeted notices for hall stakeholders."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/notices")}>
          Back to Notice Management
        </Button>,
      ]}
    >
      <FormPageShell title="Notice Form" description="Complete notice details, audience, and visibility settings.">
        {isLoading ? <LoadingState label="Loading options..." /> : null}

        {!isLoading ? (
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
              <Textarea
                className="mt-1"
                rows={6}
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
              />
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
                  Active immediately
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Notice"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setForm(defaultForm)} disabled={isSubmitting}>
                Reset
              </Button>
            </div>
          </form>
        ) : null}
      </FormPageShell>
    </DetailPageShell>
  );
}

export default ProvostCreateNoticePage;
