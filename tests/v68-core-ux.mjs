import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse} from '@babel/parser';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('runtime/index-v37-source.txt');
const start=html.indexOf('<script type="text/babel"');
assert.ok(start>=0,'Expected the original inline React/Babel application');
const scriptStart=html.indexOf('>',start)+1;
const scriptEnd=html.indexOf('</script>',scriptStart);
assert.ok(scriptStart>start&&scriptEnd>scriptStart,'React script delimiters should remain intact');
const src=html.slice(scriptStart,scriptEnd);
parse(src,{sourceType:'script',plugins:['jsx']});

const card=src.slice(src.indexOf('const PilotFavoriteButton = memo('),src.indexOf('const FullResultCard = memo('));
assert.ok(card.includes("e.preventDefault();e.stopPropagation();"),'Favorites cannot open the parent card');
assert.ok(card.includes("window.addEventListener('batco61:favorites-changed'"),'All cards must update saved status in the same session');
assert.ok(card.includes('aria-pressed={saved}'),'The saved/unsaved state must be exposed accessibly');
assert.ok(card.includes('return null;'),'Favorite is absent for non-pilot employees');
assert.equal((src.match(/<PilotFavoriteButton item=\{item\}/g)||[]).length,4,'Both search card formats and both gallery faces must have a direct favorite button');
assert.equal((src.match(/warehouse=\{warehouse\}/g)||[]).length>=7,true,'Search and gallery cards must receive exact warehouse ID');
assert.ok(src.includes('if(!warehouse){setImageWarehouseNotice(true);return;}'),'Switch must explain an unselected warehouse');
assert.ok(src.includes('role="status" aria-live="polite" className="batco-image-warehouse-toast"'),'Warehouse notice must be announced to assistive tech');
assert.ok(!src.includes('disabled={!warehouse} />'),'Search photos must be clickable even before a warehouse is chosen');
assert.ok(src.includes('صور نتائج البحث</span>'),'One-line switch wording must explain images appear in search results');

console.log('V68_CORE_JSX_PASS: native React JSX parsed, search and gallery direct favorites, warehouse tip, accessibility');
