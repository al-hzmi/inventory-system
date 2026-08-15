from pathlib import Path

p=Path('admin-dashboard.html')
t=p.read_text(encoding='utf-8')

# Repair the V33 online-count block and make explicit exit/logout events immediately offline.
start=t.find('  const registeredVisitorIds=new Set(')
end=t.find('  const employeeOnline=', start)
if start < 0 or end < 0:
    raise SystemExit('customer online block boundaries missing')
new_block="""  const registeredVisitorIds=new Set(customers.map(c=>c.visitorId).filter(Boolean));
  const customerSessionOnline=s=>!['guest_exit','logout'].includes(String(s?.event||''))&&online(s?.lastActive||s?.updatedAt);
  const customerProfileOnline=c=>String(c?.lastSessionEvent||'')!=='logout'&&online(c?.lastSeenAt||c?.lastActivityAt);
  const customerOnline=new Set([...cSessions.filter(s=>s.customerUid&&customerSessionOnline(s)).map(s=>s.customerUid),...customers.filter(customerProfileOnline).map(c=>c.id)].filter(Boolean));
  const guestOnlineVisitors=new Set(cSessions.filter(s=>!s.customerUid&&s.visitorId&&!registeredVisitorIds.has(s.visitorId)&&customerSessionOnline(s)).map(s=>s.visitorId));
  const customerOnlineCount=customerOnline.size+guestOnlineVisitors.size;
"""
t=t[:start]+new_block+t[end:]

# Restrict replacements to CustomerLive only so employee presence logic remains untouched.
live_start=t.find('  function CustomerLive(){')
live_end=t.find('\n  function EmployeeOverview(){', live_start)
if live_start < 0 or live_end < 0:
    raise SystemExit('CustomerLive boundaries missing')
live=t[live_start:live_end]
live=live.replace("const exitEvents=presence.filter(s=>!online(s.lastActive||s.updatedAt)).map", "const exitEvents=presence.filter(s=>!customerSessionOnline(s)).map", 1)
live=live.replace("on=online(s.lastActive||s.updatedAt),isGuest=!s.customerUid", "on=customerSessionOnline(s),isGuest=!s.customerUid", 1)
if '!customerSessionOnline(s)).map' not in live or 'on=customerSessionOnline(s),isGuest' not in live:
    raise SystemExit('CustomerLive online replacements failed')
t=t[:live_start]+live+t[live_end:]

# Customer session history should use the same explicit exit semantics.
sess_start=t.find('  function CustomerSessions(){')
sess_end=t.find('\n  function CustomerPortal(){', sess_start)
if sess_start < 0 or sess_end < 0:
    raise SystemExit('CustomerSessions boundaries missing')
sess=t[sess_start:sess_end]
sess=sess.replace("online(r.lastActive||r.updatedAt)", "customerSessionOnline(r)")
if sess.count('customerSessionOnline(r)') < 3:
    raise SystemExit('CustomerSessions online replacements failed')
t=t[:sess_start]+sess+t[sess_end:]

# Critical runtime regression guard: self-reference from prior global replacement must never remain.
if 'const customerOnlineCount=customerOnlineCount+' in t:
    raise SystemExit('customerOnlineCount self-reference remains')
if 'const customerOnlineCount=customerOnline.size+guestOnlineVisitors.size;' not in t:
    raise SystemExit('correct customerOnlineCount expression missing')
if "!['guest_exit','logout'].includes" not in t:
    raise SystemExit('explicit exit semantics missing')

p.write_text(t,encoding='utf-8')
print('V33.1 retry applied: fixed online count and immediate recorded-exit semantics.')
