from pathlib import Path
# V56.15: preserve V56.14 durable legacy-message cutoff and reduce Firestore quota pressure.

def replace(path, old, new, label, expected=1):
    p=Path(path); s=p.read_text(encoding='utf-8'); n=s.count(old)
    if n!=expected: raise SystemExit(f'{label}: expected {expected}, found {n}')
    p.write_text(s.replace(old,new),encoding='utf-8')

admin='admin-dashboard.html'
emp='runtime/index-v37-source.txt'
cust='runtime/customer-v37-source.txt'
test='tests/v56-4-messaging.mjs'

old_limits="""const REALTIME_LIMIT={customerDevices:1200,customerActivity:1200,customerSessions:900,customerLogins:900,customerOrders:900,customerDrafts:900,customerSecurityPhotos:900,employeeNotifications:600,employeeSecurityPhotos:900,employeeLoginAttempts:1000,employeeSessions:1000,employeeLogins:1000,access:1000,search:1200,employeeOrders:1000,employeeDrafts:1000,categoryAudit:1000,adminAudit:1000};"""
new_limits="""const REALTIME_LIMIT={customers:350,customerDevices:180,customerSessions:160,customerLogins:100,customerActivity:140,customerOrders:300,customerDrafts:220,customerSecurityPhotos:80,employeeUsers:350,employeeAccounts:350,employeeAliases:350,employeeNotifications:120,employeeSecurityPhotos:80,employeeLoginAttempts:120,employeeSessions:180,employeeLogins:120,access:120,search:160,employeeOrders:300,employeeDrafts:220,categoryAudit:100,newArrivalReviews:120,adminAudit:120};
const REALTIME_KEYS=new Set(['customers','customerSessions','customerOrders','customerDrafts','employeeUsers','employeeAccounts','employeeNotifications','employeeSessions','employeeOrders','employeeDrafts','access']);"""
replace(admin,old_limits,new_limits,'dashboard limits')

old_attach="""    const attach=(key,name)=>{
      const limit=REALTIME_LIMIT[key]||900;let unsubscribe=null,usingFallback=false;
      const fallback=()=>{if(stopped||usingFallback)return;usingFallback=true;try{unsubscribe?.()}catch{};unsubscribe=db.collection(name).limit(limit).onSnapshot(s=>apply(key,name,s),e=>{console.warn('[Dashboard realtime fallback]',name,e);markReady(key)})};
      try{
        const field=REALTIME_ORDER[key];const q=field?db.collection(name).orderBy(field,'desc').limit(limit):db.collection(name).limit(limit);
        unsubscribe=q.onSnapshot(s=>apply(key,name,s),e=>{console.warn('[Dashboard realtime]',name,e);field?fallback():markReady(key)});
      }catch(e){fallback()}
      return()=>{try{unsubscribe?.()}catch{}}
    };"""
new_attach="""    const attach=(key,name)=>{
      const limit=REALTIME_LIMIT[key]||160;let unsubscribe=null,usingFallback=false;
      const field=REALTIME_ORDER[key];
      const ordered=()=>field?db.collection(name).orderBy(field,'desc').limit(limit):db.collection(name).limit(limit);
      const loadOnce=async()=>{try{const s=await ordered().get();apply(key,name,s)}catch(e){try{const s=await db.collection(name).limit(limit).get();apply(key,name,s)}catch(err){console.warn('[Dashboard snapshot]',name,err);markReady(key)}}};
      if(!REALTIME_KEYS.has(key)){loadOnce();return()=>{}};
      const fallback=()=>{if(stopped||usingFallback)return;usingFallback=true;try{unsubscribe?.()}catch{};unsubscribe=db.collection(name).limit(limit).onSnapshot(s=>apply(key,name,s),e=>{console.warn('[Dashboard realtime fallback]',name,e);markReady(key)})};
      try{unsubscribe=ordered().onSnapshot(s=>apply(key,name,s),e=>{console.warn('[Dashboard realtime]',name,e);field?fallback():markReady(key)})}catch(e){fallback()}
      return()=>{try{unsubscribe?.()}catch{}}
    };"""
replace(admin,old_attach,new_attach,'dashboard attach')

