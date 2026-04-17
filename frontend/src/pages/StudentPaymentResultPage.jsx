import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import StatusBadge from "@/components/shared/StatusBadge";

function statusTone(status) {
  if (status === "success") return "success";
  if (status === "cancel") return "warning";
  return "danger";
}

function statusLabel(status) {
  if (status === "success") return "Payment Successful";
  if (status === "cancel") return "Payment Cancelled";
  return "Payment Failed";
}

function defaultMessage(status) {
  if (status === "success") return "Your wallet deposit was completed successfully.";
  if (status === "cancel") return "You cancelled the payment before completion.";
  return "The payment could not be completed.";
}

function StudentPaymentResultPage() {
  const navigate = useNavigate();
  const { status = "fail" } = useParams();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("transactionId") || "";
  const referenceId = searchParams.get("referenceId") || "";
  const message = searchParams.get("message") || "";

  const normalizedStatus = useMemo(() => {
    const value = String(status || "").toLowerCase();
    if (["success", "cancel", "fail"].includes(value)) return value;
    return "fail";
  }, [status]);

  return (
    <DetailPageShell
      eyebrow="Student Finance"
      title={statusLabel(normalizedStatus)}
      description="Review the gateway return result and verify your transaction status."
      actions={[
        <Button key="wallet" variant="secondary" onClick={() => navigate("/student/wallet")}>
          Go to Wallet
        </Button>,
      ]}
    >
      <ContentSection title="Payment Result" description="This result was returned from payment gateway callback.">
        <div className="space-y-4">
          <StatusBadge tone={statusTone(normalizedStatus)}>{statusLabel(normalizedStatus)}</StatusBadge>
          <p className="text-sm text-slate-300">{message || defaultMessage(normalizedStatus)}</p>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Transaction ID</p>
              <p>{transactionId || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Reference ID</p>
              <p>{referenceId || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {transactionId ? (
              <Button onClick={() => navigate(`/student/wallet/deposits/${transactionId}`)}>View Deposit Details</Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate("/student/wallet/deposit")}>
              Start New Deposit
            </Button>
          </div>
        </div>
      </ContentSection>
    </DetailPageShell>
  );
}

export default StudentPaymentResultPage;

