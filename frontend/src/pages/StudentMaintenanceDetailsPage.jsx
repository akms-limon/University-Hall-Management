import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { maintenanceApi } from "@/api/maintenanceApi";
import {
  maintenanceCategoryLabel,
  maintenanceSeverityLabel,
  maintenanceSeverityTone,
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

function StudentMaintenanceDetailsPage() {
  const { maintenanceId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await maintenanceApi.getMyMaintenanceById(maintenanceId);
      setRecord(result.maintenance);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load maintenance request."));
    } finally {
      setIsLoading(false);
    }
  }, [maintenanceId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Maintenance Request Details"
      description="Track the progress and details of your maintenance request."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/maintenance-requests")}>
          Back to My Requests
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading maintenance request..." /> : null}

      {!isLoading && error ? (
        <ErrorState title="Unable to load request" description={error} actionLabel="Retry" onAction={loadData} />
      ) : null}

      {!isLoading && record ? (
        <div className="space-y-4">
          {/* Status overview */}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-slate-400">Room</p>
                  <p className="mt-1 font-medium">
                    {record.room?.roomNumber ? `Room ${record.room.roomNumber}` : "N/A"}
                    {record.room?.wing ? ` - ${record.room.wing} Wing` : ""}
                    {record.room?.floor ? `, Floor ${record.room.floor}` : ""}
                  </p>
                </div>

                {record.assignedTo ? (
                  <div>
                    <p className="text-slate-400">Assigned Staff</p>
                    <p className="mt-1 font-medium">{record.assignedTo?.user?.name || "N/A"}</p>
                    <p className="text-xs text-slate-400">{record.assignedTo?.designation || ""}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-400">Assigned Staff</p>
                    <p className="mt-1 text-slate-500">Unassigned - pending review</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-slate-400">Description</p>
                <p className="mt-1">{record.description}</p>
              </div>

              {record.completionDate ? (
                <div>
                  <p className="text-slate-400">Completed On</p>
                  <p className="mt-1">{formatDate(record.completionDate)}</p>
                </div>
              ) : null}
            </div>
          </ContentSection>

          {/* Work progress */}
          {record.workLog ? (
            <ContentSection title="Work Log" description="Notes from the maintenance staff.">
              <p className="text-sm whitespace-pre-wrap">{record.workLog}</p>
            </ContentSection>
          ) : null}

          {/* Costs & materials */}
          {(record.estimatedCost !== null || record.actualCost !== null || record.materialUsed?.length > 0) ? (
            <ContentSection title="Cost & Materials" description="Maintenance cost breakdown.">
              <div className="space-y-3 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-400">Estimated Cost</p>
                    <p className="mt-1 font-medium">{formatCurrency(record.estimatedCost)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Actual Cost</p>
                    <p className="mt-1 font-medium">{formatCurrency(record.actualCost)}</p>
                  </div>
                </div>

                {record.materialUsed?.length > 0 ? (
                  <div>
                    <p className="text-slate-400 mb-2">Materials Used</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/60">
                            <th className="py-1.5 pr-4 text-left font-medium text-slate-400">Material</th>
                            <th className="py-1.5 pr-4 text-right font-medium text-slate-400">Qty</th>
                            <th className="py-1.5 text-right font-medium text-slate-400">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.materialUsed.map((m, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 last:border-none">
                              <td className="py-1.5 pr-4">{m.name}</td>
                              <td className="py-1.5 pr-4 text-right text-slate-300">{m.quantity}</td>
                              <td className="py-1.5 text-right text-slate-300">{formatCurrency(m.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {record.invoiceDocument ? (
                  <div>
                    <p className="text-slate-400">Invoice</p>
                    <a
                      href={record.invoiceDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-cyan-300 underline hover:text-cyan-200"
                    >
                      View Invoice Document
                    </a>
                  </div>
                ) : null}
              </div>
            </ContentSection>
          ) : null}

          {/* Photos */}
          {(record.beforePhotos?.length > 0 || record.afterPhotos?.length > 0) ? (
            <ContentSection title="Photos" description="Before and after maintenance photos.">
              <div className="space-y-3 text-sm">
                {record.beforePhotos?.length > 0 ? (
                  <div>
                    <p className="text-slate-400 mb-1">Before Photos</p>
                    <ul className="space-y-1">
                      {record.beforePhotos.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {record.afterPhotos?.length > 0 ? (
                  <div>
                    <p className="text-slate-400 mb-1">After Photos</p>
                    <ul className="space-y-1">
                      {record.afterPhotos.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </ContentSection>
          ) : null}
        </div>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentMaintenanceDetailsPage;
