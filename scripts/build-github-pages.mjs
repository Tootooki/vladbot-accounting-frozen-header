import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = path.join(root, "docs");
fs.mkdirSync(docs, { recursive: true });
fs.cpSync(path.join(root, "public", "product-images"), path.join(docs, "product-images"), { recursive: true });
fs.copyFileSync(path.join(root, "public", "og.png"), path.join(docs, "og.png"));
fs.copyFileSync(path.join(root, "app", "sheet-data.json"), path.join(docs, "sheet-data.json"));
fs.copyFileSync(path.join(root, "app", "sheet-layout.json"), path.join(docs, "sheet-layout.json"));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>ACCOUNTING_ALL_PERIODS_V2 — Frozen Header</title>
  <meta name="description" content="Public read-only VLADBOT accounting view with one frozen header.">
  <meta property="og:title" content="ACCOUNTING_ALL_PERIODS_V2 — Frozen Header">
  <meta property="og:description" content="VLADBOT accounting sheet with one frozen header">
  <meta property="og:type" content="website">
  <meta property="og:image" content="og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#188038">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="workbook-shell">
    <section id="sheet" class="sheet-viewport" aria-label="ACCOUNTING_ALL_PERIODS_V2 spreadsheet">
      <div class="loading">Loading ACCOUNTING_ALL_PERIODS_V2…</div>
    </section>
  </main>
  <script src="app.js?v=2" defer></script>
</body>
</html>
`;

const css = `*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}.workbook-shell{width:100vw;height:100dvh}.sheet-viewport{width:100%;height:100dvh;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-color:#a9adb3 #f1f3f4}.sheet-grid{display:grid;grid-auto-flow:row;width:max-content;min-width:100%;background:#fff}.sheet-row{display:contents}.sheet-cell{position:relative;display:flex;min-width:0;padding:2px 3px;line-height:1.08;overflow:hidden;font-family:Arial,Helvetica,sans-serif;font-variant-numeric:tabular-nums}.sheet-cell.frozen-cell{position:sticky;left:0;z-index:3;box-shadow:1px 0 0 rgba(95,99,104,.26)}.sheet-cell.header-cell{position:sticky;top:0;z-index:4;box-shadow:0 1px 0 rgba(95,99,104,.3)}.sheet-cell.header-cell.frozen-cell{z-index:5}.cell-value{width:100%;max-width:100%;overflow:hidden}.product-image{display:block;width:100%;height:100%;object-fit:contain;background:#fff}.loading{padding:24px;color:#5f6368;font-size:14px}`;

const javascript = `const rgb=(c,f)=>c?'rgb('+c[0]+' '+c[1]+' '+c[2]+')':f;const align=v=>v==='LEFT'?'flex-start':v==='RIGHT'?'flex-end':'center';const valign=v=>v==='TOP'?'flex-start':v==='BOTTOM'?'flex-end':'center';const textalign=v=>v==='LEFT'?'left':v==='RIGHT'?'right':'center';const isHeaderRow=row=>row[0]&&row[0].v==='IMG'&&row[1]&&row[1].v==='SKU'&&row[2]&&row[2].v==='PRICE'&&row[3]&&row[3].v==='COG';const prepareRow=(row,isHeader)=>{const totalCell=row.slice(0,4).find(cell=>cell.v&&cell.v.endsWith('_TOTALS')),totalLabel=totalCell&&totalCell.v;return row.map((cell,ci)=>{if(isHeader&&ci===0)return{...cell,v:''};if(totalLabel&&ci===0)return{...cell,v:totalLabel,fs:7,h:'CENTER',va:'MIDDLE'};if(totalLabel&&ci>=1&&ci<=3)return{...cell,v:''};return cell})};Promise.all([fetch('sheet-data.json').then(r=>r.json()),fetch('sheet-layout.json').then(r=>r.json())]).then(([sheet,layout])=>{const columns=layout.columnWidths,rows=layout.rowHeights,images=layout.images,lastUsedRow=sheet.data.reduce((last,row,ri)=>row.some(cell=>String(cell.v||'').trim()!=='')||images[String(ri)]?ri:last,-1),usedRows=sheet.data.slice(0,lastUsedRow+1),headerRowIndex=usedRows.findIndex(isHeaderRow),renderRows=[...(headerRowIndex>=0?[{row:usedRows[headerRowIndex],sourceRowIndex:headerRowIndex,isHeader:true}]:[]),...usedRows.flatMap((row,sourceRowIndex)=>isHeaderRow(row)?[]:[{row,sourceRowIndex,isHeader:false}])].map(entry=>({...entry,row:prepareRow(entry.row,entry.isHeader)})),grid=document.createElement('div');grid.className='sheet-grid';grid.setAttribute('role','table');grid.setAttribute('aria-rowcount',renderRows.length);grid.setAttribute('aria-colcount',sheet.cols);grid.style.gridTemplateColumns=columns.map(w=>w+'px').join(' ');renderRows.forEach(({row,sourceRowIndex,isHeader})=>{row.forEach((cell,ci)=>{const el=document.createElement('div');el.className='sheet-cell'+(isHeader?' header-cell':'')+(ci===0?' frozen-cell':'');el.setAttribute('role',isHeader?'columnheader':'cell');Object.assign(el.style,{height:rows[sourceRowIndex]+'px',width:columns[ci]+'px',backgroundColor:rgb(cell.bg,'#fff'),color:rgb(cell.fg,'#111'),fontSize:(cell.fs||9)+'px',fontWeight:cell.b?'700':'400',fontStyle:cell.it?'italic':'normal',textDecoration:cell.u?'underline':'none',justifyContent:align(cell.h),alignItems:valign(cell.va),textAlign:textalign(cell.h),whiteSpace:cell.w==='WRAP'?'pre-line':'pre'});if(cell.v)el.title=cell.v;const image=ci===0&&images[String(sourceRowIndex)];if(image){const img=document.createElement('img');img.className='product-image';img.src=image.startsWith('/')?image.slice(1):image;img.alt=(row[1]&&row[1].v?row[1].v:'Product')+' product';img.loading='lazy';el.append(img)}else{const span=document.createElement('span');span.className='cell-value';span.textContent=cell.v||'';el.append(span)}grid.append(el)})});const mount=document.getElementById('sheet');mount.replaceChildren(grid)}).catch(error=>{document.querySelector('.loading').textContent='Unable to load the accounting sheet.';console.error(error)});`;

fs.writeFileSync(path.join(docs, "index.html"), html);
fs.writeFileSync(path.join(docs, "styles.css"), css);
fs.writeFileSync(path.join(docs, "app.js"), javascript);
fs.writeFileSync(path.join(docs, ".nojekyll"), "");
console.log(JSON.stringify({ output: docs, files: fs.readdirSync(docs).length }));
