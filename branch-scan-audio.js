/* BATCO V87 — mandatory, cashier-style confirmation sound for newly accepted SKUs.
 * Web Audio is unlocked on a trusted touch/pointer/key gesture (iOS Safari).
 * No in-app mute / demo setting; actual speaker volume remains under iOS control.
 * Sound means locally recorded, not confirmation of successful Firestore sync. */
(function(root){
'use strict';
let context=null,master=null,unlocked=false,lastKind='',lastAt=0;
const status=()=>({enabled:true,ready:!!context&&context.state==='running'&&unlocked,supported:!!(root.AudioContext||root.webkitAudioContext)});
function getContext(){
 if(context)return context;
 const Factory=root.AudioContext||root.webkitAudioContext;
 if(!Factory)return null;
 try{
  context=new Factory();
  master=context.createGain();
  master.gain.value=1.0;
  if(typeof context.createDynamicsCompressor==='function'){
   const limiter=context.createDynamicsCompressor();
   limiter.threshold.value=-4;
   limiter.knee.value=0;
   limiter.ratio.value=10;
   limiter.attack.value=.003;
   limiter.release.value=.10;
   master.connect(limiter);
   limiter.connect(context.destination);
  }else master.connect(context.destination);
 }catch{context=null;master=null}
 return context;
}
function silentUnlock(ctx){
 try{
  const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime;
  g.gain.setValueAtTime(.00001,now);
  o.connect(g);g.connect(master);
  o.start(now);o.stop(now+.015);
 }catch{}
}
function prepare(){
 try{if(root.navigator?.audioSession)root.navigator.audioSession.type='playback'}catch{}
 const ctx=getContext();
 if(!ctx)return false;
 if(ctx.state==='running'){unlocked=true;return true}
 silentUnlock(ctx);
 try{
  const result=ctx.resume();
  if(ctx.state==='running')unlocked=true;
  result?.then?.(()=>{unlocked=ctx.state==='running'}).catch?.(()=>{});
 }catch{}
 return !!unlocked;
}
function chirp(ctx,freq,at,duration,level,type='square'){
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type;
 osc.frequency.setValueAtTime(freq,at);
 gain.gain.setValueAtTime(.0001,at);
 gain.gain.linearRampToValueAtTime(level,at+.004);
 gain.gain.setValueAtTime(level,at+duration-.018);
 gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(gain);gain.connect(master);
 osc.start(at);osc.stop(at+duration+.008);
}
function play(kind){
 if(!['accepted','duplicate','error'].includes(kind))return false;
 const now=Date.now();
 if(kind===lastKind&&now-lastAt<125)return false;
 const ctx=getContext();if(!ctx)return false;
 if(ctx.state!=='running'){
  prepare();
  if(ctx.state!=='running')return false;
 }
 lastKind=kind;lastAt=now;
 try{
  const at=ctx.currentTime+.008;
  if(kind==='accepted'){
   // Crisp retail checkout beep: two focused, punchy high-frequency pulses.
   // Compressor caps peaks to avoid distorted clipping on iPhone speakers.
   chirp(ctx,1510,at,.135,.58,'square');
   chirp(ctx,1980,at+.141,.175,.58,'square');
   chirp(ctx,2390,at+.141,.115,.22,'triangle');
  }else if(kind==='duplicate'){
   chirp(ctx,590,at,.105,.23,'triangle');
  }else{
   // Clearly different error: lower, spaced double-buzz. Never confused with approval.
   chirp(ctx,370,at,.155,.39,'square');
   chirp(ctx,270,at+.19,.22,.35,'square');
  }
  unlocked=true;
  return true;
 }catch{return false}
}
root.BranchScanAudio=Object.freeze({prepare,play,status});
})(typeof window!=='undefined'?window:globalThis);
