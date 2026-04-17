import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { staffApi } from "@/api/staffApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString();
}

function activeTone(isActive) {
  return isActive ? "success" : "danger";
}

function ProvostStaffDetailsPage() {
  const { staffRecordId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await staffApi.getStaffById(staffRecordId);
      setStaff(result.staff);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch staff details."));
    } finally {
      setIsLoading(false);
    }
  }, [staffRecordId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const summaryItems = useMemo(() => {
    if (!staff) return [];

    return [
      {
        title: "Staff ID",
        value: staff.staffId || "-",
        hint: "Unique staff identifier",
        tone: "primary",
      },
      {
        title: "Department",
        value: staff.department || "-",
        hint: "Assigned department",
        tone: "info",
      },
      {
        title: "Designation",
        value: staff.designation || "-",
        hint: "Current role",
        tone: "warning",
      },
      {
        title: "Joining Date",
        value: formatDate(staff.joiningDate),
        hint: "Employment start date",
        tone: "success",
      },
    ];
  }, [staff]);

  const handleStatusUpdate = async () => {
    if (!staff) return;

    setIsUpdatingStatus(true);
    setError("");
    try {
      const result = await staffApi.updateStaffStatus(staff.id, !staff.isActive);
      setStaff(result.staff);
      setStatusDialogOpen(false);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "Failed to update staff status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title={staff ? staff.user?.name || "Staff Details" : "Staff Details"}
      description="Detailed staff profile including account and employment information."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/staff-management")}>
          Back to List
        </Button>,
        <Button key="edit" onClick={() => navigate(`/provost/staff-management/${staffRecordId}/edit`)}>
          Edit Staff
        </Button>,
        <Button key="status" variant="danger" onClick={() => setStatusDialogOpen(true)} disabled={!staff}>
          {staff?.isActive ? "Deactivate" : "Activate"}
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading staff details..." /> : null}

      {!isLoading && error ? (
        <ErrorState title="Unable to load staff details" description={error} actionLabel="Retry" onAction={loadStaff} />
      ) : null}

      {!isLoading && !error && staff ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Account Information" description="Linked user account information">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{staff.user?.email || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Phone</dt>
                  <dd>{staff.user?.phone || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Role</dt>
                  <dd className="capitalize">{staff.user?.role || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Account State</dt>
                  <dd>
                    <StatusBadge tone={activeTone(staff.isActive)}>{staff.isActive ? "Active" : "Inactive"}</StatusBadge>
                  </dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Employment Information" description="Core employment data and identifiers">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Staff ID</dt>
                  <dd>{staff.staffId}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Department</dt>
                  <dd>{staff.department}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Designation</dt>
                  <dd>{staff.designation}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Joining Date</dt>
                  <dd>{formatDate(staff.joiningDate)}</dd>
                </div>
              </dl>
            </ContentSection>
          </section>
        </>
      ) : null}

      <ConfirmDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleStatusUpdate}
        title={staff?.isActive ? "Deactivate this staff account?" : "Activate this staff account?"}
        description={
          staff?.isActive
            ? "The staff user account will be disabled and login access will be blocked."
            : "The staff user account will be re-enabled and login access will be restored."
        }
        confirmLabel={isUpdatingStatus ? "Updating..." : staff?.isActive ? "Deactivate" : "Activate"}
        confirmDisabled={isUpdatingStatus}
      />
    </DetailPageShell>
  );
}

export default ProvostStaffDetailsPage;
