/* BATCO V85 — secondary 1D decoder.
   Quagga2 uses an independent barcode locator. Never opens a second camera.
   All work is best-effort and cancelable; html5-qrcode keeps scanning normally. */
(function(root){
'use strict';
const SOURCE='https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
let loader=null;
const NUMERIC=/^\d+$/;
function checkDigit(value){
 const s=String(value||'');
 if(!NUMERIC.test(s)||![8,12,13].includes(s.length))return false;
 let sum=0;
 for(let i=s.length-2,j=0;i>=0;i--,j++)sum+=Number(s[i])*(j%2===0?3:1);
 return (10-sum%10)%10===Number(s.at(-1));
}
function accept(code,format){
 const s=String(code||'').trim();
 if(!s||s.length<4||s.length>80)return false;
 if(/[\x00-\x1f]/.test(s))return false;
 const fmt=String(format||'').toLowerCase();
 if(fmt.startsWith('ean')||fmt.startsWith('upc')||NUMERIC.test(s)&&[8,12,13].includes(s.length))
   return checkDigit(s);
 return true;
}
function load(globalObj=root){
 if(globalObj.Quagga?.decodeSingle)return Promise.resolve(globalObj.Quagga);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  const script=globalObj.document.createElement('script');
  script.src=SOURCE;script.async=true;
  script.onload=()=>globalObj.Quagga?.decodeSingle?resolve(globalObj.Quagga):reject(Error('QUAGGA_MISSING'));
  script.onerror=()=>reject(Error('QUAGGA_NETWORK'));
  globalObj.document.head.append(script);
 }).catch(e=>{loader=null;throw e});
 return loader;
}
function makeFrame(video,canvas,rotate=false){
 if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return null;
 const W=video.videoWidth,H=video.videoHeight,maxDimension=1350;
 const scale=Math.min(1,maxDimension/Math.max(W,H));
 const w=Math.max(1,Math.round(W*scale)),h=Math.max(1,Math.round(H*scale));
 canvas.width=rotate?h:w;canvas.height=rotate?w:h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return null;
 ctx.save();
 if(rotate){ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);}
 ctx.drawImage(video,0,0,w,h);
 ctx.restore();
 return canvas.toDataURL('image/jpeg',.91);
}
function config(src){
 return {
  src,numOfWorkers:0,
  inputStream:{size:0,singleChannel:false},
  locator:{halfSample:false,patchSize:'small'},
  decoder:{readers:['ean_reader','upc_reader','ean_8_reader','upc_e_reader','code_128_reader','code_39_reader','code_93_reader','i2of5_reader']},
  locate:true
 };
}
function create({globalObj=root,videoProvider,onDecode,onStatus,interval=850}={}){
 const getVideo=typeof videoProvider==='function'?videoProvider:()=>null;
 const recognized=typeof onDecode==='function'?onDecode:()=>{};
 let stopped=false,busy=false,quagga=null,canvas=null,tickId=null,count=0;
 const schedule=(delay=interval)=>{if(!stopped)tickId=globalObj.setTimeout(tick,delay);};
 const tick=async()=>{
  if(stopped||busy||!quagga){schedule();return;}
  const video=getVideo();
  if(!video||video.readyState<2){schedule(350);return;}
  busy=true;
  try{
   if(!canvas)canvas=globalObj.document.createElement('canvas');
   const src=makeFrame(video,canvas,count++%4===3);
   if(src){
    const result=await new Promise(resolve=>{
     let finished=false;
     const timeout=globalObj.setTimeout(()=>{if(!finished){finished=true;resolve(null)}},1700);
     try{quagga.decodeSingle(config(src),value=>{
      if(!finished){finished=true;globalObj.clearTimeout(timeout);resolve(value||null)}
     })}catch{if(!finished){finished=true;globalObj.clearTimeout(timeout);resolve(null)}}
    });
    const found=result?.codeResult,code=found?.code;
    if(!stopped&&accept(code,found?.format))recognized(String(code).trim(),{engine:'quagga',format:found?.format||''});
   }
  }catch(e){onStatus?.('secondary-scan-error',e)}
  finally{busy=false;schedule();}
 };
 const ready=load(globalObj).then(q=>{
  if(stopped)return false;
  quagga=q;onStatus?.('secondary-ready');schedule(80);
  return true;
 }).catch(e=>{if(!stopped)onStatus?.('secondary-unavailable',e);return false});
 return {
  ready,
  stop(){stopped=true;globalObj.clearTimeout(tickId);quagga=null;canvas=null},
  get active(){return !stopped&&!!quagga}
 };
}
root.BranchBarcodeFallback=Object.freeze({SOURCE,checkDigit,accept,makeFrame,config,create,load});
})(typeof window!=='undefined'?window:globalThis);