old_emp="""                    db.collection('site_sessions').doc(sessionId).set({
                        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                        durationMinutes: firebase.firestore.FieldValue.increment(1)
                    }, { merge: true }).catch(()=>{});
                    
                    db.collection('users').doc(toSafeDocId(sessionName)).set({
                        timeSpentMinutes: firebase.firestore.FieldValue.increment(1),
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(()=>{});
                });
            }
        }, 60000);"""
new_emp="""                    db.collection('site_sessions').doc(sessionId).set({
                        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                        durationMinutes: firebase.firestore.FieldValue.increment(5)
                    }, { merge: true }).catch(()=>{});
                    
                    db.collection('users').doc(toSafeDocId(sessionName)).set({
                        timeSpentMinutes: firebase.firestore.FieldValue.increment(5),
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(()=>{});
                });
            }
        }, 300000);"""
replace(emp,old_emp,new_emp,'employee heartbeat')
p=Path(emp); s=p.read_text(encoding='utf-8'); p.write_text(s.replace('        }, 300000); \n','        }, 300000);\n'),encoding='utf-8')

old_cust="""useEffect(()=>{if(guestMode||!user?.uid)return;touchCustomerSession(user,safeProfile,'active');const t=setInterval(()=>touchCustomerSession(user,safeProfile,'heartbeat'),120000);return()=>clearInterval(t)},[guestMode,user?.uid,safeProfile.name,safeProfile.company,safeProfile.phone]);"""
new_cust="""useEffect(()=>{if(guestMode||!user?.uid)return;touchCustomerSession(user,safeProfile,'active');const t=setInterval(()=>{if(document.visibilityState==='visible')touchCustomerSession(user,safeProfile,'heartbeat')},300000);return()=>clearInterval(t)},[guestMode,user?.uid,safeProfile.name,safeProfile.company,safeProfile.phone]);"""
replace(cust,old_cust,new_cust,'customer heartbeat')

replace(emp,".where('employeeId','==',employeeId).limit(50)",".where('employeeId','==',employeeId).limit(20)",'employee notification id limit')
replace(emp,".where('targetKey','==',targetKeys[0]).limit(50)",".where('targetKey','==',targetKeys[0]).limit(20)",'employee notification target limit')
replace(cust,".where(field,'==',value).limit(50).onSnapshot", ".where(field,'==',value).limit(20).onSnapshot",'customer notification limit')

replace(cust,"db.collection(ORDER_COLLECTION).where('customerUid','==',user.uid).onSnapshot", "db.collection(ORDER_COLLECTION).where('customerUid','==',user.uid).limit(100).onSnapshot",'customer orders limit')
replace(cust,"db.collection(DRAFT_COLLECTION).where('customerUid','==',user.uid).onSnapshot", "db.collection(DRAFT_COLLECTION).where('customerUid','==',user.uid).limit(60).onSnapshot",'customer drafts limit')

replace('index.html',"const CORE='./runtime/index-v37-source.txt?v=56.14';","const CORE='./runtime/index-v37-source.txt?v=56.15';",'employee runtime version')
replace('customer.html',"const CORE='./runtime/customer-v37-source.txt?v=56.14';","const CORE='./runtime/customer-v37-source.txt?v=56.15';",'customer runtime version')

replace(test,"/where\\('employeeId','==',employeeId\\)\\.limit\\(50\\)/","/where\\('employeeId','==',employeeId\\)\\.limit\\(20\\)/",'employee messaging test query')
replace(test,"/where\\('targetKey','==',targetKeys\\[0\\]\\)\\.limit\\(50\\)/","/where\\('targetKey','==',targetKeys\\[0\\]\\)\\.limit\\(20\\)/",'employee alias messaging test query')
replace(test,"/where\\(field,'==',value\\)\\.limit\\(50\\)/","/where\\(field,'==',value\\)\\.limit\\(20\\)/",'customer messaging test query')
replace(test,"index-v37-source.txt?v=56.14","index-v37-source.txt?v=56.15",'employee messaging test version')
replace(test,"customer-v37-source.txt?v=56.14","customer-v37-source.txt?v=56.15",'customer messaging test version')
replace(test,"employee V56.14 cache bust missing","employee V56.15 cache bust missing",'employee messaging test label')
replace(test,"customer V56.14 cache bust missing","customer V56.15 cache bust missing",'customer messaging test label')
replace(test,"V56.14 messaging regression: OK","V56.15 messaging + quota regression: OK",'messaging test log')

print('V56.15 Firestore quota hardening patch applied over V56.14')
