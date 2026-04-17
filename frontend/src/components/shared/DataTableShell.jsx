import TableWrapper from "@/components/shared/TableWrapper";
import EmptyState from "@/components/shared/EmptyState";

function DataTableShell({ columns, rows = [], emptyTitle, emptyDescription, renderRow }) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <TableWrapper columns={columns}>{rows.map((row) => renderRow(row))}</TableWrapper>;
}

export default DataTableShell;
