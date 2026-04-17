import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { walletApi } from "@/api/walletApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function toDateValue(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function ProvostFinancialDashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [filters, setFilters] = useState({
    from: toDateValue(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)),
    to: toDateValue(now),
  });
  const [overview, setOverview] = useState(null);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await walletApi.getProvostFinancialSummary(filters);
      setOverview(result.overview || {});
      setDailyRevenue(result.dailyRevenue || []);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load financial summary."));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const summaryItems = useMemo(
    () => [
      { title: "Total Deposits", value: currency(overview?.totalDeposits || 0), hint: "Completed", tone: "success" },
      { title: "Token Sales", value: currency(overview?.totalTokenSales || 0), hint: "Meal token deductions", tone: "info" },
      { title: "Refunds", value: currency(overview?.totalRefunds || 0), hint: "Returned to students", tone: "warning" },
      { title: "Net Revenue", value: currency(overview?.netRevenue || 0), hint: "Token sales - refunds", tone: "primary" },
      { title: "Pending Tx", value: String(overview?.pendingTransactions || 0), hint: "Awaiting callback", tone: "warning" },
      { title: "Failed Tx", value: String(overview?.failedTransactions || 0), hint: "Needs review", tone: "danger" },
    ],
    [overview]
  );

  return (
    <DetailPageShell
      eyebrow="Provost Finance"
      title="Financial Dashboard"
      description="Monitor deposits, token revenue, refunds, and transaction health."
      actions={[
        <Button key="transactions" onClick={() => navigate("/provost/payments/transactions")}>
          View Transactions
        </Button>,
      ]}
    >
      <ContentSection title="Date Range" description="Filter summary metrics and daily financial trends.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-sm text-slate-300">From</span>
            <Input
              className="mt-1"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm text-slate-300">To</span>
            <Input
              className="mt-1"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchSummary}>
              Refresh
            </Button>
          </div>
        </div>
      </ContentSection>

      {isLoading ? <LoadingState label="Loading financial summary..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load financial summary" description={error} actionLabel="Retry" onAction={fetchSummary} />
      ) : null}

      {!isLoading && !error ? (
        <>
          <SummaryGrid items={summaryItems} />

          <ContentSection title="Daily Revenue" description="Day-wise deposit, token sales, and refund trend.">
            <DataTableShell
              columns={["Date", "Deposits", "Token Sales", "Refunds", "Net Revenue"]}
              rows={dailyRevenue}
              emptyTitle="No financial data"
              emptyDescription="No records found for selected date range."
              renderRow={(row) => (
                <tr key={row.date} className="border-b border-slate-800/70 last:border-none">
                  <td className="px-4 py-3 font-medium">{row.date}</td>
                  <td className="px-4 py-3 text-slate-300">{currency(row.totalDeposits || 0)}</td>
                  <td className="px-4 py-3 text-slate-300">{currency(row.totalTokenSales || 0)}</td>
                  <td className="px-4 py-3 text-slate-300">{currency(row.totalRefunds || 0)}</td>
                  <td className="px-4 py-3 text-slate-200">{currency(row.netRevenue || 0)}</td>
                </tr>
              )}
            />
          </ContentSection>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default ProvostFinancialDashboardPage;

