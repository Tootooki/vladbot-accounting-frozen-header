import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const unpacked = path.join(root, ".xlsx-unpacked", "xl");
const drawing = fs.readFileSync(path.join(unpacked, "drawings", "drawing1.xml"), "utf8");
const relationships = fs.readFileSync(path.join(unpacked, "drawings", "_rels", "drawing1.xml.rels"), "utf8");
const sheet = fs.readFileSync(path.join(unpacked, "worksheets", "sheet1.xml"), "utf8");
const imageDirectory = path.join(root, "public", "product-images");
fs.mkdirSync(imageDirectory, { recursive: true });

const relationshipMap = new Map();
for (const match of relationships.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="\.\.\/media\/([^"]+)"[^>]*\/>/g)) {
  relationshipMap.set(match[1], match[2]);
}

const images = {};
for (const match of drawing.matchAll(/<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g)) {
  const anchor = match[1];
  const row = Number(anchor.match(/<xdr:row>(\d+)<\/xdr:row>/)?.[1]);
  const relation = anchor.match(/r:embed="([^"]+)"/)?.[1];
  const file = relation && relationshipMap.get(relation);
  if (!Number.isInteger(row) || !file) continue;
  const source = path.join(unpacked, "media", file);
  const destination = path.join(imageDirectory, file);
  fs.copyFileSync(source, destination);
  images[row] = `/product-images/${file}`;
}

const defaultWidth = Number(sheet.match(/defaultColWidth="([\d.]+)"/)?.[1] || 12.63);
const defaultHeight = Number(sheet.match(/defaultRowHeight="([\d.]+)"/)?.[1] || 15.75);
const columns = Array.from({ length: 150 }, () => defaultWidth);
for (const match of sheet.matchAll(/<col\b([^>]*)\/>/g)) {
  const attrs = match[1];
  const min = Number(attrs.match(/\bmin="(\d+)"/)?.[1]);
  const max = Number(attrs.match(/\bmax="(\d+)"/)?.[1]);
  const width = Number(attrs.match(/\bwidth="([\d.]+)"/)?.[1]);
  if (!Number.isInteger(min) || !Number.isInteger(max) || !Number.isFinite(width)) continue;
  for (let index = min - 1; index < Math.min(max, columns.length); index += 1) columns[index] = width;
}
const rows = Array.from({ length: 78 }, () => defaultHeight);
for (const match of sheet.matchAll(/<row\b([^>]*)>/g)) {
  const attrs = match[1];
  const row = Number(attrs.match(/\br="(\d+)"/)?.[1]);
  const height = Number(attrs.match(/\bht="([\d.]+)"/)?.[1]);
  if (Number.isInteger(row) && Number.isFinite(height) && row <= rows.length) rows[row - 1] = height;
}

const result = {
  columnWidths: columns.map(width => Math.max(44, Math.round(width * 7 + 5))),
  rowHeights: rows.map(height => Math.max(20, Math.round(height * 96 / 72))),
  images,
};
fs.writeFileSync(path.join(root, "app", "sheet-layout.json"), `${JSON.stringify(result)}\n`);
console.log(JSON.stringify({ images: Object.keys(images).length, columns: columns.length, rows: rows.length }));
