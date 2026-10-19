/* BATCO V86 — audible scan confirmation, iOS/Safari gesture-unlocked WebAudio.
   A sound signifies local acceptance of a NEW SKU, never successful server sync. */
(function(root){
'use strict';
let context=null,enabled=true,unlocked=false,blocked=false,lastKind='',lastAt=0;
let onChange=()=>{};
try{enabled=root.localStorage?.getItem('batco_branch_scan_sound_v86')!=='off'}catch{}
const notify=()=>{try{onChange(status())}catch{}};
function status(){
 return {enabled,ready:enabled&&unlocked&&context?.state==='running',supported:Boolean(root.AudioContext||root.webkitAudioContext),blocked};
}
function getContext(){
 if(context)return context;
 const Factory=root.AudioContext||root.webkitAudioContext;
 if(!Factory){blocked=true;notify();return null}
 try{context=new Factory();if(typeof context.addEventListener==='function')context.addEventListener('statechange',()=>{unlocked=context.state==='running';notify()});}
 catch{blocked=true;notify();return null}
 return context;
}
function silentUnlock(ctx){
 // WebKit requires a sound source started directly inside the trusted gesture.
 try{
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  gain.gain.setValueAtTime(0,now);
  oscillator.connect(gain);gain.connect(ctx.destination);
  oscillator.start(now);oscillator.stop(now+.018);
 }catch{}
}
function prepare(){
 if(!enabled)return false;
 const ctx=getContext();if(!ctx)return false;
 silentUnlock(ctx);
 if(ctx.state==='running'){unlocked=true;blocked=false;notify();return true}
 try{
  const resumed=ctx.resume();
  if(resumed?.then)resumed.then(()=>{unlocked=ctx.state==='running';blocked=!unlocked;notify()}).catch(()=>{blocked=true;notify()});
  else {unlocked=ctx.state==='running';notify()}
 }catch{blocked=true;notify()}
 return ctx.state==='running';
}
function note(ctx,hz,start,duration,level,type='sine'){
 const oscillator=ctx.createOscillator(),gain=ctx.createGain();
 oscillator.type=type;
 oscillator.frequency.setValueAtTime(hz,start);
 gain.gain.setValueAtTime(.0001,start);
 gain.gain.exponentialRampToValueAtTime(Math.max(.001,level),start+.013);
 gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 oscillator.connect(gain);gain.connect(ctx.destination);
 oscillator.start(start);oscillator.stop(start+duration+.018);
}
function output(kind,force=false){
 if(!enabled)return false;
 const now=Date.now();
 if(!force&&kind===lastKind&&now-lastAt<110)return false;
 lastKind=kind;lastAt=now;
 const ctx=getContext();if(!ctx)return false;
 if(ctx.state!=='running'){
  // Once sound is gesture-unlocked, WebKit sometimes suspends after app switching.
  // Resume is best-effort; the manual "تجربة الصوت" button provides another gesture.
  prepare();
  if(ctx.state!=='running'){notify();return false}
 }
 try{
  const at=ctx.currentTime+.005;
  if(kind==='accepted'){
   // Two distinct, full-volume but capped confirmation notes.
   note(ctx,830,at,.145,.17,'sine');
   note(ctx,1170,at+.105,.19,.16,'sine');
  }else if(kind==='duplicate'){
   note(ctx,380,at,.15,.11,'triangle');
  }else if(kind==='error'){
   note(ctx,280,at,.16,.095,'triangle');
  }else if(kind==='test'){
   note(ctx,830,at,.145,.17,'sine');
   note(ctx,1170,at+.105,.19,.16,'sine');
  }
  unlocked=true;blocked=false;notify();
  return true;
 }catch{blocked=true;notify();return false}
}
function play(kind){return output(kind)}
function test(){prepare();return output('test',true)}
function setEnabled(value){
 enabled=Boolean(value);
 try{root.localStorage?.setItem('batco_branch_scan_sound_v86',enabled?'on':'off')}catch{}
 if(enabled)prepare();
 notify();return status();
}
function subscribe(fn){onChange=typeof fn==='function'?fn:()=>{};notify()}
root.BranchScanAudio=Object.freeze({prepare,play,test,setEnabled,status,subscribe});
})(typeof window!=='undefined'?window:globalThis);
