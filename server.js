const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5500;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const ASSETS_DIR = path.join(ROOT, 'assets');
const USERS_DIR = path.join(ASSETS_DIR, 'users');
const AUTH_DB = path.join(USERS_DIR, 'users.json');
const PUBLIC_USERS_DB = path.join(DATA_DIR, 'users.json');
const MEMBER_PROFILES_DB = path.join(DATA_DIR, 'memberProfiles.json');
const ECHO_PROFILES_DB = path.join(DATA_DIR, 'echoProfiles.json');
const TASKS_DB = path.join(DATA_DIR, 'echoTasks.json');
const LIVE_DB = path.join(DATA_DIR, 'liveUpdates.json');
const MEMORIES_DB = path.join(DATA_DIR, 'memories.json');
const PROB_DB = path.join(DATA_DIR, 'probabilities.json');
const LOCATIONS_DB = path.join(DATA_DIR, 'userLocations.json');
const MAP_SESSIONS_DB = path.join(DATA_DIR, 'mapSessions.json');

for (const d of [DATA_DIR, ASSETS_DIR, USERS_DIR]) fs.mkdirSync(d, { recursive: true });
function ensure(file, fallback){ if(!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback,null,2), 'utf8'); }
ensure(AUTH_DB, { users: [] }); ensure(PUBLIC_USERS_DB, []); ensure(MEMBER_PROFILES_DB, []); ensure(ECHO_PROFILES_DB, []);
ensure(TASKS_DB, { tasks: [] }); ensure(LIVE_DB, { updates: [] }); ensure(MEMORIES_DB, { memories: [] }); ensure(PROB_DB, { probabilities: {} }); ensure(LOCATIONS_DB, { locations: [] }); ensure(MAP_SESSIONS_DB, { sessions: [] });

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret:'soulmatch-v30-local-dev', resave:false, saveUninitialized:false, cookie:{ httpOnly:true, sameSite:'lax', maxAge:1000*60*60*24*14 }}));
app.use(express.static(ROOT));

function readJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file, data){ fs.writeFileSync(file, JSON.stringify(data,null,2), 'utf8'); }
function authDB(){ const db=readJson(AUTH_DB,{users:[]}); if(!Array.isArray(db.users)) db.users=[]; return db; }
function safeUser(u){ if(!u) return null; const { passwordHash, ...safe } = u; return safe; }
function requireAuth(req,res,next){ if(!req.session.userId) return res.status(401).json({ok:false,error:'Not logged in.'}); next(); }
function currentUser(req){ const db=authDB(); return db.users.find(u=>u.id===req.session.userId)||null; }
function zodiacFromDate(dateStr){ if(!dateStr) return ''; const d=new Date(dateStr+'T12:00:00'); if(Number.isNaN(d.getTime())) return ''; const month=d.getMonth(), day=d.getDate(); const signs=[['Capricorn',20],['Aquarius',19],['Pisces',20],['Aries',20],['Taurus',21],['Gemini',21],['Cancer',22],['Leo',23],['Virgo',23],['Libra',23],['Scorpio',22],['Sagittarius',22],['Capricorn',32]]; return day<signs[month][1]?signs[month][0]:signs[month+1][0]; }
function sanitizeEchoDraft(draft){ if(!draft||typeof draft!=='object') return null; const result=draft.result||{}; const answers=Array.isArray(draft.answers)?draft.answers.slice(0,120).map(a=>({key:String(a.key||'').slice(0,80),text:String(a.text||'').slice(0,320),value:Number(a.value||0)})):[]; return { version:String(draft.version||'echo-v30').slice(0,50), savedAt:new Date().toISOString(), createdAt:String(draft.createdAt||new Date().toISOString()), result:{type:String(result.type||'Echo AI Twin').slice(0,90),summary:String(result.summary||'EchoProfile progress saved.').slice(0,600),echoScore:Number(result.echoScore||answers.length||0)}, scores:draft.scores||{}, answers }; }
function attachEchoProfile(user,draft){ const clean=sanitizeEchoDraft(draft); if(!clean) return null; user.echoProfile=clean; user.profile=user.profile||{}; user.profile.soulType=clean.result.type; user.profile.echoScore=clean.result.echoScore; const list=readJson(ECHO_PROFILES_DB,[]); const entry={userId:user.id,name:user.name,email:user.email,...clean}; const idx=list.findIndex(x=>x.userId===user.id); if(idx>=0) list[idx]=entry; else list.push(entry); writeJson(ECHO_PROFILES_DB,list); return clean; }
function syncPublicProfile(user){ const list=readJson(PUBLIC_USERS_DB,[]); const p=user.profile||{}; const profile={id:user.id,name:p.displayName||user.name,age:p.age||'',height:p.height||'',quote:p.quote||p.bio||'New SoulMatch user.',zodiac:p.zodiac||zodiacFromDate(p.birthDate),soulType:p.soulType||user.echoProfile?.result?.type||'',echoScore:p.echoScore||user.echoProfile?.result?.echoScore||'',photos:Array.isArray(p.photos)&&p.photos.length?p.photos:['/assets/profiles/demo-profile-001.svg']}; const idx=list.findIndex(x=>x.id===user.id); if(idx>=0) list[idx]=profile; else list.unshift(profile); writeJson(PUBLIC_USERS_DB,list); }

