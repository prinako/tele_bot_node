import { useId, useState } from "react";
import Badge from "./Badge.jsx";
import Icon from "./Icon.jsx";

function formatValue(value) {
  if (value === true) {
    return <Badge tone="success">Yes</Badge>;
  }

  if (value === false) {
    return <Badge>No</Badge>;
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function searchText(value) {
  if (typeof value === "boolean") {
    return `${value ? "yes" : "no"} ${value}`;
  }
  if (value == null || typeof value === "object") return "";
  return String(value).toLowerCase();
}

function filterRows(rows, columns, query) {
  if (!query) return rows;

  return rows.filter((row) => columns.some((column) => {
    const value = column.searchValue ? column.searchValue(row) : row[column.key];
    return searchText(value).includes(query);
  }));
}

function RecordCount({ loading, count, total, query }) {
  if (loading) return "Loading records…";

  return (
    <>
      <strong>{count}</strong> {count === 1 ? "record" : "records"}
      {query && ` of ${total}`}
    </>
  );
}

function EmptyState({ query, empty, onClear }) {
  const title = query ? "No matching records" : empty;
  const description = query
    ? "Try a different search or clear the filter."
    : "Records will appear here when they become available.";

  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={query ? "search" : "empty"} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {query && <button type="button" onClick={onClear}>Clear search</button>}
    </div>
  );
}

function RecordsTable({ columns, rows }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Records table. Scroll horizontally to see all columns.">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? row.telegramId ?? row.telegramUserId ?? row.telegramChatId ?? row.messageThreadId ?? row._id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : formatValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableContent({ loading, columns, rows, query, empty, onClear }) {
  if (loading) {
    return (
      <div className="table-loading" role="status">
        <span className="loading-spinner" />Loading your workspace data…
      </div>
    );
  }
  if (!rows.length) {
    return <EmptyState query={query} empty={empty} onClear={onClear} />;
  }
  return <RecordsTable columns={columns} rows={rows} />;
}

export default function Table({ columns, rows, empty = "No records found", loading = false }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = filterRows(rows, columns, normalizedQuery);

  return (
    <div className="records-panel" aria-busy={loading}>
      <div className="table-toolbar">
        <div className="record-count" role="status">
          <RecordCount loading={loading} count={filteredRows.length} total={rows.length} query={normalizedQuery} />
        </div>
        <div className="table-search">
          <Icon name="search" />
          <label className="sr-only" htmlFor={searchId}>Search records</label>
          <input
            id={searchId}
            type="search"
            placeholder="Search records…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <TableContent
        loading={loading}
        columns={columns}
        rows={filteredRows}
        query={normalizedQuery}
        empty={empty}
        onClear={() => setQuery("")}
      />
    </div>
  );
}
