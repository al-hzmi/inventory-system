/* Build-only compiler. No business data, authentication or appearance changes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Babel=require('@babel/standalone');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/build');fs.mkdirSync(out,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const report=[];
let reactAsset,reactDOMAsset;
function asset(label,code,extension='js'){
 const hash=crypto.createHash('sha256').update(code).digest('hex').slice(0,20),file=`${label}.${hash}.${extension}`;
 fs.writeFileSync(path.join(out,file),code);return './assets/build/'+file;
}
function compile(html,label){
 html=html.replace('https://unpkg.com/react@18/umd/react.production.min.js',reactAsset).replace('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',reactDOMAsset);
 let scripts=0,sourceBytes=0,compiledBytes=0;
 html=html.replace(/<script\b([^>]*\btype=["']text\/babel["'][^>]*)>([\s\S]*?)<\/script>/g,(_,attrs,code)=>{
   if(/\bsrc\s*=/.test(attrs))throw new Error('External JSX needs explicit compilation: '+label);
   const result=Babel.transform(code,{presets:['env','react'],sourceType:'script',comments:false,compact:true}).code;
   scripts++;sourceBytes+=Buffer.byteLength(code);compiledBytes+=Buffer.byteLength(result);
   return `<script defer src="${asset(label,result)}"></script>`;
 });
 if(scripts){html=html.replace(/<script\b[^>]*src=["']https:\/\/unpkg.com\/@babel\/standalone\/babel.min.js["'][^>]*>\s*<\/script>/g,'');report.push({page:label,scripts,sourceBytes,compiledBytes,browserCompilations:0})}
 return html;
}
reactAsset=asset('react',fs.readFileSync(require.resolve('react/package.json').replace('package.json','umd/react.production.min.js'),'utf8'));
reactDOMAsset=asset('react-dom',fs.readFileSync(require.resolve('react-dom/package.json').replace('package.json','umd/react-dom.production.min.js'),'utf8'));
let index=read('index.html');
const start=index.indexOf('    // V44_EMPLOYEE_CORE_PATCH'),end=index.indexOf('    document.open();document.write(html);document.close();',start);
if(start<0||end<0)throw new Error('Employee patch boundaries changed; refusing a partial build');
const patch=index.slice(start,end);
// These are the existing, source-controlled transforms, evaluated only against static HTML.
const context={html:read('runtime/index-v37-source.txt'),onboardHaroon:false,employeeName:''};
vm.runInNewContext(patch,context,{timeout:5000});
const employee=compile(context.html,'employee');
if(/type=["']text\/babel/.test(employee))throw new Error('Uncompiled employee source');
const employeePath=asset('employee-shell',employee,'html');
// Keep transfer validation and conditional onboarding at runtime. All other transforms run at build time.
const onboarding=patch.split('\n').find(line=>line.includes('if(onboardHaroon&&!employeeName)'));
if(!onboarding)throw new Error('Onboarding contract changed');
index=index.slice(0,start)+onboarding+'\n'+index.slice(end);
index=index.replace(/const CORE='[^']+';/,`const CORE='${employeePath}';`);
// Hashed core never needs background revalidation.
const revalidateStart=index.indexOf("            setTimeout(()=>fetch(CORE,");
if(revalidateStart>=0){const revalidateEnd=index.indexOf("),3000);",revalidateStart);if(revalidateEnd<0)throw new Error('Core cache callback changed');index=index.slice(0,revalidateStart)+index.slice(revalidateEnd+8);}
write('index.html',index);
// Compile independently authored HTML pages. Runtime source archives remain untouched.
for(const file of fs.readdirSync(root).filter(p=>p.endsWith('.html')&&p!=='index.html')){
 const html=read(file);if(/type=["']text\/babel/.test(html))write(file,compile(html,file.replace(/\.html$/,'')));
}
write('assets/build/report.json',JSON.stringify(report,null,2));

// Customer wrapper keeps routing, identity checks and cart handoff; only static transforms move.
if(fs.existsSync(path.join(root,'customer.html'))){
 let shell=read('customer.html');const marker='    let html=await loadCore();',begin=shell.indexOf(marker)+marker.length,finish=shell.indexOf('    document.open();document.write(html);document.close();',begin);
 const helperStart=shell.indexOf('  const replaceBetween='),helperEnd=shell.indexOf('  const loadCore=',helperStart);
 if(begin<marker.length||finish<0||helperStart<0||helperEnd<0)throw new Error('Customer patch boundaries changed');
 const customerContext={html:read('runtime/customer-v37-source.txt')};
 vm.runInNewContext(shell.slice(helperStart,helperEnd)+shell.slice(begin,finish),customerContext,{timeout:5000});
 const customerPath=asset('customer-shell',compile(customerContext.html,'customer'),'html');
 shell=shell.slice(0,begin)+'\n'+shell.slice(finish);
 shell=shell.replace(/const CORE='[^']+';/,`const CORE='${customerPath}';`);
 const a=shell.indexOf('  const loadCore='),b=shell.indexOf('  try{',a);
 if(a<0||b<0)throw new Error('Customer loader changed');
 shell=shell.slice(0,a)+`  const loadCore=async()=>{let cache;try{cache=await caches.open('batco-v37-core');const hit=await cache.match(CORE);if(hit)return hit.text()}catch{}const r=await fetch(CORE);if(!r.ok)throw new Error('CORE_HTTP_'+r.status);const text=await r.text();if(cache)cache.put(CORE,new Response(text)).catch(()=>{});return text};\n`+shell.slice(b);
 write('customer.html',shell);
}
write('assets/build/report.json',JSON.stringify(report,null,2));

console.log(JSON.stringify({precompiledPages:report.length,report}));
