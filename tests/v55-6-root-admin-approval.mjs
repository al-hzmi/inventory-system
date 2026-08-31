import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const login=fs.readFileSync('runtime/index-v37-source.txt','utf8');
assert(login.includes("const ROOT_ADMIN_EMPLOYEE_ID = 'admin_mohanad'"));
assert(login.includes("identity.role === 'admin' && identity.employeeId === 'admin_mohanad'"));
assert(login.includes('const approvedByRoot = row.approverEmployeeId === ROOT_ADMIN_EMPLOYEE_ID'));
assert(login.includes('const proofMatchesRoot = approvedByRoot'));
assert(login.includes('approverIsRoot: isRootRemoteApprover(approverIdentity)'));

const helperBody=login.match(/const isRootRemoteApprover = identity => ([^;]+);/)?.[1];
assert(helperBody,'root helper must be extractable');
const context={ROOT_ADMIN_EMPLOYEE_ID:'admin_mohanad'};vm.createContext(context);vm.runInContext(`this.root = identity => ${helperBody};`,context);
assert.equal(context.root({valid:true,role:'admin',employeeId:'admin_mohanad'}),true,'Mohanad trusted admin is ROOT');
assert.equal(context.root({valid:true,role:'admin',employeeId:'admin_other'}),false,'another admin is not ROOT');
assert.equal(context.root({valid:true,role:'employee',employeeId:'admin_mohanad'}),false,'employee role cannot become ROOT');
assert.equal(context.root({valid:false,role:'admin',employeeId:'admin_mohanad'}),false,'untrusted local identity cannot become ROOT');
console.log('V55_6_ROOT_ADMIN_APPROVAL_PASS');
