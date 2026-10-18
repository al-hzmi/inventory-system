/* BATCO v82: lightweight consistent official logo footer. */
(()=>{
'use strict';
const doc=document;
if(window.self!==window.top&&new URLSearchParams(location.search).get('embedded')==='1')return;
if(!doc.getElementById('batco-brand-footer-style')){
 const style=doc.createElement('style');style.id='batco-brand-footer-style';
 style.textContent=[
  '.batco-site-footer{display:block;position:relative;z-index:1;clear:both;width:100%;margin:26px 0 0;background:#fff;border-top:1px solid #ececec;color:#454545;direction:rtl;font-family:-apple-system,BlinkMacSystemFont,"IBM Plex Sans Arabic",system-ui,sans-serif}',
  '.batco-site-footer-inner{max-width:1120px;margin:auto;min-height:104px;display:flex;gap:15px;align-items:center;justify-content:center;padding:20px 16px 24px;flex-wrap:wrap}',
  '.batco-site-footer-logo{display:block;width:117px;max-width:38vw;height:auto;max-height:48px;object-fit:contain;flex:none;filter:none!important;opacity:.95}',
  '.batco-site-footer-separator{display:block;width:1px;height:28px;background:#e8e8e8;flex:none}',
  '.batco-site-footer-copy{display:flex;flex-direction:column;align-items:flex-start;gap:2px;font-size:11px;line-height:1.8;min-width:0}',
  '.batco-site-footer-copy strong{font-weight:700;font-size:11px;color:#333}',
  '.batco-site-footer-copy small{font-size:10px;color:#858585}',
  'body:has(nav.fixed.bottom-0)>.batco-site-footer .batco-site-footer-inner{padding-bottom:calc(105px + env(safe-area-inset-bottom))}',
  '.batco-customer-header-brand{display:flex;align-items:center;gap:12px;flex:1 1 auto;min-width:0}',
  '.batco-customer-header-logo{display:block;width:clamp(122px,32vw,164px);height:auto;max-height:64px;object-fit:contain;flex:none}',
  '.batco-customer-header-brand>div{padding-inline-start:12px;border-inline-start:1px solid #e8e8e8;min-width:0}',
  '@media(max-width:500px){.batco-site-footer-inner{min-height:88px;padding:14px 12px 18px;gap:10px}.batco-site-footer-logo{width:102px}.batco-customer-header-logo{width:min(41vw,155px)}.batco-customer-header-brand{gap:7px}.batco-customer-header-brand>div{padding-inline-start:7px}}',
  '@media print{.batco-site-footer{display:none!important}}'
 ].join('');
 (doc.head||doc.documentElement).appendChild(style);
}
const mount=()=>{
 if(!doc.body||doc.getElementById('batco-site-footer'))return;
 const footer=doc.createElement('footer');footer.id='batco-site-footer';footer.className='batco-site-footer';
 footer.setAttribute('aria-label','هوية شركة بيت الأواني الطيبة');
 const row=doc.createElement('div');row.className='batco-site-footer-inner';
 const logo=doc.createElement('img');logo.src='./assets/batco-logo.svg?v=82.0';logo.className='batco-site-footer-logo';logo.width=117;logo.height=46;logo.loading='lazy';logo.decoding='async';logo.alt='BATCO — شركة بيت الأواني الطيبة';
 const rule=doc.createElement('span');rule.className='batco-site-footer-separator';rule.setAttribute('aria-hidden','true');
 const copy=doc.createElement('div');copy.className='batco-site-footer-copy';
 const title=doc.createElement('strong');title.textContent=/\/customer\.html$/i.test(location.pathname)?'بوابة العملاء':'نظام إدارة المخزون';
 const year=doc.createElement('small');year.textContent='© '+new Date().getFullYear()+' · جميع الحقوق محفوظة';
 copy.append(title,year);row.append(logo,rule,copy);footer.append(row);doc.body.append(footer);
};
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
