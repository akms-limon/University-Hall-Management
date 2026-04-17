import Button from "@/components/ui/Button";

function PaginationControls({ page = 1, totalPages = 0, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:rgb(var(--ui-border)/0.65)] bg-[rgb(var(--bg-card)/0.88)] p-3 shadow-[var(--shadow-soft)]">
      <p className="text-xs text-[rgb(var(--text-muted))]">
        Page {page} of {totalPages}
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
        <Button variant="secondary" size="sm" className="w-full sm:w-auto" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default PaginationControls;
