/* V112 — PDF stock report import. Only trusted SKU and quantity columns leave the device. */
(function (host) {
  'use strict';
  const SKU = /[A-Z]{1,10}[_-][A-Z0-9][A-Z0-9_./-]{1,79}/g;
  const PDF_JS = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
  ];
  const LRM = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;
  function clean(input) {
    return String(input == null ? '' : input).normalize('NFKC').replace(LRM, '')
      .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0))
      .replace(/\u066b/g, '.').replace(/\u066c/g, ',').trim();
  }
  function quantity(text) {
    const value = clean(text).replace(/\s+/g, '');
    if (!/^(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)$/.test(value)) return null;
    const number = Number(value.replace(/,/g, ''));
    return Number.isFinite(number) && number >= 0 ? String(number) : null;
  }
  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  }
  function textLines(items) {
    const sorted = items.filter(item => item && clean(item.str)).map(item => ({
      str: clean(item.str), x: Number(item.transform && item.transform[4]),
      y: Number(item.transform && item.transform[5]), width: Number(item.width || 0),
      height: Number(item.height || 0)
    })).filter(item => Number.isFinite(item.x) && Number.isFinite(item.y))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const item of sorted) {
      const last = lines[lines.length - 1];
      const tolerance = Math.max(2.5, Math.min(5, item.height * 0.4 || 3));
      if (!last || Math.abs(last.y - item.y) > tolerance) lines.push({ y: item.y, items: [item] });
      else last.items.push(item);
    }
    return lines;
  }
  function extractPage(page, pageIndex) {
    const width = Number(page.width || 0);
    const candidates = [];
    for (const line of textLines(page.items || [])) {
      const cells = line.items.slice().sort((a, b) => a.x - b.x);
      let match = null, skuCell = null;
      for (const cell of cells) {
        const found = cell.str.toUpperCase().match(SKU);
        if (found) {
          if (!skuCell || cell.x > skuCell.x) { skuCell = cell; match = found[0]; }
        }
      }
      // Some PDF printers split Latin SKU text into adjacent fragments.
      if (!match) {
        const right = cells.slice().sort((a, b) => b.x - a.x).slice(0,4);
        for (let i = 0; i < right.length && !match; i++) for (let j = i + 1; j < right.length && !match; j++) {
          const a = right[i], b = right[j];
          if (Math.abs(a.x - b.x) > 85) continue;
          for (const joined of [a.str + b.str, b.str + a.str]) {
            const found = joined.toUpperCase().match(SKU);
            if (found) { match = found[0]; skuCell = {x: Math.min(a.x,b.x),str: joined}; break; }
          }
        }
      }
      if (!match || !skuCell || (width && skuCell.x < width * .55)) continue;
      if (!/^[A-Z0-9][A-Z0-9_.\/-]{0,79}$/.test(match)) continue;
      const suffix = skuCell.str.toUpperCase().slice(skuCell.str.toUpperCase().indexOf(match) + match.length);
      if (/^\s+\d/.test(suffix)) throw Error('صفحة ' + pageIndex + ': رقم الصنف ' + match + ' يحتوي لاحقة رقمية غير واضحة. استخدم PDF نصيًا أو راجع التقرير.');
      const nums = cells.filter(cell => cell.x < skuCell.x - 8).map(cell => ({
        x: cell.x, value: quantity(cell.str)
      })).filter(item => item.value !== null).sort((a,b) => a.x-b.x);
      candidates.push({sku:match,nums});
    }
    if (!candidates.length) return [];
    const paired = candidates.filter(row => row.nums.length >= 2);
    if (!paired.length) throw Error('صفحة ' + pageIndex + ': لم أستطع تمييز عمود الكمية عن الشد بشكل موثوق.');
    const anchor = median(paired.map(row => row.nums[0].x));
    const gap = median(paired.map(row => row.nums[1].x - row.nums[0].x));
    const tolerance = Math.max(12, Math.min(48, gap * .35));
    const found = [];
    for (const row of candidates) {
      const aligned = row.nums.filter(n => Math.abs(n.x - anchor) <= tolerance);
      if (aligned.length !== 1) throw Error('صفحة ' + pageIndex + ': كمية الصنف ' + row.sku + ' غير واضحة، لن تُستورد أرقام محتملة.');
      found.push({sku:row.sku,quantity:aligned[0].value});
    }
    return found;
  }
  function parseTextPages(pages) {
    if (!Array.isArray(pages) || !pages.length) throw Error('ملف PDF فارغ.');
    const rows = new Map();
    pages.forEach((page, index) => {
      const items = page && page.items || [];
      if (items.length < 3) throw Error('صفحة ' + (index+1) + ' لا تحتوي نصًا يمكن استخراجه. ملفات PDF المصورة تحتاج نسخة نصية أصلية.');
      for (const row of extractPage(page,index+1)) {
        if (rows.has(row.sku)) throw Error('رقم الصنف ' + row.sku + ' مكرر في PDF؛ راجع التقرير قبل الاستيراد.');
        rows.set(row.sku,row.quantity);
      }
    });
    if (!rows.size) throw Error('لم أجد جدول الأصناف في PDF. المطلوب تقرير يحتوي رقم الصنف والشد والكمية المتوفرة.');
    if (rows.size > 10000) throw Error('تجاوز التقرير الحد الأقصى (10000 صنف).');
    return {text:'رقم الصنف\tالكمية المتوفرة\n' +
      Array.from(rows, ([sku,value]) => sku+'\t'+value).join('\n')+'\n',rows:rows.size,pages:pages.length};
  }
  let loadingLibrary = null;
  function loadPdfJs() {
    if (host.pdfjsLib && host.pdfjsLib.getDocument) return Promise.resolve(host.pdfjsLib);
    if (loadingLibrary) return loadingLibrary;
    loadingLibrary = (async () => {
      for (const url of PDF_JS) {
        try {
          await new Promise((resolve,reject) => {
            const script = document.createElement('script');
            script.src=url;script.async=true;
            script.onload=resolve;script.onerror=()=>reject(Error('تعذر تحميل PDF.js'));
            document.head.appendChild(script);
          });
          if (host.pdfjsLib && host.pdfjsLib.getDocument) {
            host.pdfjsLib.GlobalWorkerOptions.workerSrc = url.replace(/pdf\.min\.js$/, 'pdf.worker.min.js');
            return host.pdfjsLib;
          }
        } catch (_) {}
      }
      throw Error('تعذر تحميل قارئ PDF. تأكد من الاتصال بالإنترنت وأعد المحاولة.');
    })().catch(error=>{loadingLibrary=null;throw error});
    return loadingLibrary;
  }
  async function readFile(file, onProgress) {
    if (!file || !file.arrayBuffer) throw Error('اختر ملف PDF صالحًا.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0,5)) !== '%PDF-')
      throw Error('هذا الملف ليس PDF صالحًا.');
    const lib = await loadPdfJs();
    let doc;
    try {
      doc = await lib.getDocument({data:bytes,isEvalSupported:false}).promise;
      if (!doc.numPages || doc.numPages > 160) throw Error('تقرير PDF يتجاوز 160 صفحة؛ قسم التقرير إلى ملفات أصغر.');
      const pages = [];
      for (let p=1;p<=doc.numPages;p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent({disableCombineTextItems:false});
        pages.push({width:page.view[2]-page.view[0],items:content.items});
        if (typeof onProgress === 'function') onProgress(p,doc.numPages);
        page.cleanup();
      }
      return parseTextPages(pages);
    } catch(error) {
      if (/password/i.test(String(error && error.message || ''))) throw Error('ملف PDF محمي بكلمة مرور؛ استخدم نسخة غير محمية.');
      throw error;
    } finally {
      if (doc && doc.destroy) await doc.destroy();
    }
  }
  const api = {parseTextPages,readFile};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  host.BatcoPdfInventory=api;
})(typeof window !== 'undefined' ? window : globalThis);
