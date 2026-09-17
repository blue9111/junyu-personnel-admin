import {resolveSupervisor} from './work-supervisors';
import type {Firestore} from 'firebase-admin/firestore';
import type {Employee} from './employee-identity';
import {dayDiff,localDay,validDay,workAccess,type WorkPlan,type WorkTask} from './work-model';
import {notionExamplesToWorkSeeds} from './work-examples';
export class WorkError extends Error { constructor(message:string,public status=400){super(message);} }
function text(value:unknown,max:number,required=false) {
  if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())) throw new WorkError('請確認必填文字與字數限制。');
  return value.trim();
}
function plan(input:any):WorkPlan {
  if(!input||!validDay(input.startDate)||!validDay(input.dueDate)||input.dueDate<input.startDate||dayDiff(input.startDate,input.dueDate)>366) throw new WorkError('請填有效的開始日與期限，範圍最多一年。');
  if(!['low','normal','high'].includes(input.priority)) throw new WorkError('請選擇優先程度。');
  return {title:text(input.title,120,true),description:text(input.description,2000),startDate:input.startDate,dueDate:input.dueDate,priority:input.priority};
}
function authorize(actor:Employee) { if(!workAccess(actor)) throw new WorkError('研發部試行版目前僅開放李宗杰測試。',403); }
async function checkParents(tx:any,db:Firestore,actor:Employee,parentId?:string){
  const seen=new Set<string>();
  while(parentId){
    if(!/^[\w-]{1,100}$/.test(parentId)||seen.has(parentId)||seen.size>=50)throw new WorkError('工作階層無效或超過５０層。');
    seen.add(parentId);const parent=(await tx.get(db.collection('rd_work_tasks').doc(parentId))).data() as WorkTask|undefined;
    if(!parent||parent.ownerEmail!==actor.email||parent.department!=='rd')throw new WorkError('母工作不存在或無權限。',403);
    if(parent.archived)throw new WorkError('所屬專案或母工作已封存，請先恢復。',409);
    parentId=parent.parentId;
  }
}
export async function createWork(db:Firestore,actor:Employee,input:unknown):Promise<WorkTask> {
  authorize(actor);const fields=plan(input);const ref=db.collection('rd_work_tasks').doc();const now=new Date().toISOString();
  const kind=(input as any)?.kind??'task';
  if(!['project','task'].includes(kind))throw new WorkError('項目類型無效。');
  if(kind==='project'&&(input as any)?.parentId)throw new WorkError('專案須建立在最上層，專案下請新增工作。');
  fields.kind=kind;
  const task:WorkTask={...fields,id:ref.id,department:'rd',ownerEmail:actor.email,ownerName:actor.name,status:'todo',progress:0,blocked:false,archived:false,version:1,logs:[],history:[{action:'create',actorName:actor.name,at:now,reason:'自行規劃'}],createdAt:now,updatedAt:now,completedAt:null};
  await db.runTransaction(async tx=>{
    const parentId=(input as any)?.parentId;
    if(parentId){
      if(typeof parentId!=='string'||!/^[\w-]{1,100}$/.test(parentId))throw new WorkError('母工作無效。');
      await checkParents(tx,db,actor,parentId);
      const parent=(await tx.get(db.collection('rd_work_tasks').doc(parentId))).data() as WorkTask|undefined;
      if(!parent||parent.ownerEmail!==actor.email||parent.department!=='rd'||parent.archived||['review','done'].includes(parent.status))throw new WorkError('母工作不存在或不可新增子任務。');
      task.parentId=parentId;
    }
    if ((input as any)?.supervisorEmail!==undefined) Object.assign(task,await resolveSupervisor(tx,db,(input as any).supervisorEmail));
    tx.create(ref,task);
  });return task;
}
export async function updateWork(db:Firestore,actor:Employee,id:string,input:any):Promise<WorkTask> {
  authorize(actor);
  if(['comment','attachment','removeAttachment'].includes(input?.action))throw new WorkError('留言與附件功能尚未開放。',403);
  if(!/^[\w-]{1,100}$/.test(id)||!input||!Number.isInteger(input.version)) throw new WorkError('工作識別或版本無效。');
  const ref=db.collection('rd_work_tasks').doc(id);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists) throw new WorkError('找不到工作。',404);
    const old=snap.data() as WorkTask;
    if(old.removed) throw new WorkError('工作已移除。',404);
    if(old.department!=='rd'||old.ownerEmail!==actor.email) throw new WorkError('沒有此工作的權限。',403);
    if(old.version!==input.version) throw new WorkError('工作已更新，請重新整理後再操作。',409);
    await checkParents(tx,db,actor,old.parentId);
    const now=new Date().toISOString();let reason='';let changes:Partial<WorkTask>={};
    if(old.archived&&input.action!=='restore') throw new WorkError('工作已封存，請先恢復。',409);
    if(old.status==='review'&&['plan','log','checklist'].includes(input.action))throw new WorkError('待確認中，請先退回後再修改規劃或紀錄。',409);
    if(old.status==='done'&&!old.sourceExampleId&&!['archive','restore','comment','attachment','removeAttachment','relate','unrelate'].includes(input.action)) throw new WorkError('已完成的工作保留紀錄，不再修改。',409);
    switch(input.action){
      case 'removeAttachment':
        if(!Number.isInteger(input.index)||input.index<0||input.index>=(old.attachments?.length||0))throw new WorkError('附件項目無效。');
        changes={attachments:old.attachments!.filter((_,index)=>index!==input.index)};break;
      case 'unrelate':changes={relatedIds:(old.relatedIds||[]).filter(other=>other!==input.relatedId)};break;
      case 'checklist': {
        if(!Array.isArray(input.items)||input.items.length>50)throw new WorkError('檢查清單最多５０項。');
        const ids=new Set<string>();
        changes={checklist:input.items.map((item:any)=>{if(typeof item.id!=='string'||!/^[\w-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.done!=='boolean')throw new WorkError('檢查清單格式無效。');ids.add(item.id);return{id:item.id,text:text(item.text,200,true),done:item.done};})};break;
      }
      case 'comment':
        if((old.comments?.length||0)>=100)throw new WorkError('留言已達１００則。');
        changes={comments:[...(old.comments||[]),{text:text(input.text,1500,true),actorName:actor.name,at:now}]};break;
      case 'attachment': {
        if((old.attachments?.length||0)>=30)throw new WorkError('附件連結最多３０項。');
        const url=text(input.url,2000,true);let parsed:URL;
        try{parsed=new URL(url);}catch{throw new WorkError('請輸入完整的 HTTPS 檔案網址。');}
        if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new WorkError('附件僅接受 HTTPS 網址，且不可含登入密碼。');
        changes={attachments:[...(old.attachments||[]),{label:text(input.label,120,true),url:parsed.href}]};break;
      }
      case 'relate': {
        const relatedId=text(input.relatedId,100,true);
        if(!/^[\w-]{1,100}$/.test(relatedId)||relatedId===id)throw new WorkError('請選擇另一項工作。');
        const other=(await tx.get(db.collection('rd_work_tasks').doc(relatedId))).data();
        if(!other||other.department!=='rd'||other.ownerEmail!==actor.email)throw new WorkError('關聯工作不存在或無權限。',403);
        if((old.relatedIds?.length||0)>=30)throw new WorkError('關聯工作最多３０項。');
        changes={relatedIds:[...new Set([...(old.relatedIds||[]),relatedId])]};break;
      }
      case 'plan': {
        changes=plan(input);
        if(input.supervisorEmail!==undefined)Object.assign(changes,await resolveSupervisor(tx,db,input.supervisorEmail));
        if(changes.dueDate!==old.dueDate||changes.startDate!==old.startDate) {
          if(typeof input.reason!=='string'||!input.reason.trim()) throw new WorkError('修改日期須填寫原因。');
          reason=text(input.reason,500,true);
        }
        break;
      }
      case 'log': {
        if(old.status==='review') throw new WorkError('待確認中，請先由主管退回後再更新。',409);
        if(!validDay(input.date)||input.date>localDay()||input.date<old.startDate||!Number.isInteger(input.progress)||input.progress<0||input.progress>100) throw new WorkError('請核對紀錄日期與０～１００的完成百分比。');
        if(old.logs.length>=100) throw new WorkError('每日紀錄已達１００筆，請另建後續工作。');
        const log={date:input.date,done:text(input.done,500,true),next:text(input.next,500),blocker:text(input.blocker,500),progress:input.progress,actorName:actor.name,at:now};
        changes={logs:[...old.logs,log],progress:log.progress,blocked:!!log.blocker,status:'doing'};break;
      }
      case 'submit':
        if(!['todo','doing'].includes(old.status)) throw new WorkError('此工作目前不能提交完成。',409);
        changes={status:'review'};break;
      case 'approve':
        if(old.status!=='review') throw new WorkError('只有待確認工作可核准完成。',409);
        changes={status:'done',progress:100,blocked:false,completedAt:now};break;
      case 'return':
        if(old.status!=='review') throw new WorkError('只有待確認工作可退回。',409);
        reason=text(input.reason,500,true);changes={status:'doing'};break;
      case 'archive':changes={archived:true};break;
      case 'restore':changes={archived:false};break;
      default:throw new WorkError('不支援此操作。');
    }
    if(old.history.length>=200) throw new WorkError('工作異動已達２００筆，請另建後續工作。');
    const next:WorkTask={...old,...changes,version:old.version+1,updatedAt:now,history:[...old.history,{action:input.action,actorName:actor.name,at:now,reason,...(input.action==='plan'?{fromDueDate:old.dueDate,toDueDate:changes.dueDate}:{})}]};
    tx.set(ref,next);return next;
  });
}
export async function listWork(db:Firestore,actor:Employee) {
  authorize(actor);const snapshot=await db.collection('rd_work_tasks').get();
  return snapshot.docs.map(doc=>({...doc.data(),id:doc.id}) as WorkTask).filter(task=>task.department==='rd'&&task.ownerEmail===actor.email&&!task.removed).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}

