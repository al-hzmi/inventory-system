const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Babel = require('@babel/standalone');

const source = fs.readFileSync('runtime/index-v37-source.txt', 'utf8');
const entry = fs.readFileSync('index.html', 'utf8');
const begin = source.indexOf('const ProductImage =');
const end = source.indexOf('const Lightbox =', begin);
assert.ok(begin > 0 && end > begin);
const componentCode = Babel.transform(source.slice(begin, end), { presets: ['react'] }).code;

const findImage = node => {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'img') return node;
  const children = [node.props?.children].flat(Infinity);
  for (const child of children) {
    const found = findImage(child);
    if (found) return found;
  }
  return null;
};

function setup(options = {}) {
  let now = 0, nextId = 0;
  const tasks = new Map(), state = [], zoomCalls = [], multiple = [];
  const setTimeoutFake = (fn, ms) => { const id = ++nextId; tasks.set(id, { at:now + ms, fn }); return id; };
  const clearTimeoutFake = id => tasks.delete(id);
  const advance = ms => {
    const until = now + ms;
    while (true) {
      const due = [...tasks.entries()].filter(([, task]) => task.at <= until).sort((a,b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at;
      tasks.delete(due[0]);
      due[1].fn();
    }
    now = until;
  };
  const React = { Fragment:'fragment', createElement:(type,props,...children)=>({type,props:{...(props||{}),children}}) };
  const context = {
    React,
    useState:initial=>{const index=state.length;state.push(initial);return [initial,value=>{state[index]=typeof value==='function'?value(state[index]):value;}]},
    useRef:initial=>({current:initial}), useEffect:()=>{}, useCallback:fn=>fn,
    getProductImageUrl:file=>`https://inventory.example/images/${file}`,
    MULTI_TAP_WINDOW_MS:300, setTimeout:setTimeoutFake, clearTimeout:clearTimeoutFake,
    Math, URL, navigator:{}, window:{}, fetch:async()=>{}
  };
  const Component = vm.runInNewContext(componentCode + '\nProductImage;', context);
  const image = findImage(Component({fileName:'photo.webp',alt:'صنف',onZoom:()=>zoomCalls.push('zoom'),onMultiTap:taps=>multiple.push(taps),...options}));
  assert.ok(image, 'product image must render');
  const event = () => ({button:0,clientX:10,clientY:10,preventDefault(){},stopPropagation(){}});
  const tap = () => {image.props.onPointerDown(event());image.props.onPointerUp(event());image.props.onClick(event());};
  return {image,event,tap,advance,state,zoomCalls,multiple};
}

let s = setup();
s.tap(); s.advance(299);
assert.equal(s.zoomCalls.length, 0, 'single click must wait for possible second/third tap');
s.advance(1);
assert.equal(s.zoomCalls.length, 1);
assert.equal(s.state[0], false, 'ordinary click must not open the download/share sheet');

s = setup();
s.tap();s.advance(75);s.tap();s.advance(300);
assert.deepEqual(s.multiple, [2], 'two taps on the image must reach the gallery quantity mode');
assert.equal(s.zoomCalls.length, 0);
assert.equal(s.state[0], false);

s = setup();
s.tap();s.advance(75);s.tap();s.advance(75);s.tap();s.advance(300);
assert.deepEqual(s.multiple, [3], 'three taps on the image must reach product details');
assert.equal(s.zoomCalls.length, 0);

s = setup();
s.image.props.onPointerDown(s.event());s.advance(560);s.image.props.onPointerUp(s.event());
s.image.props.onClick(s.event());s.advance(350);
assert.equal(s.state[0], true, 'press-and-hold must show share/download');
assert.equal(s.zoomCalls.length, 0, 'long press must suppress its trailing click');
assert.deepEqual(s.multiple, []);

s = setup();
s.image.props.onPointerDown(s.event());
s.image.props.onPointerMove({...s.event(),clientX:50});
s.advance(600);s.image.props.onPointerUp(s.event());
assert.equal(s.state[0], false, 'scroll/drag must cancel long press');

s = setup({disableZoom:true});
s.tap();s.advance(300);
assert.equal(s.zoomCalls.length, 0, 'lightbox image must not open another lightbox');

assert.match(source, /onImageTaps=\{applyTaps\}/);
assert.match(source, /onMultiTap=\{\(taps\) => onImageTaps\(item\.uid, taps\)\}/);
assert.match(entry, /image-touch=119/, 'installed PWA must request the revised image handlers');
const jsx = source.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
assert.ok(jsx);
assert.ok(Babel.transform(jsx[1], { presets:['react'] }).code.includes('handleImageClick'));

console.log('PASS V119: image single/double/triple tap, long press, drag cancellation and lightbox gestures');
