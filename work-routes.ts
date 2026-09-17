import {listSupervisors} from './work-supervisors';
import type {Express,Request} from 'express';
import type {Firestore} from 'firebase-admin/firestore';
import type {Employee} from './employee-identity';
import {workAccess} from './work-model';
import {createWork,listWork,updateWork,WorkError,saveWorkTemplate,listWorkTemplates,removeWork,seedWorkExamples} from './work-service';
export function registerWorkRoutes(app:Express,db:Firestore|null,userFrom:(req:Request)=>Promise<Employee|null>) {
  app.use('/api/work',async(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!db)return res.status(503).json({error:'尚未連線資料庫。'});
    const employee=await userFrom(req);
    if(!employee||!workAccess(employee))return res.status(403).json({error:'研發部試行版目前僅開放李宗杰測試。'});
    res.locals.employee=employee;next();
  });
  app.get('/api/work/people',async(_req,res)=>{try{res.json({people:await listSupervisors(db!)});}catch{res.status(503).json({error:'讀取人員名冊失敗。'});}});
  app.get('/api/work/tasks',async(_req,res)=>{
    try{res.json({tasks:await listWork(db!,res.locals.employee),pilot:true,canReview:true});}
    catch{res.status(503).json({error:'讀取工作失敗，請稍後再試。'});}
  });
  app.get('/api/work/templates',async(_req,res)=>{
    try{res.json({templates:await listWorkTemplates(db!,res.locals.employee)});}
    catch{res.status(503).json({error:'讀取範本失敗。'});}
  });
  app.post('/api/work/templates',async(req,res)=>{
    try{res.status(201).json({template:await saveWorkTemplate(db!,res.locals.employee,req.body)});}
    catch(error){res.status(error instanceof WorkError?error.status:503).json({error:error instanceof WorkError?error.message:'儲存範本失敗。'});}
  });
  app.post('/api/work/tasks',async(req,res)=>{
    try{res.status(201).json({task:await createWork(db!,res.locals.employee,req.body)});}
    catch(error){res.status(error instanceof WorkError?error.status:503).json({error:error instanceof WorkError?error.message:'新增工作失敗。'});}
  });
  app.post('/api/work/examples',async(_req,res)=>{
    try{res.status(201).json(await seedWorkExamples(db!,res.locals.employee));}
    catch(error){res.status(error instanceof WorkError?error.status:503).json({error:error instanceof WorkError?error.message:'套用範例失敗。'});}
  });
  app.put('/api/work/tasks/:id',async(req,res)=>{
    try{res.json({task:await updateWork(db!,res.locals.employee,req.params.id,req.body)});}
    catch(error){res.status(error instanceof WorkError?error.status:503).json({error:error instanceof WorkError?error.message:'更新工作失敗。'});}
  });
  app.delete('/api/work/tasks/:id',async(req,res)=>{
    try{await removeWork(db!,res.locals.employee,req.params.id);res.json({success:true});}
    catch(error){res.status(error instanceof WorkError?error.status:503).json({error:error instanceof WorkError?error.message:'移除工作失敗。'});}
  });
}
