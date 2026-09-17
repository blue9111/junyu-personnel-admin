import type {Firestore} from 'firebase-admin/firestore';
import type {Employee} from './employee-identity';
import {validateRoster} from './employee-roster';
import {
  buildDirectoryImportResult,
  mergeDirectoryWithAccounts,
  planAccountProfileUpdates,
  type PersonnelAccount,
  validateEmployeeDirectory,
  validateEmployeeDirectoryRow,
} from './employee-directory';

export const isPersonnelAdmin = (employee: Employee | null) => employee?.email === 'jet@gotofunapp.com';
export class PersonnelError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export type DirectoryAction='update'|'disable'|'enable';
export function planDirectoryAction(action:DirectoryAction,input:any) {
  const id=typeof input?.employeeId==='string'?input.employeeId.trim():'';
  if(!id||id.length>40||id.includes('/')) throw new PersonnelError('請核對工號。');
  if(action==='disable') return {originalEmployeeId:id,directoryPatch:{active:false,archived:true},accountPatch:{active:false,archived:true}};
  if(action==='enable') return {originalEmployeeId:id,directoryPatch:{active:true,archived:false},accountPatch:{archived:false}};
  const originalEmployeeId=typeof input?.originalEmployeeId==='string'?input.originalEmployeeId.trim():'';
  if(!originalEmployeeId||originalEmployeeId.length>40||originalEmployeeId.includes('/')) throw new PersonnelError('請核對原工號。');
  let row;
  try { row=validateEmployeeDirectoryRow({employeeId:input.employeeId,name:input.name,departmentCode:input.departmentCode,unit:input.unit,jobTitle:input.jobTitle}); }
  catch(error) { throw new PersonnelError(error instanceof Error?error.message:'名冊資料無效。'); }
  return {originalEmployeeId,row,directoryPatch:{...row},accountPatch:{employeeId:row.employeeId,name:row.name,departmentCode:row.departmentCode,unit:row.unit,department:row.unit,jobTitle:row.jobTitle}};
}

export async function changeDirectoryEmployee(db:Firestore,actor:Employee,action:DirectoryAction,input:any) {
  if(!isPersonnelAdmin(actor)) throw new PersonnelError('只有李宗杰可以管理人員。',403);
  const plan=planDirectoryAction(action,input);
  const oldRef=db.collection('company_employee_directory').doc(plan.originalEmployeeId);
  const newEmployeeId=plan.row?.employeeId||plan.originalEmployeeId;
  const newRef=db.collection('company_employee_directory').doc(newEmployeeId);
  const accountsQuery=db.collection('meeting_employees').where('employeeId','==',plan.originalEmployeeId).limit(2);
  const audit=db.collection('meeting_employee_audit').doc();
  await db.runTransaction(async tx=>{
    const oldSnap=await tx.get(oldRef);
    const [newSnap,accounts]=await Promise.all([newEmployeeId===plan.originalEmployeeId?Promise.resolve(oldSnap):tx.get(newRef),tx.get(accountsQuery)]);
    if(!oldSnap.exists) throw new PersonnelError('找不到此名冊人員，請重新整理。',404);
    if(action==='update'&&newEmployeeId!==plan.originalEmployeeId&&newSnap.exists) throw new PersonnelError('新工號已存在，請核對後再儲存。',409);
    if(action==='disable'&&(actor.employeeId===plan.originalEmployeeId||accounts.docs.some(doc=>doc.id===actor.email))) throw new PersonnelError('管理員本人不能停用。',409);
    const updatedAt=new Date().toISOString();
    const directoryData={...plan.directoryPatch,updatedAt,updatedBy:actor.email};
    if(action==='update'&&newEmployeeId!==plan.originalEmployeeId) {
      tx.create(newRef,{...oldSnap.data(),...directoryData,active:oldSnap.data()?.active!==false,archived:oldSnap.data()?.archived===true});
      tx.set(oldRef,{active:false,archived:true,replacedBy:newEmployeeId,updatedAt,updatedBy:actor.email},{merge:true});
    } else tx.set(oldRef,directoryData,{merge:true});
    accounts.docs.forEach(doc=>tx.set(doc.ref,{...plan.accountPatch,updatedAt,updatedBy:actor.email},{merge:true}));
    tx.create(audit,{actor:actor.email,employeeId:plan.originalEmployeeId,newEmployeeId,action:`directory-${action}`,updatedAt,before:oldSnap.data(),after:directoryData});
  });
}
export async function changeEmployee(db: Firestore, actor: Employee, action: 'create' | 'update' | 'remove', input: any) {
  if (!isPersonnelAdmin(actor)) throw new PersonnelError('只有李宗杰可以管理人員。',403);
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!/^[^@\s/]+@gotofunapp\.com$/.test(email)) throw new PersonnelError('請輸入 @gotofunapp.com 公司信箱。');
  if (email === actor.email) throw new PersonnelError('此頁不能變更自己的管理帳號。');
  let row;
  if (action !== 'remove') {
    try { [row] = validateRoster([{email,name:input.name,employeeId:input.employeeId,active:action === 'create' ? false : input.active,department:input.department,departmentCode:input.departmentCode,unit:input.unit,jobTitle:input.jobTitle}]); }
    catch { throw new PersonnelError('請核對姓名、公司信箱、工號與啟用狀態。'); }
  }
  const ref = db.collection('meeting_employees').doc(email);
  const audit = db.collection('meeting_employee_audit').doc();
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (action === 'create' && snap.exists) throw new PersonnelError('此信箱已建檔，請編輯或恢復原資料。',409);
    if (action !== 'create' && !snap.exists) throw new PersonnelError('找不到此人員，請重新整理。',404);
    const old = snap.data();
    if (row && old?.boundUid && old.employeeId && old.employeeId !== row.employeeId) throw new PersonnelError('已綁定帳號的工號不可變更，請先核對身分。');
    const updatedAt = new Date().toISOString();
    const patch = action === 'remove' ? {active:false,archived:true} : {name:row!.name,employeeId:row!.employeeId,active:row!.active,archived:false,...(row!.department!==undefined?{department:row!.department}:{}),...(row!.departmentCode!==undefined?{departmentCode:row!.departmentCode}:{}),...(row!.unit!==undefined?{unit:row!.unit}:{}),...(row!.jobTitle!==undefined?{jobTitle:row!.jobTitle}:{})};
    tx.set(ref,{...patch,updatedAt,updatedBy:actor.email},{merge:true});
    tx.create(audit,{actor:actor.email,email,action,updatedAt,before:old ? {name:old.name,active:old.active === true,archived:old.archived === true} : null,after:patch});
  });
}

