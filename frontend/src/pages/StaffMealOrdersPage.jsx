import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { mealApi } from "@/api/mealApi";
import {
  mealOrderStatusLabel,
  mealOrderStatusOptions,
  mealOrderStatusTone,
  mealPaymentStatusLabel,
  mealPaymentStatusOptions,
  mealPaymentStatusTone,
  mealCategoryLabel,
} from "@/features/meal-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { getDateKeyInDhaka, isTodayDateKeyInDhaka } from "@/utils/dateInDhaka";

const defaultFilters = {
  search: "",
  status: "",
  paymentStatus: "",
  mealType: "",
  date: getDateKeyInDhaka(new Date()),
  sort: "validDate:desc",
};

const sortOptions = [
  { label: "Valid Date (Newest)", value: "validDate:desc" },
  { label: "Valid Date (Oldest)", value: "validDate:asc" },
  { label: "Purchase Date (Newest)", value: "orderDate:desc" },
];

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StaffMealOrdersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    tokenId: null,
    tokenCode: "",
    status: "consumed",
  });
  const [isMutating, setIsMutating] = useState(false);

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.listMealOrdersForStaff({
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        mealType: filters.mealType || undefined,
        date: filters.date || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || {});
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch meal tokens."));
    } finally {
      setIsLoading(false);
    }
  }, [filters, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const summaryCards = [
    { title: "Total Tokens", value: String(summary.totalTokens || 0), hint: "Filtered result", tone: "primary" },
    { title: "Active", value: String(summary.active || 0), hint: "Awaiting token check", tone: "warning" },
    { title: "Eaten", value: String(summary.consumed || 0), hint: "Confirmed dining use", tone: "success" },
    { title: "Not Eaten", value: String(summary.notEaten || 0), hint: "Checked but unused", tone: "danger" },
    { title: "Expired", value: String(summary.expired || 0), hint: "No longer valid", tone: "neutral" },
    { title: "Collected", value: currency(summary.totalAmount || 0), hint: "Paid amount", tone: "info" },
  ];

  const handleMarkUsage = async () => {
    if (!confirmState.tokenId) return;
    setIsMutating(true);
    setError("");
    try {
      await mealApi.updateMealOrderStatus(confirmState.tokenId, { status: confirmState.status });
      setConfirmState({ open: false, tokenId: null, tokenCode: "", status: "consumed" });
      await fetchTokens();
    } catch (markError) {
      setError(getApiErrorMessage(markError, "Failed to update token usage status."));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Dining Staff"
      title="Meal Token Check"
      description="Search today's tokens and mark whether each student has eaten or not eaten."
      actions={[
        <Button key="stats" variant="secondary" onClick={() => navigate("/staff/orders/stats")}>
          Dining Summary
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Token Queue" description="Search by token code or student info for quick dining check-in.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              className="xl:col-span-2"
              placeholder="Search token code / student / email"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />
            <Input type="date" value={filters.date} onChange={(event) => handleFilterChange("date", event.target.value)} />
            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {mealOrderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select value={filters.mealType} onChange={(event) => handleFilterChange("mealType", event.target.value)}>
              <option value="">All Meal Types</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </Select>
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={filters.paymentStatus} onChange={(event) => handleFilterChange("paymentStatus", event.target.value)}>
              <option value="">All Payments</option>
              {mealPaymentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Button variant="secondary" onClick={fetchTokens}>Refresh</Button>
          </div>

          {isLoading ? <LoadingState label="Loading token queue..." /> : null}
          {!isLoading && error ? <ErrorState title="Unable to load tokens" description={error} actionLabel="Retry" onAction={fetchTokens} /> : null}

          {!isLoading && !error ? (
            <>
              <DataTableShell
                columns={["Token", "Student", "Meal", "Valid Date", "Amount", "Status", "Payment", "Action"]}
                rows={items}
                emptyTitle="No tokens found"
                emptyDescription="No tokens match current filters."
                renderRow={(token) => (
                  <tr key={token.id} className="border-b border-slate-800/70 last:border-none align-top">
                    <td className="px-4 py-3 font-medium">{token.tokenCode || "-"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{token.student?.user?.name || "N/A"}</p>
                      <p className="text-xs text-slate-400">{token.student?.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{mealCategoryLabel(token.mealType)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(token.validDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{currency(token.amount || token.totalPrice)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={mealOrderStatusTone(token.status)}>{mealOrderStatusLabel(token.status)}</StatusBadge></td>
                    <td className="px-4 py-3"><StatusBadge tone={mealPaymentStatusTone(token.paymentStatus)}>{mealPaymentStatusLabel(token.paymentStatus)}</StatusBadge></td>
                    <td className="px-4 py-3">
                      {token.status === "active" && token.paymentStatus === "paid" && isTodayDateKeyInDhaka(token.validDate) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tokenId: token.id,
                                tokenCode: token.tokenCode || token.id,
                                status: "consumed",
                              })
                            }
                          >
                            Mark Eaten
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                tokenId: token.id,
                                tokenCode: token.tokenCode || token.id,
                                status: "not_eaten",
                              })
                            }
                          >
                            Mark Not Eaten
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {token.status === "expired" ? "Expired token" : "Not eligible"}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              />
              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, tokenId: null, tokenCode: "", status: "consumed" })}
        onConfirm={handleMarkUsage}
        title={confirmState.status === "not_eaten" ? "Mark token as not eaten?" : "Mark token as eaten?"}
        description={
          confirmState.status === "not_eaten"
            ? `This will record no dining usage for token ${confirmState.tokenCode || ""}.`
            : `This will confirm dining usage for token ${confirmState.tokenCode || ""}.`
        }
        confirmLabel={isMutating ? "Saving..." : "Confirm"}
        confirmDisabled={isMutating}
      />
    </DetailPageShell>
  );
}

export default StaffMealOrdersPage;
