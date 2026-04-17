import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
  availabilityLabel,
  availabilityTone,
  mealCategoryLabel,
  mealCategoryOptions,
} from "@/features/meal-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultFilters = {
  search: "",
  category: "",
  isAvailable: "",
  sort: "createdAt:desc",
};

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Price (Low-High)", value: "price:asc" },
  { label: "Price (High-Low)", value: "price:desc" },
  { label: "Sold Today", value: "soldToday:desc" },
];

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StaffMealManagementPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    availableItems: 0,
    unavailableItems: 0,
    vegetarianItems: 0,
    veganItems: 0,
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [isMutating, setIsMutating] = useState(false);

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.listMealItemsForStaff({
        page,
        limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        isAvailable: filters.isAvailable === "" ? undefined : filters.isAvailable === "true",
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(
        result.summary || {
          totalItems: 0,
          availableItems: 0,
          unavailableItems: 0,
          vegetarianItems: 0,
          veganItems: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch meal items."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.isAvailable, filters.search, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const summaryCards = [
    { title: "Total Items", value: String(summary.totalItems || 0), hint: "Menu records", tone: "primary" },
    { title: "Available", value: String(summary.availableItems || 0), hint: "Buyable by students", tone: "success" },
    { title: "Unavailable", value: String(summary.unavailableItems || 0), hint: "Hidden from menu", tone: "warning" },
    { title: "Vegetarian", value: String(summary.vegetarianItems || 0), hint: "Dietary option count", tone: "info" },
  ];

  const handleAvailabilityToggle = async (item) => {
    setIsMutating(true);
    setError("");
    try {
      await mealApi.updateMealItemAvailability(item.id, !item.isAvailable);
      await fetchItems();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError, "Failed to update availability."));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.item?.id) return;
    setIsMutating(true);
    setError("");
    try {
      await mealApi.deleteMealItem(deleteDialog.item.id);
      setDeleteDialog({ open: false, item: null });
      await fetchItems();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Failed to delete meal item."));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Dining Staff"
      title="Meal Management"
      description="Create and maintain menu pricing and metadata for future-date token purchases."
      actions={[
        <Button key="create" onClick={() => navigate("/staff/meals/new")}>
          <Plus size={16} className="mr-1" />
          Create Meal Item
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection
        title="Menu Item Directory"
        description="Search and update future-date menu metadata and availability."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              className="xl:col-span-2"
              placeholder="Search by item name or description"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

            <Select value={filters.category} onChange={(event) => handleFilterChange("category", event.target.value)}>
              <option value="">All Categories</option>
              {mealCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.isAvailable} onChange={(event) => handleFilterChange("isAvailable", event.target.value)}>
              <option value="">All Availability</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </Select>

            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading meal items..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load meal items" description={error} actionLabel="Retry" onAction={fetchItems} />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Item", "Category", "Price", "Sold", "Availability", "Date", "Actions"]}
                  rows={items}
                  emptyTitle="No meal items found"
                  emptyDescription="Create your first menu item for meal operations."
                  renderRow={(item) => (
                    <tr key={item.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-slate-400">{item.description || "No description"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{mealCategoryLabel(item.category)}</td>
                      <td className="px-4 py-3 text-slate-300">{currency(item.price)}</td>
                      <td className="px-4 py-3 text-slate-300">{item.soldToday}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={availabilityTone(item.isAvailable)}>
                          {availabilityLabel(item.isAvailable)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(item.availableDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/staff/meals/${item.id}/edit`)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => handleAvailabilityToggle(item)}
                          >
                            {item.isAvailable ? "Hide" : "Show"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteDialog({ open: true, item })}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{item.itemName}</h3>
                        <p className="text-xs text-slate-400">{mealCategoryLabel(item.category)}</p>
                      </div>
                      <StatusBadge tone={availabilityTone(item.isAvailable)}>
                        {availabilityLabel(item.isAvailable)}
                      </StatusBadge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Price</dt>
                        <dd>{currency(item.price)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Sold</dt>
                        <dd>{item.soldToday || 0}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/staff/meals/${item.id}/edit`)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" disabled={isMutating} onClick={() => handleAvailabilityToggle(item)}>
                        {item.isAvailable ? "Hide" : "Show"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteDialog({ open: true, item })}>
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete this meal item?"
        description="This will remove the item from active menu listings."
        confirmLabel={isMutating ? "Deleting..." : "Delete"}
        confirmDisabled={isMutating}
      />
    </DetailPageShell>
  );
}

export default StaffMealManagementPage;
