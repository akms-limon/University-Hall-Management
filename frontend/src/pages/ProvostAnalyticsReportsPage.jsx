import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import SectionCard from "@/components/shared/SectionCard";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { analyticsApi } from "@/api/analyticsApi";
import { addDaysToDateKey, getDateKeyInDhaka } from "@/utils/dateInDhaka";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const periodOptions = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "week" },
  { label: "Last 30 Days", value: "month" },
  { label: "Custom Range", value: "custom" },
];

const roomPieColors = ["#34d399", "#38bdf8", "#f59e0b", "#ef4444"];

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function rangeFromPeriod(period) {
  const todayKey = getDateKeyInDhaka(new Date());
  if (period === "today") {
    return { from: todayKey, to: todayKey };
  }
  if (period === "week") {
    return { from: addDaysToDateKey(todayKey, -6), to: todayKey };
  }
  return { from: addDaysToDateKey(todayKey, -29), to: todayKey };
}

function ProvostAnalyticsReportsPage() {
  const defaultRange = rangeFromPeriod("month");
  const [filters, setFilters] = useState({
    period: "month",
    from: defaultRange.from,
    to: defaultRange.to,
  });
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const chartContainerProps = import.meta.env.MODE === "test" ? { width: 760, height: 280 } : { width: "100%", height: "100%" };

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getProvostSummary({
        period: filters.period,
        from: filters.from,
        to: filters.to,
      });
      setAnalytics(result);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load analytics dashboard."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.from, filters.period, filters.to]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpiCards = useMemo(() => {
    const hall = analytics?.hallOverview || {};
    const finance = analytics?.financial || {};
    const complaints = analytics?.complaints || {};
    const maintenance = analytics?.maintenance || {};
    const support = analytics?.supportTickets || {};
    return [
      { title: "Total Students", value: String(hall.totalStudents || 0), hint: "Active student records", tone: "primary" },
      { title: "Total Staff", value: String(hall.totalStaff || 0), hint: "Active staff records", tone: "info" },
      { title: "Occupancy Rate", value: `${Number(hall.occupancyRate || 0).toFixed(2)}%`, hint: "Occupied vs active rooms", tone: "success" },
      { title: "Total Deposits", value: currency(finance.totalDeposits || 0), hint: "Completed deposits", tone: "success" },
      { title: "Token Purchase", value: currency(finance.totalTokenPurchaseAmount || 0), hint: "Completed meal token spend", tone: "warning" },
      { title: "Complaints", value: String(complaints.total || 0), hint: "In selected range", tone: "warning" },
      { title: "Maintenance", value: String(maintenance.total || 0), hint: "In selected range", tone: "info" },
      { title: "Support Tickets", value: String(support.total || 0), hint: "In selected range", tone: "primary" },
    ];
  }, [analytics]);

  const roomStatusData = useMemo(() => {
    const hall = analytics?.hallOverview || {};
    return [
      { name: "Vacant", value: hall.vacantRooms || 0 },
      { name: "Occupied", value: hall.occupiedRooms || 0 },
      { name: "Maintenance", value: hall.maintenanceRooms || 0 },
      { name: "Closed", value: hall.closedRooms || 0 },
    ];
  }, [analytics]);

  const diningTrendData = useMemo(
    () =>
      (analytics?.dining?.trend || []).map((item) => ({
        date: item.date,
        tokens: item.totalTokens || 0,
        amount: Number(item.totalAmount || 0),
      })),
    [analytics]
  );

  const operationsStatusData = useMemo(() => {
    const complaints = analytics?.complaints || {};
    const maintenance = analytics?.maintenance || {};
    const support = analytics?.supportTickets || {};
    const tasks = analytics?.tasks || {};
    return [
      {
        status: "Open/Pending",
        complaints: complaints.open || 0,
        maintenance: maintenance.reported || 0,
        supportTickets: support.open || 0,
        tasks: tasks.pending || 0,
      },
      {
        status: "In Progress",
        complaints: complaints["in-progress"] || 0,
        maintenance: maintenance["in-progress"] || 0,
        supportTickets: support["in-progress"] || 0,
        tasks: tasks["in-progress"] || 0,
      },
      {
        status: "Resolved/Completed",
        complaints: complaints.resolved || 0,
        maintenance: maintenance.completed || 0,
        supportTickets: support.resolved || 0,
        tasks: tasks.completed || 0,
      },
      {
        status: "Closed/Cancelled",
        complaints: complaints.closed || 0,
        maintenance: maintenance.closed || 0,
        supportTickets: support.closed || 0,
        tasks: tasks.cancelled || 0,
      },
    ];
  }, [analytics]);

  const updatePeriod = (value) => {
    if (value === "custom") {
      setFilters((prev) => ({ ...prev, period: value }));
      return;
    }
    const range = rangeFromPeriod(value);
    setFilters((prev) => ({ ...prev, period: value, from: range.from, to: range.to }));
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Analytics & Reporting"
      description="Unified operational reporting across occupancy, finance, dining, tickets, tasks, and notices."
      actions={[
        <Button key="refresh" variant="secondary" onClick={fetchAnalytics}>
          Refresh
        </Button>,
      ]}
    >
      <ContentSection title="Filters" description="Adjust reporting range for date-sensitive modules.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label>
            <span className="text-sm text-slate-300">Period</span>
            <Select className="mt-1" value={filters.period} onChange={(event) => updatePeriod(event.target.value)}>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-sm text-slate-300">From</span>
            <Input className="mt-1" type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value, period: "custom" }))} />
          </label>
          <label>
            <span className="text-sm text-slate-300">To</span>
            <Input className="mt-1" type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value, period: "custom" }))} />
          </label>
          <div className="flex items-end">
            <Button onClick={fetchAnalytics}>Apply</Button>
          </div>
        </div>
      </ContentSection>

      {isLoading ? <LoadingState label="Loading analytics..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load analytics" description={error} actionLabel="Retry" onAction={fetchAnalytics} />
      ) : null}

      {!isLoading && !error && analytics ? (
        <>
          <SummaryGrid items={kpiCards} />

          <section className="grid gap-4 xl:grid-cols-3">
            <SectionCard title="Room Occupancy Status" description="Current room state distribution.">
              <div className="h-64">
                <ResponsiveContainer {...chartContainerProps}>
                  <PieChart>
                    <Pie data={roomStatusData} dataKey="value" nameKey="name" outerRadius={85} label>
                      {roomStatusData.map((_, index) => (
                        <Cell key={index} fill={roomPieColors[index % roomPieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Dining Trend" description="Date-wise token volume and amount in selected range." className="xl:col-span-2">
              <div className="h-64">
                <ResponsiveContainer {...chartContainerProps}>
                  <LineChart data={diningTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis yAxisId="left" stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="tokens" name="Tokens" stroke="#38bdf8" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount (BDT)" stroke="#34d399" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Operations Status Matrix" description="Cross-module workload snapshot by status buckets.">
              <div className="h-72">
                <ResponsiveContainer {...chartContainerProps}>
                  <BarChart data={operationsStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="status" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="complaints" fill="#f59e0b" name="Complaints" />
                    <Bar dataKey="maintenance" fill="#0ea5e9" name="Maintenance" />
                    <Bar dataKey="supportTickets" fill="#14b8a6" name="Support" />
                    <Bar dataKey="tasks" fill="#8b5cf6" name="Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Notices & Applications" description="Monitoring notices and hall application workflow.">
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-700/50 p-3">
                  <p className="text-xs text-slate-400">Notices</p>
                  <p className="mt-2 text-sm text-slate-200">Total: {analytics.notices?.total || 0}</p>
                  <p className="text-sm text-slate-200">Active: {analytics.notices?.active || 0}</p>
                  <p className="text-sm text-slate-200">Urgent: {analytics.notices?.urgent || 0}</p>
                  <p className="text-sm text-slate-200">Inactive: {analytics.notices?.inactive || 0}</p>
                </article>
                <article className="rounded-xl border border-slate-700/50 p-3">
                  <p className="text-xs text-slate-400">Hall Applications</p>
                  <p className="mt-2 text-sm text-slate-200">Total: {analytics.hallApplications?.total || 0}</p>
                  <p className="text-sm text-slate-200">Pending: {analytics.hallApplications?.pending || 0}</p>
                  <p className="text-sm text-slate-200">Approved: {analytics.hallApplications?.approved || 0}</p>
                  <p className="text-sm text-slate-200">Rejected: {analytics.hallApplications?.rejected || 0}</p>
                </article>
                <article className="rounded-xl border border-slate-700/50 p-3">
                  <p className="text-xs text-slate-400">Room Allocations</p>
                  <p className="mt-2 text-sm text-slate-200">Pending: {analytics.roomAllocations?.pending || 0}</p>
                  <p className="text-sm text-slate-200">Approved: {analytics.roomAllocations?.approved || 0}</p>
                  <p className="text-sm text-slate-200">Active: {analytics.roomAllocations?.active || 0}</p>
                  <p className="text-sm text-slate-200">Completed: {analytics.roomAllocations?.completed || 0}</p>
                </article>
                <article className="rounded-xl border border-slate-700/50 p-3">
                  <p className="text-xs text-slate-400">Transactions</p>
                  <p className="mt-2 text-sm text-slate-200">Completed: {analytics.financial?.completedTransactions || 0}</p>
                  <p className="text-sm text-slate-200">Failed: {analytics.financial?.failedTransactions || 0}</p>
                  <p className="text-sm text-slate-200">Refunds: {currency(analytics.financial?.totalRefunds || 0)}</p>
                </article>
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ContentSection title="Complaint Categories" description="Volume by complaint category in selected range.">
              <DataTableShell
                columns={["Category", "Count"]}
                rows={analytics.complaints?.byCategory || []}
                emptyTitle="No complaint data"
                emptyDescription="No complaints in selected range."
                renderRow={(row) => (
                  <tr key={row.category} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3 font-medium">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.count || 0}</td>
                  </tr>
                )}
              />
            </ContentSection>
            <ContentSection title="Maintenance Categories" description="Volume by maintenance category.">
              <DataTableShell
                columns={["Category", "Count"]}
                rows={analytics.maintenance?.byCategory || []}
                emptyTitle="No maintenance data"
                emptyDescription="No maintenance requests in selected range."
                renderRow={(row) => (
                  <tr key={row.category} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3 font-medium">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.count || 0}</td>
                  </tr>
                )}
              />
            </ContentSection>
            <ContentSection title="Support Categories" description="Volume by support ticket category.">
              <DataTableShell
                columns={["Category", "Count"]}
                rows={analytics.supportTickets?.byCategory || []}
                emptyTitle="No support ticket data"
                emptyDescription="No support tickets in selected range."
                renderRow={(row) => (
                  <tr key={row.category} className="border-b border-slate-800/70 last:border-none">
                    <td className="px-4 py-3 font-medium">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.count || 0}</td>
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

export default ProvostAnalyticsReportsPage;
