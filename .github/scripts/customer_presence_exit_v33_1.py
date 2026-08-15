from pathlib import Path
p=Path('admin-dashboard.html')
t=p.read_text(encoding='utf-8')

old="  const registeredVisitorIds=new Set(customers.map(c=>c.visitorId).filter(Boolean));\n  const customerOnline=new Set([...cSessions.filter(s=>s.customerUid&&online(s.lastActive||s.updatedAt)).map(s=>s.customerUid),...customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt)).map(c=>c.id)].filter(Boolean));\n  const guestOnlineVisitors=new Set(cSessions.filter(s=>!s.customerUid&&s.visitorId&&!registeredVisitorIds.has(s.visitorId)&&online(s.lastActive||s.updatedAt)).map(s=>s.visitorId));\n  const customerOnlineCount=customerOnline.size+guestOnlineVisitors.size;"
new="  const registeredVisitorIds=new Set(customers.map(c=>c.visitorId).filter(Boolean));\n  const customerSessionOnline=s=>!['guest_exit','logout'].includes(String(s?.event||''))&&online(s?.lastActive||s?.updatedAt);\n  const customerProfileOnline=c=>String(c?.lastSessionEvent||'')!=='logout'&&online(c?.lastSeenAt||c?.lastActivityAt);\n  const customerOnline=new Set([...cSessions.filter(s=>s.customerUid&&customerSessionOnline(s)).map(s=>s.customerUid),...customers.filter(customerProfileOnline).map(c=>c.id)].filter(Boolean));\n  const guestOnlineVisitors=new Set(cSessions.filter(s=>!s.customerUid&&s.visitorId&&!registeredVisitorIds.has(s.visitorId)&&customerSessionOnline(s)).map(s=>s.visitorId));\n  const customerOnlineCount=customerOnline.size+guestOnlineVisitors.size;"
if old not in t: raise SystemExit('online block marker missing')
t=t.replace(old,new,1)

t=t.replace("const exitEvents=presence.filter(s=>!online(s.lastActive||s.updatedAt)).map", "const exitEvents=presence.filter(s=>!customerSessionOnline(s)).map",1)
t=t.replace("on=online(s.lastActive||s.updatedAt),isGuest=!s.customerUid", "on=customerSessionOnline(s),isGuest=!s.customerUid",1)
t=t.replace("status={online(r.lastActive||r.updatedAt)?'متصل':'مغادر'} statusTone={online(r.lastActive||r.updatedAt)?'ok':'neutral'}", "status={customerSessionOnline(r)?'متصل':'مغادر'} statusTone={customerSessionOnline(r)?'ok':'neutral'}",1)

if 'customerSessionOnline' not in t or "event||''" not in t: raise SystemExit('presence helper missing')
p.write_text(t,encoding='utf-8')
print('Immediate/stale exit presence logic patched.')
