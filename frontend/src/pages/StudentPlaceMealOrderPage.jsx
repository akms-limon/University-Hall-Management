import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { mealApi } from "@/api/mealApi";
import { availabilityLabel, availabilityTone } from "@/features/meal-management/constants";
import {
  buildMealOrderPayload,
  mealOrderFormSchema,
} from "@/features/meal-management/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { getTomorrowDateKeyInDhaka } from "@/utils/dateInDhaka";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function tomorrowDateString() {
  return getTomorrowDateKeyInDhaka(new Date());
}

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function StudentPlaceMealOrderPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [apiError, setApiError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(mealOrderFormSchema),
    defaultValues: {
      validDate: tomorrowDateString(),
      specialRequests: "",
    },
  });

  const tokenAmount = Number(item?.price || 0);

  const loadItem = useCallback(async () => {
    setIsBootstrapping(true);
    setApiError("");
    try {
      const result = await mealApi.getMealItemById(itemId);
      setItem(result.item);
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to load meal item for order."));
    } finally {
      setIsBootstrapping(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const onSubmit = (values) => {
    setApiError("");
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const submitOrder = async () => {
    if (!pendingValues) return;

    setApiError("");
    try {
      const result = await mealApi.createMealOrder(buildMealOrderPayload(pendingValues, itemId));
      setConfirmOpen(false);

      if (result.paymentFailed) {
        setApiError(result.payment?.message || "Token purchase could not be completed.");
        return;
      }

      if (result.payment?.paymentUrl) {
        window.location.href = result.payment.paymentUrl;
        return;
      }

      navigate("/my-meal-orders", { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Failed to purchase meal token."));
      setConfirmOpen(false);
    }
  };

  const disableOrder = useMemo(
    () => !item || !item.isAvailable || isSubmitting,
    [isSubmitting, item]
  );

  return (
    <FormPageShell
      eyebrow="Student Workspace"
      title="Buy Meal Token"
      description="Purchase a meal token in advance for a future dining date."
      formTitle={item ? `Token: ${item.itemName}` : "Meal Token"}
      formDescription="Choose your token date. The token price will be deducted from your wallet balance."
      actions={[
        <Button key="menu" variant="secondary" onClick={() => navigate("/menu")}>
          Back to Menu
        </Button>,
      ]}
    >
      {isBootstrapping ? <LoadingState label="Loading token form..." /> : null}

      {!isBootstrapping ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {apiError}
            </div>
          ) : null}

          {item ? (
            <section className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.itemName}</h3>
                  <p className="text-xs text-slate-400">{currency(item.price)} per token</p>
                </div>
                <StatusBadge tone={availabilityTone(item.isAvailable)}>
                  {availabilityLabel(item.isAvailable)}
                </StatusBadge>
              </div>
              <p className="mt-2 text-xs text-slate-300">{item.description || "No description provided."}</p>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm text-slate-300">Valid Date</span>
              <Input type="date" min={tomorrowDateString()} className="mt-1" {...register("validDate")} />
              <p className="mt-1 text-xs text-slate-500">
                Tokens are purchasable from tomorrow onward (Asia/Dhaka).
              </p>
              <FieldError error={errors.validDate?.message} />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm text-slate-300">Note (Optional)</span>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Optional note for your token purchase"
                {...register("specialRequests")}
              />
              <FieldError error={errors.specialRequests?.message} />
            </label>
          </section>

          <section className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Token Price</span>
              <span>{currency(tokenAmount)}</span>
            </div>
            <div className="mt-3 border-t border-slate-700/60 pt-3 flex items-center justify-between font-semibold">
              <span>Payable Amount</span>
              <span>{currency(tokenAmount)}</span>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate("/menu")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={disableOrder}>
              {isSubmitting ? "Submitting..." : "Confirm Token Purchase"}
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitOrder}
        title="Confirm meal token purchase?"
        description={`Deduct ${currency(tokenAmount)} from your wallet balance to buy this token for your selected date.`}
        confirmLabel={isSubmitting ? "Processing..." : "Buy Token"}
        confirmDisabled={isSubmitting}
      />
    </FormPageShell>
  );
}

export default StudentPlaceMealOrderPage;
