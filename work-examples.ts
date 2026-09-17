import source from './src/notion-examples.json';
import type {Employee} from './employee-identity';
import type {WorkStatus,WorkTask} from './work-model';

function supervisor(value:string) {
  const [name,...title]=value.split('-');
  return {supervisorName:name.trim(),supervisorTitle:title.join('-').trim()};
}

function base(actor:Employee,id:string,now:string) {
  return {
    id,
    sourceExampleId:id,
    department:'rd',
    ownerEmail:actor.email,
    ownerName:actor.name,
    progress:0,
    blocked:false,
    archived:false,
    version:1,
    logs:[],
    history:[{action:'import-example',actorName:actor.name,at:now,reason:'套用範例'}],
    createdAt:now,
    updatedAt:now,
    completedAt:null,
  };
}

export function notionExamplesToWorkSeeds(actor:Employee,now=new Date().toISOString()):WorkTask[] {
  const schedules=source.schedule.map(item=>{
    const status:WorkStatus=item.status==='已完成'?'done':'todo';
    return {
      ...base(actor,item.id,now),
      ...supervisor(item.supervisor),
      kind:'task' as const,
      title:item.title,
      description:`${item.department}／${item.type}，預定時間 ${item.time}。`,
      startDate:item.date,
      dueDate:item.date,
      plannedTime:item.time,
      priority:item.priority===1?'high' as const:item.priority===2?'normal' as const:'low' as const,
      status,
      progress:status==='done'?100:0,
    };
  });
  const projects=source.projects.map(item=>{
    const status:WorkStatus=item.status==='執行中'?'doing':'todo';
    return {
      ...base(actor,item.id,now),
      ...supervisor(item.supervisor),
      kind:'project' as const,
      title:item.title,
      description:`${item.department}專案，風險：${item.risk}。`,
      startDate:item.startDate,
      dueDate:item.dueDate,
      priority:item.priority.startsWith('P1')||item.priority.startsWith('P2')?'high' as const:item.priority.startsWith('P3')?'normal' as const:'low' as const,
      status,
    };
  });
  return [...schedules,...projects];
}
