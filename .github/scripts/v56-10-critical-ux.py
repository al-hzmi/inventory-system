from pathlib import Path

ROOT = Path('.')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'MISSING_ANCHOR:{label}')
    if text.count(old) != 1:
        raise SystemExit(f'NON_UNIQUE_ANCHOR:{label}:{text.count(old)}')
    return text.replace(old, new, 1)

# 1) Admin message sheets: hard body scroll lock on iOS + scroll only inside sheet.
p = ROOT / 'admin-dashboard.html'
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    ".admin-message-overlay{overscroll-behavior:contain}\n.admin-message-sheet{max-height:min(92dvh,760px);min-height:0}\n.admin-message-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}",
    ".admin-message-overlay{overscroll-behavior:none;overflow:hidden;touch-action:none}\n.admin-message-sheet{max-height:min(92dvh,760px);min-height:0;touch-action:pan-y}\n.admin-message-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:pan-y;min-height:0}",
    'message_css'
)
react_anchor = "const {useState,useEffect,useMemo,useCallback}=React;"
scroll_hook = r'''const {useState,useEffect,useMemo,useCallback}=React;

// V56.10 — iOS-safe modal scroll lock. Prevents a bottom sheet from scrolling the page behind it.
const useBodyScrollLock=()=>{useEffect(()=>{
  const w=window,body=document.body,html=document.documentElement;
  let lock=w.__BATCO_BODY_SCROLL_LOCK;
  if(!lock){lock=w.__BATCO_BODY_SCROLL_LOCK={count:0,y:0,body:{},htmlOverflow:''}}
  if(lock.count===0){
    lock.y=window.scrollY||window.pageYOffset||0;
    lock.body={position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow};
    lock.htmlOverflow=html.style.overflow;
    body.style.position='fixed';body.style.top=`-${lock.y}px`;body.style.left='0';body.style.right='0';body.style.width='100%';body.style.overflow='hidden';
    html.style.overflow='hidden';
  }
  lock.count+=1;
  return()=>{
    const active=w.__BATCO_BODY_SCROLL_LOCK;if(!active)return;
    active.count=Math.max(0,active.count-1);
    if(active.count===0){
      Object.assign(body.style,active.body);html.style.overflow=active.htmlOverflow||'';
      const y=active.y||0;delete w.__BATCO_BODY_SCROLL_LOCK;
      requestAnimationFrame(()=>window.scrollTo(0,y));
    }
  };
},[])};'''
s = replace_once(s, react_anchor, scroll_hook, 'scroll_hook')
s = replace_once(s, "function EmployeeMessageModal({target,notifications,onClose}){\n  const [title", "function EmployeeMessageModal({target,notifications,onClose}){\n  useBodyScrollLock();\n  const [title", 'employee_message_lock')
s = replace_once(s, "function CustomerMessageModal({target,onClose}){\n  const [title", "function CustomerMessageModal({target,onClose}){\n  useBodyScrollLock();\n  const [title", 'customer_message_lock')
p.write_text(s, encoding='utf-8')

