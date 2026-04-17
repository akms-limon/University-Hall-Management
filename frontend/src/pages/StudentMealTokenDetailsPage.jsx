import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { mealApi } from "@/api/mealApi";
import { mealOrderStatusLabel, mealOrderStatusTone, mealPaymentStatusLabel, mealPaymentStatusTone, mealCategoryLabel } from "@/features/meal-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function StudentMealTokenDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchToken = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.getMyMealOrderById(orderId);
      setToken(result.order);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to load meal token details."));
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const summaryItems = token
    ? [
        { title: "Token Code", value: token.tokenCode || "-", hint: "Dining verification", tone: "primary" },
        { title: "Meal Type", value: mealCategoryLabel(token.mealType), hint: "Meal slot", tone: "info" },
        { title: "Valid Date", value: formatDate(token.validDate), hint: "Use date", tone: "warning" },
        { title: "Amount", value: currency(token.amount || token.totalPrice), hint: "Paid amount", tone: "success" },
      ]
    : [];

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Meal Token Details"
      description="Review token status, payment status, and usage details."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/my-meal-orders")}>
          Back to Tokens
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading token details..." /> : null}
      {!isLoading && error ? <ErrorState title="Unable to load token details" description={error} actionLabel="Retry" onAction={fetchToken} /> : null}

      {!isLoading && !error && token ? (
        <>
          <SummaryGrid items={summaryItems} />
          <section className="grid gap-4 xl:grid-cols-2">
            <ContentSection title="Token Status" description="Current usage and payment state.">
              <dl className="grid gap-3 text-sm">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge tone={mealOrderStatusTone(token.status)}>{mealOrderStatusLabel(token.status)}</StatusBadge>
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Payment</dt>
                  <dd className="mt-1">
                    <StatusBadge tone={mealPaymentStatusTone(token.paymentStatus)}>{mealPaymentStatusLabel(token.paymentStatus)}</StatusBadge>
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Checked At</dt>
                  <dd className="mt-1">{formatDate(token.checkedAt || token.consumedAt)}</dd>
                </div>
              </dl>
            </ContentSection>

            <ContentSection title="Meal Information" description="Linked menu and notes.">
              <dl className="grid gap-3 text-sm">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Meal Item</dt>
                  <dd className="mt-1">{token.foodItem?.itemName || "N/A"}</dd>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Purchase Date</dt>
                  <dd className="mt-1">{formatDate(token.orderDate)}</dd>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Note</dt>
                  <dd className="mt-1">{token.specialRequests || "-"}</dd>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                  <dt className="text-slate-400">Cancellation Reason</dt>
                  <dd className="mt-1">{token.cancelledReason || "-"}</dd>
                </div>
              </dl>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentMealTokenDetailsPage;
