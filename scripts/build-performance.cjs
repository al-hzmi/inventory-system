/* Build-only compiler. No business data, authentication or appearance changes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Babel=require('@babel/standalone'),postcss=require('postcss'),tailwind=require('tailwindcss');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/build');fs.mkdirSync(out,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const report=[];
let reactAsset,reactDOMAsset;
function asset(label,code,extension='js'){
 const hash=crypto.createHash('sha256').update(code).digest('hex').slice(0,20),file=`${label}.${hash}.${extension}`;
 fs.writeFileSync(path.join(out,file),code);return './assets/build/'+file;
}
async function compile(html,label){
 // CSS is generated once during deployment, never on the employee's phone.
 if(html.includes('https://cdn.tailwindcss.com')){
   const configScript=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(m=>/^\s*tailwind\.config\s*=/.test(m[1]));
   if(!configScript)throw new Error('Missing Tailwind config: '+label);
   const sandbox={tailwind:{}};vm.runInNewContext(configScript[1],sandbox,{timeout:5000});
   const config=JSON.parse(JSON.stringify(sandbox.tailwind.config));
   const extra=fs.readdirSync(root).filter(f=>f.endsWith('.js')).map(f=>read(f)).join('\n');
   config.content=[{raw:html+'\n'+extra,extension:'html'}];
   const css=(await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
   html=html.replace(configScript[0],'').replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/,label==='employee'?`<style data-batco-compiled-styles>${css}</style>`:`<link rel="stylesheet" href="${asset(label+'-styles',css,'css')}">`);
 }

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
async function main(){
reactAsset=asset('react',fs.readFileSync(require.resolve('react/package.json').replace('package.json','umd/react.production.min.js'),'utf8'));
reactDOMAsset=asset('react-dom',fs.readFileSync(require.resolve('react-dom/package.json').replace('package.json','umd/react-dom.production.min.js'),'utf8'));
let index=read('index.html');
const start=index.indexOf('    // V44_EMPLOYEE_CORE_PATCH'),end=index.indexOf('    document.open();document.write(html);document.close();',start);
if(start<0||end<0)throw new Error('Employee patch boundaries changed; refusing a partial build');
const patch=index.slice(start,end);
// These are the existing, source-controlled transforms, evaluated only against static HTML.
const context={html:read('runtime/index-v37-source.txt'),onboardHaroon:false,employeeName:''};
vm.runInNewContext(patch,context,{timeout:5000});
// Ship the real document directly. The old fetch/document.write wrapper erased the
// visible splash and added a serialized request before Safari could parse the app.
const bootstrapStart=index.indexOf('(async function(){')+'(async function(){'.length;
const bootstrapEnd=index.indexOf('  // Cache the immutable, revisioned UI shell');
if(bootstrapStart<18||bootstrapEnd<bootstrapStart)throw new Error('Transfer bootstrap boundary changed');
let bootstrap=index.slice(bootstrapStart,bootstrapEnd).replace(/  const CORE='[^']+';\n/,'');
const onboarding=patch.split('\n').find(line=>line.includes('if(onboardHaroon&&!employeeName)'));
if(!onboarding)throw new Error('Onboarding contract changed');
const onboardingMarkup=onboarding.match(/html=html\.replace\('<\/body>','([\s\S]*)<\/body>'\)/)?.[1];
if(!onboardingMarkup)throw new Error('Onboarding markup changed');
bootstrap+=`\nawait prepareTransfer40();\nif(onboardHaroon&&!employeeName)document.body.insertAdjacentHTML('beforeend',${JSON.stringify(onboardingMarkup)});\n`;
const bootstrapScript=`<script>window.__BATCO_BOOT_READY=(async function(){${bootstrap}})();</script>`;
const guard=`<script>
(()=>{window.__BATCO_BOOT_GUARD=true;const root=document.getElementById('root'),loader=document.getElementById('app-loader');
let timer;const observer=new MutationObserver(check);function check(){if(!root.childElementCount)return;clearTimeout(timer);observer.disconnect();loader.classList.add('is-hidden');window.__BATCO_APP_MOUNTED=true;}
function recover(){if(root.childElementCount)return;loader.classList.remove('is-hidden');if(document.getElementById('batco-boot-retry'))return;const box=document.createElement('div');box.id='batco-boot-retry';box.style.cssText='position:absolute;top:calc(50% + 75px);text-align:center;padding:0 20px;font:14px/1.8 system-ui';const note=document.createElement('p');note.textContent=navigator.onLine?'تأخر فتح النظام. يمكنك إعادة المحاولة.':'الاتصال غير متاح. أعد المحاولة عند رجوعه.';const button=document.createElement('button');button.textContent='إعادة المحاولة';button.style.cssText='background:#111;color:white;border:0;border-radius:12px;padding:12px 24px;font:inherit';button.onclick=()=>{const u=new URL(location.href);u.searchParams.set('batco-retry',String(Date.now()));location.replace(u.href)};box.append(note,button);loader.append(box);}
observer.observe(root,{childList:true});timer=setTimeout(recover,10000);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){check();if(!root.childElementCount)recover()}});check();
})();</script>`;
const mount='ReactDOM.createRoot(document.getElementById(\'root\')).render(__employeeMode ? <EmployeeBootstrap /> : <EntryChooser />);';
if(!context.html.includes(mount))throw new Error('Employee mount contract changed');
context.html=context.html.replace(mount,`Promise.resolve(window.__BATCO_BOOT_READY).catch(error=>console.error('[BATCO boot]',error)).then(()=>{${mount}});`);
context.html=context.html.replace('<div id="root"></div>','<div id="root"></div>'+guard+bootstrapScript);
const logo='data:image/svg+xml;base64,'+Buffer.from(read('assets/batco-logo.svg')).toString('base64');
context.html=context.html.replace(/(id="app-loader"[^>]*><img[^>]*src=")[^"]+/, '$1'+logo);
// Local React loads in parse order; optional feature vendors are requested on use.
context.html=context.html.replace(/<script crossorigin src="https:\/\/unpkg.com\/react/g,'<script defer crossorigin src="https://unpkg.com/react');
for(const [url,file,label] of [
 ['https://cdn.jsdelivr.net/npm/dayjs/dayjs.min.js','dayjs/dayjs.min.js','dayjs'],
 ['https://cdn.jsdelivr.net/npm/dayjs/plugin/relativeTime.js','dayjs/plugin/relativeTime.js','dayjs-relative-time'],
 ['https://cdn.jsdelivr.net/npm/dayjs/locale/ar.js','dayjs/locale/ar.js','dayjs-ar']
])context.html=context.html.replace(url,asset(label,fs.readFileSync(require.resolve(file),'utf8')));

context.html=context.html.replace('<script>if (typeof dayjs', "<script>document.addEventListener('DOMContentLoaded',()=>{if (typeof dayjs").replace('dayjs.locale("ar"); }</script>','dayjs.locale("ar"); }});</script>');
context.html=context.html.replace(/(<link href="https:\/\/fonts.googleapis.com[^>]+)rel="stylesheet">/g,'$1rel="stylesheet" media="print" onload="this.media=\'all\'">');
context.html=context.html.replace(/<script src="(\.\/[^"]+)"/g,'<script defer src="$1"');
context.html=context.html.replace('</head>','<script defer data-batco-fast-nav src="./batco-fast-nav.js?v=78.0"></script></head>');
const employee=await compile(context.html,'employee');
if(/type=["']text\/babel/.test(employee)||employee.includes('document.write('))throw new Error('Employee direct build failed');
write('index.html',employee);
// Compile independently authored HTML pages. Runtime source archives remain untouched.
for(const file of fs.readdirSync(root).filter(p=>p.endsWith('.html')&&p!=='index.html')){
 const html=read(file);if(/type=["']text\/babel/.test(html))write(file,await compile(html,file.replace(/\.html$/,'')));
}
write('assets/build/report.json',JSON.stringify(report,null,2));

// Customer wrapper keeps routing, identity checks and cart handoff; only static transforms move.
if(fs.existsSync(path.join(root,'customer.html'))){
 let shell=read('customer.html');const marker='    let html=await loadCore();',begin=shell.indexOf(marker)+marker.length,finish=shell.indexOf('    document.open();document.write(html);document.close();',begin);
 const helperStart=shell.indexOf('  const replaceBetween='),helperEnd=shell.indexOf('  const loadCore=',helperStart);
 if(begin<marker.length||finish<0||helperStart<0||helperEnd<0)throw new Error('Customer patch boundaries changed');
 const customerContext={html:read('runtime/customer-v37-source.txt')};
 vm.runInNewContext(shell.slice(helperStart,helperEnd)+shell.slice(begin,finish),customerContext,{timeout:5000});
 const customerPath=asset('customer-shell',await compile(customerContext.html,'customer'),'html');
 shell=shell.slice(0,begin)+'\n'+shell.slice(finish);
 shell=shell.replace(/const CORE='[^']+';/,`const CORE='${customerPath}';`);
 const a=shell.indexOf('  const loadCore='),b=shell.indexOf('  try{',a);
 if(a<0||b<0)throw new Error('Customer loader changed');
 shell=shell.slice(0,a)+`  const loadCore=async()=>{let cache;try{cache=await caches.open('batco-v37-core');const hit=await cache.match(CORE);if(hit)return hit.text()}catch{}const r=await fetch(CORE);if(!r.ok)throw new Error('CORE_HTTP_'+r.status);const text=await r.text();if(cache)cache.put(CORE,new Response(text)).catch(()=>{});return text};\n`+shell.slice(b);
 write('customer.html',shell);
}
write('assets/build/report.json',JSON.stringify(report,null,2));

console.log(JSON.stringify({precompiledPages:report.length,report}));


}
main().catch(error=>{console.error(error);process.exitCode=1});