# 2) V48 session security: a freshly verified photo must satisfy a stale reauth/reset flag.
p = ROOT / 'v48-auth-security.js'
s = p.read_text(encoding='utf-8')
s = replace_once(s, "const VERSION='55.0';", "const VERSION='55.1';", 'v48_version')
current_anchor = "const currentSession=()=>{try{return {name:String(localStorage.getItem(K.name)||'').trim(),id:String(localStorage.getItem(K.id)||'').trim(),auth:String(localStorage.getItem(K.auth)||'')}}catch{return{name:'',id:'',auth:''}}};"
current_patch = current_anchor + r'''
const readSessionProof=()=>{try{return JSON.parse(localStorage.getItem(K.photoProof)||'null')||null}catch{return null}};
const tsMs=v=>{try{if(!v)return 0;if(typeof v.toMillis==='function')return v.toMillis();if(Number.isFinite(Number(v.seconds)))return Number(v.seconds)*1000;const n=new Date(v).getTime();return Number.isFinite(n)?n:0}catch{return 0}};
const proofStateFor=(session)=>{const proof=readSessionProof(),verifiedAt=Number(proof?.verifiedAt)||0,matches=Boolean(proof?.role==='employee'&&proof?.employeeId===session.id&&proof?.photoId);return {proof,verifiedAt,matches}};
const resetProofSatisfied=(session,account)=>{const ps=proofStateFor(session);if(!ps.matches)return false;if(account?.passwordResetPhotoId||account?.passwordResetPhotoCompletedAt)return true;const resetAt=Math.max(tsMs(account?.passwordResetAt),tsMs(account?.passwordUpdatedAt));return Boolean(resetAt&&ps.verifiedAt>=resetAt)};'''
s = replace_once(s, current_anchor, current_patch, 'proof_helpers')
old_initial = """const fresh=(await ref.get()).data()||account,epoch=Number(fresh.forceReauthEpoch)||0;\n    let ack=0,pending=0;try{ack=Number(localStorage.getItem(ACK+s.id)||0);pending=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}\n    const decision=reauthDecision(epoch,ack,pending);"""
new_initial = """const fresh=(await ref.get()).data()||account,epoch=Number(fresh.forceReauthEpoch)||0;\n    let ack=0,pending=0;try{ack=Number(localStorage.getItem(ACK+s.id)||0);pending=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}\n    const proofState=proofStateFor(s),serverCompleted=Number(fresh.forceReauthCompletedEpoch)||0;\n    if(epoch&&(serverCompleted>=epoch||(proofState.matches&&proofState.verifiedAt>=epoch))){ack=epoch;pending=0;try{localStorage.setItem(ACK+s.id,String(epoch));localStorage.removeItem(PENDING+s.id)}catch{};if(!QA)ref.set({lastReauthCompletedAt:serverTs(),lastReauthDeviceHash:hash,forceReauthCompletedEpoch:epoch},{merge:true}).catch(()=>{})}\n    if(fresh.passwordResetRequiresPhoto&&resetProofSatisfied(s,fresh)){fresh.passwordResetRequiresPhoto=false;if(!QA)ref.set({passwordResetRequiresPhoto:false,passwordResetPhotoCompletedAt:fresh.passwordResetPhotoCompletedAt||serverTs(),passwordResetPhotoId:fresh.passwordResetPhotoId||proofState.proof?.photoId||''},{merge:true}).catch(()=>{})}\n    const decision=reauthDecision(epoch,ack,pending);"""
s = replace_once(s, old_initial, new_initial, 'initial_reauth')
old_snap = """let a=0,p=0;try{a=Number(localStorage.getItem(ACK+s.id)||0);p=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}\n      const e=Number(data.forceReauthEpoch)||0,d=reauthDecision(e,a,p);\n      if(data.passwordResetRequiresPhoto&&!QA){softLogout(s.id,Date.now(),now.name);return}\n      if(d==='force')softLogout(s.id,e,now.name);"""
new_snap = """let a=0,p=0;try{a=Number(localStorage.getItem(ACK+s.id)||0);p=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}\n      const e=Number(data.forceReauthEpoch)||0,proofState=proofStateFor(now),serverCompleted=Number(data.forceReauthCompletedEpoch)||0;\n      if(e&&(serverCompleted>=e||(proofState.matches&&proofState.verifiedAt>=e))){a=e;p=0;try{localStorage.setItem(ACK+s.id,String(e));localStorage.removeItem(PENDING+s.id)}catch{};if(!QA)ref.set({lastReauthCompletedAt:serverTs(),lastReauthDeviceHash:hash,forceReauthCompletedEpoch:e},{merge:true}).catch(()=>{})}\n      if(data.passwordResetRequiresPhoto&&resetProofSatisfied(now,data)){data.passwordResetRequiresPhoto=false;if(!QA)ref.set({passwordResetRequiresPhoto:false,passwordResetPhotoCompletedAt:data.passwordResetPhotoCompletedAt||serverTs(),passwordResetPhotoId:data.passwordResetPhotoId||proofState.proof?.photoId||''},{merge:true}).catch(()=>{})}\n      const d=reauthDecision(e,a,p);\n      if(data.passwordResetRequiresPhoto&&!QA){softLogout(s.id,Date.now(),now.name);return}\n      if(d==='force')softLogout(s.id,e,now.name);"""
s = replace_once(s, old_snap, new_snap, 'snapshot_reauth')
p.write_text(s, encoding='utf-8')

# 3) Cache-bust the fixed security layer and latest stocktake shell.
p = ROOT / 'index.html'
s = p.read_text(encoding='utf-8')
s = replace_once(s, './v48-auth-security.js?v=55.0', './v48-auth-security.js?v=55.1', 'auth_cache_bust')
p.write_text(s, encoding='utf-8')

p = ROOT / 'admin-stocktake-shell.html'
s = p.read_text(encoding='utf-8')
if 'admin-stocktake.html?embedded=1&v=56.8' in s:
    s=s.replace('admin-stocktake.html?embedded=1&v=56.8','admin-stocktake.html?embedded=1&v=56.9',1)
p.write_text(s, encoding='utf-8')

# Contract assertions.
admin=(ROOT/'admin-dashboard.html').read_text(encoding='utf-8')
auth=(ROOT/'v48-auth-security.js').read_text(encoding='utf-8')
index=(ROOT/'index.html').read_text(encoding='utf-8')
stock=(ROOT/'stocktake.html').read_text(encoding='utf-8')
checks=[
 ('scroll_hook','useBodyScrollLock' in admin and 'body.style.position=\'fixed\'' in admin),
 ('customer_lock','function CustomerMessageModal({target,onClose}){\n  useBodyScrollLock();' in admin),
 ('employee_lock','function EmployeeMessageModal({target,notifications,onClose}){\n  useBodyScrollLock();' in admin),
 ('proof_state','proofStateFor' in auth and 'resetProofSatisfied' in auth),
 ('proof_epoch','proofState.verifiedAt>=epoch' in auth and 'proofState.verifiedAt>=e' in auth),
 ('cache_bust','v48-auth-security.js?v=55.1' in index),
 ('stocktake_v569','v56-9-operator' in stock or 'recentComplete' in stock or 'المنجز حديثًا' in stock),
]
for name,ok in checks:
    if not ok: raise SystemExit('CHECK_FAILED:'+name)
print('V56.10 patch applied and contracts verified')
