import type { CSSProperties } from "react";
import sheet from "./sheet-data.json";
import layout from "./sheet-layout.json";

type Cell = {
  v?: string;
  bg?: number[];
  fg?: number[];
  fs?: number;
  b?: number;
  it?: number;
  u?: number;
  h?: "LEFT" | "CENTER" | "RIGHT";
  va?: "TOP" | "MIDDLE" | "BOTTOM";
  w?: "WRAP" | "CLIP" | "OVERFLOW_CELL";
};

const rgb = (color: number[] | undefined, fallback: string) =>
  color ? `rgb(${color[0]} ${color[1]} ${color[2]})` : fallback;

const align = (value: Cell["h"]) =>
  value === "LEFT" ? "flex-start" : value === "RIGHT" ? "flex-end" : "center";

const verticalAlign = (value: Cell["va"]) =>
  value === "TOP" ? "flex-start" : value === "BOTTOM" ? "flex-end" : "center";

const textAlign = (value: Cell["h"]) =>
  value === "LEFT" ? "left" : value === "RIGHT" ? "right" : "center";

const isHeaderRow = (row: Cell[]) =>
  row[0]?.v === "IMG" && row[1]?.v === "SKU" && row[2]?.v === "PRICE" && row[3]?.v === "COG";

const prepareRow = (row: Cell[], isHeader: boolean) => {
  const totalLabel = row.slice(0, 4).find((cell) => cell.v?.endsWith("_TOTALS"))?.v;
  return row.map((cell, columnIndex) => {
    if (isHeader && columnIndex === 0) return { ...cell, v: "" };
    if (totalLabel && columnIndex === 0) {
      return { ...cell, v: totalLabel, fs: 7, h: "CENTER" as const, va: "MIDDLE" as const };
    }
    if (totalLabel && columnIndex >= 1 && columnIndex <= 3) return { ...cell, v: "" };
    return cell;
  });
};

export default function Home() {
  const columns = layout.columnWidths as number[];
  const rows = layout.rowHeights as number[];
  const images = layout.images as Record<string, string>;
  const allRows = sheet.data as Cell[][];
  const lastUsedRow = allRows.reduce(
    (last, row, rowIndex) =>
      row.some((cell) => String(cell.v ?? "").trim() !== "") || images[String(rowIndex)] ? rowIndex : last,
    -1,
  );
  const usedRows = allRows.slice(0, lastUsedRow + 1);
  const headerRowIndex = usedRows.findIndex(isHeaderRow);
  const renderRows = [
    ...(headerRowIndex >= 0
      ? [{ cells: usedRows[headerRowIndex], sourceRowIndex: headerRowIndex, isHeader: true }]
      : []),
    ...usedRows.flatMap((cells, sourceRowIndex) =>
      isHeaderRow(cells) ? [] : [{ cells, sourceRowIndex, isHeader: false }],
    ),
  ].map((row) => ({ ...row, cells: prepareRow(row.cells, row.isHeader) }));
  const gridStyle = {
    gridTemplateColumns: columns.map((width) => `${width}px`).join(" "),
  } satisfies CSSProperties;

  return (
    <main className="workbook-shell">
      <section className="sheet-viewport" aria-label={`${sheet.tab} spreadsheet`}>
        <div
          className="sheet-grid"
          style={gridStyle}
          role="table"
          aria-rowcount={renderRows.length}
          aria-colcount={sheet.cols}
        >
          {renderRows.map(({ cells: row, sourceRowIndex, isHeader }) => (
            <div className="sheet-row" role="row" key={`row-${sourceRowIndex}`}>
              {row.map((cell, columnIndex) => {
                const image = columnIndex === 0 ? images[String(sourceRowIndex)] : undefined;
                const backgroundColor = rgb(cell.bg, "#fff");
                const cellStyle = {
                  height: rows[sourceRowIndex],
                  width: columns[columnIndex],
                  backgroundColor,
                  color: rgb(cell.fg, "#111"),
                  fontSize: `${cell.fs ?? 9}px`,
                  fontWeight: cell.b ? 700 : 400,
                  fontStyle: cell.it ? "italic" : "normal",
                  textDecoration: cell.u ? "underline" : "none",
                  justifyContent: align(cell.h),
                  alignItems: verticalAlign(cell.va),
                  textAlign: textAlign(cell.h),
                  whiteSpace: cell.w === "WRAP" ? "pre-line" : "pre",
                } satisfies CSSProperties;
                return (
                  <div
                    className={`sheet-cell${isHeader ? " header-cell" : ""}${columnIndex === 0 ? " frozen-cell" : ""}`}
                    key={`${sourceRowIndex}-${columnIndex}`}
                    style={cellStyle}
                    role={isHeader ? "columnheader" : "cell"}
                    title={cell.v || undefined}
                  >
                    {image ? (
                      <img
                        className="product-image"
                        src={image}
                        alt={row[1]?.v ? `${row[1].v} product` : "Product"}
                        loading="lazy"
                      />
                    ) : (
                      <span className="cell-value">{cell.v ?? ""}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
