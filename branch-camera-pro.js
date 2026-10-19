/* BATCO V84: camera-capability adapter for long-range 1D barcode capture.
   Uses browser-supported hardware only; never simulates optical zoom with CSS. */
(function(root){
'use strict';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function formats(F={}){
 const keys=['CODE_128','CODE_39','CODE_93','EAN_13','EAN_8','UPC_A','UPC_E','ITF','CODABAR','QR_CODE','DATA_MATRIX','PDF_417'];
 return keys.map(k=>F[k]).filter(v=>typeof v==='number'&&Number.isFinite(v));
}
function region(width,height){
 const w=Math.max(90,Number(width)||320),h=Math.max(90,Number(height)||240);
 // Keep almost the whole picture. Narrow scan boxes miss off-centre, skewed 1D barcodes.
 return {
  width:clamp(Math.floor(w*.97),80,Math.floor(w)),
  height:clamp(Math.floor(h*.80),80,Math.floor(h))
 };
}
function options(highRes=true){
 const cfg={fps:17,disableFlip:true,aspectRatio:4/3,qrbox:region};
 if(highRes)cfg.videoConstraints={
  facingMode:'environment',
  width:{ideal:1920},height:{ideal:1080},
  frameRate:{ideal:30}
 };
 return cfg;
}
function readCapability(feature){try{return feature&&typeof feature.isSupported==='function'&&feature.isSupported()?feature:null}catch{return null}}
function valueOr(fallback,callback){try{const v=callback();return v==null?fallback:v}catch{return fallback}}
function getHardware(scanner,video){
 const track=video?.srcObject?.getVideoTracks?.()?.[0]||null;
 const caps=valueOr({},()=>track?.getCapabilities?.()||scanner?.getRunningTrackCapabilities?.()||{});
 const wrapper=valueOr(null,()=>scanner?.getRunningTrackCameraCapabilities?.()||null);
 const zoomFeature=readCapability(wrapper?.zoomFeature?.());
 const torchFeature=readCapability(wrapper?.torchFeature?.());
 const zoomRange=zoomFeature?{
  min:Number(valueOr(1,()=>zoomFeature.min())),
  max:Number(valueOr(1,()=>zoomFeature.max())),
  step:Number(valueOr(.1,()=>zoomFeature.step()))
 }:(typeof caps.zoom==='object'&&Number.isFinite(Number(caps.zoom.max))?{
  min:Number(caps.zoom.min||1),max:Number(caps.zoom.max||1),step:Number(caps.zoom.step||.1)
 }:null);
 const zoomSupported=!!zoomRange&&zoomRange.max>zoomRange.min;
 const torchSupported=!!torchFeature||caps.torch===true||Array.isArray(caps.torch)&&caps.torch.includes(true);
 const setZoom=async desired=>{
  if(!zoomSupported)throw Error('ZOOM_UNSUPPORTED');
  const target=clamp(Number(desired),zoomRange.min,zoomRange.max);
  if(zoomFeature)await zoomFeature.apply(target);
  else if(track?.applyConstraints)await track.applyConstraints({advanced:[{zoom:target}]});
  else if(scanner?.applyVideoConstraints)await scanner.applyVideoConstraints({advanced:[{zoom:target}]});
  else throw Error('ZOOM_UNSUPPORTED');
  return target;
 };
 const setTorch=async enabled=>{
  if(!torchSupported)throw Error('TORCH_UNSUPPORTED');
  if(torchFeature)await torchFeature.apply(Boolean(enabled));
  else if(track?.applyConstraints)await track.applyConstraints({advanced:[{torch:Boolean(enabled)}]});
  else if(scanner?.applyVideoConstraints)await scanner.applyVideoConstraints({advanced:[{torch:Boolean(enabled)}]});
  else throw Error('TORCH_UNSUPPORTED');
  return Boolean(enabled);
 };
 const focus=async()=>{
  const modes=caps.focusMode;
  if(!track?.applyConstraints||!Array.isArray(modes)||!modes.includes('continuous'))return false;
  try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]});return true}catch{return false}
 };
 const width=Number(valueOr(0,()=>track?.getSettings?.().width||scanner?.getRunningTrackSettings?.().width));
 const height=Number(valueOr(0,()=>track?.getSettings?.().height||scanner?.getRunningTrackSettings?.().height));
 const zoomCurrent=Number(valueOr(zoomRange?.min||1,()=>zoomFeature?.value?.()||track?.getSettings?.().zoom));
 return {track,width,height,zoomSupported,zoomRange,zoomCurrent,torchSupported,setZoom,setTorch,focus};
}
root.BranchCameraPro=Object.freeze({formats,region,options,getHardware});
})(typeof window!=='undefined'?window:globalThis);
