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

function ProvostTransactionMonitoringPage() {
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
  const [limit] = useState(20);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
    totalDeposits: 0,
    totalTokenSales: 0,
    totalRefunds: 0,
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await walletApi.listProvostTransactions({
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
          completed: 0,
          pending: 0,
          failed: 0,
          totalAmount: 0,
          totalDeposits: 0,
          totalTokenSales: 0,
          totalRefunds: 0,
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

  const summaryItems = [
    { title: "Transactions", value: String(summary.totalTransactions || 0), hint: "Matched records", tone: "primary" },
    { title: "Completed", value: String(summary.completed || 0), hint: "Successful", tone: "success" },
    { title: "Pending", value: String(summary.pending || 0), hint: "Awaiting callback", tone: "warning" },
    { title: "Failed", value: String(summary.failed || 0), hint: "Needs review", tone: "danger" },
    { title: "Deposits", value: currency(summary.totalDeposits || 0), hint: "Completed", tone: "info" },
    { title: "Token Sales", value: currency(summary.totalTokenSales || 0), hint: "Completed", tone: "warning" },
  ];

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Provost Finance"
      title="Transaction Monitoring"
      description="Audit student financial activity with filters and searchable transaction logs."
      actions={[
        <Button key="summary" variant="secondary" onClick={() => navigate("/provost/payments")}>
          Financial Dashboard
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Filters" description="Filter by transaction type, status, method, date range, and search terms.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <Input
            className="xl:col-span-2"
            placeholder="Search by student/reference/remarks"
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
        <ContentSection title="Transaction Logs" description="Detailed financial records across all students.">
          {!items.length ? (
            <EmptyState title="No transactions found" description="No records match the selected filters." />
          ) : (
            <>
              <DataTableShell
                columns={["Student", "Type", "Amount", "Method", "Status", "Reference", "Date"]}
                rows={items}
                emptyTitle="No transactions found"
                emptyDescription="No records available."
                renderRow={(transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3">
                      <p className="font-medium">{transaction.student?.user?.name || "N/A"}</p>
                      <p className="text-xs text-slate-400">{transaction.student?.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{transactionTypeLabel(transaction.transactionType)}</td>
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

export default ProvostTransactionMonitoringPage;

