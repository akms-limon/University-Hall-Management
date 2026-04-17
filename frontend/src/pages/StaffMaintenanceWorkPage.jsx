import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import FilePickerField from "@/components/shared/FilePickerField";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { maintenanceApi } from "@/api/maintenanceApi";
import { uploadApi } from "@/api/uploadApi";
import {
  maintenanceCategoryLabel,
  maintenanceSeverityLabel,
  maintenanceSeverityTone,
  maintenanceStatusByStaffOptions,
  maintenanceStatusLabel,
  maintenanceStatusTone,
} from "@/features/maintenance/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "N/A";
  return `BDT ${Number(value).toLocaleString()}`;
}

const emptyMaterial = { name: "", quantity: "", cost: "" };

function StaffMaintenanceWorkPage() {
  const { maintenanceId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });

  // Work update form state
  const [status, setStatus] = useState("inspected");
  const [workLog, setWorkLog] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [materials, setMaterials] = useState([]);
  const [afterPhotoFiles, setAfterPhotoFiles] = useState([]);
  const [afterPhotoPreviewUrls, setAfterPhotoPreviewUrls] = useState([]);
  const [invoiceDocument, setInvoiceDocument] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await maintenanceApi.getAssignedMaintenanceById(maintenanceId);
      const rec = result.maintenance;
      setRecord(rec);
      setStatus(rec.status || "inspected");
      setWorkLog(rec.workLog || "");
      setEstimatedCost(rec.estimatedCost !== null && rec.estimatedCost !== undefined ? String(rec.estimatedCost) : "");
      setActualCost(rec.actualCost !== null && rec.actualCost !== undefined ? String(rec.actualCost) : "");
      setMaterials(rec.materialUsed?.length ? rec.materialUsed.map((m) => ({ name: m.name, quantity: String(m.quantity), cost: String(m.cost) })) : []);
      setAfterPhotoFiles([]);
      setAfterPhotoPreviewUrls([]);
      setInvoiceDocument(rec.invoiceDocument || "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load maintenance request."));
    } finally {
      setIsLoading(false);
    }
  }, [maintenanceId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addMaterial = () => setMaterials((prev) => [...prev, { ...emptyMaterial }]);
  const removeMaterial = (idx) => setMaterials((prev) => prev.filter((_, i) => i !== idx));
  const updateMaterial = (idx, field, value) => {
    setMaterials((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const buildPayload = (uploadedAfterPhotos = []) => {
    const payload = {};

    if (status) payload.status = status;
    if (workLog.trim()) payload.workLog = workLog.trim();
    if (estimatedCost !== "") payload.estimatedCost = Number(estimatedCost) || 0;
    if (actualCost !== "") payload.actualCost = Number(actualCost) || 0;

    const validMaterials = materials
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        quantity: Number(m.quantity) || 0,
        cost: Number(m.cost) || 0,
      }));

    if (validMaterials.length) payload.materialUsed = validMaterials;

    const afterPhotos = [...(record?.afterPhotos || []), ...uploadedAfterPhotos];
    if (afterPhotos.length) payload.afterPhotos = afterPhotos;
    if (invoiceDocument.trim()) payload.invoiceDocument = invoiceDocument.trim();

    return payload;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      let uploadedAfterPhotos = [];
      if (afterPhotoFiles.length) {
        const uploadResult = await uploadApi.uploadFiles(afterPhotoFiles);
        uploadedAfterPhotos = uploadResult.urls || [];
      }

      const payload = buildPayload(uploadedAfterPhotos);
      await maintenanceApi.updateAssignedMaintenance(maintenanceId, payload);
      setSuccessMessage("Maintenance record updated successfully.");
      await loadData();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to update maintenance record."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Maintenance Work"
      description="Log work progress, update status, and record costs and materials."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/maintenance")}>
          Back to Assigned
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading maintenance request..." /> : null}

      {!isLoading && error && !record ? (
        <ErrorState title="Unable to load request" description={error} actionLabel="Retry" onAction={loadData} />
      ) : null}

      {!isLoading && record ? (
        <div className="space-y-4">
          {/* Request summary */}
          <ContentSection title={record.issue} description={`Reported ${formatDate(record.createdAt)}`}>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={maintenanceStatusTone(record.status)}>
                  {maintenanceStatusLabel(record.status)}
                </StatusBadge>
                <StatusBadge tone={maintenanceSeverityTone(record.severity)}>
                  {maintenanceSeverityLabel(record.severity)}
                </StatusBadge>
                <span className="text-slate-400">{maintenanceCategoryLabel(record.category)}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-slate-400">Room</p>
                  <p className="mt-1 font-medium">
                    {record.room?.roomNumber ? `Room ${record.room.roomNumber}` : "N/A"}
                    {record.room?.wing ? ` - ${record.room.wing} Wing` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Reported By</p>
                  <p className="mt-1 font-medium">{record.reportedBy?.name || "N/A"}</p>
                  <p className="text-xs text-slate-400">{record.reportedBy?.email || ""}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400">Description</p>
                <p className="mt-1">{record.description}</p>
              </div>

              {record.beforePhotos?.length > 0 ? (
                <div>
                  <p className="text-slate-400 mb-1">Before Photos</p>
                  <ul className="space-y-1">
                    {record.beforePhotos.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">{url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </ContentSection>

          {/* Work update panel */}
          <ContentSection title="Work Update" description="Update status, log progress, and record costs.">
            <div className="space-y-4">
              {error ? (
                <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
              ) : null}
              {successMessage ? (
                <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{successMessage}</div>
              ) : null}

              <label className="block">
                <span className="text-sm text-slate-300">Status</span>
                <Select className="mt-1" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSaving}>
                  {maintenanceStatusByStaffOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Work Log</span>
                <Textarea
                  rows={5}
                  className="mt-1"
                  placeholder="Describe work done, observations, or progress notes..."
                  value={workLog}
                  onChange={(e) => setWorkLog(e.target.value)}
                  disabled={isSaving}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-300">Estimated Cost (BDT)</span>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1"
                    placeholder="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    disabled={isSaving}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Actual Cost (BDT)</span>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1"
                    placeholder="0"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    disabled={isSaving}
                  />
                </label>
              </div>

              {/* Materials section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Materials Used</span>
                  <Button type="button" size="sm" variant="secondary" onClick={addMaterial} disabled={isSaving}>
                    <Plus size={14} className="mr-1" /> Add Material
                  </Button>
                </div>
                {materials.length === 0 ? (
                  <p className="text-xs text-slate-500">No materials added yet.</p>
                ) : null}
                <div className="space-y-2">
                  {materials.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2 items-center">
                      <Input
                        placeholder="Material name"
                        value={m.name}
                        onChange={(e) => updateMaterial(idx, "name", e.target.value)}
                        disabled={isSaving}
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={m.quantity}
                        onChange={(e) => updateMaterial(idx, "quantity", e.target.value)}
                        disabled={isSaving}
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Cost"
                        value={m.cost}
                        onChange={(e) => updateMaterial(idx, "cost", e.target.value)}
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={() => removeMaterial(idx)}
                        disabled={isSaving}
                        className="flex items-center justify-center text-red-400 hover:text-red-300 disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <FilePickerField
                label="After Photos"
                accept="image/*"
                multiple
                onChange={(files) => {
                  setAfterPhotoFiles(files);
                  setAfterPhotoPreviewUrls(files.map((file) => URL.createObjectURL(file)));
                }}
                helperText="Upload completion photos from your device."
                previewUrls={afterPhotoPreviewUrls}
                disabled={isSaving}
              />

              <label className="block">
                <span className="text-sm text-slate-300">Invoice Document (link)</span>
                <Input
                  className="mt-1"
                  placeholder="https://example.com/invoice.pdf"
                  value={invoiceDocument}
                  onChange={(e) => setInvoiceDocument(e.target.value)}
                  disabled={isSaving}
                />
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => setConfirmState({ open: true, action: "save" })} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Updates"}
                </Button>
                {status !== "completed" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("completed");
                      setConfirmState({ open: true, action: "complete" });
                    }}
                    disabled={isSaving}
                  >
                    Mark as Completed
                  </Button>
                ) : null}
              </div>
            </div>
          </ContentSection>

          {/* Existing costs summary */}
          {(record.estimatedCost !== null || record.actualCost !== null) ? (
            <ContentSection title="Recorded Costs" description="Costs logged in the system.">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-slate-400">Estimated Cost</p>
                  <p className="mt-1 font-medium">{formatCurrency(record.estimatedCost)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Actual Cost</p>
                  <p className="mt-1 font-medium">{formatCurrency(record.actualCost)}</p>
                </div>
              </div>
            </ContentSection>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, action: "" })}
        onConfirm={handleSave}
        title={confirmState.action === "complete" ? "Mark as completed?" : "Save work updates?"}
        description={
          confirmState.action === "complete"
            ? "This will mark the maintenance request as completed and notify the student."
            : "This will save your work log, costs, and status updates."
        }
        confirmLabel={isSaving ? "Saving..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default StaffMaintenanceWorkPage;
