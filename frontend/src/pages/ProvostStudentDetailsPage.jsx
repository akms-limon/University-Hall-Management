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
import { studentApi } from "@/api/studentApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatBalance(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function allocationTone(status) {
  if (status === "allocated") return "success";
  if (status === "pending") return "warning";
  if (status === "requested") return "info";
  return "neutral";
}

function activeTone(isActive) {
  return isActive ? "success" : "danger";
}

function ProvostStudentDetailsPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadStudent = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await studentApi.getStudentById(studentId);
      setStudent(result.student);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch student details."));
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const summaryItems = useMemo(() => {
    if (!student) return [];

    return [
      {
        title: "Allocation Status",
        value: student.allocationStatus || "none",
        hint: "Current room allocation progress",
        tone: allocationTone(student.allocationStatus),
      },
      {
        title: "Semester",
        value: String(student.semester || "-"),
        hint: "Academic session",
        tone: "info",
      },
      {
        title: "Department",
        value: student.department || "-",
        hint: "Registered department",
        tone: "primary",
      },
      {
        title: "Balance",
        value: formatBalance(student.balance),
        hint: "Outstanding / prepaid balance",
        tone: "warning",
      },
    ];
  }, [student]);

  const handleStatusUpdate = async () => {
    if (!student) return;

    setIsUpdatingStatus(true);
    setError("");
    try {
      const result = await studentApi.updateStudentStatus(student.id, !student.isActive);
      setStudent(result.student);
      setStatusDialogOpen(false);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "Failed to update student status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title={student ? student.user?.name || "Student Details" : "Student Details"}
      description="Comprehensive student profile, account, allocation, and emergency contact overview."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/provost/student-management")}>
          Back to List
        </Button>,
        <Button key="edit" onClick={() => navigate(`/provost/student-management/${studentId}/edit`)}>
          Edit Student
        </Button>,
        <Button key="status" variant="danger" onClick={() => setStatusDialogOpen(true)} disabled={!student}>
          {student?.isActive ? "Deactivate" : "Activate"}
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading student details..." /> : null}

      {!isLoading && error ? (
        <ErrorState title="Unable to load student details" description={error} actionLabel="Retry" onAction={loadStudent} />
      ) : null}

      {!isLoading && !error && student ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Account Information" description="Linked user account fields">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Email</dt>
                  <dd>{student.user?.email || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Phone</dt>
                  <dd>{student.user?.phone || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Role</dt>
                  <dd className="capitalize">{student.user?.role || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Account State</dt>
                  <dd>
                    <StatusBadge tone={activeTone(student.isActive)}>{student.isActive ? "Active" : "Inactive"}</StatusBadge>
                  </dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Academic Information" description="Student profile and enrollment data">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Registration Number</dt>
                  <dd>{student.registrationNumber || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Department</dt>
                  <dd>{student.department || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Semester</dt>
                  <dd>{student.semester || "-"}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-400">Profile Photo</dt>
                  <dd className="max-w-[260px] text-left sm:text-right">
                    {student.profilePhoto ? (
                      <div>
                        <img
                          src={student.profilePhoto}
                          alt="Student profile"
                          className="ml-auto h-16 w-16 rounded-lg border border-[color:rgb(var(--ui-border)/0.28)] object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      "Not set"
                    )}
                  </dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Allocation and Room" description="Hall residency status and room information">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Current Room</dt>
                  <dd>{student.currentRoom || "Not allocated"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Allocation Status</dt>
                  <dd>
                    <StatusBadge tone={allocationTone(student.allocationStatus)}>
                      {student.allocationStatus || "none"}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Balance</dt>
                  <dd>{formatBalance(student.balance)}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Emergency Contact" description="Guardian contact details for urgent communication">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Name</dt>
                  <dd>{student.emergencyContact?.name || "Not set"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Phone</dt>
                  <dd>{student.emergencyContact?.phone || "Not set"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Relation</dt>
                  <dd>{student.emergencyContact?.relation || "Not set"}</dd>
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
        title={student?.isActive ? "Deactivate this student?" : "Activate this student?"}
        description={
          student?.isActive
            ? "The student user account will be disabled and login access will be blocked."
            : "The student user account will be re-enabled and login access will be restored."
        }
        confirmLabel={isUpdatingStatus ? "Updating..." : student?.isActive ? "Deactivate" : "Activate"}
        confirmDisabled={isUpdatingStatus}
      />
    </DetailPageShell>
  );
}

export default ProvostStudentDetailsPage;
