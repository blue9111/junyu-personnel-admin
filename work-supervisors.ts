import type {Firestore} from 'firebase-admin/firestore';
import {WorkError} from './work-service';
import {mergeDirectoryWithAccounts,type PersonnelAccount} from './employee-directory';
export async function resolveSupervisor(tx:any,db:Firestore,email:unknown){
 if(email==='')return {supervisorEmail:'',supervisorName:'',supervisorTitle:''};
 if(typeof email!=='string'||email.length>254)throw new WorkError('請從人員名冊選擇主管。');
 const key=email.trim().toLowerCase();
 const employeeId=key.startsWith('employee:')?key.slice(9):'';
 if(employeeId&&!/^[\w-]{1,40}$/.test(employeeId)||!employeeId&&!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(key))throw new WorkError('請從人員名冊選擇主管。');
 const snap=await tx.get(db.collection(employeeId?'company_employee_directory':'meeting_employees').doc(employeeId||key));const person=snap.data();
 if(!snap.exists||person?.archived===true||(!!employeeId&&person?.active===false)||typeof person?.name!=='string'||!person.name.trim())throw new WorkError('主管不存在或已停用，請重新選擇。');
 return {supervisorEmail:key,supervisorName:person.name.trim(),supervisorTitle:typeof person.jobTitle==='string'?person.jobTitle:''};
}
export async function listSupervisors(db:Firestore){
 const [accountSnapshot,directorySnapshot]=await Promise.all([db.collection('meeting_employees').get(),db.collection('company_employee_directory').get()]);
 const accounts:PersonnelAccount[]=accountSnapshot.docs.map(doc=>({email:doc.id,...doc.data()} as PersonnelAccount));
 const directory=directorySnapshot.docs.map(doc=>({employeeId:doc.id,name:doc.data().name,departmentCode:doc.data().departmentCode,unit:doc.data().unit,jobTitle:doc.data().jobTitle,active:doc.data().active!==false,archived:doc.data().archived===true}));
 return mergeDirectoryWithAccounts(directory,accounts).filter(row=>row.directoryActive!==false&&!row.archived&&row.name).map(row=>({email:row.email&&row.active&&!row.accountArchived?row.email:`employee:${row.employeeId}`,name:row.name,department:row.unit,jobTitle:row.jobTitle,active:row.active}));
}
