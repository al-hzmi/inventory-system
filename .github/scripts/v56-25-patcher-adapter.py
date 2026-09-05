#!/usr/bin/env python3
from pathlib import Path

p = Path('.github/scripts/v56-25-image-binding.py')
s = p.read_text(encoding='utf-8')

old_tab = "{ id: 'product_categories', label: 'تصنيف المنتجات', icon: Icon.Grid },"
real_tab = "{ id: 'product_categories', label: 'إدارة الأقسام' },"
if old_tab not in s:
    raise SystemExit('V56.25 adapter: old admin-tab anchor missing')
s = s.replace(old_tab, real_tab, 1)

needle = "for pat in [r'imagesList\\.get\\([^\\n)]*cleanId', r'imagesList\\.has\\([^\\n)]*cleanId']:\n"
if needle not in s:
    raise SystemExit('V56.25 adapter: safety gate anchor missing')
extra = '''# Dedicated image manager is local UI; do not query a Firestore collection named product_images.\nruntime = runtime.replace("if (activeTab === 'product_categories') {", "if (['product_categories','product_images'].includes(activeTab)) {", 1)\n\n# Convert every remaining direct numeric image lookup to the collision-safe item resolver.\n# Supports simple variables and nested references such as search.exact.cleanId.\n# This intentionally affects image access only; cleanId remains numeric for pricing/categories/cart logic.\nitem_expr = r'([A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)*)'\nruntime = re.sub(r'imagesList\\.get\\(' + item_expr + r'\\.cleanId\\)', r'imageForItem(imagesList, \\1)', runtime)\nruntime = re.sub(r'imagesList\\.has\\(' + item_expr + r'\\.cleanId\\)', r'hasImageForItem(imagesList, \\1)', runtime)\n\n'''
s = s.replace(needle, extra + needle, 1)

write_anchor = "RUNTIME.write_text(runtime, encoding='utf-8')\nINDEX.write_text(index, encoding='utf-8')\n"
if write_anchor not in s:
    raise SystemExit('V56.25 adapter: write anchor missing')
manifest_block = '''IMAGES = Path('data/images_list.txt')\nimages_manifest = IMAGES.read_text(encoding='utf-8')\nlegacy_line = '209\\t209.webp'\ncanonical_line = 'BA_209\\t209.webp'\nif canonical_line not in images_manifest:\n    if legacy_line not in images_manifest:\n        raise SystemExit('V56.25 manifest anchor 209.webp not found')\n    images_manifest = images_manifest.replace(legacy_line, canonical_line, 1)\nIMAGES.write_text(images_manifest, encoding='utf-8')\n\n'''
s = s.replace(write_anchor, manifest_block + write_anchor, 1)

p.write_text(s, encoding='utf-8')
print('V56.25 patcher adapted to current admin runtime')
