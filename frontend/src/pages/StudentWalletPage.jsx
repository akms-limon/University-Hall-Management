import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
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
  transactionTypeTone,
} from "@/features/wallet/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentWalletPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalDeposits: 0,
    totalMealTokenSpend: 0,
    totalRefunds: 0,
    currentBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [balanceResult, historyResult] = await Promise.all([
        walletApi.getMyBalance(),
        walletApi.listMyTransactions({ page: 1, limit: 6, sortBy: "createdAt", sortOrder: "desc" }),
      ]);

      setBalance(balanceResult.balance);
      setTransactions(historyResult.items || []);
      setSummary(historyResult.summary || {});
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load wallet details."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Current Balance",
        value: currency(balance?.balance ?? summary.currentBalance ?? 0),
        hint: "Available for meal token purchase",
        tone: "success",
      },
      {
        title: "Total Deposits",
        value: currency(summary.totalDeposits || 0),
        hint: "Completed deposits",
        tone: "info",
      },
      {
        title: "Meal Token Spend",
        value: currency(summary.totalMealTokenSpend || 0),
        hint: "Wallet deductions",
        tone: "warning",
      },
      {
        title: "Refunds",
        value: currency(summary.totalRefunds || 0),
        hint: "Returned to wallet",
        tone: "primary",
      },
    ],
    [balance, summary]
  );

  return (
    <DetailPageShell
      eyebrow="Student Finance"
      title="Wallet"
      description="Manage your hall wallet balance, deposits, and token payments."
      actions={[
        <Button key="deposit" onClick={() => navigate("/student/wallet/deposit")}>
          Deposit Money
        </Button>,
        <Button key="history" variant="secondary" onClick={() => navigate("/student/payment-history")}>
          Full History
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading wallet..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load wallet" description={error} actionLabel="Retry" onAction={loadWallet} />
      ) : null}

      {!isLoading && !error ? (
        <>
          <SummaryGrid items={summaryCards} />

          <ContentSection
            title="Recent Transactions"
            description="Your latest wallet movements and meal token payments."
          >
            {!transactions.length ? (
              <EmptyState
                title="No transactions yet"
                description="Make your first deposit to start buying meal tokens from wallet balance."
              />
            ) : (
              <DataTableShell
                columns={["Type", "Amount", "Method", "Status", "Date"]}
                rows={transactions}
                emptyTitle="No records"
                emptyDescription="No transaction records available."
                renderRow={(transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={transactionTypeTone(transaction.transactionType)}>
                          {transactionTypeLabel(transaction.transactionType)}
                        </StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{currency(transaction.amount)}</td>
                    <td className="px-4 py-3 text-slate-300">{paymentMethodLabel(transaction.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={transactionStatusTone(transaction.status)}>
                        {transactionStatusLabel(transaction.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(transaction.createdAt)}</td>
                  </tr>
                )}
              />
            )}
          </ContentSection>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentWalletPage;

