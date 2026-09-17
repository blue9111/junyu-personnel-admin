import type {WorkTask} from './work-model';

export function ancestors(task:WorkTask,tasks:WorkTask[]) {
  const byId=new Map(tasks.map(t=>[t.id,t]));const seen=new Set([task.id]);const result:WorkTask[]=[];
  let current=task;
  while(current.parentId){const parent=byId.get(current.parentId);if(!parent||seen.has(parent.id))break;result.push(parent);seen.add(parent.id);current=parent;}
  return result;
}
export function projectFor(task:WorkTask,tasks:WorkTask[]){return [task,...ancestors(task,tasks)].find(t=>t.kind==='project');}
export function isWorkArchived(task:WorkTask,tasks:WorkTask[]){return [task,...ancestors(task,tasks)].some(t=>t.archived);}
export function canRemoveWork(id:string,tasks:Pick<WorkTask,'id'|'parentId'>[]){return !tasks.some(task=>task.parentId===id);}
export function workTree(tasks:WorkTask[]){
  const rows:{task:WorkTask;depth:number;code:string}[]=[];const seen=new Set<string>();const ids=new Set(tasks.map(t=>t.id));
  const sorted=[...tasks].sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id));
  function visit(task:WorkTask,depth:number,code:string){if(seen.has(task.id))return;seen.add(task.id);rows.push({task,depth,code});sorted.filter(t=>t.parentId===task.id).forEach((child,i)=>visit(child,depth+1,`${code}.${i+1}`));}
  sorted.filter(t=>!t.parentId||!ids.has(t.parentId)).forEach((t,i)=>visit(t,0,String(i+1)));
  for(const task of sorted)if(!seen.has(task.id))visit(task,0,String(rows.filter(r=>r.depth===0).length+1));
  return rows;
}
