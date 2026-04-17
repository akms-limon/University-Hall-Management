import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/shared/StatusBadge";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import HallApplicationFormFields from "@/features/hall-application/components/HallApplicationFormFields";
import { buildHallApplicationPayload, hallApplicationFormSchema } from "@/features/hall-application/validation";
import {
  hallApplicationActiveStatuses,
  hallApplicationStatusLabel,
  hallApplicationStatusTone,
} from "@/features/hall-application/constants";
import { hallApplicationApi } from "@/api/hallApplicationApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultValues = {
  registrationNumber: "",
  department: "",
  semester: 1,
  contactPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  reason: "",
  attachmentsText: "",
};

function StudentHallApplicationSubmitPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isCheckingLatest, setIsCheckingLatest] = useState(true);
  const [latestApplication, setLatestApplication] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(hallApplicationFormSchema),
    defaultValues,
  });

  useEffect(() => {
    let mounted = true;

    const loadLatest = async () => {
      setIsCheckingLatest(true);
      try {
        const result = await hallApplicationApi.listMyApplications({
          page: 1,
          limit: 1,
          sortBy: "applicationDate",
          sortOrder: "desc",
        });
        if (!mounted) return;
        setLatestApplication(result.items?.[0] || null);
      } catch {
        if (mounted) {
          setLatestApplication(null);
        }
      } finally {
        if (mounted) {
          setIsCheckingLatest(false);
        }
      }
    };

    loadLatest();
    return () => {
      mounted = false;
    };
  }, []);

  const hasActiveApplication =
    latestApplication && hallApplicationActiveStatuses.includes(latestApplication.status);

  const onSubmit = async (values) => {
    setApiError("");

    try {
      const result = await hallApplicationApi.submitMyApplication(
        buildHallApplicationPayload(values, "new_room_request")
      );
      navigate(`/student/general-application/${result.application.id}`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to submit general application."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Student Workspace"
      title="Submit General Application"
      description="Complete your general application with academic details and supporting reason."
      formTitle="General Application Form"
      formDescription="This application will be reviewed by the provost office."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/student/general-application")}>
          Back to Tracking
        </Button>,
      ]}
    >
      {isCheckingLatest ? <LoadingState label="Checking existing application status..." /> : null}

      {!isCheckingLatest && hasActiveApplication ? (
        <div className="rounded-2xl border border-[rgb(var(--accent-warning)/0.4)] bg-[rgb(var(--accent-warning)/0.14)] p-4 text-sm text-[rgb(var(--text-base))]">
          <p className="font-semibold text-[rgb(var(--accent-primary))]">You already have an active general application.</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge tone={hallApplicationStatusTone(latestApplication.status)}>
              {hallApplicationStatusLabel(latestApplication.status)}
            </StatusBadge>
            <span className="text-[rgb(var(--text-soft))]">
              Submitted on {new Date(latestApplication.applicationDate).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-3 text-[rgb(var(--text-soft))]">
            Track this application from{" "}
            <Link
              className="font-semibold text-[rgb(var(--accent-primary))] underline underline-offset-2 hover:text-[rgb(var(--accent-secondary))]"
              to={`/student/general-application/${latestApplication.id}`}
            >
              details page
            </Link>
            .
          </p>
        </div>
      ) : null}

      {!isCheckingLatest && !hasActiveApplication ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {apiError}
            </div>
          ) : null}

          <HallApplicationFormFields register={register} errors={errors} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => navigate("/student/general-application")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      ) : null}
    </FormPageShell>
  );
}

export default StudentHallApplicationSubmitPage;