export async function listEmployees(db: Firestore) {
  const [accountSnapshot,directorySnapshot] = await Promise.all([
    db.collection('meeting_employees').get(),
    db.collection('company_employee_directory').get(),
  ]);
  const accounts:PersonnelAccount[] = accountSnapshot.docs.map(doc => {
    const row = doc.data();
    return {email:doc.id,name:row.name || '',employeeId:row.employeeId || '',departmentCode:typeof row.departmentCode==='string'?row.departmentCode:'',unit:typeof row.unit==='string'?row.unit:'',department:typeof row.department==='string'?row.department:'',jobTitle:typeof row.jobTitle==='string'?row.jobTitle:'',active:row.active === true,
      archived:row.archived === true,boundUid:typeof row.boundUid==='string'?row.boundUid:'',updatedAt:row.updatedAt || ''};
  });
  const directory = directorySnapshot.docs.map(doc=>({
    employeeId:doc.id,
    name:typeof doc.data().name==='string'?doc.data().name:'',
    departmentCode:typeof doc.data().departmentCode==='string'?doc.data().departmentCode:'',
    unit:typeof doc.data().unit==='string'?doc.data().unit:'',
    jobTitle:typeof doc.data().jobTitle==='string'?doc.data().jobTitle:'',
    active:doc.data().active!==false,
    archived:doc.data().archived===true,
  })).filter(row=>row.name&&row.departmentCode&&row.unit&&row.jobTitle);
  return mergeDirectoryWithAccounts(directory,accounts);
}

export async function importEmployeeDirectory(db:Firestore,actor:Employee,input:unknown) {
  if (!isPersonnelAdmin(actor)) throw new PersonnelError('只有李宗杰可以匯入公司名冊。',403);
  let directory;
  try { directory = validateEmployeeDirectory(input); }
  catch(error) { throw new PersonnelError(error instanceof Error?error.message:'公司名冊格式無效。'); }
  if (!directory.length) throw new PersonnelError('公司名冊沒有可匯入的人員。');
  const accountSnapshot = await db.collection('meeting_employees').get();
  const accounts:PersonnelAccount[] = accountSnapshot.docs.map(doc=>({email:doc.id,...doc.data()} as PersonnelAccount));
  const updates = planAccountProfileUpdates(directory,accounts);
  const result = buildDirectoryImportResult(directory,accounts,updates);
  const updatedAt = new Date().toISOString();
  const batch = db.batch();
  directory.forEach(row=>batch.set(db.collection('company_employee_directory').doc(row.employeeId),{
    ...row,updatedAt,updatedBy:actor.email,
  },{merge:true}));
  updates.forEach(update=>batch.set(db.collection('meeting_employees').doc(update.email),{
    ...update.patch,updatedAt,updatedBy:actor.email,
  },{merge:true}));
  batch.set(db.collection('meeting_employee_audit').doc(),{
    actor:actor.email,action:'directory-import',updatedAt,...result,
  });
  await batch.commit();
  return result;
}
