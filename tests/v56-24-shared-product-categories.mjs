import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('admin-dashboard.html','utf8');
const employee=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const customer=fs.readFileSync('runtime/customer-v37-source.txt','utf8');

assert.ok(admin.includes("const PRODUCT_CATEGORY_META='catalog_categories'"),'admin category manager must use catalog_categories');
assert.ok(admin.includes("const PRODUCT_CATEGORY_AUDIT='category_audit_logs'"),'admin category manager must audit category creation');
assert.ok(admin.includes("const productCategoryDocId=name=>'cat_'+toSafeDocId(normalizeText(name).replace(/\\s+/g,'_'))"),'admin must use the same deterministic category document id as employee UI');
assert.ok(admin.includes('function ProductCategoryManager({onClose}){'),'admin dashboard must expose category manager');
assert.ok(admin.includes("db.collection(PRODUCT_CATEGORY_META).doc(productCategoryDocId(clean)).set({name:clean,archived:false"),'new category must be active in shared metadata');
assert.ok(admin.includes("action:'create-category',category:clean"),'new category must write shared audit log');
assert.ok(admin.includes('أي قسم تضيفه هنا يظهر تلقائيًا للموظفين والعملاء.'),'admin UI must explain shared propagation');
assert.ok(admin.includes('فتح إدارة الأقسام ←'),'admin home must expose category manager');
assert.ok(admin.includes('categoryManagerOpen&&<ProductCategoryManager'),'admin must render category manager');
assert.ok(employee.includes("META: 'catalog_categories'"),'employee UI must consume shared category metadata');
assert.ok(employee.includes("if (meta && meta.name && !meta.archived && !result[meta.name]) result[meta.name] = []"),'employee UI must surface active metadata categories even when empty');
assert.ok(customer.includes("const CATEGORY_META = 'catalog_categories'"),'customer UI must consume shared category metadata');
assert.ok(customer.includes("else if(m?.name)out[m.name]=out[m.name]||[]"),'customer UI must surface active metadata categories even when empty');
assert.ok(admin.includes('useBodyScrollLock(Boolean(row));'),'shared category work must not regress the V56.22 page-scroll fix');
console.log('V56.24 shared product categories regression: OK');
