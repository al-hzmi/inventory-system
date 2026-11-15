const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Babel = require('@babel/standalone');

const read = path => fs.readFileSync(path,'utf8');
const scripts = html => [...html.matchAll(/<script[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const compile = (html,label) => {
  const blocks=scripts(html);
  assert(blocks.length>0,`${label} has no JSX script`);
  blocks.forEach(code=>{
    const parsed=Babel.transform(code,{presets:['react'],ast:false,comments:false});
    assert(parsed.code.length>100,`${label} must compile`);
  });
};

// Vercel's real build evaluates these wrapper patches before compiling JSX.
// Test that same path so a harmless-looking runtime change cannot break boot.
let index=read('index.html');
const i=index.indexOf('    // V44_EMPLOYEE_CORE_PATCH');
const j=index.indexOf('    document.open();document.write(html);document.close();',i);
assert(i>0&&j>i,'employee patch boundaries');
const employee={html:read('runtime/index-v37-source.txt'),onboardHaroon:false,employeeName:''};
vm.runInNewContext(index.slice(i,j),employee,{timeout:10000});
compile(employee.html,'employee after wrapper transforms');
assert(employee.html.includes('showUnimagedProducts'),'employee permission survives wrapper');
assert(employee.html.includes('اسم الصنف غير متوفر'),'employee WhatsApp formatting survives wrapper');

const shell=read('customer.html');
const marker='    let html=await loadCore();';
const begin=shell.indexOf(marker)+marker.length;
const finish=shell.indexOf('    document.open();document.write(html);document.close();',begin);
const helperStart=shell.indexOf('  const replaceBetween=');
const helperEnd=shell.indexOf('  const loadCore=',helperStart);
assert(begin>marker.length&&finish>begin&&helperStart>0&&helperEnd>helperStart,'customer patch boundaries');
const customer={html:read('runtime/customer-v37-source.txt')};
vm.runInNewContext(shell.slice(helperStart,helperEnd)+shell.slice(begin,finish),customer,{timeout:10000});
compile(customer.html,'customer after wrapper transforms');
assert(customer.html.includes('• *${name}*'),'customer item names survive wrapper');
compile(read('admin-dashboard.html'),'admin permissions dashboard');

console.log('V120_SHELL_COMPILE_PASS: employee, customer and admin JSX compile after production wrapper transforms');
