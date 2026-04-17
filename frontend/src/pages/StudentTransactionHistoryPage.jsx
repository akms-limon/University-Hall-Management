import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { walletApi } from "@/api/walletApi";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  transactionStatusLabel,
  transactionStatusOptions,
  transactionStatusTone,
  transactionTypeLabel,
  transactionTypeOptions,
} from "@/features/wallet/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentTransactionHistoryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    transactionType: "",
    status: "",
    paymentMethod: "",
    search: "",
    from: "",
    to: "",
    sort: "createdAt:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalDeposits: 0,
    totalMealTokenSpend: 0,
    totalRefunds: 0,
    currentBalance: 0,
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await walletApi.listMyTransactions({
        page,
        limit,
        transactionType: filters.transactionType || undefined,
        status: filters.status || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        search: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(
        result.summary || {
          totalTransactions: 0,
          totalDeposits: 0,
          totalMealTokenSpend: 0,
          totalRefunds: 0,
          currentBalance: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load transactions."));
    } finally {
      setIsLoading(false);
    }
  }, [filters, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const summaryCards = [
    {
      title: "Current Balance",
      value: currency(summary.currentBalance || 0),
      hint: "Wallet available",
      tone: "success",
    },
    {
      title: "Deposits",
      value: currency(summary.totalDeposits || 0),
      hint: "Completed",
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
      hint: "Returned credits",
      tone: "primary",
    },
  ];

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Student Finance"
      title="Transaction History"
      description="Review your payment history, wallet deposits, and token charges."
      actions={[
        <Button key="wallet" variant="secondary" onClick={() => navigate("/student/wallet")}>
          Wallet
        </Button>,
        <Button key="deposit" onClick={() => navigate("/student/wallet/deposit")}>
          Deposit Money
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Filters" description="Refine transaction history by type, status, method, and date range.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <Input
            className="xl:col-span-2"
            placeholder="Search by reference or remarks"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
          />

          <Select value={filters.transactionType} onChange={(event) => handleFilterChange("transactionType", event.target.value)}>
            <option value="">All Types</option>
            {transactionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
            <option value="">All Statuses</option>
            {transactionStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={filters.paymentMethod} onChange={(event) => handleFilterChange("paymentMethod", event.target.value)}>
            <option value="">All Methods</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input type="date" value={filters.from} onChange={(event) => handleFilterChange("from", event.target.value)} />
          <Input type="date" value={filters.to} onChange={(event) => handleFilterChange("to", event.target.value)} />

          <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="amount:desc">Amount High-Low</option>
            <option value="amount:asc">Amount Low-High</option>
          </Select>
        </div>
      </ContentSection>

      {isLoading ? <LoadingState label="Loading transactions..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load transactions" description={error} actionLabel="Retry" onAction={fetchTransactions} />
      ) : null}

      {!isLoading && !error ? (
        <ContentSection title="Transaction Records" description="Every wallet movement is logged for transparency.">
          {!items.length ? (
            <EmptyState
              title="No transactions found"
              description="No records match your current filters."
            />
          ) : (
            <>
              <DataTableShell
                columns={["Type", "Amount", "Method", "Status", "Reference", "Date"]}
                rows={items}
                emptyTitle="No transactions found"
                emptyDescription="No records available."
                renderRow={(transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3 text-slate-200">{transactionTypeLabel(transaction.transactionType)}</td>
                    <td className="px-4 py-3 text-slate-300">{currency(transaction.amount)}</td>
                    <td className="px-4 py-3 text-slate-300">{paymentMethodLabel(transaction.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={transactionStatusTone(transaction.status)}>
                        {transactionStatusLabel(transaction.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{transaction.referenceId || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(transaction.createdAt)}</td>
                  </tr>
                )}
              />

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          )}
        </ContentSection>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentTransactionHistoryPage;

