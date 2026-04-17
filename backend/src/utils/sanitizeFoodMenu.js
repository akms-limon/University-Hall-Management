function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
}

export function sanitizeFoodMenu(foodMenuDocument) {
  const foodMenu = foodMenuDocument?.toObject ? foodMenuDocument.toObject() : foodMenuDocument;

  return {
    id: foodMenu?._id?.toString?.() || foodMenu?.id,
    itemName: foodMenu?.itemName || "",
    category: foodMenu?.category || "extras",
    description: foodMenu?.description || "",
    price: Number.isFinite(foodMenu?.price) ? foodMenu.price : 0,
    quantity: Number.isFinite(foodMenu?.quantity) ? foodMenu.quantity : null,
    soldToday: Number.isFinite(foodMenu?.soldToday) ? foodMenu.soldToday : 0,
    image: foodMenu?.image || "",
    ingredients: normalizeStringArray(foodMenu?.ingredients),
    allergens: normalizeStringArray(foodMenu?.allergens),
    isVegetarian: Boolean(foodMenu?.isVegetarian),
    isVegan: Boolean(foodMenu?.isVegan),
    calories: Number.isFinite(foodMenu?.calories) ? foodMenu.calories : 0,
    availableDate: foodMenu?.availableDate || null,
    isAvailable: Boolean(foodMenu?.isAvailable),
    isDeleted: Boolean(foodMenu?.isDeleted),
    createdBy: foodMenu?.createdBy?.toString?.() || foodMenu?.createdBy || null,
    createdAt: foodMenu?.createdAt,
    updatedAt: foodMenu?.updatedAt,
  };
}
