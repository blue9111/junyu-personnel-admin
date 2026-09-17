import type {Firestore} from 'firebase-admin/firestore';

export type RosterRow = {email:string; name:string; employeeId:string; active:boolean;department?:string;departmentCode?:string;unit?:string;jobTitle?:string};
export function validateRoster(input: unknown): RosterRow[] {
  if (!Array.isArray(input) || input.length > 200) throw Error('名冊必須是陣列，每批最多２００筆。');
  const emails = new Set<string>(); const ids = new Set<string>();
  return input.map((value, index) => {
    const fail = () => { throw Error(`第 ${index + 1} 筆資料無效或重複，請核對公司信箱、姓名、工號及 active。`); };
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !['email','name','employeeId','active','department','departmentCode','unit','jobTitle'].includes(key)) ||
        typeof value.email !== 'string' || typeof value.name !== 'string' || typeof value.active !== 'boolean' ||
        (value.employeeId != null && typeof value.employeeId !== 'string')) return fail();
    const email = value.email.trim().toLowerCase(); const name = value.name.trim(); const employeeId = (value.employeeId || '').trim();
    if (!/^[^@\s/]+@gotofunapp\.com$/.test(email) || !name || name.length > 80 || employeeId.length > 40 ||
        emails.has(email) || (employeeId && ids.has(employeeId))) return fail();
    emails.add(email); if (employeeId) ids.add(employeeId);
    const profile: {department?:string;departmentCode?:string;unit?:string;jobTitle?:string} = {};
    for (const key of ['department','departmentCode','unit','jobTitle'] as const) { if(value[key]!==undefined){if(typeof value[key]!=='string'||value[key].trim().length>80)return fail();profile[key]=value[key].trim();}}
    return {email,name,employeeId,active:value.active,...profile};
  });
}

export async function importRoster(db: Firestore, input: unknown): Promise<number> {
  const rows = validateRoster(input);
  if (!rows.length) return 0;
  await db.runTransaction(async tx => {
    const refs = rows.map(row => db.collection('meeting_employees').doc(row.email));
    const existing = await Promise.all(refs.map(ref => tx.get(ref)));
    rows.forEach((row, index) => {
      const old = existing[index].data();
      if (old?.boundUid && old.employeeId && old.employeeId !== row.employeeId) throw Error('已綁定帳號的工號不同，請由管理員先核對身分。');
      tx.set(refs[index], {name:row.name,employeeId:row.employeeId,active:row.active,...(row.department!==undefined?{department:row.department}:{}),...(row.jobTitle!==undefined?{jobTitle:row.jobTitle}:{})}, {merge:true});
    });
  });
  return rows.length;
}
