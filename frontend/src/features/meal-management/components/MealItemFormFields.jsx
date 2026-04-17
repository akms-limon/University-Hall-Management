import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FilePickerField from "@/components/shared/FilePickerField";
import { mealCategoryOptions } from "@/features/meal-management/constants";

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-300">{error}</p>;
}

function MealItemFormFields({
  register,
  errors,
  minAvailableDate = undefined,
  imageUrl = "",
  fallbackImageUrl = "",
  imagePreviewUrl = "",
  onImageFileChange,
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="text-sm text-slate-300">Item Name</span>
        <Input className="mt-1" placeholder="Chicken Biryani" {...register("itemName")} />
        <FieldError error={errors.itemName?.message} />
      </label>

      <label>
        <span className="text-sm text-slate-300">Category</span>
        <Select className="mt-1" {...register("category")}>
          <option value="">Select category</option>
          {mealCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <FieldError error={errors.category?.message} />
      </label>

      <label>
        <span className="text-sm text-slate-300">Price</span>
        <Input type="number" min="0" step="1" className="mt-1" {...register("price")} />
        <FieldError error={errors.price?.message} />
      </label>

      <label>
        <span className="text-sm text-slate-300">Calories</span>
        <Input type="number" min="0" step="1" className="mt-1" {...register("calories")} />
        <FieldError error={errors.calories?.message} />
      </label>

      <label>
        <span className="text-sm text-slate-300">Available Date</span>
        <Input type="date" min={minAvailableDate} className="mt-1" {...register("availableDate")} />
        <FieldError error={errors.availableDate?.message} />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm text-slate-300">Description</span>
        <Textarea className="mt-1" rows={3} placeholder="Meal details and serving note..." {...register("description")} />
        <FieldError error={errors.description?.message} />
      </label>

      <div className="sm:col-span-2">
        <input type="hidden" {...register("image")} />
        <FilePickerField
          label="Meal Image"
          accept="image/*"
          onChange={(files) => onImageFileChange?.(files[0] || null)}
          helperText={
            imageUrl
              ? "Current image is set. Upload a new file to replace it."
              : fallbackImageUrl
                ? "Auto-matched from assets by meal name. Upload a new file to override."
                : "Upload a meal image (optional)."
          }
          error={errors.image?.message}
          previewUrls={imagePreviewUrl ? [imagePreviewUrl] : imageUrl ? [imageUrl] : fallbackImageUrl ? [fallbackImageUrl] : []}
        />
      </div>

      <label className="sm:col-span-2">
        <span className="text-sm text-slate-300">Ingredients</span>
        <Textarea
          className="mt-1"
          rows={3}
          placeholder="Comma or new line separated (e.g., Rice, Chicken, Garlic)"
          {...register("ingredientsText")}
        />
        <FieldError error={errors.ingredientsText?.message} />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm text-slate-300">Allergens</span>
        <Textarea
          className="mt-1"
          rows={3}
          placeholder="Comma or new line separated (e.g., Gluten, Nuts)"
          {...register("allergensText")}
        />
        <FieldError error={errors.allergensText?.message} />
      </label>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
          {...register("isVegetarian")}
        />
        <span className="text-sm text-slate-300">Vegetarian</span>
      </label>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
          {...register("isVegan")}
        />
        <span className="text-sm text-slate-300">Vegan</span>
      </label>

      <label className="inline-flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
          {...register("isAvailable")}
        />
        <span className="text-sm text-slate-300">Item is available for ordering</span>
      </label>
    </section>
  );
}

export default MealItemFormFields;
