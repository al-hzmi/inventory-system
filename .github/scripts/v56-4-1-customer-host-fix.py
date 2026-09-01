from pathlib import Path

path=Path('runtime/customer-v37-source.txt')
s=path.read_text()
start="const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';\nfunction CustomerAdminNotificationHost(){"
portal="function CustomerPortalBootstrap(){"
mount="ReactDOM.createRoot(document.getElementById('root')).render("
a=s.find(start)
b=s.find(portal,a)
if a<0 or b<0:
    raise SystemExit('customer notification host block anchors not found')
block=s[a:b].rstrip()+"\n\n"
without=s[:a]+s[b:]
m=without.find(mount)
if m<0:
    raise SystemExit('customer root mount not found')
# Keep the notification host outside the V42_ROOT replacement range, which ends at CustomerPortalBootstrap.
fixed=without[:m]+block+without[m:]
if not (fixed.find(portal) < fixed.find(start) < fixed.find(mount)):
    raise SystemExit('customer notification host relocation invariant failed')
path.write_text(fixed)

# Strengthen V56.4 regression against the dynamic V42 bootstrap deletion boundary.
test=Path('tests/v56-4-messaging.mjs')
t=test.read_text()
anchor="assert.ok(cust.includes('<CustomerPortalBootstrap/><CustomerAdminNotificationHost/>'),'customer notification host must be mounted');"
addition=anchor+"\nassert.ok(cust.indexOf('function CustomerPortalBootstrap(){') < cust.indexOf(\"const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';\") && cust.indexOf(\"const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';\") < cust.indexOf(\"ReactDOM.createRoot(document.getElementById('root')).render\"),'customer notification host must live after the V42 bootstrap replacement boundary');"
if t.count(anchor)!=1:
    raise SystemExit(f'expected one messaging regression mount anchor, found {t.count(anchor)}')
test.write_text(t.replace(anchor,addition,1))
print('V56.4.1 customer notification host relocated')
