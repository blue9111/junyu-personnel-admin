import './personnel-admin.css';
import {useEffect,useState} from 'react';
import type {User} from 'firebase/auth';
import {readApiJson} from './api';

type Row={email:string;name:string;employeeId:string;active:boolean;department?:string;departmentCode?:string;unit?:string;jobTitle?:string;archived?:boolean;bound?:boolean;directoryListed?:boolean;directoryActive?:boolean};
type DirectoryForm={originalEmployeeId:string;email:string;employeeId:string;name:string;departmentCode:string;unit:string;jobTitle:string};
const empty:Row={email:'',name:'',employeeId:'',active:false};

export default function PersonnelAdmin({user}:{user:User}) {
  const [rows,setRows]=useState<Row[]>([]);
  const [accountForm,setAccountForm]=useState<Row|null>(null);
  const [directoryForm,setDirectoryForm]=useState<DirectoryForm|null>(null);
  const [creating,setCreating]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [showDisabled,setShowDisabled]=useState(false);
  const [accountConfirmation,setAccountConfirmation]=useState<{row:Row}|null>(null);
  const [directoryConfirmation,setDirectoryConfirmation]=useState<{row:Row;active:boolean}|null>(null);

  async function api(path:string,method='GET',body?:unknown) {
    const response=await fetch(path,{method,headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await readApiJson(response);
    if(!response.ok) throw Error(data.error||'人員管理暫時無法使用。');
    return data;
  }
  async function load(){setError('');try{const data=await api('/api/admin/employees');setRows(data.employees);}catch(error){setRows([]);setError(error instanceof Error?error.message:'讀取失敗');}}
  useEffect(()=>{void load();},[user]);

  async function saveAccount(row:Row,method:string){
    setBusy(true);setError('');setMessage('');
    try{await api('/api/admin/employees',method,row);setAccountForm(null);setAccountConfirmation(null);setMessage(method==='POST'?'已新增待確認人員。核對帳號與姓名後，再確認啟用。':row.active?'已啟用登入帳號。':'已停用登入帳號，歷史紀錄保留。');await load();}
    catch(error){setError(error instanceof Error?error.message:'儲存失敗');}finally{setBusy(false);}
  }
  async function saveDirectory(){
    if(!directoryForm)return;setBusy(true);setError('');setMessage('');
    try{await api('/api/admin/employee-directory','PUT',directoryForm);setDirectoryForm(null);setMessage('已更新名冊資料；已連結帳號同步更新姓名、部門與職稱。');await load();}
    catch(error){setError(error instanceof Error?error.message:'更新名冊失敗');}finally{setBusy(false);}
  }
  async function changeDirectoryStatus(){
    if(!directoryConfirmation)return;setBusy(true);setError('');setMessage('');
    try{await api('/api/admin/employee-directory/status','POST',{employeeId:directoryConfirmation.row.employeeId,active:directoryConfirmation.active});setMessage(directoryConfirmation.active?'已重新啟用名冊；登入帳號仍需另外確認啟用。':'已停用人員，歷史預約、工作與稽核紀錄均保留。');setDirectoryConfirmation(null);await load();}
    catch(error){setError(error instanceof Error?error.message:'變更名冊狀態失敗');}finally{setBusy(false);}
  }
  async function importDirectory(file:File){
    setBusy(true);setError('');setMessage('');
    try{const body=JSON.parse(await file.text());const data=await api('/api/admin/employee-directory/import','POST',body);setMessage(`已匯入 ${data.imported} 位員工，連結 ${data.linkedAccounts} 個帳號；補入 ${data.titlesFilled} 個職稱，保留 ${data.titlesPreserved} 個既有職稱。`);await load();}
    catch(error){setError(error instanceof Error?error.message:'公司名冊匯入失敗。');}finally{setBusy(false);}
  }
  function editDirectory(row:Row){setDirectoryForm({originalEmployeeId:row.employeeId,email:row.email,employeeId:row.employeeId,name:row.name,departmentCode:row.departmentCode||'',unit:row.unit||row.department||'',jobTitle:row.jobTitle||''});setAccountForm(null);setAccountConfirmation(null);setDirectoryConfirmation(null);setError('');}
  const visible=rows.filter(row=>(showDisabled||!row.archived)&&`${row.name} ${row.email} ${row.employeeId} ${row.departmentCode||''} ${row.unit||''} ${row.jobTitle||''}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="personnel-panel">
    <div className="calendar-toolbar"><div><h1>完整人員清單</h1><p>公司正式名冊與 Google 登入帳號對照</p></div></div>
    <p>只有李宗杰可以管理。名冊資料可逐欄修改；停用人員時，既有預約、工作與姓名紀錄仍會保留。</p>
    <div className="personnel-summary"><strong>{rows.filter(row=>row.directoryListed&&!row.archived).length}</strong><span>啟用名冊人數</span><strong>{rows.filter(row=>row.email&&!row.archived).length}</strong><span>已連結帳號</span><strong>{rows.filter(row=>row.directoryListed&&!row.archived&&!row.email).length}</strong><span>尚未連結帳號</span></div>
    <div className="toolbar-actions"><button className="primary" disabled={busy} onClick={()=>{setCreating(true);setAccountForm({...empty});setDirectoryForm(null);}}>＋ 新增登入帳號</button><label className="file-button" aria-disabled={busy}>匯入公司名冊<input type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void importDirectory(file);e.currentTarget.value='';}}/></label><button disabled={busy} onClick={load}>重新整理</button><input aria-label="搜尋人員" placeholder="搜尋姓名、工號、單位或職稱" value={query} onChange={e=>setQuery(e.target.value)}/><label><input type="checkbox" checked={showDisabled} onChange={e=>setShowDisabled(e.target.checked)}/>顯示已停用</label></div>
    {message&&<p className="notice" role="status">🟢 {message}</p>}{error&&<p className="form-error" role="alert">🔴 {error}</p>}

    {directoryForm&&<form className="personnel-form" onSubmit={e=>{e.preventDefault();void saveDirectory();}}><h2>編輯名冊資料</h2>{directoryForm.email&&<p>已連結帳號：<strong>{directoryForm.email}</strong></p>}<fieldset disabled={busy}><div className="form-grid directory-form-grid"><label>工號<input required maxLength={40} value={directoryForm.employeeId} onChange={e=>setDirectoryForm({...directoryForm,employeeId:e.target.value})}/></label><label>姓名<input required maxLength={80} value={directoryForm.name} onChange={e=>setDirectoryForm({...directoryForm,name:e.target.value})}/></label><label>部門代號<input required maxLength={20} value={directoryForm.departmentCode} onChange={e=>setDirectoryForm({...directoryForm,departmentCode:e.target.value})}/></label><label>單位<input required maxLength={80} value={directoryForm.unit} onChange={e=>setDirectoryForm({...directoryForm,unit:e.target.value})}/></label><label>職稱<input required maxLength={80} value={directoryForm.jobTitle} onChange={e=>setDirectoryForm({...directoryForm,jobTitle:e.target.value})}/></label></div><p>變更工號時會保留舊工號的稽核紀錄，並將已連結帳號移至新工號。</p><button type="button" onClick={()=>setDirectoryForm(null)}>返回</button><button className="primary" type="submit">{busy?'儲存中…':'確認儲存名冊'}</button></fieldset></form>}

    {accountForm&&<form className="personnel-form" onSubmit={e=>{e.preventDefault();void saveAccount(accountForm,creating?'POST':'PUT');}}><h2>{creating?'連結公司 Google 帳號':'編輯登入帳號'}</h2><fieldset disabled={busy}><div className="form-grid"><label>公司 Google 帳號<input required type="email" readOnly={!creating} value={accountForm.email} placeholder="name@gotofunapp.com" onChange={e=>setAccountForm({...accountForm,email:e.target.value})}/></label><label>正式姓名<input required maxLength={80} value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})}/></label><label>工號<input maxLength={40} readOnly={!!accountForm.bound&&!!accountForm.employeeId} value={accountForm.employeeId} onChange={e=>setAccountForm({...accountForm,employeeId:e.target.value})}/></label><label>部門代號<input maxLength={20} value={accountForm.departmentCode||''} onChange={e=>setAccountForm({...accountForm,departmentCode:e.target.value})}/></label><label>單位<input maxLength={80} value={accountForm.unit||accountForm.department||''} onChange={e=>setAccountForm({...accountForm,unit:e.target.value,department:e.target.value})}/></label><label>職稱<input maxLength={80} value={accountForm.jobTitle||''} onChange={e=>setAccountForm({...accountForm,jobTitle:e.target.value})}/></label></div><button type="button" onClick={()=>setAccountForm(null)}>返回</button><button className="primary" type="submit">{busy?'儲存中…':creating?'新增待確認':'確認儲存帳號'}</button></fieldset></form>}

    {directoryConfirmation&&<div className="personnel-form" role="dialog" aria-label="確認名冊狀態"><h2>{directoryConfirmation.active?'重新啟用人員':'停用人員'}</h2><p>{directoryConfirmation.row.name}（工號 {directoryConfirmation.row.employeeId}）</p><p>{directoryConfirmation.active?'重新顯示於名冊及主管選單；登入帳號仍需另外確認啟用。':'停止登入及主管指派，歷史預約、工作與稽核紀錄均保留。'}</p><button disabled={busy} onClick={()=>setDirectoryConfirmation(null)}>返回</button><button className={directoryConfirmation.active?'primary':'danger'} disabled={busy} onClick={()=>void changeDirectoryStatus()}>{busy?'處理中…':'確認'}</button></div>}
    {accountConfirmation&&<div className="personnel-form" role="dialog" aria-label="確認登入權限"><h2>{accountConfirmation.row.active?'確認啟用登入':'確認停用登入'}</h2><p>{accountConfirmation.row.name}（{accountConfirmation.row.email}）</p><p>{accountConfirmation.row.active?'確認此帳號與姓名屬於同一人後，才開放登入。':'登入權限將停止，歷史紀錄保留。'}</p><button disabled={busy} onClick={()=>setAccountConfirmation(null)}>返回</button><button className="primary" disabled={busy} onClick={()=>void saveAccount(accountConfirmation.row,'PUT')}>{busy?'處理中…':'確認'}</button></div>}

    <div className="personnel-list">{visible.map(row=><article key={row.email||`directory-${row.employeeId}`} className="personnel-row"><div><strong>{row.name}</strong><p className="personnel-profile"><span>工號：{row.employeeId||'未設定'}</span><span>部門代號：{row.departmentCode||'未設定'}</span><span>單位：{row.unit||row.department||'未設定'}</span><span>職稱：{row.jobTitle||'未設定'}</span></p><small>{row.email||'尚未連結公司 Google 帳號'}・{row.email?(row.bound?'已完成首次登入':'尚未首次登入'):'不具登入權限'}</small></div><div className="personnel-actions"><p>{row.archived?'🔴 已停用':row.email&&row.active?'🟢 名冊及登入已啟用':row.email?'🟡 名冊啟用／登入停用':'⚪ 名冊啟用／未連結帳號'}</p><div className="toolbar-actions">{row.directoryListed&&<button disabled={busy} onClick={()=>editDirectory(row)}>編輯資料</button>}{row.directoryListed&&(row.directoryActive===false||row.archived)?<button disabled={busy} onClick={()=>{setDirectoryConfirmation({row,active:true});setDirectoryForm(null);}}>重新啟用</button>:row.directoryListed&&row.email===user.email?.toLowerCase()?<small>管理員本人，受保護</small>:row.directoryListed&&<button className="danger" disabled={busy} onClick={()=>{setDirectoryConfirmation({row,active:false});setDirectoryForm(null);}}>停用人員</button>}{!row.email&&row.directoryActive!==false&&<button disabled={busy} onClick={()=>{setCreating(true);setAccountForm({...row,email:'',active:false});setDirectoryForm(null);}}>連結公司帳號</button>}{row.email&&row.email!==user.email?.toLowerCase()&&row.directoryActive!==false&&<button disabled={busy} onClick={()=>setAccountConfirmation({row:{...row,active:!row.active}})}>{row.active?'停用登入':'確認啟用登入'}</button>}</div></div></article>)}</div>
    {!visible.length&&!error&&<p>目前沒有符合條件的人員。</p>}
  </section>;
}
