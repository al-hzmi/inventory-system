import fs from 'node:fs';
const s=fs.readFileSync('admin-stocktake.html','utf8');
const need=[
  'id="v56-6-responsive-fix"',
  '-webkit-text-size-adjust:100%',
  '.head .grow{order:2;flex:1 1 calc(100% - 52px)',
  '#employeeView{order:3;flex:0 0 100%',
  '.campaigns{display:grid!important;grid-template-columns:minmax(0,1fr)',
  '.stats{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))',
  '.summaryActions{display:grid!important;grid-template-columns:minmax(0,1fr)',
  '.desktopOnly{display:none!important}.mobileOnly{display:block!important}',
  '@media(min-width:720px)'
];
const missing=need.filter(x=>!s.includes(x));
if(missing.length){console.error('V56.6 missing:',missing);process.exit(1)}
console.log('V56_6_ADMIN_RESPONSIVE_PASS');
