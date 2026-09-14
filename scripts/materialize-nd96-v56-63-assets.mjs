import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const assets=path.join(root,'national-day-96','assets');
await fs.mkdir(assets,{recursive:true});

async function decodeEmbeddedWebp(sourceName,targetName){
  const source=await fs.readFile(path.join(assets,sourceName),'utf8');
  const match=source.match(/data:image\/webp;base64,([^"']+)/);
  if(!match) throw new Error(`Embedded WebP not found in ${sourceName}`);
  const bytes=Buffer.from(match[1],'base64');
  if(bytes.length<1024) throw new Error(`Decoded ${sourceName} is unexpectedly small`);
  await fs.writeFile(path.join(assets,targetName),bytes);
  console.log(`${sourceName} -> ${targetName}: ${bytes.length} bytes`);
}

await decodeEmbeddedWebp('exact-corner-top.svg','v56-63-corner-top.webp');
await decodeEmbeddedWebp('exact-corner-bottom.svg','v56-63-corner-bottom.webp');
await decodeEmbeddedWebp('exact-skyline.svg','v56-63-skyline.webp');

const markUrl='https://cdn.gea.gov.sa/ND-2026/brand/brand-emblem-wide.png';
const response=await fetch(markUrl,{headers:{'user-agent':'BATCO-ND96-V56.63'}});
if(!response.ok) throw new Error(`Official ND96 badge download failed: ${response.status}`);
const mark=Buffer.from(await response.arrayBuffer());
if(mark.length<1024) throw new Error('Official ND96 badge is unexpectedly small');
await fs.writeFile(path.join(assets,'v56-63-mark.png'),mark);
console.log(`official badge -> v56-63-mark.png: ${mark.length} bytes`);