app.get('/api/health',(req,res)=>res.json({ok:true,app:'SoulMatch v31 AR Map Engine',time:new Date().toISOString()}));
app.get('/api/me',(req,res)=>res.json({ok:true,user:safeUser(currentUser(req))}));
app.post('/api/register', async (req,res)=>{ const name=String(req.body.name||'').trim(); const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||''); const confirmPassword=String(req.body.confirmPassword||password); const birthDate=String(req.body.birthDate||'').trim(); const birthTime=String(req.body.birthTime||'').trim(); const height=String(req.body.height||'').trim(); if(name.length<2) return res.status(400).json({ok:false,error:'Name must be at least 2 characters.'}); if(!email.includes('@')) return res.status(400).json({ok:false,error:'Enter a valid email.'}); if(password.length<6) return res.status(400).json({ok:false,error:'Password must be at least 6 characters.'}); if(password!==confirmPassword) return res.status(400).json({ok:false,error:'Passwords do not match.'}); if(height){ const h=Number(height); if(h<1.30||h>1.90) return res.status(400).json({ok:false,error:'Height must be between 1.30 and 1.90.'}); } const db=authDB(); if(db.users.some(u=>u.email===email)) return res.status(409).json({ok:false,error:'This email is already registered.'}); const id=crypto.randomUUID(); fs.mkdirSync(path.join(USERS_DIR,id),{recursive:true}); const user={id,name,email,passwordHash:await bcrypt.hash(password,10),createdAt:new Date().toISOString(),folder:`/assets/users/${id}/`,profile:{displayName:name,age:'',height,birthDate,birthTime,zodiac:zodiacFromDate(birthDate),bio:'',quote:'New SoulMatch user.',photos:[]}}; if(req.body.echoDraft) attachEchoProfile(user, req.body.echoDraft); db.users.push(user); writeJson(AUTH_DB,db); syncPublicProfile(user); req.session.userId=id; res.json({ok:true,user:safeUser(user),redirect:'/member-onboarding/'}); });
app.post('/api/login', async (req,res)=>{ const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||''); const db=authDB(); const user=db.users.find(u=>u.email===email); if(!user || !(await bcrypt.compare(password,user.passwordHash))) return res.status(401).json({ok:false,error:'Wrong email or password.'}); req.session.userId=user.id; res.json({ok:true,user:safeUser(user),redirect:'/member-onboarding/'}); });
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.post('/api/profile', requireAuth, (req,res)=>{ const db=authDB(); const user=db.users.find(u=>u.id===req.session.userId); if(!user) return res.status(404).json({ok:false,error:'User not found.'}); user.profile={...user.profile,...req.body}; if(user.profile.birthDate) user.profile.zodiac=zodiacFromDate(user.profile.birthDate); writeJson(AUTH_DB,db); syncPublicProfile(user); res.json({ok:true,user:safeUser(user)}); });
app.get('/api/echo-profile', requireAuth, (req,res)=>res.json({ok:true,echoProfile:currentUser(req)?.echoProfile||null}));
app.post('/api/echo-profile', requireAuth, (req,res)=>{ const db=authDB(); const user=db.users.find(u=>u.id===req.session.userId); if(!user) return res.status(404).json({ok:false,error:'User not found.'}); const clean=attachEchoProfile(user, req.body.echoDraft||req.body); if(!clean) return res.status(400).json({ok:false,error:'Invalid EchoProfile.'}); writeJson(AUTH_DB,db); syncPublicProfile(user); res.json({ok:true,echoProfile:clean,user:safeUser(user)}); });
const storage=multer.diskStorage({destination:(req,file,cb)=>{const dir=path.join(USERS_DIR,req.session.userId||'guest');fs.mkdirSync(dir,{recursive:true});cb(null,dir)},filename:(req,file,cb)=>cb(null,`profile-${Date.now()}${path.extname(file.originalname||'.jpg')}`)}); const upload=multer({storage,limits:{fileSize:8*1024*1024}});
app.post('/api/upload-photo', requireAuth, upload.single('photo'), (req,res)=>{ if(!req.file) return res.status(400).json({ok:false,error:'Upload an image file.'}); const db=authDB(); const user=db.users.find(u=>u.id===req.session.userId); const url=`/assets/users/${user.id}/${req.file.filename}`; user.profile.photos=user.profile.photos||[]; user.profile.photos.unshift(url); writeJson(AUTH_DB,db); syncPublicProfile(user); res.json({ok:true,photoUrl:url,user:safeUser(user)}); });
app.post('/api/upload-avatar', requireAuth, upload.single('avatar'), (req,res)=>{ if(!req.file) return res.status(400).json({ok:false,error:'Upload an avatar photo or video.'}); const db=authDB(); const user=db.users.find(u=>u.id===req.session.userId); const url=`/assets/users/${user.id}/${req.file.filename}`; user.profile.avatarUrl=url; user.profile.avatarMimeType=req.file.mimetype||''; writeJson(AUTH_DB,db); res.json({ok:true,avatarUrl:url,mimeType:user.profile.avatarMimeType,user:safeUser(user)}); });
app.post('/api/location/current', requireAuth, (req,res)=>{ const db=readJson(LOCATIONS_DB,{locations:[]}); const loc=req.body.location||{}; const pov=req.body.pov||loc; const entry={ id:crypto.randomUUID(), userId:req.session.userId, exact:{ lat:Number(loc.lat), lng:Number(loc.lng), accuracy:Math.round(Number(loc.accuracy||0)), heading:loc.heading??null, speed:loc.speed??null }, pov:{ lat:Number(pov.lat||loc.lat), lng:Number(pov.lng||loc.lng), accuracy:Math.round(Number(pov.accuracy||loc.accuracy||0)) }, heading:Number(req.body.heading||0), publicApprox: loc.lat?{ lat:Number(loc.lat).toFixed(4), lng:Number(loc.lng).toFixed(4), accuracy:Math.round(Number(loc.accuracy||0)) }:null, createdAt:new Date().toISOString() }; if(!Number.isFinite(entry.exact.lat)||!Number.isFinite(entry.exact.lng)) return res.status(400).json({ok:false,error:'Invalid coordinates.'}); db.locations.unshift(entry); db.locations=db.locations.slice(0,500); writeJson(LOCATIONS_DB,db); res.json({ok:true,location:entry}); });
app.get('/api/location/current', requireAuth, (req,res)=>{ const db=readJson(LOCATIONS_DB,{locations:[]}); const location=(db.locations||[]).find(x=>x.userId===req.session.userId)||null; res.json({ok:true,location}); });
app.post('/api/map-session', requireAuth, (req,res)=>{ const db=readJson(MAP_SESSIONS_DB,{sessions:[]}); const s={id:crypto.randomUUID(),userId:req.session.userId,startedAt:new Date().toISOString(),mode:String(req.body.mode||'ar-pov').slice(0,40),location:req.body.location||null,notes:String(req.body.notes||'').slice(0,240)}; db.sessions.unshift(s); db.sessions=db.sessions.slice(0,500); writeJson(MAP_SESSIONS_DB,db); res.json({ok:true,session:s}); });

