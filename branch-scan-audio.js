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
  master.gain.value=.88;
  if(typeof context.createDynamicsCompressor==='function'){
   const limiter=context.createDynamicsCompressor();
   limiter.threshold.value=-9;
   limiter.knee.value=0;
   limiter.ratio.value=12;
   limiter.attack.value=.003;
   limiter.release.value=.085;
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
   chirp(ctx,1175,at,.095,.39,'square');
   chirp(ctx,1480,at+.107,.145,.40,'square');
   chirp(ctx,2220,at+.107,.075,.11,'triangle');
  }else if(kind==='duplicate')chirp(ctx,490,at,.105,.15,'triangle');
  else chirp(ctx,320,at,.12,.13,'triangle');
  unlocked=true;
  return true;
 }catch{return false}
}
root.BranchScanAudio=Object.freeze({prepare,play,status});
})(typeof window!=='undefined'?window:globalThis);
