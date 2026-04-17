import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { maintenanceApi } from "@/api/maintenanceApi";
import { staffApi } from "@/api/staffApi";
import {
  maintenanceCategoryLabel,
  maintenanceSeverityLabel,
  maintenanceSeverityTone,
  maintenanceStatusByProvostOptions,
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

function ProvostMaintenanceDetailsPage() {
  const { maintenanceId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [status, setStatus] = useState("reported");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, action: "" });

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [maintenanceResult, staffResult] = await Promise.all([
        maintenanceApi.getMaintenanceById(maintenanceId),
        staffApi.listStaff({
          page: 1,
          limit: 100,
          isActive: true,
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);

      const currentRecord = maintenanceResult.maintenance;
      setRecord(currentRecord);
      setSelectedStaffId(currentRecord.assignedTo?.id || "");
      setStatus(currentRecord.status || "reported");
      setStaffOptions(staffResult.items || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load maintenance details."));
    } finally {
      setIsLoading(false);
    }
  }, [maintenanceId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const summaryItems = useMemo(() => {
    if (!record) return [];
    return [
      {
        title: "Status",
        value: maintenanceStatusLabel(record.status),
        hint: "Current workflow stage",
        tone: maintenanceStatusTone(record.status),
      },
      {
        title: "Category",
        value: maintenanceCategoryLabel(record.category),
        hint: "Issue type",
        tone: "info",
      },
      {
        title: "Severity",
        value: maintenanceSeverityLabel(record.severity),
        hint: "Priority level",
        tone: maintenanceSeverityTone(record.severity),
      },
      {
        title: "Assigned Staff",
        value: record.assignedTo?.user?.name || "Unassigned",
        hint: record.assignedTo?.designation || "No assignment",
        tone: "primary",
      },
    ];
  }, [record]);

  const handleAssign = async () => {
    if (!record || !selectedStaffId) {
      setError("Please select a staff member.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await maintenanceApi.assignMaintenance(record.id, selectedStaffId);
      setSuccessMessage("Maintenance request assigned successfully.");
      await loadPageData();
    } catch (assignError) {
      setError(getApiErrorMessage(assignError, "Failed to assign maintenance request."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const handleStatusUpdate = async () => {
    if (!record) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await maintenanceApi.updateMaintenanceStatus(record.id, status);
      setSuccessMessage("Maintenance status updated successfully.");
      await loadPageData();
    } catch (statusError) {
      setError(getApiErrorMessage(statusError, "Failed to update maintenance status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "" });
    }
  };

  const confirmTitle =
    confirmState.action === "assign"
      ? "Assign maintenance request?"
      : "Update maintenance status?";
  const confirmDescription =
    confirmState.action === "assign"
      ? "This will assign the request and notify the selected staff member."
      : "This will update maintenance status and notify the student.";

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Maintenance Details & Assignment"
      description="Review maintenance details, assign staff, and manage status."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/maintenance")}>
          Back to Maintenance
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading maintenance details..." /> : null}

      {!isLoading && error && !record ? (
        <ErrorState title="Unable to load maintenance request" description={error} actionLabel="Retry" onAction={loadPageData} />
      ) : null}

      {!isLoading && record ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ContentSection title={record.issue} description={`Submitted ${formatDate(record.createdAt)}`}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={maintenanceStatusTone(record.status)}>
                    {maintenanceStatusLabel(record.status)}
                  </StatusBadge>
                  <StatusBadge tone={maintenanceSeverityTone(record.severity)}>
                    {maintenanceSeverityLabel(record.severity)}
                  </StatusBadge>
                  <span className="text-slate-400">{maintenanceCategoryLabel(record.category)}</span>
                </div>

                <div>
                  <p className="text-slate-400">Student</p>
                  <p className="mt-1 font-medium">{record.reportedBy?.name || "N/A"}</p>
                  <p className="text-xs text-slate-400">{record.reportedBy?.email || "N/A"}</p>
                </div>

                <div>
                  <p className="text-slate-400">Room</p>
                  <p className="mt-1 font-medium">
                    {record.room?.roomNumber ? `Room ${record.room.roomNumber}` : "N/A"}
                    {record.room?.wing ? ` - ${record.room.wing} Wing` : ""}
                    {record.room?.floor ? `, Floor ${record.room.floor}` : ""}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Description</p>
                  <p className="mt-1">{record.description}</p>
                </div>

                <div>
                  <p className="text-slate-400">Work Log</p>
                  <p className="mt-1 whitespace-pre-wrap">{record.workLog || "No work log added yet."}</p>
                </div>

                <div>
                  <p className="text-slate-400">Costs</p>
                  <p className="mt-1">Estimated: {formatCurrency(record.estimatedCost)}</p>
                  <p>Actual: {formatCurrency(record.actualCost)}</p>
                  <p className="text-xs text-slate-500">Completion Date: {formatDate(record.completionDate)}</p>
                </div>

                <div>
                  <p className="text-slate-400">Materials Used</p>
                  {record.materialUsed?.length ? (
                    <ul className="mt-1 space-y-1">
                      {record.materialUsed.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          {item.name} - Qty {item.quantity}, Cost {formatCurrency(item.cost)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No materials logged.</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">Before Photos</p>
                  {record.beforePhotos?.length ? (
                    <ul className="mt-1 space-y-1">
                      {record.beforePhotos.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No before photos.</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">After Photos</p>
                  {record.afterPhotos?.length ? (
                    <ul className="mt-1 space-y-1">
                      {record.afterPhotos.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-400">No after photos.</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">Invoice</p>
                  {record.invoiceDocument ? (
                    <a href={record.invoiceDocument} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
                      {record.invoiceDocument}
                    </a>
                  ) : (
                    <p className="mt-1 text-slate-400">No invoice uploaded.</p>
                  )}
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Action Panel" description="Assign staff and update maintenance workflow.">
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
                    Assign Maintenance
                  </Button>
                </div>

                <div className="space-y-2 border-t border-slate-700/60 pt-3">
                  <p className="text-sm font-medium">Status Update</p>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)} disabled={isSaving}>
                    {maintenanceStatusByProvostOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={() => setConfirmState({ open: true, action: "status" })} disabled={isSaving}>
                    Update Status
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

export default ProvostMaintenanceDetailsPage;
