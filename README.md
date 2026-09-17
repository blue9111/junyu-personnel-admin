# 君宇集團人員管理後台

獨立的人員管理 App。它會合併 Firestore 的完整公司名冊 `company_employee_directory` 與 Google 登入帳號 `meeting_employees`，所以尚未連結登入帳號的員工仍會出現在清單中。

## 功能

- 使用 Firebase Google 登入驗證管理員
- 顯示完整名冊、已連結帳號與尚未連結帳號人數
- 依姓名、信箱、工號、部門、單位或職稱搜尋
- 編輯名冊資料、停用或重新啟用員工
- 連結及管理 `@gotofunapp.com` Google 登入帳號
- 匯入 JSON 公司名冊並保留稽核紀錄

目前管理權限限 `jet@gotofunapp.com`，前端顯示與後端 API 都會檢查權限。

## 本機執行

1. 將 `.env.example` 複製為 `.env`，填入 Firebase Web App 設定與 `FIREBASE_PROJECT_ID`。
2. 使用 Google Application Default Credentials，或在 Cloud Run 使用具 Firestore 存取權的服務帳戶。
3. 執行 `npm install` 與 `npm run dev`。

## 驗證

- `npm run lint`
- `npm run build`
