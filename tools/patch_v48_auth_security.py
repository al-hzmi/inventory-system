from pathlib import Path

EMPLOYEE_FILES = [Path('index.html'), Path('customer.html')]
ADMIN_FILES = [Path('admin-dashboard.html'), Path('control-center.html'), Path('command-center.html')]

OLD = "html=html.replace('</body>','<script src=\"./v44-observability.js?v=44.0\"></scr'+'ipt></body>');"
NEW = "html=html.replace('</body>','<script src=\"./v44-observability.js?v=44.0\"></scr'+'ipt><script src=\"./v48-auth-security.js?v=48.0\"></scr'+'ipt></body>');"
ADMIN_TAG = '<script src="./v48-admin-security.js?v=48.0"></script>'


def patch_employee(path: Path):
    text = path.read_text(encoding='utf-8')
    if 'v48-auth-security.js?v=48.0' in text:
        return False
    if OLD not in text:
        raise SystemExit(f'V48 employee injection marker missing: {path}')
    path.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')
    return True


def patch_admin(path: Path):
    text = path.read_text(encoding='utf-8')
    if 'v48-admin-security.js?v=48.0' in text:
        return False
    if '</body>' not in text:
        raise SystemExit(f'V48 admin body marker missing: {path}')
    path.write_text(text.replace('</body>', ADMIN_TAG + '\n</body>', 1), encoding='utf-8')
    return True


def main():
    changed = []
    for p in EMPLOYEE_FILES:
        if patch_employee(p): changed.append(str(p))
    for p in ADMIN_FILES:
        if patch_admin(p): changed.append(str(p))
    for p in EMPLOYEE_FILES:
        t = p.read_text(encoding='utf-8')
        if t.count('v48-auth-security.js?v=48.0') != 1:
            raise SystemExit(f'V48 employee injection duplicate/missing: {p}')
    for p in ADMIN_FILES:
        t = p.read_text(encoding='utf-8')
        if t.count('v48-admin-security.js?v=48.0') != 1:
            raise SystemExit(f'V48 admin injection duplicate/missing: {p}')
    print('V48_PATCH_OK', ','.join(changed) if changed else 'already-applied')


if __name__ == '__main__':
    main()