export async function seedWorkExamples(db:Firestore,actor:Employee) {
  authorize(actor);const now=new Date().toISOString();const seeds=notionExamplesToWorkSeeds(actor,now);
  const refs=seeds.map(task=>db.collection('rd_work_tasks').doc(task.id));
  const snapshots=await Promise.all(refs.map(ref=>ref.get()));
  const batch=db.batch();let created=0;
  snapshots.forEach((snapshot,index)=>{if(!snapshot.exists){batch.create(refs[index],seeds[index]);created++;}});
  if(created)await batch.commit();
  return {created,existing:seeds.length-created,total:seeds.length};
}

export async function removeWork(db:Firestore,actor:Employee,id:string) {
  authorize(actor);
  if(!/^[\w-]{1,100}$/.test(id))throw new WorkError('工作識別無效。');
  const ref=db.collection('rd_work_tasks').doc(id);
  await db.runTransaction(async tx=>{
    const [snapshot,children]=await Promise.all([tx.get(ref),tx.get(db.collection('rd_work_tasks').where('parentId','==',id))]);
    if(!snapshot.exists||snapshot.data()?.removed)throw new WorkError('找不到工作。',404);
    const old=snapshot.data() as WorkTask;
    if(old.department!=='rd'||old.ownerEmail!==actor.email)throw new WorkError('沒有此工作的權限。',403);
    if(children.docs.some(child=>child.data().removed!==true))throw new WorkError('此項目仍有子工作，請先移除或改掛子工作。',409);
    const now=new Date().toISOString();
    tx.update(ref,{removed:true,removedAt:now,removedBy:actor.email,updatedAt:now,version:old.version+1,history:[...old.history,{action:'remove',actorName:actor.name,at:now,reason:'由人員管理畫面確認移除'}]});
  });
}
export async function saveWorkTemplate(db:Firestore,actor:Employee,input:any) {
  authorize(actor);const fields=plan(input);const name=text(input.name,80,true);const ref=db.collection('rd_work_templates').doc();
  const template={id:ref.id,name,title:fields.title,description:fields.description,priority:fields.priority,duration:dayDiff(fields.startDate,fields.dueDate),ownerEmail:actor.email};
  await db.runTransaction(async tx=>{tx.create(ref,template);});return template;
}
export async function listWorkTemplates(db:Firestore,actor:Employee){
  authorize(actor);const snapshot=await db.collection('rd_work_templates').get();
  return snapshot.docs.map(doc=>({...doc.data(),id:doc.id})).filter((row:any)=>row.ownerEmail===actor.email);
}
