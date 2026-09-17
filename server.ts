import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveEmployee } from './employee-identity';
import {
  changeDirectoryEmployee,
  changeEmployee,
  importEmployeeDirectory,
  isPersonnelAdmin,
  listEmployees,
  PersonnelError,
} from './personnel-admin';

dotenv.config();

const app = express();
app.use(express.json({ limit: '64kb' }));

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const firebase = projectId ? initializeApp({ credential: applicationDefault(), projectId }) : null;
const db = firebase ? getFirestore(firebase) : null;
const auth = firebase ? getAuth(firebase) : null;
const accessError = '請使用已建檔且啟用的管理員 Google 帳號登入。';

async function userFrom(req: express.Request) {
  const token = /^Bearer (.+)$/.exec(req.header('authorization') || '')?.[1];
  if (!token || !auth || !db) return null;
  try {
    const identity = await auth.verifyIdToken(token, true);
    return await resolveEmployee(db, identity);
  } catch {
    return null;
  }
}

app.get('/api/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!db) return res.json({ ready: false, error: '尚未連線資料庫：請設定 FIREBASE_PROJECT_ID' });
  try {
    await db.collection('company_employee_directory').limit(1).get();
    res.json({ ready: true });
  } catch (error) {
    const failure = error as { code?: unknown; message?: unknown };
    console.error('Firestore health check failed', { code: failure.code, message: failure.message });
    res.json({ ready: false, error: '尚未連線資料庫：請檢查 Firestore 與服務帳戶權限' });
  }
});

app.get('/api/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!db) return res.status(503).json({ error: '尚未連線資料庫' });
  const employee = await userFrom(req);
  if (!employee) return res.status(403).json({ error: accessError });
  res.json({ employee, canManageEmployees: isPersonnelAdmin(employee) });
});

app.use('/api/admin', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!db) return res.status(503).json({ error: '尚未連線資料庫' });
  const employee = await userFrom(req);
  if (!isPersonnelAdmin(employee)) return res.status(403).json({ error: '只有李宗杰可以管理人員。' });
  res.locals.employee = employee;
  next();
});

app.get('/api/admin/employees', async (_req, res) => {
  try {
    res.json({ employees: await listEmployees(db!) });
  } catch {
    res.status(503).json({ error: '讀取人員失敗，請稍後重試。' });
  }
});

app.post('/api/admin/employee-directory/import', async (req, res) => {
  try {
    res.status(201).json(await importEmployeeDirectory(db!, res.locals.employee, req.body));
  } catch (error) {
    res.status(error instanceof PersonnelError ? error.status : 503).json({
      error: error instanceof PersonnelError ? error.message : '匯入公司名冊失敗，請稍後重試。',
    });
  }
});

app.put('/api/admin/employee-directory', async (req, res) => {
  try {
    await changeDirectoryEmployee(db!, res.locals.employee, 'update', req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(error instanceof PersonnelError ? error.status : 503).json({
      error: error instanceof PersonnelError ? error.message : '更新名冊失敗，請稍後重試。',
    });
  }
});

app.post('/api/admin/employee-directory/status', async (req, res) => {
  try {
    const action = req.body?.active === true ? 'enable' : 'disable';
    await changeDirectoryEmployee(db!, res.locals.employee, action, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(error instanceof PersonnelError ? error.status : 503).json({
      error: error instanceof PersonnelError ? error.message : '變更名冊狀態失敗，請稍後重試。',
    });
  }
});

for (const [method, action] of [['post', 'create'], ['put', 'update'], ['delete', 'remove']] as const) {
  app[method]('/api/admin/employees', async (req, res) => {
    try {
      await changeEmployee(db!, res.locals.employee, action, req.body);
      res.status(action === 'create' ? 201 : 200).json({ success: true });
    } catch (error) {
      res.status(error instanceof PersonnelError ? error.status : 503).json({
        error: error instanceof PersonnelError ? error.message : '儲存人員失敗，請重新整理後重試。',
      });
    }
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}

startServer();
