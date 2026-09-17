export type WorkStatus = 'todo' | 'doing' | 'review' | 'done';
export type WorkPlan = {title:string;description:string;startDate:string;dueDate:string;priority:'low'|'normal'|'high';kind?:'project'|'task';supervisorEmail?:string};
export type WorkLog = {date:string;done:string;next:string;blocker:string;progress:number;actorName:string;at:string};
export type WorkHistory = {action:string;actorName:string;at:string;reason:string;fromDueDate?:string;toDueDate?:string};
export type WorkTask = WorkPlan & {id:string;supervisorName?:string;supervisorTitle?:string;department:string;ownerEmail:string;ownerName:string;status:WorkStatus;progress:number;blocked:boolean;archived:boolean;removed?:boolean;version:number;logs:WorkLog[];history:WorkHistory[];createdAt:string;updatedAt:string;completedAt:string|null;parentId?:string;relatedIds?:string[];checklist?:{id:string;text:string;done:boolean}[];comments?:{text:string;actorName:string;at:string}[];attachments?:{label:string;url:string}[];sourceExampleId?:string;plannedTime?:string};
export type WorkTemplate = {id:string;name:string;title:string;description:string;duration:number;priority:WorkPlan['priority']};
export const statusLabels:Record<WorkStatus,string> = {todo:'未開始',doing:'進行中',review:'待主管確認',done:'已完成'};
export const workAccess = (actor:{email:string}|null) => actor?.email === 'jet@gotofunapp.com';
export function localDay() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validDay(value:unknown):value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}
export function dayDiff(from:string,to:string) { return Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000); }
export function deadlineState(task:Pick<WorkTask,'dueDate'|'status'|'blocked'>,today=localDay()) {
  if(task.status==='done') return 'done';
  if(task.dueDate<today) return 'overdue';
  if(task.blocked) return 'blocked';
  return dayDiff(today,task.dueDate)<=3?'soon':'normal';
}
export const deadlineLabels = {done:'✅ 已完成',overdue:'🔴 已逾期',blocked:'🟡 有阻礙',soon:'🟡 ３天內到期',normal:'🟢 正常'};
