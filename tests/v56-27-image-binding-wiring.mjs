import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync('runtime/index-v37-source.txt','utf8');
const index = fs.readFileSync('index.html','utf8');
const images = fs.readFileSync('data/images_list.txt','utf8');
const jeddah = fs.readFileSync('data/jeddah.tsv','utf8');
const riyadh = fs.readFileSync('data/riyadh.tsv','utf8');
const inventory = jeddah + '\n' + riyadh;

assert.match(inventory, /^BA_209\t/m, 'fixture must contain BA_209');
assert.match(inventory, /^AR_M209\t/m, 'fixture must contain AR_M209');
assert.match(images, /^BA_209\t209\.webp$/m, '209 image must be declared for BA_209 by exact SKU');
assert.doesNotMatch(images, /^AR_M209\t209\.webp$/m, '209 image must not be declared for AR_M209');

assert.ok(runtime.includes("const normalizeImageSku = raw =>"), 'exact SKU image identity missing');
assert.ok(runtime.includes("if (owners.size !== 1) return '';"), 'ambiguous numeric fallback guard missing');
assert.ok(runtime.includes("const exact = imagesMap.exact?.get(sku);\n    if (exact) return exact;"), 'exact SKU match must win before legacy numeric fallback');

const modalSig = "const AdminDashboardModal = memo(({ onClose, catalogItems, imageCatalogItems, imagesList, rawImagesList, imageBindingOverrides, onImageBindingsChanged, categories";
assert.ok(runtime.includes(modalSig), 'AdminDashboardModal must receive all image-binding state as props');
assert.ok(runtime.includes('onBindingsChanged={onImageBindingsChanged}'), 'image manager must call the App-owned binding callback');
assert.ok(runtime.includes('imageCatalogItems={imageCatalogItems}'), 'App must pass the full-SKU catalog into image manager');
assert.ok(runtime.includes('rawImagesList={rawImagesList}'), 'App must pass raw image keys into image manager');
assert.ok(runtime.includes('imageBindingOverrides={imageBindingOverrides}'), 'App must pass current exact-SKU bindings into image manager');
assert.ok(runtime.includes('onImageBindingsChanged={(next)=>{ setImageBindingOverrides(next); setImagesList(buildResolvedImagesMap(rawImagesList, databases, next)); }}'), 'App must rebuild resolved images after a manual correction');

const modalStart = runtime.indexOf('const AdminDashboardModal = memo');
const modalEnd = runtime.indexOf('const App = () =>', modalStart);
const modal = runtime.slice(modalStart, modalEnd);
assert.ok(!modal.includes('setImageBindingOverrides(next)'), 'AdminDashboardModal must not reach into App setters directly');
assert.ok(!modal.includes('buildResolvedImagesMap(rawImagesList, databases, next)'), 'AdminDashboardModal must not depend on undefined App databases');

assert.ok(index.includes('index-v37-source.txt?v=56.16&rev=56.27'), 'V56.27 cache bust missing');
console.log('V56.27 exact-SKU image binding + admin wiring regression: PASS');
