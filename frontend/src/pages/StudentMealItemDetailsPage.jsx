import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Leaf, Vegan } from "lucide-react";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { mealApi } from "@/api/mealApi";
import { availabilityLabel, availabilityTone, mealCategoryLabel } from "@/features/meal-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { resolveMealImage } from "@/utils/resolveMealImage";

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function StudentMealItemDetailsPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.getMealItemById(itemId);
      setItem(result.item);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load meal item details."));
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const summaryItems = useMemo(() => {
    if (!item) return [];
    return [
      { title: "Category", value: mealCategoryLabel(item.category), hint: "Meal slot", tone: "info" },
      { title: "Price", value: currency(item.price), hint: "Per item", tone: "primary" },
      { title: "Availability", value: availabilityLabel(item.isAvailable), hint: "Current status", tone: availabilityTone(item.isAvailable) },
      { title: "Calories", value: String(item.calories || 0), hint: "Estimated energy", tone: "neutral" },
    ];
  }, [item]);

  const mealImageUrl = useMemo(() => resolveMealImage(item || {}), [item]);

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Meal Item Details"
      description="Review meal details before purchasing a dining token."
      actions={[
        <Button key="menu" variant="secondary" onClick={() => navigate("/menu")}>
          Back to Menu
        </Button>,
        <Button
          key="order"
          onClick={() => navigate(`/student/meals/order/${itemId}`)}
          disabled={!item?.isAvailable}
        >
          Buy Token
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading meal item..." /> : null}

      {!isLoading && error ? (
        <ErrorState title="Unable to load meal item" description={error} actionLabel="Retry" onAction={loadItem} />
      ) : null}

      {!isLoading && !error && item ? (
        <>
          <SummaryGrid items={summaryItems} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ContentSection title={item.itemName} description="Meal description and ingredient profile.">
              <div className="space-y-4">
                <div className="aspect-[16/9] overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70">
                  {mealImageUrl ? (
                    <img src={mealImageUrl} alt={item.itemName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm text-slate-400">
                      No image available
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <StatusBadge tone={availabilityTone(item.isAvailable)}>
                    {availabilityLabel(item.isAvailable)}
                  </StatusBadge>
                  <p className="text-slate-300">{item.description || "No description provided."}</p>
                </div>
              </div>
            </ContentSection>

            <ContentSection title="Nutrition and Diet Flags" description="Diet compatibility and allergy information.">
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  {item.isVegetarian ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                      <Leaf size={12} />
                      Vegetarian
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px] text-slate-300">Contains meat</span>
                  )}
                  {item.isVegan ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200">
                      <Vegan size={12} />
                      Vegan
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px] text-slate-300">Non-vegan</span>
                  )}
                </div>

                <div>
                  <p className="text-slate-400">Ingredients</p>
                  <p className="mt-1">{item.ingredients?.length ? item.ingredients.join(", ") : "Not specified"}</p>
                </div>

                <div>
                  <p className="text-slate-400">Allergens</p>
                  <p className="mt-1">{item.allergens?.length ? item.allergens.join(", ") : "Not specified"}</p>
                </div>
              </div>
            </ContentSection>
          </section>
        </>
      ) : null}
    </DetailPageShell>
  );
}

export default StudentMealItemDetailsPage;
