import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import { imageRecordApi } from "@/api/imageRecordApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
const apiOrigin = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");

function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${apiOrigin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function ProvostImageLibraryPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState("");

  const isEditMode = Boolean(editingId);
  const imagePreviewSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (!isEditMode) return "";
    const current = items.find((entry) => entry.id === editingId);
    return resolveImageUrl(current?.imagePath || "");
  }, [editingId, isEditMode, items, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await imageRecordApi.listImageRecords({
        page,
        limit,
        search: search || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setItems(result.items || []);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load image records."));
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setEditingId("");
    setForm({
      title: "",
      description: "",
      imageFile: null,
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
    setForm((prev) => ({ ...prev, imageFile: file }));
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!isEditMode && !form.imageFile) {
      setError("Image file is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await imageRecordApi.updateImageRecord(editingId, {
          title: form.title.trim(),
          description: form.description.trim(),
          imageFile: form.imageFile,
        });
        setSuccessMessage("Image record updated successfully.");
      } else {
        await imageRecordApi.createImageRecord({
          title: form.title.trim(),
          description: form.description.trim(),
          imageFile: form.imageFile,
        });
        setSuccessMessage("Image record created successfully.");
      }

      resetForm();
      await loadItems();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Failed to save image record."));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      imageFile: null,
    });
    setSuccessMessage("");
    setError("");
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await imageRecordApi.deleteImageRecord(deleteTarget.id);
      setSuccessMessage("Image record deleted successfully.");
      if (editingId === deleteTarget.id) {
        resetForm();
      }
      await loadItems();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Failed to delete image record."));
    } finally {
      setIsSaving(false);
      setDeleteTarget(null);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Image Library"
      description="Upload and manage local images stored in the uploads directory."
      actions={[
        <Button key="refresh" variant="secondary" onClick={loadItems}>
          Refresh
        </Button>,
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <ContentSection
          title={isEditMode ? "Edit Image" : "Upload Image"}
          description="Allowed formats: JPG, JPEG, PNG. Maximum size: 2MB."
        >
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
            ) : null}
            {successMessage ? (
              <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm text-slate-300">Title</span>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Image title"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-[10px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-muted)/0.9)] px-3 py-2 text-sm text-[rgb(var(--text-base))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-primary)/0.35)]"
                placeholder="Optional description"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">{isEditMode ? "Replace Image (optional)" : "Image File"}</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleFileChange}
                className="mt-1 block w-full rounded-[10px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-muted)/0.9)] px-3 py-2 text-sm text-[rgb(var(--text-base))] file:mr-3 file:rounded-md file:border-0 file:bg-[rgb(var(--accent-primary))] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[rgb(var(--accent-primary)/0.88)]"
              />
            </label>

            {imagePreviewSrc ? (
              <div className="rounded-xl border border-[color:rgb(var(--ui-border)/0.28)] p-2">
                <p className="mb-2 text-xs text-slate-400">Preview</p>
                <img src={imagePreviewSrc} alt="Preview" className="h-44 w-full rounded-lg object-cover" />
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              {isEditMode ? (
                <Button type="button" variant="secondary" onClick={resetForm} disabled={isSaving}>
                  Cancel Edit
                </Button>
              ) : null}
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditMode ? "Update Image" : "Upload Image"}
              </Button>
            </div>
          </form>
        </ContentSection>

        <ContentSection title="Uploaded Images" description="All images are served from your local uploads folder.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <Button variant="secondary" onClick={loadItems}>
                Search
              </Button>
            </div>

            {isLoading ? <LoadingState label="Loading images..." /> : null}
            {!isLoading && error ? (
              <ErrorState title="Unable to load images" description={error} actionLabel="Retry" onAction={loadItems} />
            ) : null}
            {!isLoading && !error && items.length === 0 ? (
              <EmptyState title="No images found" description="Upload your first image using the form." />
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-700/60 bg-bg-card/75">
                      <img
                        src={resolveImageUrl(item.imagePath)}
                        alt={item.title}
                        className="h-40 w-full object-cover"
                      />
                      <div className="space-y-2 p-3">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="line-clamp-2 text-xs text-slate-400">{item.description || "No description"}</p>
                        <p className="text-[11px] text-slate-500">Created: {formatDate(item.createdAt)}</p>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <PaginationControls
                  page={meta.page || page}
                  totalPages={meta.totalPages || 0}
                  onPageChange={setPage}
                />
              </>
            ) : null}
          </div>
        </ContentSection>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete image record?"
        description="This will remove the database record and delete the local image file from uploads."
        confirmLabel={isSaving ? "Deleting..." : "Delete"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostImageLibraryPage;

