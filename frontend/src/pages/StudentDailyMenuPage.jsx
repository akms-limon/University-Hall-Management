import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Vegan } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
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
import { resolveMealImage } from "@/utils/resolveMealImage";
import { getTomorrowDateKeyInDhaka } from "@/utils/dateInDhaka";

function tomorrowDateString() {
  return getTomorrowDateKeyInDhaka(new Date());
}

const defaultFilters = {
  date: tomorrowDateString(),
  search: "",
  category: "",
  isVegetarian: "",
  isVegan: "",
  sort: "category:asc",
};

const sortOptions = [
  { label: "Category (A-Z)", value: "category:asc" },
  { label: "Price (Low-High)", value: "price:asc" },
  { label: "Price (High-Low)", value: "price:desc" },
  { label: "Name (A-Z)", value: "itemName:asc" },
];

const orderedCategories = mealCategoryOptions.map((entry) => entry.value);

function currency(value) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

function StudentDailyMenuPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
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

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchMenu = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await mealApi.listDailyMenu({
        page,
        limit,
        date: filters.date || undefined,
        search: filters.search || undefined,
        category: filters.category || undefined,
        isVegetarian: filters.isVegetarian === "" ? undefined : filters.isVegetarian === "true",
        isVegan: filters.isVegan === "" ? undefined : filters.isVegan === "true",
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
      setError(getApiErrorMessage(fetchError, "Failed to load daily menu."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.category,
    filters.date,
    filters.isVegan,
    filters.isVegetarian,
    filters.search,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const groupedItems = useMemo(() => {
    const grouped = Object.fromEntries(orderedCategories.map((category) => [category, []]));
    items.forEach((item) => {
      const key = grouped[item.category] ? item.category : "extras";
      grouped[key].push(item);
    });
    return grouped;
  }, [items]);

  const summaryCards = [
    { title: "Menu Items", value: String(summary.totalItems || 0), hint: "Selected date", tone: "primary" },
    { title: "Available", value: String(summary.availableItems || 0), hint: "Ready to order", tone: "success" },
    { title: "Unavailable", value: String(summary.unavailableItems || 0), hint: "Hidden or paused", tone: "warning" },
    { title: "Vegetarian", value: String(summary.vegetarianItems || 0), hint: "Plant-forward options", tone: "info" },
  ];

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Daily Menu"
      description="Browse meal options and purchase future-date dining tokens."
      actions={[
        <Button key="wallet" variant="ghost" onClick={() => navigate("/student/wallet")}>
          Wallet
        </Button>,
        <Button key="orders" variant="secondary" onClick={() => navigate("/my-meal-orders")}>
          My Meal Tokens
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryCards} />

      <ContentSection
        title="Meal Catalog"
        description="Choose a meal and buy a token for tomorrow or any future date (Asia/Dhaka)."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              type="date"
              min={tomorrowDateString()}
              value={filters.date}
              onChange={(event) => handleFilterChange("date", event.target.value)}
            />

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

            <Select value={filters.isVegetarian} onChange={(event) => handleFilterChange("isVegetarian", event.target.value)}>
              <option value="">All Diet Types</option>
              <option value="true">Vegetarian</option>
              <option value="false">Non-Vegetarian</option>
            </Select>

            <Select value={filters.isVegan} onChange={(event) => handleFilterChange("isVegan", event.target.value)}>
              <option value="">All Vegan Types</option>
              <option value="true">Vegan</option>
              <option value="false">Non-Vegan</option>
            </Select>

            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading daily menu..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load menu" description={error} actionLabel="Retry" onAction={fetchMenu} />
          ) : null}

          {!isLoading && !error ? (
            <div className="space-y-5">
              {!items.length ? (
                <EmptyState
                  title="No meal items found"
                  description="No menu items match your current filters for the selected date."
                />
              ) : null}

              {orderedCategories.map((category) => {
                const categoryItems = groupedItems[category] || [];
                if (!categoryItems.length) return null;

                return (
                  <section key={category} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
                        {mealCategoryLabel(category)}
                      </h3>
                      <span className="text-xs text-slate-400">{categoryItems.length} items</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {categoryItems.map((item) => {
                        const mealImageUrl = resolveMealImage(item);

                        return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-slate-700/60 bg-bg-card/80 p-4 shadow-[0_16px_35px_rgba(2,6,23,0.25)]"
                        >
                          <div className="aspect-[16/9] overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/70">
                            {mealImageUrl ? (
                              <img src={mealImageUrl} alt={item.itemName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-slate-400">
                                No image available
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold">{item.itemName}</h4>
                              <p className="text-xs text-slate-400">{currency(item.price)}</p>
                            </div>
                            <StatusBadge tone={availabilityTone(item.isAvailable)}>
                              {availabilityLabel(item.isAvailable)}
                            </StatusBadge>
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs text-slate-300">{item.description || "No description provided."}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.isVegetarian ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                                <Leaf size={12} />
                                Vegetarian
                              </span>
                            ) : null}
                            {item.isVegan ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200">
                                <Vegan size={12} />
                                Vegan
                              </span>
                            ) : null}
                            <span className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px] text-slate-300">
                              {item.calories || 0} cal
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => navigate(`/menu/item/${item.id}`)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/student/meals/order/${item.id}`)}
                              disabled={!item.isAvailable}
                            >
                              Buy Token
                            </Button>
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {!items.length ? (
                <p className="text-center text-xs text-slate-500">
                  Need token history instead?{" "}
                  <Link to="/my-meal-orders" className="text-cyan-300 hover:text-cyan-200">
                    Open my tokens
                  </Link>
                  .
                </p>
              ) : null}

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </div>
          ) : null}
        </div>
      </ContentSection>
    </DetailPageShell>
  );
}

export default StudentDailyMenuPage;
