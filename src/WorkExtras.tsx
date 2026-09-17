import {useEffect,useState} from 'react';
import type {WorkTask} from '../work-model';
import {statusLabels} from '../work-model';
type Props={task:WorkTask;tasks:WorkTask[];busy:boolean;onAction:(action:string,payload?:Record<string,unknown>)=>Promise<void>;onOpen:(task:WorkTask)=>void;onChild:(task:WorkTask)=>void};
export default function WorkExtras({task,tasks,busy,onAction,onOpen,onChild}:Props){
  const [item,setItem]=useState('');const [related,setRelated]=useState('');
  useEffect(()=>{setItem('');setRelated('');},[task.id]);
  const editable=!task.archived&&task.status!=='done'&&task.status!=='review';
  const children=tasks.filter(other=>other.parentId===task.id&&!other.archived);
  const parent=tasks.find(other=>other.id===task.parentId);
  const relations=tasks.filter(other=>(task.relatedIds||[]).includes(other.id));
  return <div className="work-extras">
    <section><h3>子任務 <small>{children.filter(t=>t.status==='done').length}／{children.length} 完成</small></h3>{parent&&<p>所屬工作：<button className="work-inline" onClick={()=>onOpen(parent)}>{parent.title}</button></p>}{children.map(child=><button className="work-child" key={child.id} onClick={()=>onOpen(child)}><strong>{child.title}</strong><small>{child.ownerName} · {child.dueDate} · {statusLabels[child.status]}</small></button>)}{editable&&<button disabled={busy} onClick={()=>onChild(task)}>＋ 新增子任務</button>}<small className="work-hint">子任務各自規劃期限與確認完成，不會自動改動母工作狀態。</small></section>
    <section><h3>檢查清單 <small>{(task.checklist||[]).filter(i=>i.done).length}／{task.checklist?.length||0}</small></h3>{(task.checklist||[]).map(entry=><div className="work-check" key={entry.id}><label><input type="checkbox" disabled={busy||!editable} checked={entry.done} onChange={()=>onAction('checklist',{items:task.checklist!.map(i=>i.id===entry.id?{...i,done:!i.done}:i)})}/><span className={entry.done?'checked':''}>{entry.text}</span></label>{editable&&<button aria-label={'移除檢查項目 '+entry.text} disabled={busy} onClick={()=>onAction('checklist',{items:task.checklist!.filter(i=>i.id!==entry.id)})}>×</button>}</div>)}{editable&&<form className="work-inline-form" onSubmit={e=>{e.preventDefault();void onAction('checklist',{items:[...(task.checklist||[]),{id:crypto.randomUUID(),text:item,done:false}]});}}><input aria-label="新增檢查項目" required maxLength={200} placeholder="例如：完成測試環境準備" value={item} onChange={e=>setItem(e.target.value)}/><button disabled={busy||!item.trim()}>新增</button></form>}</section>
    <section><h3>關聯工作</h3>{relations.map(other=><div className="work-related" key={other.id}><button className="work-inline" onClick={()=>onOpen(other)}>{other.title}</button><button disabled={busy||task.archived} onClick={()=>onAction('unrelate',{relatedId:other.id})}>解除關聯</button></div>)}{!task.archived&&<div className="work-inline-form"><select aria-label="選擇關聯工作" value={related} onChange={e=>setRelated(e.target.value)}><option value="">選擇工作…</option>{tasks.filter(other=>other.id!==task.id&&!other.archived&&!(task.relatedIds||[]).includes(other.id)).map(other=><option key={other.id} value={other.id}>{other.title}</option>)}</select><button disabled={busy||!related} onClick={()=>onAction('relate',{relatedId:related})}>加入關聯</button></div>}<small className="work-hint">用於連結相關工作，不自動限制開始或完成時間。</small></section>
  </div>;
}
