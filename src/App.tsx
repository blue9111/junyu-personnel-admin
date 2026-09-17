import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import PersonnelAdmin from './PersonnelAdmin';
import { readApiJson } from './api';
import './index.css';

type Employee = { uid: string; email: string; name: string; employeeId: string };

export default function App() {
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('正在確認管理權限…');
  const requestVersion = useRef(0);

  useEffect(() => {
    document.title = '君宇集團人員管理後台';
    void (async () => {
      try {
        const response = await fetch('/api/firebase-config', { cache: 'no-store' });
        const config = await response.json();
        if (!response.ok || !Object.values(config).every(Boolean)) throw new Error();
        setFirebaseAuth(getAuth(initializeApp(config)));
      } catch {
        setMessage('尚未設定 Google 登入，請先完成 Firebase 環境變數。');
        setChecking(false);
      } finally {
        setConfigLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    if (!firebaseAuth) {
      setChecking(false);
      setMessage('尚未設定 Google 登入，請先完成 Firebase 環境變數。');
      return;
    }
    return onAuthStateChanged(firebaseAuth, currentUser => {
      requestVersion.current += 1;
      setUser(currentUser);
      setEmployee(null);
      setAuthorized(false);
      setChecking(!!currentUser);
      setMessage(currentUser ? '正在確認管理權限…' : '請使用管理員的公司 Google 帳號登入。');
    });
  }, [configLoaded, firebaseAuth]);

  useEffect(() => {
    if (!user) return;
    const version = ++requestVersion.current;
    void (async () => {
      try {
        if (!user.emailVerified) throw new Error('Google 帳號尚未完成信箱驗證。');
        const response = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data.error || '無法確認管理權限。');
        if (version !== requestVersion.current) return;
        if (data.canManageEmployees !== true || data.employee?.email !== 'jet@gotofunapp.com') {
          throw new Error('此帳號沒有使用人員管理後台的權限。');
        }
        setEmployee(data.employee);
        setAuthorized(true);
        setMessage('公司人員資料庫已連線');
      } catch (error) {
        if (version !== requestVersion.current) return;
        setEmployee(null);
        setAuthorized(false);
        setMessage(error instanceof Error ? error.message : '無法確認管理權限。');
      } finally {
        if (version === requestVersion.current) setChecking(false);
      }
    })();
  }, [user]);

  async function login() {
    if (!firebaseAuth) {
      setMessage('尚未設定 Google 登入，請先完成 Firebase 環境變數。');
      return;
    }
    setMessage('正在開啟 Google 登入…');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
    } catch {
      setMessage('Google 登入未完成，請重新嘗試。');
    }
  }

  async function logout() {
    if (firebaseAuth) await signOut(firebaseAuth);
  }

  return <div className="app-shell personnel-app-shell">
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">J</span>
        <div><strong>君宇集團人員管理後台</strong><small>PERSONNEL ADMIN</small></div>
      </div>
      <div className="account">
        {user
          ? <><span>{employee?.name || user.email}</span><button onClick={logout}>登出</button></>
          : <button className="primary" disabled={!firebaseAuth} onClick={login}>使用 Google 登入</button>}
      </div>
    </header>
    <main className="content personnel-app-content">
      {authorized && user
        ? <>
            <div className="admin-status" role="status"><span className="dot" />{message}</div>
            <PersonnelAdmin user={user} />
          </>
        : <section className="admin-login-card" aria-labelledby="admin-login-title">
            <div className="eyebrow">JUNYU GROUP · PERSONNEL ADMIN</div>
            <h1 id="admin-login-title">人員管理後台</h1>
            <p>集中查看完整公司名冊、搜尋員工，並管理 Google 登入帳號的連結與啟用狀態。</p>
            <div className={`status ${checking ? '' : 'offline'}`} role="status"><span className="dot" />{message}</div>
            {!user && <button className="primary" disabled={!firebaseAuth} onClick={login}>使用管理員 Google 帳號登入</button>}
            {user && !checking && !authorized && <button onClick={logout}>切換 Google 帳號</button>}
          </section>}
    </main>
  </div>;
}
