import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {User} from 'firebase/auth';
import {readApiJson} from './api';
import {deadlineState,deadlineLabels,dayDiff,localDay,statusLabels,type WorkTask,type WorkPlan,type WorkStatus,type WorkTemplate} from '../work-model';
import WorkExtras from './WorkExtras';
import NotionExamples from './NotionExamples';
import WheelPicker from './WheelPicker';
import {ancestors,canRemoveWork,isWorkArchived,projectFor,workTree} from '../work-hierarchy';
import './work-calendar.css';
type View='list'|'board'|'calendar'|'gantt'|'stats';
type Section='schedule'|'projects'|'control'|'reports'|'archive';
const sections:{id:Section;title:string;description:string;view:View}[]=[
{id:'schedule',title:'📅 月曆與工作排程',description:'年度工作資料庫：每個人的工作與期限。',view:'calendar'},
{id:'projects',title:'📋 專案管理／待辦事項',description:'專案拆成待辦，再逐步規劃子任務。',view:'list'},
{id:'control',title:'📈 管制用甘特圖／WBS',description:'依工作階層檢視起訖日期與執行進度。',view:'gantt'},
{id:'reports',title:'📊 檢視／報告用',description:'查看各人員進度、逾期與待確認工作。',view:'stats'},
{id:'archive',title:'📦 封存專案',description:'保留專案及工作歷程，需要時可恢復。',view:'list'}];
const statuses=Object.keys(statusLabels) as WorkStatus[];
const priorityLabels={low:'低',normal:'一般',high:'高'};
const actionLabels:Record<string,string>={create:'新增工作',plan:'修改規劃',log:'每日更新',submit:'提交完成',approve:'主管確認完成',return:'退回補充',archive:'封存',restore:'恢復',remove:'移除','import-example':'套用範例'};
const blankPlan=():WorkPlan=>({title:'',description:'',startDate:localDay(),dueDate:localDay(),priority:'normal'});
function moveDay(day:string,amount:number){return new Date(Date.parse(day+'T00:00:00Z')+amount*86400000).toISOString().slice(0,10);}
export default function WorkCalendar({user,area='schedule'}:{user:User;area?:'schedule'|'projects'}) {
  const [people,setPeople]=useState<{email:string;name:string;department:string;jobTitle:string;active:boolean}[]>([]);
  const [tasks,setTasks]=useState<WorkTask[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [view,setView]=useState<View>(area==='schedule'?'calendar':'list');
  const [search,setSearch]=useState('');
  const [owner,setOwner]=useState('all');
  const [filter,setFilter]=useState('all');
  const [grouped,setGrouped]=useState(true);
  const [section,setSection]=useState<Section>(area==='schedule'?'schedule':'projects');
  const [project,setProject]=useState('all');
  function changeSection(id:Section){setSection(id);setView(sections.find(s=>s.id===id)!.view);setFilter('all');setSearch('');setOwner('all');setProject('all');}
  const [month,setMonth]=useState(()=>localDay().slice(0,7));
  const [selected,setSelected]=useState<WorkTask|null>(null);
  const [creating,setCreating]=useState(false);
  const [parentId,setParentId]=useState('');
  const [templates,setTemplates]=useState<WorkTemplate[]>([]);
  const [templateName,setTemplateName]=useState('');
  const [showReminders,setShowReminders]=useState(false);
  const [plan,setPlan]=useState<WorkPlan>(blankPlan);
  const [reason,setReason]=useState('');
  const [log,setLog]=useState({date:localDay(),done:'',next:'',blocker:'',progress:0});
  const dialog=useRef<HTMLDialogElement>(null);
  const version=useRef(0);
  const today=localDay();
  async function api(method='GET',body?:unknown,id?:string,resource='tasks') {
    const response=await fetch('/api/work/'+resource+(id?'/'+encodeURIComponent(id):''),{method,headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await readApiJson(response);
    if(!response.ok)throw Error(data.error||'工作資料暫時無法使用。');
    return data;
  }
  async function load(){
    const current=++version.current;setLoading(true);setError('');
    try{const [data,templateData,peopleData]=await Promise.all([api(),api('GET',undefined,undefined,'templates'),api('GET',undefined,undefined,'people')]);if(current!==version.current)return;if(!Array.isArray(data.tasks))throw Error('工作資料格式錯誤。');setPeople(peopleData.people||[]);setTasks(data.tasks);setTemplates(templateData.templates||[]);}
    catch(error){if(current===version.current){setTasks([]);setError(error instanceof Error?error.message:'讀取失敗');}}
    finally{if(current===version.current)setLoading(false);}
  }
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('work-data-updated',refresh);return()=>{version.current++;window.removeEventListener('work-data-updated',refresh);};},[user]);
  function open(task?:WorkTask,example=false){
    setSelected(task||null);setCreating(!task);setError('');setReason('');setParentId('');setTemplateName('');
    setPlan(task?{kind:task.kind,title:task.title,description:task.description,startDate:task.startDate,dueDate:task.dueDate,priority:task.priority,supervisorEmail:task.supervisorEmail||''}:example?{title:'【測試】新產品樣機驗證',description:'整理測試案例、執行功能驗證，完成後提交結果供主管確認。',startDate:today,dueDate:moveDay(today,5),priority:'normal'}:blankPlan());
    setLog({date:today,done:'',next:'',blocker:'',progress:task?.progress||0});if(!dialog.current?.open)dialog.current?.showModal();
  }
  async function mutate(action:string,extra:Record<string,unknown>={}){
    if(busy)return;setBusy(true);setError('');
    try{
      const body=creating?{...plan,parentId:parentId||undefined}:{action,version:selected!.version,...(action==='plan'?{...plan,reason}:action==='log'?log:{reason}),...extra};
      const result=await api(creating?'POST':'PUT',body,selected?.id);
      setTasks(previous=>[...previous.filter(t=>t.id!==result.task.id),result.task].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)));
      setSelected(result.task);setCreating(false);setReason('');window.dispatchEvent(new Event('work-data-updated'));
      setMessage(action==='approve'?'已確認完成，紀錄已保留。':action==='return'?'已退回，請依原因補充。':action==='submit'?'已提交完成，等待主管確認。':'工作資料已儲存。');
      if(action==='log')setLog({...log,done:'',next:'',blocker:'',progress:result.task.progress});
      if(action==='archive'||action==='restore')dialog.current?.close();
    }catch(error){setError(error instanceof Error?error.message:'儲存失敗');}
    finally{setBusy(false);}
  }
  async function applyExamples(){
    if(busy)return;setBusy(true);setError('');
    try{const result=await api('POST',{},undefined,'examples');await load();setMessage(`已套用全部 ${result.total} 筆範例；新增 ${result.created} 筆，原有 ${result.existing} 筆保留。`);}
    catch(error){setError(error instanceof Error?error.message:'套用範例失敗。');}
    finally{setBusy(false);}
  }
  async function removeSelected(){
    if(!selected||busy||!canRemoveWork(selected.id,tasks))return;
    if(!window.confirm(`確定移除「${selected.title}」？移除後不會顯示；需要保留查閱時請改用封存。`))return;
    setBusy(true);setError('');
    try{await api('DELETE',undefined,selected.id);setTasks(previous=>previous.filter(task=>task.id!==selected.id));setSelected(null);dialog.current?.close();setMessage('項目已移除。');window.dispatchEvent(new Event('work-data-updated'));}
    catch(error){setError(error instanceof Error?error.message:'移除失敗。');}
    finally{setBusy(false);}
  }
  const owners=[...new Map(tasks.map(t=>[t.ownerEmail,t.ownerName])).entries()];
  const projects=tasks.filter(t=>t.kind==='project');
  const active=tasks.filter(t=>!isWorkArchived(t,tasks)&&t.kind!=='project');
  const currentSection=sections.find(s=>s.id===section)!;
  const summaryItems=section==='archive'?tasks.filter(t=>isWorkArchived(t,tasks)&&t.kind!=='project'):active;
  const reminders=summaryItems.filter(t=>t.status!=='done'&&deadlineState(t,today)!=='normal');
  const allTemplates:WorkTemplate[]=[{id:'sample',name:'樣機驗證',title:'新產品樣機驗證',description:'整理測試案例、執行功能驗證，完成後提交結果供主管確認。',duration:5,priority:'normal'},{id:'firmware',name:'韌體開發',title:'韌體功能開發',description:'確認需求、完成實作、測試與版本交付。',duration:10,priority:'high'},{id:'review',name:'設計審查',title:'產品設計審查',description:'整理設計文件、確認風險與改善事項。',duration:3,priority:'normal'},...templates];
  async function saveTemplate(){setBusy(true);setError('');try{const data=await api('POST',{...plan,name:templateName},undefined,'templates');setTemplates([...templates,data.template]);setTemplateName('');setMessage('已儲存工作範本。');}catch(error){setError(error instanceof Error?error.message:'儲存範本失敗');}finally{setBusy(false);}}
  const visible=tasks.filter(t=>(area==='schedule'?t.kind!=='project':t.kind==='project'||!!projectFor(t,tasks))&&(section==='archive'?isWorkArchived(t,tasks):!isWorkArchived(t,tasks))&&(project==='all'||project==='none'&&!projectFor(t,tasks)||projectFor(t,tasks)?.id===project)&&(owner==='all'||t.ownerEmail===owner)&&`${t.title} ${t.description} ${t.ownerName}`.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||filter==='overdue'&&deadlineState(t,today)==='overdue'||filter==='soon'&&['soon','blocked'].includes(deadlineState(t,today))||t.status===filter));
  const reportItems=visible.filter(t=>t.kind!=='project');
  const visibleIds=new Set(visible.map(t=>t.id));
  const treeIds=new Set(visible.flatMap(t=>[t.id,...ancestors(t,tasks).map(a=>a.id)]));
  const tree=workTree(tasks).filter(r=>treeIds.has(r.task.id));
  const selectedArchived=!!selected&&isWorkArchived(selected,tasks);
  const groups=grouped?[...new Map(visible.map(t=>[t.ownerEmail,t.ownerName])).entries()].map(([email,name])=>({name,items:visible.filter(t=>t.ownerEmail===email)})):[{name:'全部工作',items:visible}];
  const first=month+'-01';const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();const last=month+'-'+String(days).padStart(2,'0');
  const offset=new Date(first+'T12:00:00').getDay();
  function changeMonth(amount:number){const date=new Date(first+'T12:00:00');date.setMonth(date.getMonth()+amount);setMonth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`);}
  function badge(task:WorkTask){const state=deadlineState(task,today);return <span className={`work-badge ${state}`}>{deadlineLabels[state]}</span>;}
  function card(task:WorkTask){return <button className="work-card" key={task.id} onClick={()=>open(task)}><div>{badge(task)}<span className="work-priority">{priorityLabels[task.priority]}優先</span></div><strong>{task.title}</strong><span>{task.ownerName} · 截止 {task.dueDate}</span><div className="work-progress"><i style={{width:task.progress+'%'}}/></div><small>{task.progress}％ · {task.logs.length?'最近更新 '+task.updatedAt.slice(0,10):'尚未填寫每日進度'}</small></button>;}
  return <div className="work-space" style={{marginBottom:48,paddingTop:24,borderTop:area==='projects'?'2px solid #dce3ee':undefined}}>
    <header className="work-header"><div><h1>{area==='schedule'?'月曆與 2026 工作任務與排程DB':'專案管理'}</h1><p>{area==='schedule'?'每日工作、時間與人員安排。':'代辦事項、管制用甘特圖WBS、檢視／報告用、封存專案。'}</p></div><button className="primary" onClick={()=>{open();if(area==='projects')setPlan({...blankPlan(),kind:'project'});}} disabled={loading||busy}>{area==='schedule'?'＋ 新增工作':'＋ 新增專案'}</button></header>
    {area==='schedule'&&<div className="work-pilot">目前以李宗杰帳號測試。正式主管規劃：莊鈞奐／總經理，尚未綁定帳號。</div>}
    {area==='projects'&&<nav className="work-sections" aria-label="專案管理檢視">{sections.filter(item=>item.id!=='schedule').map(item=><button key={item.id} aria-current={section===item.id?'page':undefined} onClick={()=>changeSection(item.id)}>{item.id==='projects'?'代辦事項':item.id==='control'?'管制用甘特圖WBS':item.id==='reports'?'檢視／報告用':'封存專案'}</button>)}</nav>}
    <NotionExamples area={area} liveTasks={tasks} onOpenTask={task=>open(task)} onApplyAll={applyExamples} applying={busy} onCreateDate={day=>{open();setPlan({...blankPlan(),startDate:day,dueDate:day});}} projectView={section==='control'?'管制用甘特圖WBS':section==='reports'?'檢視／報告用':section==='archive'?'封存專案':'代辦事項'}/>
    <details open={tasks.some(t=>area==='schedule'?t.kind!=='project':t.kind==='project')}><summary style={{padding:'16px 0',fontWeight:700,cursor:'pointer'}}>正式{area==='schedule'?'工作':'專案'}資料與管理工具（{tasks.filter(t=>area==='schedule'?t.kind!=='project':t.kind==='project').length}）</summary>
    <div className="work-tools"><button onClick={()=>setShowReminders(!showReminders)}>🔔 到期與卡關提醒（{reminders.length}）</button><small>提醒顯示於系統內，不會寄送郵件。</small></div>
    {showReminders&&<section className="work-reminders"><h2>今日需關注</h2>{reminders.map(t=><button key={t.id} onClick={()=>open(t)}>{badge(t)}　{t.ownerName}｜{t.title}　截止 {t.dueDate}</button>)}{!reminders.length&&<p>目前沒有即將到期、逾期或卡關工作。</p>}</section>}
    <div className="work-summary">{[['all',section==='archive'?'封存工作':'全部工作',summaryItems.length],['doing','進行中',summaryItems.filter(t=>t.status==='doing').length],['soon','需注意',summaryItems.filter(t=>['soon','blocked'].includes(deadlineState(t,today))).length],['overdue','已逾期',summaryItems.filter(t=>deadlineState(t,today)==='overdue').length],['review','待確認',summaryItems.filter(t=>t.status==='review').length]].map(([key,label,count])=><button key={String(key)} className={filter===key?'selected':''} onClick={()=>setFilter(String(key))}><span>{label}</span><strong>{count}</strong></button>)}</div>
    <section className="work-database"><h2 className="work-db-title">{section==='schedule'?`${today.slice(0,4)} 工作任務與排程DB`:currentSection.title}</h2>
      {area==='schedule'&&<div className="work-tabs" role="tablist" aria-label="工作資料視圖">{([['list','☷ 清單'],['board','▥ 看板'],['calendar','▦ 行事曆']] as [View,string][]).map(([key,label])=><button key={key} role="tab" aria-selected={view===key} onClick={()=>setView(key)}>{label}</button>)}</div>}
      <div className="work-tools"><input aria-label="搜尋工作" placeholder="搜尋工作或人員…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="負責人" value={owner} onChange={e=>setOwner(e.target.value)}><option value="all">全部人員</option>{owners.map(([email,name])=><option key={email} value={email}>{name}</option>)}</select><select aria-label="工作狀態" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部狀態</option>{statuses.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}<option value="soon">需注意</option><option value="overdue">已逾期</option></select><button disabled={loading||busy} onClick={load}>重新整理</button><select aria-label="所屬專案篩選" value={project} onChange={e=>setProject(e.target.value)}><option value="all">全部專案與工作</option><option value="none">未歸入專案</option>{projects.filter(t=>section==='archive'?isWorkArchived(t,tasks):!isWorkArchived(t,tasks)).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
      {message&&<p className="work-success" role="status">{message}</p>}{error&&<p className="work-error" role="alert">{error}</p>}
      {loading?<p className="work-empty">正在讀取工作資料…</p>:<>
      {view==='stats'&&<div className="work-statistics"><h2>人員工作分布</h2><p>依目前篩選的待辦與子任務統計，專案容器不重複計數；工作數量不等同工作量或績效。</p><div className="work-table-scroll"><table className="work-table"><thead><tr><th>負責人</th><th>工作數</th><th>進行中</th><th>待確認</th><th>已完成</th><th>已逾期</th><th>完成比例</th></tr></thead><tbody>{owners.filter(([email])=>owner==='all'||email===owner).map(([email,name])=>{const items=reportItems.filter(t=>t.ownerEmail===email);const done=items.filter(t=>t.status==='done').length;return <tr key={email}><td>{name}</td><td>{items.length}</td><td>{items.filter(t=>t.status==='doing').length}</td><td>{items.filter(t=>t.status==='review').length}</td><td>{done}</td><td>{items.filter(t=>deadlineState(t,today)==='overdue').length}</td><td>{items.length?Math.round(done/items.length*100):0}％</td></tr>;})}</tbody></table></div></div>}
      {section==='reports'&&<div className="work-report-focus"><h3>主管需處理</h3>{reportItems.filter(t=>t.status==='review'||deadlineState(t,today)==='overdue'||t.blocked).map(t=><button key={t.id} onClick={()=>open(t)}><span>{t.ownerName}｜{t.title}</span><span>{statusLabels[t.status]} · {deadlineLabels[deadlineState(t,today)]}</span></button>)}{!reportItems.some(t=>t.status==='review'||deadlineState(t,today)==='overdue'||t.blocked)&&<p>目前篩選範圍沒有待確認、逾期或卡關工作。</p>}</div>}
      {view==='list'&&(section==='projects'||section==='archive')?<div className="work-table-scroll"><table className="work-table"><thead><tr><th>WBS／專案與待辦</th><th>負責人</th><th>狀態</th><th>期限</th><th>進度</th></tr></thead><tbody>{tree.map(({task,depth,code})=><tr key={task.id} className={!visibleIds.has(task.id)?'work-context-row':''}><td><button className="work-title-button" style={{paddingLeft:Math.min(depth,8)*18}} onClick={()=>open(task)}>{code}　{task.kind==='project'?'📁 ':''}{task.title}{!visibleIds.has(task.id)?'（所屬項目）':''}{isWorkArchived(task,tasks)?'（已封存）':''}</button></td><td>{task.ownerName}</td><td>{statusLabels[task.status]}</td><td>{task.startDate}～{task.dueDate}</td><td>{task.progress}％</td></tr>)}</tbody></table></div>:view==='list'&&<><label className="work-group-toggle"><input type="checkbox" checked={grouped} onChange={e=>setGrouped(e.target.checked)}/>依負責人分組</label>{groups.map(group=><section className="work-group" key={group.name}><h2>{group.name}<span>{group.items.length} 項工作</span></h2><div className="work-table-scroll"><table className="work-table"><thead><tr><th>工作項目</th><th>負責人</th><th>狀態</th><th>開始日</th><th>截止日</th><th>進度</th><th>期限提醒</th></tr></thead><tbody>{group.items.map(task=><tr key={task.id}><td><button className="work-title-button" onClick={()=>open(task)}>{task.title}{task.archived?'（已封存）':''}</button><small>{priorityLabels[task.priority]}優先</small></td><td>{task.ownerName}</td><td><span className={'work-state '+task.status}>{statusLabels[task.status]}</span></td><td>{task.startDate}</td><td>{task.dueDate}</td><td>{task.progress}％</td><td>{badge(task)}</td></tr>)}</tbody></table></div></section>)}</>}
      {view==='board'&&<div className="work-board">{statuses.map(status=><section key={status}><h2><span className={'work-state '+status}>{statusLabels[status]}</span><small>{visible.filter(t=>t.status===status).length}</small></h2>{visible.filter(t=>t.status===status).map(card)}{!visible.some(t=>t.status===status)&&<p className="work-column-empty">目前沒有工作</p>}</section>)}</div>}
      {(view==='calendar'||view==='gantt')&&<><div className="work-month"><button aria-label="前一個月" onClick={()=>changeMonth(-1)}>‹</button><h2>{month.replace('-',' 年 ')} 月</h2><button aria-label="後一個月" onClick={()=>changeMonth(1)}>›</button><button onClick={()=>setMonth(today.slice(0,7))}>本月</button><small>{view==='calendar'?'依截止日顯示工作，點選查看完整規劃。':'WBS 依專案／工作／子任務排列；橫條為個別規劃日期，父層進度不自動加總。'}</small></div>
      {view==='calendar'?<div className="work-calendar-scroll"><div className="work-calendar">{['日','一','二','三','四','五','六'].map(d=><div className="work-weekday" key={d}>{d}</div>)}{Array.from({length:offset},(_,i)=><div className="work-day blank" key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const day=month+'-'+String(i+1).padStart(2,'0');return <div key={day} className={'work-day '+(day===today?'today':'')}><button type="button" aria-label={day+' 新增工作'} onClick={()=>{open();setPlan({...blankPlan(),startDate:day,dueDate:day});}}><strong>{i+1}</strong> ＋</button>{visible.filter(t=>t.dueDate===day).map(t=><button key={t.id} className={'work-calendar-item '+deadlineState(t,today)} onClick={()=>open(t)}><b>{t.plannedTime?`${t.plannedTime} `:''}{t.title}</b><span>{t.ownerName}</span></button>)}</div>;})}</div></div>:<div className="work-gantt-scroll"><div className="work-gantt" style={{'--work-days':days} as CSSProperties}><div className="work-gantt-row work-gantt-head"><strong>WBS／工作／負責人</strong><div className="work-gantt-track">{Array.from({length:days},(_,i)=><span key={i} className={month+'-'+String(i+1).padStart(2,'0')===today?'is-today':''}>{i+1}</span>)}</div></div>{tree.filter(r=>r.task.startDate<=last&&r.task.dueDate>=first||tree.some(child=>child.task.startDate<=last&&child.task.dueDate>=first&&ancestors(child.task,tasks).some(a=>a.id===r.task.id))).map(({task:t,depth,code})=>{const start=Math.max(0,dayDiff(first,t.startDate));const end=Math.min(days-1,dayDiff(first,t.dueDate));return <div className="work-gantt-row" key={t.id}><button className="work-gantt-name" style={{paddingLeft:12+Math.min(depth,8)*16}} onClick={()=>open(t)}><b>{code}　{t.kind==='project'?'📁 ':''}{t.title}</b><small>{t.ownerName} · {t.progress}％</small></button><div className="work-gantt-track">{end>=start&&<button className={'work-gantt-bar '+deadlineState(t,today)} style={{gridColumn:`${start+1} / ${end+2}`}} onClick={()=>open(t)} title={`${t.title}：${t.startDate}～${t.dueDate}`} aria-label={`${t.title}，${t.startDate} 至 ${t.dueDate}`}><span>{t.startDate<first?'← ':''}{t.title}{t.dueDate>last?' →':''}</span></button>}</div></div>;})}</div></div>}</>}
      {!visible.length&&<div className="work-empty"><h2>{section==='archive'?'目前沒有符合條件的封存項目':tasks.length?'沒有符合條件的工作':'從第一項工作開始'}</h2><p>{section==='archive'?'封存後可在此查詢與恢復。':'工作會同步出現在清單、看板、月曆與甘特圖。'}</p>{section!=='archive'&&<><button onClick={()=>open(undefined,true)}>套用「樣機驗證」測試範例</button><small>只填入表單，按儲存才建立。</small></>}</div>}
      </>}
    </section>
    </details>
    <dialog className="work-dialog" ref={dialog} onCancel={e=>{if(busy)e.preventDefault();}}><div className="work-dialog-top"><div><small>WORK DETAILS</small><h2>{creating?'新增工作規劃':selected?.title}</h2></div><button aria-label="關閉工作詳情" disabled={busy} onClick={()=>dialog.current?.close()}>×</button></div>
      {error&&<p className="work-error" role="alert">{error}</p>}{selected&&<div className="work-detail-status"><span className={'work-state '+selected.status}>{statusLabels[selected.status]}</span>{badge(selected)}<strong>{selected.progress}％</strong></div>}
      {creating&&<section className="work-tools"><label>從範本規劃工作（選填）<select aria-label="選擇工作範本" value="" onChange={e=>{const template=allTemplates.find(t=>t.id===e.target.value);if(template){setPlan({...plan,title:template.title,description:template.description,dueDate:moveDay(plan.startDate,template.duration),priority:template.priority});}}}><option value="">＋ 從範本規劃工作</option>{allTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><small>日期已帶入，可直接填寫；套用範本會依開始日計算期限。</small></section>}<form onSubmit={e=>{e.preventDefault();void mutate('plan');}}><fieldset disabled={busy||!!selected&&((selected.status==='done'&&!selected.sourceExampleId)||selectedArchived||selected.status==='review')}>{creating&&<div className="work-form-grid"><label>項目類型<select value={plan.kind||'task'} onChange={e=>{setPlan({...plan,kind:e.target.value as 'task'|'project'});setParentId('');}}><option value="task">待辦工作</option><option value="project">專案</option></select></label>{plan.kind!=='project'&&<label>所屬專案／母工作<select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">獨立工作</option>{tasks.filter(t=>!isWorkArchived(t,tasks)&&!['review','done'].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.kind==='project'?'📁 ':''}{t.title}</option>)}</select></label>}</div>}<label>主管<select value={plan.supervisorEmail||''} onChange={e=>setPlan({...plan,supervisorEmail:e.target.value})}><option value="">未指定主管</option>{plan.supervisorEmail&&!people.some(p=>p.email===plan.supervisorEmail)&&<option value={plan.supervisorEmail}>原主管已移除／不可選用</option>}{people.map(p=><option key={p.email} value={p.email}>{p.name}／{p.jobTitle||'職稱未設定'}{p.active?'':'（尚未啟用登入）'}</option>)}</select></label><label>主管職稱（名冊自動帶入）<input readOnly value={people.find(p=>p.email===plan.supervisorEmail)?.jobTitle||''} placeholder="請先在人員後台填寫職稱"/></label><p className="work-muted">主管資料來自 Firebase 人員名冊；指定主管不會自動開放登入或審核權限。</p><label>工作項目<input required maxLength={120} value={plan.title} onChange={e=>setPlan({...plan,title:e.target.value})}/></label><label>工作說明與預期成果<textarea maxLength={2000} rows={3} value={plan.description} onChange={e=>setPlan({...plan,description:e.target.value})}/></label><div className="work-form-grid"><label>開始日<WheelPicker kind="date" label="開始日期" value={plan.startDate} onChange={day=>setPlan({...plan,startDate:day,dueDate:plan.dueDate<day?day:plan.dueDate})}/></label><label>截止日<WheelPicker kind="date" label="結束日期" value={plan.dueDate} onChange={day=>setPlan({...plan,dueDate:day})}/></label><label>優先程度<select value={plan.priority} onChange={e=>setPlan({...plan,priority:e.target.value as WorkPlan['priority']})}><option value="low">低</option><option value="normal">一般</option><option value="high">高</option></select></label></div>{selected&&(plan.startDate!==selected.startDate||plan.dueDate!==selected.dueDate)&&
<label>調整日期原因<input required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
<div className="work-plan-summary"><strong>{plan.title||'工作規劃'} · {plan.startDate<=plan.dueDate?dayDiff(plan.startDate,plan.dueDate)+1:0} 天</strong><p>{plan.startDate} ～ {plan.dueDate}</p><small>負責人：{selected?.ownerName||'李宗杰'}{plan.supervisorEmail?' · 主管：'+(people.find(p=>p.email===plan.supervisorEmail)?.name||selected?.supervisorName||'未指定'):''}</small></div><div className="work-plan-actions"><button type="button" onClick={()=>dialog.current?.close()}>返回</button><button type="submit" className="primary">{busy?'儲存中…':creating?'儲存工作':'儲存規劃'}</button></div></fieldset></form>
      <section className="work-template-save"><label>另存為工作範本<input maxLength={80} placeholder="輸入範本名稱" value={templateName} onChange={e=>setTemplateName(e.target.value)}/></label><button disabled={busy||!templateName.trim()||!plan.title.trim()} onClick={saveTemplate}>儲存範本</button></section>
      {creating&&parentId&&<p className="work-pilot">此工作是「{tasks.find(t=>t.id===parentId)?.title}」的子任務。</p>}
      {selected&&<WorkExtras task={{...selected,archived:selectedArchived}} tasks={tasks} busy={busy} onAction={mutate} onOpen={open} onChild={parent=>{open();setParentId(parent.id);setPlan({...blankPlan(),startDate:parent.startDate,dueDate:parent.dueDate});}}/>}
      {selected&&<><section className="work-log-form"><h3>每日工作紀錄</h3>{!selectedArchived&&!['review','done'].includes(selected.status)&&<form onSubmit={e=>{e.preventDefault();void mutate('log');}}><fieldset disabled={busy}><div className="work-form-grid"><label>紀錄日期<input required type="date" min={selected.startDate} max={today} value={log.date} onChange={e=>setLog({...log,date:e.target.value})}/></label><label>完成進度（％）<input type="number" required min={0} max={100} value={log.progress} onChange={e=>setLog({...log,progress:Number(e.target.value)})}/></label></div><label>今天完成了什麼？<textarea required maxLength={500} value={log.done} onChange={e=>setLog({...log,done:e.target.value})}/></label><label>下一步<textarea maxLength={500} value={log.next} onChange={e=>setLog({...log,next:e.target.value})}/></label><label>卡關／需要協助（沒有可留空）<textarea maxLength={500} value={log.blocker} onChange={e=>setLog({...log,blocker:e.target.value})}/></label><button type="submit">新增每日紀錄</button></fieldset></form>}{selected.logs.length?[...selected.logs].reverse().map((entry,i)=><article className="work-log" key={i}><strong>{entry.date} · {entry.actorName} · {entry.progress}％</strong><p>{entry.done}</p>{entry.next&&<p>下一步：{entry.next}</p>}{entry.blocker&&<p className="work-blocker">需要協助：{entry.blocker}</p>}</article>):<p className="work-muted">尚未填寫每日紀錄。</p>}</section>
      {!selectedArchived&&<section className="work-review"><h3>完成確認</h3>{['todo','doing'].includes(selected.status)&&<><p>完成工作後提交，經主管確認才列為已完成。</p><button disabled={busy} className="primary" onClick={()=>mutate('submit')}>提交完成</button></>}{selected.status==='review'&&<><p>主管測試操作：目前由李宗杰確認，所有操作保留本人姓名。</p><label>退回原因<input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="work-review-buttons"><button disabled={busy||!reason.trim()} onClick={()=>mutate('return')}>退回補充</button><button className="primary" disabled={busy} onClick={()=>mutate('approve')}>確認完成</button></div></>}{selected.status==='done'&&<p>{selected.completedAt?`✅ 已於 ${new Date(selected.completedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})} 確認完成。`:'✅ 範例原始狀態為已完成；實際完成時間未提供。'}</p>}</section>}</>}
      {selected&&<><details className="work-history"><summary>查看異動紀錄（{selected.history.length}）</summary>{[...selected.history].reverse().map((entry,i)=><p key={i}>{new Date(entry.at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})} · {entry.actorName} · {actionLabels[entry.action]||entry.action}{entry.fromDueDate&&`（期限 ${entry.fromDueDate} → ${entry.toDueDate}）`}{entry.reason&&`：${entry.reason}`}</p>)}</details>{selectedArchived&&!selected.archived?<p>所屬專案或母工作已封存，請先恢復上層項目。</p>:<><p className="work-muted">封存會連同下層工作移到封存區，紀錄保留；恢復後可繼續查閱。</p><button className="work-archive" disabled={busy} onClick={()=>mutate(selected.archived?'restore':'archive')}>{selected.archived?'恢復項目':'封存項目（保留紀錄）'}</button></>}<section className="work-remove"><p className="work-muted">移除後不再顯示；若需要保留查閱，請使用封存。</p><button className="danger" disabled={busy||!canRemoveWork(selected.id,tasks)} onClick={removeSelected}>移除項目</button>{!canRemoveWork(selected.id,tasks)&&<small>此項目仍有子工作，請先處理子工作。</small>}</section></>}
    </dialog>
  </div>;
}

