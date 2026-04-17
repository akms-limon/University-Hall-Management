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
import { analyticsApi } from "@/api/analyticsApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { addDaysToDateKey, getDateKeyInDhaka, normalizeDateInputToDhakaKey } from "@/utils/dateInDhaka";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function StaffMealStatsPage() {
  const navigate = useNavigate();
  const todayKey = getDateKeyInDhaka(new Date());
  const [date, setDate] = useState(todayKey);
  const [from, setFrom] = useState(addDaysToDateKey(todayKey, -6));
  const [to, setTo] = useState(todayKey);
  const [todayStats, setTodayStats] = useState(null);
  const [historyStats, setHistoryStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getStaffDiningSummary({
        period: "custom",
        date,
        from,
        to,
      });
      setTodayStats(result.today || null);
      setHistoryStats(result.trend || []);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load dining statistics."));
    } finally {
      setIsLoading(false);
    }
  }, [date, from, to]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summaryCards = useMemo(() => {
    const tokenSummary = todayStats || {};
    return [
      { title: "Today Total Tokens", value: String(tokenSummary.totalTokens || 0), hint: "Purchased tokens", tone: "primary" },
      { title: "Breakfast", value: String(tokenSummary.breakfastCount || 0), hint: "Today", tone: "info" },
      { title: "Lunch", value: String(tokenSummary.lunchCount || 0), hint: "Today", tone: "info" },
      { title: "Dinner", value: String(tokenSummary.dinnerCount || 0), hint: "Today", tone: "info" },
      { title: "Eaten", value: String(tokenSummary.consumedCount || 0), hint: "Checked in", tone: "success" },
      { title: "Not Eaten", value: String(tokenSummary.notEatenCount || 0), hint: "Checked but unused", tone: "danger" },
      { title: "Remaining", value: String(tokenSummary.remainingCount || 0), hint: "Not consumed yet", tone: "warning" },
      { title: "Total Amount", value: currency(tokenSummary.totalAmount || 0), hint: "Today collection", tone: "success" },
    ];
  }, [todayStats]);

  return (
    <DetailPageShell
      eyebrow="Dining Staff"
      title="Dining Token Summary"
      description="Monitor token purchases, meal-type demand, and consumed vs remaining counts."
      actions={[
        <Button key="check" variant="secondary" onClick={() => navigate("/staff/orders")}>
          Back to Token Check
        </Button>,
      ]}
    >
      <ContentSection title="Filters" description="Use date filters for daily and range summaries.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label>
            <span className="text-sm text-slate-300">Selected Day</span>
            <Input
              className="mt-1"
              type="date"
              value={date}
              onChange={(event) => setDate(normalizeDateInputToDhakaKey(event.target.value))}
            />
          </label>
          <label>
            <span className="text-sm text-slate-300">Range From</span>
            <Input
              className="mt-1"
              type="date"
              value={from}
              onChange={(event) => setFrom(normalizeDateInputToDhakaKey(event.target.value))}
            />
          </label>
          <label>
            <span className="text-sm text-slate-300">Range To</span>
            <Input
              className="mt-1"
              type="date"
              value={to}
              onChange={(event) => setTo(normalizeDateInputToDhakaKey(event.target.value))}
            />
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchStats}>Refresh</Button>
          </div>
        </div>
      </ContentSection>

      {isLoading ? <LoadingState label="Loading dining statistics..." /> : null}
      {!isLoading && error ? <ErrorState title="Unable to load statistics" description={error} actionLabel="Retry" onAction={fetchStats} /> : null}

      {!isLoading && !error ? (
        <>
          <SummaryGrid items={summaryCards} />

          <ContentSection title="Date-wise Token Totals" description="Daily breakdown for operational planning.">
            <DataTableShell
              columns={["Date", "Breakfast", "Lunch", "Dinner", "Total", "Amount", "Eaten", "Not Eaten"]}
              rows={historyStats || []}
              emptyTitle="No token records"
              emptyDescription="No token history found for this range."
              renderRow={(row) => (
                <tr key={row.date} className="border-b border-slate-800/70 last:border-none">
                  <td className="px-4 py-3 font-medium">{row.date}</td>
                  <td className="px-4 py-3 text-slate-300">{row.breakfastCount || 0}</td>
                  <td className="px-4 py-3 text-slate-300">{row.lunchCount || 0}</td>
                  <td className="px-4 py-3 text-slate-300">{row.dinnerCount || 0}</td>
                  <td className="px-4 py-3 text-slate-300">{row.totalTokens || 0}</td>
                  <td className="px-4 py-3 text-slate-300">{currency(row.totalAmount || 0)}</td>
                  <td className="px-4 py-3 text-slate-300">{row.consumedCount || 0}</td>
                  <td className="px-4 py-3 text-slate-300">{row.notEatenCount || 0}</td>
                </tr>
              )}
            />
          </ContentSection>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StaffMealStatsPage;
