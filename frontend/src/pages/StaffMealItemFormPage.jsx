import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormPageShell from "@/components/shared/FormPageShell";
import LoadingState from "@/components/shared/LoadingState";
import MealItemFormFields from "@/features/meal-management/components/MealItemFormFields";
import { buildMealItemPayload, mealItemFormSchema } from "@/features/meal-management/validation";
import { mealApi } from "@/api/mealApi";
import { uploadApi } from "@/api/uploadApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { getTomorrowDateKeyInDhaka, normalizeDateInputToDhakaKey } from "@/utils/dateInDhaka";
import { resolveMealImage } from "@/utils/resolveMealImage";

function toDateInputValue(value) {
  if (!value) return "";
  return normalizeDateInputToDhakaKey(value);
}

function tomorrowDateString() {
  return getTomorrowDateKeyInDhaka(new Date());
}

function toMultilineList(values) {
  return Array.isArray(values) ? values.join("\n") : "";
}

function StaffMealItemFormPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(itemId));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const isEditMode = Boolean(itemId);

  const defaultValues = useMemo(
    () => ({
      itemName: "",
      category: "breakfast",
      description: "",
      price: 0,
      image: "",
      ingredientsText: "",
      allergensText: "",
      isVegetarian: false,
      isVegan: false,
      calories: 0,
      availableDate: tomorrowDateString(),
      isAvailable: true,
    }),
    []
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(mealItemFormSchema),
    defaultValues,
  });

  const watchedItemName = watch("itemName");
  const watchedCategory = watch("category");
  const watchedImage = watch("image");
  const fallbackImageUrl = useMemo(
    () =>
      resolveMealImage({
        itemName: watchedItemName,
        category: watchedCategory,
      }),
    [watchedCategory, watchedItemName]
  );

  const loadItem = useCallback(async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    setApiError("");
    try {
      const result = await mealApi.getMealItemByIdForStaff(itemId);
      const item = result.item;
      reset({
        itemName: item.itemName || "",
        category: item.category || "breakfast",
        description: item.description || "",
        price: Number(item.price || 0),
        image: item.image || "",
        ingredientsText: toMultilineList(item.ingredients),
        allergensText: toMultilineList(item.allergens),
        isVegetarian: Boolean(item.isVegetarian),
        isVegan: Boolean(item.isVegan),
        calories: Number(item.calories || 0),
        availableDate: toDateInputValue(item.availableDate),
        isAvailable: Boolean(item.isAvailable),
      });
    } catch (loadError) {
      setApiError(getApiErrorMessage(loadError, "Failed to load meal item."));
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, itemId, reset]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const payload = buildMealItemPayload(values);
      if (imageFile) {
        payload.image = await uploadApi.uploadSingleFile(imageFile);
      }

      if (isEditMode) {
        const result = await mealApi.updateMealItem(itemId, payload);
        navigate("/staff/meals", {
          replace: true,
          state: { updatedItemId: result.item?.id || itemId },
        });
        return;
      }

      const result = await mealApi.createMealItem(payload);
      navigate(`/staff/meals/${result.item.id}/edit`, { replace: true });
    } catch (error) {
      setApiError(getApiErrorMessage(error, `Failed to ${isEditMode ? "update" : "create"} meal item.`));
    }
  };

  const handleImageFileChange = (file) => {
    setImageFile(file);
    if (!file) {
      setImagePreviewUrl("");
      return;
    }
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  return (
    <FormPageShell
      eyebrow="Dining Staff"
      title={isEditMode ? "Edit Meal Item" : "Create Meal Item"}
      description={
        isEditMode
          ? "Update meal details, pricing, and availability."
          : "Add a new menu item for dining service."
      }
      formTitle={isEditMode ? "Meal Item Update" : "Meal Item Setup"}
      formDescription="Use clear pricing and meal details for future-date token purchases."
      actions={[
        <Button key="back" variant="secondary" onClick={() => navigate("/staff/meals")}>
          Back to Meals
        </Button>,
      ]}
    >
      {isLoading ? <LoadingState label="Loading meal item..." /> : null}

      {!isLoading ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {apiError ? (
            <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {apiError}
            </div>
          ) : null}

          <MealItemFormFields
            register={register}
            errors={errors}
            minAvailableDate={isEditMode ? undefined : tomorrowDateString()}
            imageUrl={watchedImage}
            fallbackImageUrl={!watchedImage ? fallbackImageUrl : ""}
            imagePreviewUrl={imagePreviewUrl}
            onImageFileChange={handleImageFileChange}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate("/staff/meals")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      ) : null}
    </FormPageShell>
  );
}

export default StaffMealItemFormPage;
