from pathlib import Path
p=Path('customer.html')
s=p.read_text()
old="html=html.replace('<script src=\\\"https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js\\\"></script>','');"
new="html=html.replace('<script src=\\\"https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js\\\"></scr'+'ipt>','');"
if old in s:
    s=s.replace(old,new)
elif new not in s:
    raise SystemExit('V42_OUTER_SCRIPT_MARKER')
p.write_text(s)
print('V42_OUTER_SCRIPT_SAFE')
