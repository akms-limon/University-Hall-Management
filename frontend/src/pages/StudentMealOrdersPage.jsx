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
import { isFutureDateKeyInDhaka } from "@/utils/dateInDhaka";

const defaultFilters = {
  status: "",
  paymentStatus: "",
  mealType: "",
  validDateFrom: "",
  validDateTo: "",
  sort: "validDate:desc",
};

const sortOptions = [
  { label: "Valid Date (Newest)", value: "validDate:desc" },
  { label: "Valid Date (Oldest)", value: "validDate:asc" },
  { label: "Purchase Date (Newest)", value: "orderDate:desc" },
  { label: "Amount (High-Low)", value: "amount:desc" },
];

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StudentMealOrdersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelDialog, setCancelDialog] = useState({ open: false, tokenId: null });
  const [isMutating, setIsMutating] = useState(false);

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.listMyMealOrders({
        page,
        limit,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        mealType: filters.mealType || undefined,
        validDateFrom: filters.validDateFrom || undefined,
        validDateTo: filters.validDateTo || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || {});
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load meal tokens."));
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
    { title: "Total Tokens", value: String(summary.totalTokens || 0), hint: "All records", tone: "primary" },
    { title: "Active", value: String(summary.active || 0), hint: "Usable tokens", tone: "warning" },
    { title: "Consumed", value: String(summary.consumed || 0), hint: "Already used", tone: "success" },
  ];

  const handleCancelToken = async () => {
    if (!cancelDialog.tokenId) return;
    setIsMutating(true);
    setError("");
    try {
      await mealApi.cancelMyMealOrder(cancelDialog.tokenId, { cancelledReason: "Cancelled by student" });
      setCancelDialog({ open: false, tokenId: null });
      await fetchTokens();
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError, "Failed to cancel token."));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="My Meal Tokens"
      description="Track your purchased meal tokens, status, and payment records."
      actions={[
        <Button key="menu" variant="secondary" onClick={() => navigate("/menu")}>
          Buy New Token
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection title="Token History" description="Filter by status, meal type, and date range.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {mealOrderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select value={filters.paymentStatus} onChange={(event) => handleFilterChange("paymentStatus", event.target.value)}>
              <option value="">All Payment Statuses</option>
              {mealPaymentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select value={filters.mealType} onChange={(event) => handleFilterChange("mealType", event.target.value)}>
              <option value="">All Meal Types</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </Select>
            <Input type="date" value={filters.validDateFrom} onChange={(event) => handleFilterChange("validDateFrom", event.target.value)} />
            <Input type="date" value={filters.validDateTo} onChange={(event) => handleFilterChange("validDateTo", event.target.value)} />
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading meal tokens..." /> : null}
          {!isLoading && error ? <ErrorState title="Unable to load tokens" description={error} actionLabel="Retry" onAction={fetchTokens} /> : null}

          {!isLoading && !error ? (
            <>
              <DataTableShell
                columns={["Token Code", "Meal Type", "Valid Date", "Amount", "Status", "Payment", "Actions"]}
                rows={items}
                emptyTitle="No meal tokens found"
                emptyDescription="Buy your first meal token from the menu."
                renderRow={(token) => (
                  <tr key={token.id} className="border-b border-slate-800/70 last:border-none align-top">
                    <td className="px-4 py-3 font-medium">{token.tokenCode || "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{mealCategoryLabel(token.mealType)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(token.validDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{currency(token.amount || token.totalPrice)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={mealOrderStatusTone(token.status)}>{mealOrderStatusLabel(token.status)}</StatusBadge></td>
                    <td className="px-4 py-3"><StatusBadge tone={mealPaymentStatusTone(token.paymentStatus)}>{mealPaymentStatusLabel(token.paymentStatus)}</StatusBadge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/my-meal-orders/${token.id}`)}>View</Button>
                        {token.status === "active" && isFutureDateKeyInDhaka(token.validDate) ? (
                          <Button variant="danger" size="sm" onClick={() => setCancelDialog({ open: true, tokenId: token.id })}>Cancel</Button>
                        ) : null}
                        {token.status === "active" && !isFutureDateKeyInDhaka(token.validDate) ? (
                          <span className="text-xs text-slate-500">
                            Cancellation closed after token day starts (Asia/Dhaka)
                          </span>
                        ) : null}
                      </div>
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
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, tokenId: null })}
        onConfirm={handleCancelToken}
        title="Cancel this meal token?"
        description="Only active tokens for future dates can be cancelled before token day starts in Asia/Dhaka."
        confirmLabel={isMutating ? "Cancelling..." : "Cancel Token"}
        confirmDisabled={isMutating}
      />
    </DetailPageShell>
  );
}

export default StudentMealOrdersPage;
