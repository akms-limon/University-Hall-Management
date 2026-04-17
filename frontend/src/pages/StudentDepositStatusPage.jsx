import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { walletApi } from "@/api/walletApi";
import {
  paymentMethodLabel,
  transactionStatusLabel,
  transactionStatusTone,
  transactionTypeLabel,
} from "@/features/wallet/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentDepositStatusPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await walletApi.getMyDepositStatus(transactionId);
      setTransaction(result.transaction);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load deposit status."));
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const summaryItems = transaction
    ? [
        { title: "Amount", value: currency(transaction.amount), hint: "Deposit amount", tone: "primary" },
        { title: "Status", value: transactionStatusLabel(transaction.status), hint: "Current state", tone: "info" },
        { title: "Balance Before", value: currency(transaction.balanceBefore), hint: "Wallet", tone: "warning" },
        { title: "Balance After", value: currency(transaction.balanceAfter), hint: "Wallet", tone: "success" },
      ]
    : [];

  return (
    <DetailPageShell
      eyebrow="Student Finance"
      title="Deposit Status"
      description="Track the current status of your wallet deposit."
      actions={[
        <Button key="wallet" variant="secondary" onClick={() => navigate("/student/wallet")}>
          Wallet
        </Button>,
        <Button key="history" onClick={() => navigate("/student/payment-history")}>
          Transaction History
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading deposit status..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load deposit status" description={error} actionLabel="Retry" onAction={loadStatus} />
      ) : null}

      {!isLoading && !error && transaction ? (
        <>
          <SummaryGrid items={summaryItems} />

          <ContentSection title="Transaction Details" description="Reference and processing details for this deposit.">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd>{transactionTypeLabel(transaction.transactionType)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment Method</dt>
                <dd>{paymentMethodLabel(transaction.paymentMethod)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reference</dt>
                <dd>{transaction.referenceId || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Provider Reference</dt>
                <dd>{transaction.providerReference || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created At</dt>
                <dd>{formatDate(transaction.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge tone={transactionStatusTone(transaction.status)}>
                    {transactionStatusLabel(transaction.status)}
                  </StatusBadge>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Remarks</dt>
                <dd>{transaction.remarks || transaction.description || "N/A"}</dd>
              </div>
            </dl>
          </ContentSection>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentDepositStatusPage;

