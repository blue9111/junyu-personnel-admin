export type EmployeeDirectoryRow = {
  employeeId:string;
  name:string;
  departmentCode:string;
  unit:string;
  jobTitle:string;
};
export type EmployeeDirectoryRecord = EmployeeDirectoryRow & {active?:boolean;archived?:boolean};

export type PersonnelAccount = {
  email:string;
  name:string;
  employeeId?:string;
  departmentCode?:string;
  unit?:string;
  department?:string;
  jobTitle?:string;
  active?:boolean;
  archived?:boolean;
  boundUid?:string;
  updatedAt?:string;
};

const allowedKeys = new Set(['employeeId','name','departmentCode','unit','jobTitle']);
const clean = (value:unknown) => typeof value === 'string' ? value.trim() : '';
const normalizedName = (value:unknown) => clean(value).replace(/\s+/g,'').toLocaleLowerCase('zh-Hant');

export function validateEmployeeDirectory(input:unknown):EmployeeDirectoryRow[] {
  if (!Array.isArray(input) || input.length > 200) throw Error('公司名冊必須是陣列，每批最多２００筆。');
  const employeeIds = new Set<string>();
  return input.map((value,index) => {
    let row:EmployeeDirectoryRow;
    try { row=validateEmployeeDirectoryRow(value); }
    catch { throw Error(`第 ${index + 1} 筆資料無效，請核對工號、姓名、部門代號、單位及職稱。`); }
    if (employeeIds.has(row.employeeId)) throw Error(`第 ${index + 1} 筆工號重複，請核對工號、姓名、部門代號、單位及職稱。`);
    employeeIds.add(row.employeeId);
    return row;
  });
}

export function validateEmployeeDirectoryRow(value:unknown):EmployeeDirectoryRow {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key=>!allowedKeys.has(key)))
    throw Error('名冊資料無效，請核對工號、姓名、部門代號、單位及職稱。');
  const source=value as Record<string,unknown>;
  if (Object.values(source).some(item=>typeof item!=='string')) throw Error('名冊資料無效，請核對工號、姓名、部門代號、單位及職稱。');
  const row={employeeId:clean(source.employeeId),name:clean(source.name),departmentCode:clean(source.departmentCode),unit:clean(source.unit),jobTitle:clean(source.jobTitle)};
  if (!row.employeeId||row.employeeId.length>40||row.employeeId.includes('/')||!row.name||row.name.length>80||
      !row.departmentCode||row.departmentCode.length>20||!row.unit||row.unit.length>80||!row.jobTitle||row.jobTitle.length>80)
    throw Error('名冊資料無效，請核對工號、姓名、部門代號、單位及職稱。');
  return row;
}

function directoryIndexes(directory:EmployeeDirectoryRow[]) {
  const byId = new Map(directory.map(row=>[row.employeeId,row]));
  const byName = new Map<string,EmployeeDirectoryRow|null>();
  directory.forEach(row=>{
    const key = normalizedName(row.name);
    byName.set(key,byName.has(key)?null:row);
  });
  return {byId,byName};
}

function matchDirectoryRow(account:PersonnelAccount,indexes:ReturnType<typeof directoryIndexes>) {
  const accountId = clean(account.employeeId);
  if (accountId) {
    const row = indexes.byId.get(accountId);
    return row ? {row,matchedBy:'employeeId' as const} : null;
  }
  const row = indexes.byName.get(normalizedName(account.name));
  return row ? {row,matchedBy:'name' as const} : null;
}

export function planAccountProfileUpdates(directory:EmployeeDirectoryRow[],accounts:PersonnelAccount[]) {
  const indexes = directoryIndexes(directory);
  return accounts.flatMap(account=>{
    const matched = matchDirectoryRow(account,indexes);
    if (!matched) return [];
    const patch:Partial<PersonnelAccount> = {};
    if (clean(account.employeeId) !== matched.row.employeeId) patch.employeeId = matched.row.employeeId;
    if (clean(account.departmentCode) !== matched.row.departmentCode) patch.departmentCode = matched.row.departmentCode;
    if (clean(account.unit) !== matched.row.unit) patch.unit = matched.row.unit;
    if (clean(account.department) !== matched.row.unit) patch.department = matched.row.unit;
    if (!clean(account.jobTitle)) patch.jobTitle = matched.row.jobTitle;
    return [{email:account.email.toLowerCase(),matchedBy:matched.matchedBy,directory:matched.row,patch}];
  });
}

export function buildDirectoryImportResult(
  directory:EmployeeDirectoryRow[],
  accounts:PersonnelAccount[],
  updates:ReturnType<typeof planAccountProfileUpdates>,
) {
  const byEmail = new Map(accounts.map(account=>[account.email.toLowerCase(),account]));
  return {
    imported:directory.length,
    linkedAccounts:updates.length,
    titlesFilled:updates.filter(update=>!clean(byEmail.get(update.email)?.jobTitle) && !!update.patch.jobTitle).length,
    titlesPreserved:updates.filter(update=>!!clean(byEmail.get(update.email)?.jobTitle)).length,
  };
}

export function mergeDirectoryWithAccounts(directory:EmployeeDirectoryRecord[],accounts:PersonnelAccount[]) {
  const indexes = directoryIndexes(directory);
  const matchedEmails = new Set<string>();
  const accountByEmployeeId = new Map<string,PersonnelAccount>();
  const accountByName = new Map<string,PersonnelAccount|null>();
  accounts.forEach(account=>{
    const id = clean(account.employeeId);
    if (id) accountByEmployeeId.set(id,account);
    const key = normalizedName(account.name);
    accountByName.set(key,accountByName.has(key)?null:account);
  });
  const rows = directory.map(profile=>{
    const account = accountByEmployeeId.get(profile.employeeId) || accountByName.get(normalizedName(profile.name)) || undefined;
    if (account) matchedEmails.add(account.email.toLowerCase());
    return {
      email:account?.email || '',
      name:profile.name,
      employeeId:profile.employeeId,
      departmentCode:profile.departmentCode,
      unit:profile.unit,
      department:profile.unit,
      jobTitle:clean(account?.jobTitle) || profile.jobTitle,
      active:account?.active === true,
      archived:profile.active===false||profile.archived===true,
      accountArchived:account?.archived===true,
      directoryActive:profile.active!==false&&profile.archived!==true,
      bound:!!account?.boundUid,
      updatedAt:account?.updatedAt || '',
      directoryListed:true,
    };
  });
  accounts.filter(account=>!matchedEmails.has(account.email.toLowerCase())).forEach(account=>rows.push({
    email:account.email,
    name:account.name || '',
    employeeId:clean(account.employeeId),
    departmentCode:clean(account.departmentCode),
    unit:clean(account.unit) || clean(account.department),
    department:clean(account.department) || clean(account.unit),
    jobTitle:clean(account.jobTitle),
    active:account.active === true,
    archived:account.archived === true,
    accountArchived:account.archived === true,
    directoryActive:true,
    bound:!!account.boundUid,
    updatedAt:account.updatedAt || '',
    directoryListed:false,
  }));
  return rows.sort((a,b)=>a.employeeId.localeCompare(b.employeeId,'zh-Hant',{numeric:true}) || a.name.localeCompare(b.name,'zh-Hant'));
}
