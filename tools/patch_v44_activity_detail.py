from pathlib import Path

p=Path('v44-observability.js')
s=p.read_text()
start=s.index("document.addEventListener('click',e=>{")
end=s.index("document.addEventListener('input',e=>",start)
new="""document.addEventListener('click',e=>{const el=e.target?.closest?.('button,a,[role=\"button\"],img');if(!el)return;const permission=classify(el);if(permission&&effective[permission]===false){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();denied();return}const txt=(el.innerText||el.textContent||'').replace(/\\s+/g,' ').trim(),category=el.closest?.('.category-tile');if(category){const label=(category.innerText||'').replace(/\\s+/g,' ').trim().slice(0,120);log('category_select',label,itemFromNode(category));return}const a=clickAction(el);if(a){const extra=itemFromNode(el);log(a[0],a[1],extra);return}if(txt&&txt.length<=90){const href=el.getAttribute?.('href')||'',role=el.tagName?.toLowerCase()||'';log('button_click',txt,{href,role,context:itemFromNode(el).text},500)}},true);
"""
s=s[:start]+new+s[end:]
p.write_text(s)

p=Path('command-center.html');s=p.read_text()
s=s.replace("ui_select:'اختيار',page_visible:'عاد للصفحة'","ui_select:'اختيار',category_select:'اختيار قسم',button_click:'ضغط زر',page_visible:'عاد للصفحة'")
p.write_text(s)
print('V44_DETAIL_PATCH_OK')