app.get('/api/users',(req,res)=>res.json({ok:true,users:readJson(PUBLIC_USERS_DB,[])}));
app.get('/api/member-profiles',(req,res)=>{ const registered=readJson(PUBLIC_USERS_DB,[]); const demo=readJson(MEMBER_PROFILES_DB,[]); res.json({ok:true,profiles:[...registered,...demo]}); });
app.get('/api/tasks',(req,res)=>{ const tasks=readJson(TASKS_DB,{tasks:[]}).tasks||[]; res.json({ok:true,tasks}); });
app.post('/api/tasks', requireAuth, (req,res)=>{ const db=readJson(TASKS_DB,{tasks:[]}); const task={id:crypto.randomUUID(),userId:req.session.userId,title:String(req.body.title||'Echo task').slice(0,120),text:String(req.body.text||'').slice(0,400),status:String(req.body.status||'active'),createdAt:new Date().toISOString()}; db.tasks.unshift(task); writeJson(TASKS_DB,db); res.json({ok:true,task}); });
function isExpired(update, range){ const hours=(Date.now()-new Date(update.createdAt).getTime())/36e5; if(range==='24h') return hours>24; if(range==='7d') return hours>168; return false; }
app.get('/api/live-updates',(req,res)=>{ const range=String(req.query.range||'24h'); const updates=(readJson(LIVE_DB,{updates:[]}).updates||[]).filter(u=>!isExpired(u, range)); res.json({ok:true,updates}); });
app.post('/api/live-updates', requireAuth, (req,res)=>{ const db=readJson(LIVE_DB,{updates:[]}); const loc=req.body.location||{}; const update={id:crypto.randomUUID(),userId:req.session.userId,city:String(req.body.city||'Around').slice(0,80),text:String(req.body.text||'').slice(0,240),visibility:String(req.body.visibility||'24h'),status:'pending',location:loc.lat?{lat:Number(loc.lat).toFixed(4),lng:Number(loc.lng).toFixed(4),accuracy:Math.round(Number(loc.accuracy||0))}:null,createdAt:new Date().toISOString()}; if(!update.text) return res.status(400).json({ok:false,error:'Write update text.'}); db.updates.unshift(update); writeJson(LIVE_DB,db); res.json({ok:true,update}); });
app.post('/api/live-updates/:id/approve', requireAuth, (req,res)=>{ const db=readJson(LIVE_DB,{updates:[]}); const u=db.updates.find(x=>x.id===req.params.id); if(!u) return res.status(404).json({ok:false,error:'Update not found.'}); u.status='approved'; u.approvedAt=new Date().toISOString(); writeJson(LIVE_DB,db); res.json({ok:true,update:u}); });
app.get('/api/memories',(req,res)=>{ const range=String(req.query.range||'0-6'); const all=readJson(MEMORIES_DB,{memories:[]}).memories||[]; res.json({ok:true,memories:all.filter(m=>m.range===range || range==='all')}); });
app.get('/api/probabilities',(req,res)=>{ const base=readJson(PROB_DB,{probabilities:{}}).probabilities||{}; const user=currentUser(req); if(user){ const c=user.profile?.zodiac?7:0; base['Your zodiac base']=Math.min(99,55+c); base['Your profile completion']=user.echoProfile?.answers?.length?Math.min(99,user.echoProfile.answers.length):25; } res.json({ok:true,probabilities:base}); });
app.get('/api/zodiac-map',(req,res)=>{ const u=currentUser(req); const sign=u?.profile?.zodiac||zodiacFromDate(u?.profile?.birthDate)||'Unknown'; res.json({ok:true,sign,birthDate:u?.profile?.birthDate||'',birthTime:u?.profile?.birthTime||'',stars:141}); });
app.use((err,req,res,next)=>{ console.error(err); res.status(400).json({ok:false,error:err.message||'Server error.'}); });
app.listen(PORT,()=>{ console.log(`SoulMatch v31: http://localhost:${PORT}/home/`); console.log(`Auth: http://localhost:${PORT}/auth/`); console.log(`Echo AI Twin: http://localhost:${PORT}/scheme5/`); });
