import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FormPageShell from "@/components/shared/FormPageShell";
import { walletApi } from "@/api/walletApi";
import { paymentMethodOptions, transactionStatusLabel } from "@/features/wallet/constants";
import { buildDepositPayload, depositRequestSchema } from "@/features/wallet/validation";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function StudentDepositPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "sslcommerz",
      remarks: "",
    },
  });

  const onSubmit = async (values) => {
    setApiError("");
    setSubmissionNote("");
    try {
      const result = await walletApi.createDepositRequest(buildDepositPayload(values));
      const transactionId = result.transaction?.id;
      const statusLabel = transactionStatusLabel(result.payment?.status || result.transaction?.status || "");
      setSubmissionNote(result.payment?.message || `Deposit request status: ${statusLabel}`);

      if (result.payment?.paymentUrl) {
        window.location.href = result.payment.paymentUrl;
        return;
      }

      if (transactionId) {
        navigate(`/student/wallet/deposits/${transactionId}`, { replace: true });
        return;
      }

      navigate("/student/wallet", { replace: true });
    } catch (submitError) {
      setApiError(getApiErrorMessage(submitError, "Failed to create deposit request."));
    }
  };

  return (
    <FormPageShell
      eyebrow="Student Finance"
      title="Deposit Money"
      description="Add money to your wallet to buy meal tokens."
      formTitle="New Deposit"
      formDescription="Select amount and gateway. SSLCommerz will process your payment and verified deposits will increase wallet balance."
      actions={[
        <Button key="wallet" variant="secondary" onClick={() => navigate("/student/wallet")}>
          Back to Wallet
        </Button>,
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {apiError ? (
          <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {apiError}
          </div>
        ) : null}

        {submissionNote ? (
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {submissionNote}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-sm text-slate-300">Deposit Amount (BDT)</span>
            <Input type="number" min="1" step="1" className="mt-1" {...register("amount")} />
            <FieldError error={errors.amount?.message} />
          </label>

          <label>
            <span className="text-sm text-slate-300">Payment Method</span>
            <Select className="mt-1" {...register("paymentMethod")}>
              {paymentMethodOptions
                .filter((option) => option.value !== "system")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              SSLCommerz is recommended for online deposits.
            </p>
            <FieldError error={errors.paymentMethod?.message} />
          </label>

          <label className="sm:col-span-2">
            <span className="text-sm text-slate-300">Remarks (Optional)</span>
            <Textarea
              rows={3}
              className="mt-1"
              placeholder="Add note for this deposit request"
              {...register("remarks")}
            />
            <FieldError error={errors.remarks?.message} />
          </label>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/student/wallet")} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Submit Deposit"}
          </Button>
        </div>
      </form>
    </FormPageShell>
  );
}

export default StudentDepositPage;
