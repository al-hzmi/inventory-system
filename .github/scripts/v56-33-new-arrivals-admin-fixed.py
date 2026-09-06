from pathlib import Path

root = Path('.')
source_path = root / '.github/scripts/v56-33-new-arrivals-admin.py'
source = source_path.read_text(encoding='utf-8')

replacements = [
    (
        "employee_files = ['runtime/index-v37-source.txt', 'index.html']",
        "employee_files = ['runtime/index-v37-source.txt']",
        'employee targets'
    ),
    (
        "customer_files = ['runtime/customer-v37-source.txt', 'customer.html']",
        "customer_files = ['runtime/customer-v37-source.txt']",
        'customer targets'
    ),
    (
        "assert.ok(index.includes('NewArrivalsAdminPanel'));",
        "assert.ok(index.includes(\"runtime/index-v37-source.txt?v=56.16&rev=56.33\"));",
        'employee boot regression'
    ),
    (
        "assert.ok(customerHtml.includes('loadCustomerNewArrivalOverrides'));",
        "assert.ok(customerHtml.includes(\"runtime/customer-v37-source.txt?v=56.33\"));",
        'customer boot regression'
    ),
]

for old, new, label in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one source match, found {count}')
    source = source.replace(old, new, 1)

# Execute the canonical feature patch with corrected source/runtime targets.
exec(compile(source, str(source_path), 'exec'), {'__name__': '__main__'})

# index.html and customer.html are bootloaders. They must only receive a cache-bust
# so browsers fetch the new runtime; application JSX lives in runtime/*.txt.
def replace_once(path, old, new, label):
    p = root / path
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'index.html',
    "const CORE='./runtime/index-v37-source.txt?v=56.16&rev=56.27';",
    "const CORE='./runtime/index-v37-source.txt?v=56.16&rev=56.33';",
    'employee runtime cache bust'
)
replace_once(
    'customer.html',
    "const CORE='./runtime/customer-v37-source.txt?v=56.25';",
    "const CORE='./runtime/customer-v37-source.txt?v=56.33';",
    'customer runtime cache bust'
)

print('V56.33 fixed patch targets applied')
