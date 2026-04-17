function TableWrapper({ columns, children }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-card)/0.98)] shadow-[var(--shadow-soft)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-[color:rgb(var(--ui-border)/0.25)] bg-[rgb(var(--bg-muted)/0.55)] text-[rgb(var(--text-muted))]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default TableWrapper;
