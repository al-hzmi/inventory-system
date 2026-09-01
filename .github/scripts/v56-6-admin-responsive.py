from pathlib import Path
import re

path = Path('admin-stocktake.html')
s = path.read_text()

# Idempotent: remove an earlier V56.6 override before re-applying.
s = re.sub(r'\n?<style id="v56-6-responsive-fix">.*?</style>\n?', '\n', s, flags=re.S)

css = r'''
<style id="v56-6-responsive-fix">
/* V56.6 — true mobile/desktop separation for Stocktake Admin */
html{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;max-width:100%;overflow-x:hidden}
body{width:100%;max-width:100%;overflow-x:hidden!important}
.wrap,.top,#root,.grid,.g2,.panel,.row,.head,.grow,.card,.cardtop,.stats,.stat,.teams,.campaigns,.summaryActions,.moreActions,.reviewHead,.mobileItems,.mobileAudit,.mobileItem,.mobileItemHead,.mobileMeta,.mobileMetric{min-width:0;max-width:100%}
.grow{min-width:0!important}
.sub,.muted,.roster,.mobileName,.mobileFoot,.note{overflow-wrap:anywhere;word-break:normal;white-space:normal}
button,input,select,textarea{max-width:100%}

@media(max-width:719px){
  html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
  .wrap{width:100%!important;max-width:100%!important;padding:10px 10px max(28px,env(safe-area-inset-bottom))!important;margin:0!important}
  .top{width:auto!important;max-width:none!important;margin:0 -10px!important;padding:10px!important}
  .head{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:8px!important;width:100%!important}
  .head .back{order:1;flex:0 0 44px!important;width:44px!important;height:44px!important}
  .head .grow{order:2;flex:1 1 calc(100% - 52px)!important;width:auto!important;min-width:0!important}
  #employeeView{order:3;flex:0 0 100%!important;width:100%!important;max-width:100%!important;height:46px!important;margin:0!important;font-size:14px!important;white-space:normal!important}
  .title{font-size:20px!important;line-height:1.35!important}
  .sub{font-size:13px!important;line-height:1.55!important;margin-top:3px!important}

  #root,.grid,.g2{width:100%!important;max-width:100%!important;grid-template-columns:minmax(0,1fr)!important}
  .panel{width:100%!important;max-width:100%!important;padding:13px!important;border-radius:15px!important;overflow:hidden!important}
  .panel h2{font-size:18px!important;line-height:1.4!important}.panel h3{font-size:17px!important;line-height:1.4!important}
  .muted{font-size:13px!important;line-height:1.65!important}
  .row{width:100%!important;max-width:100%!important}.row>*{min-width:0!important}

  .campaigns{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:9px!important;overflow:visible!important;padding:0!important;scroll-snap-type:none!important}
  .campaigns>.card{width:100%!important;min-width:0!important;max-width:100%!important;scroll-snap-align:none!important}
  .card,.cardtop{width:100%!important;max-width:100%!important}.cardtop{min-width:0!important}

  .stats{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;width:100%!important}
  .stat{width:auto!important;min-width:0!important;padding:11px 8px!important}.stat b{font-size:22px!important}.stat span{font-size:12px!important}

  .summaryActions{display:grid!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;gap:8px!important}
  .summaryActions .btn,.summaryActions .primaryAction{width:100%!important;max-width:100%!important;min-height:48px!important;font-size:15px!important}
  .moreActions{width:100%!important;max-width:100%!important;margin-top:9px!important}
  .moreActions .row{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
  .moreActions .btn{width:100%!important;max-width:100%!important}

  .teams{width:100%!important;max-width:100%!important}.teams .card{width:100%!important;max-width:100%!important}.teams .row{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important}.teams .row .btn{width:100%!important;max-width:100%!important}
  .members{grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}

  .reviewHead{display:grid!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
  .reviewSearch{width:100%!important;max-width:100%!important;height:48px!important;margin-top:9px!important}
  .tabs{width:100%!important;max-width:100%!important;overflow-x:auto!important;overscroll-behavior-inline:contain;padding-bottom:5px!important}
  .desktopOnly{display:none!important}.mobileOnly{display:block!important}
  .mobileItems,.mobileAudit{width:100%!important;max-width:100%!important}
  .mobileItem{width:100%!important;max-width:100%!important;padding:12px!important}
  .mobileItemHead{width:100%!important;max-width:100%!important}.mobileItemHead .grow{min-width:0!important}
  .mobileMeta{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important}
  .mobileMetric{min-width:0!important;width:auto!important}.mobileMetric b{white-space:normal!important;overflow-wrap:anywhere!important}

  .tablewrap{width:100%!important;max-width:100%!important;overflow:auto!important}
  .modal{width:100%!important;max-width:100%!important;max-height:94dvh!important;padding:16px 12px max(20px,env(safe-area-inset-bottom))!important}
  .modalactions{grid-template-columns:minmax(0,1fr)!important}.modalactions button{width:100%!important;min-height:48px!important}
}

@media(min-width:720px){
  html,body{overflow-x:auto!important}
  .desktopOnly{display:block}.mobileOnly{display:none!important}
  .head{flex-wrap:nowrap!important}
  #employeeView{width:auto!important;flex:0 0 auto!important}
}
</style>
'''

anchor = '</head><body>'
if anchor not in s:
    raise SystemExit('admin-stocktake head anchor missing')
s = s.replace(anchor, css + '\n</head><body>', 1)
path.write_text(s)

# Dedicated regression: assert the exact safeguards that prevent the iPhone clipping shown in production.
test = r'''import fs from 'node:fs';
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
'''
Path('tests/v56-6-admin-responsive.mjs').write_text(test)
print('V56.6 responsive patch applied')
