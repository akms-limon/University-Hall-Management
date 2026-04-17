import { useCallback, useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { mealApi } from "@/api/mealApi";
import { mealPaymentStatusLabel, mealPaymentStatusTone, reportGroupByOptions } from "@/features/meal-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function toDateValue(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function ProvostMealReportsPage() {
  const today = new Date();
  const [filters, setFilters] = useState({
    from: toDateValue(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)),
    to: toDateValue(today),
    groupBy: "day",
  });
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.getProvostMealReports(filters);
      setReports(result.reports);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load token reports."));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const summaryItems = useMemo(() => {
    const overview = reports?.overview || {};
    return [
      { title: "Total Tokens", value: String(overview.totalTokens || 0), hint: "Selected range", tone: "primary" },
      { title: "Total Amount", value: currency(overview.totalAmount || 0), hint: "Paid amount", tone: "success" },
      { title: "Consumed", value: String(overview.consumedTokens || 0), hint: "Dining check-ins", tone: "info" },
      { title: "Remaining", value: String(overview.remainingTokens || 0), hint: "Not consumed yet", tone: "warning" },
      { title: "Cancelled", value: String(overview.cancelledTokens || 0), hint: "Cancelled tokens", tone: "danger" },
    ];
  }, [reports]);

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Dining Token Reports"
      description="Review token sales, payment outcomes, and meal-type trends."
    >
      <ContentSection title="Report Filters" description="Adjust range and grouping for report exports.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-sm text-slate-300">From</span>
            <Input className="mt-1" type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
          </label>
          <label>
            <span className="text-sm text-slate-300">To</span>
            <Input className="mt-1" type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
          </label>
          <label>
            <span className="text-sm text-slate-300">Group By</span>
            <Select className="mt-1" value={filters.groupBy} onChange={(event) => setFilters((prev) => ({ ...prev, groupBy: event.target.value }))}>
              {reportGroupByOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchReports}>Refresh Report</Button>
          </div>
        </div>
      </ContentSection>

      {isLoading ? <LoadingState label="Loading token reports..." /> : null}
      {!isLoading && error ? <ErrorState title="Unable to load reports" description={error} actionLabel="Retry" onAction={fetchReports} /> : null}

      {!isLoading && !error && reports ? (
        <>
          <SummaryGrid items={summaryItems} />
          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Payment Breakdown" description="Token counts by payment outcome.">
              <DataTableShell
                columns={["Payment Status", "Count"]}
                rows={reports.paymentBreakdown || []}
                emptyTitle="No payment records"
                emptyDescription="No payment data found for selected range."
                renderRow={(entry) => (
                  <tr key={entry.status} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3">
                      <StatusBadge tone={mealPaymentStatusTone(entry.status)}>{mealPaymentStatusLabel(entry.status)}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{entry.count || 0}</td>
                  </tr>
                )}
              />
            </ContentSection>
            <ContentSection title={reports.groupedBy === "mealType" ? "Meal Type Trend" : "Daily Trend"} description="Token volume and amount trend.">
              <DataTableShell
                columns={[reports.groupedBy === "mealType" ? "Meal Type" : "Date", "Total Tokens", "Consumed", "Total Amount"]}
                rows={reports.trend || []}
                emptyTitle="No trend records"
                emptyDescription="Try widening the date range."
                renderRow={(entry) => (
                  <tr key={entry.label} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3 font-medium">{entry.label || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.totalTokens || 0}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.consumedTokens || 0}</td>
                    <td className="px-4 py-3 text-slate-300">{currency(entry.totalAmount || 0)}</td>
                  </tr>
                )}
              />
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default ProvostMealReportsPage;

