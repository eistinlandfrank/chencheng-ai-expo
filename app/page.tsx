'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import MapCanvas from './components/MapCanvas';
import { DEFAULT_DATASET, ENTRANCES, type ExpoDataset, type Exhibitor } from './lib/data';
import { distance, generatePlan, rankExhibitors, toMinutes, toTime, type GeneratedPlan, type PlanStop, type PlannerInput } from './lib/planner';

type Profile = { name:string; company:string; role:string; offers:string; };
type Meeting = { id:string; sourceId:string; company:string; contact:string; createdAt:string; notes:string; nextAction:string; deadline:string; summary:string; followup:string; };
type EventLog = { id:string; type:string; label:string; at:string; };
type HomeMessage = { id:string; role:'assistant'|'user'; text:string; plan?:GeneratedPlan; };
type SpeechResult = { [index:number]:{ transcript:string } };
type SpeechEvent = { results:ArrayLike<SpeechResult> };
type SpeechRecognitionLike = { lang:string;continuous:boolean;interimResults:boolean;onresult:((event:SpeechEvent)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void; };
type SpeechRecognitionConstructor = new()=>SpeechRecognitionLike;

declare global { interface Window { SpeechRecognition?:SpeechRecognitionConstructor;webkitSpeechRecognition?:SpeechRecognitionConstructor; } }

const HOME_EXAMPLES = [
  '我只有两小时，想找环保包装供应商',
  '从南入口进，帮我少走一点路',
  '安排展位拜访，再推荐附近午餐',
];

const INITIAL_INPUT: PlannerInput = { query:'我想找环保美妆包装供应商，也想认识消费领域投资人', startTime:'14:00', endTime:'17:00', entranceId:'south', lessWalking:true, mealNeeded:false, mealBudget:80, dietary:'' };
const INITIAL_PROFILE: Profile = { name:'陈同学', company:'独立项目团队', role:'采购与合作', offers:'产品设计、AI应用开发' };
const NAV = [['home','行动台','⌂'],['match','找商机','◎'],['plan','我的行程','◷'],['map','场馆地图','▦'],['meetings','会面记录','◇'],['ops','数据与运营','◫']];
const PAGE_META: Record<string,[string,string]> = {
  home:['行动台','告诉我你要找什么，我直接排好展位和路线'],match:['找商机','按真实需求筛选展商'],plan:['我的行程','按顺序执行，时间和距离自动更新'],map:['场馆地图','点展位查看详情，沿路线直接行动'],meetings:['会面记录','记下结论，生成下一步跟进'],ops:['数据与运营','导入企业数据，查看现场使用结果'],
};

export default function Home() {
  const [active,setActive] = useState('home');
  const [input,setInput] = useState<PlannerInput>(INITIAL_INPUT);
  const [profile,setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [dataset,setDataset] = useState<ExpoDataset>(DEFAULT_DATASET);
  const [plan,setPlan] = useState<GeneratedPlan | null>(null);
  const [meetings,setMeetings] = useState<Meeting[]>([]);
  const [logs,setLogs] = useState<EventLog[]>([]);
  const [selectedId,setSelectedId] = useState(DEFAULT_DATASET.exhibitors[0].id);
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('全部');
  const [profileOpen,setProfileOpen] = useState(false);
  const [toast,setToast] = useState('');
  const [hydrated,setHydrated] = useState(false);
  const [meetingDraft,setMeetingDraft] = useState({ notes:'',nextAction:'',deadline:'' });
  const [newExhibitor,setNewExhibitor] = useState({ name:'',booth:'',category:'',offers:'',wants:'',contact:'' });

  useEffect(() => {
    try {
      const storedInput = localStorage.getItem('chencheng-input');
      const storedProfile = localStorage.getItem('chencheng-profile');
      const storedData = localStorage.getItem('chencheng-dataset');
      const storedPlan = localStorage.getItem('chencheng-plan');
      const storedMeetings = localStorage.getItem('chencheng-meetings');
      const storedLogs = localStorage.getItem('chencheng-logs');
      if (storedInput) setInput(JSON.parse(storedInput));
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      if (storedData) setDataset(JSON.parse(storedData));
      if (storedPlan) setPlan(JSON.parse(storedPlan));
      if (storedMeetings) setMeetings(JSON.parse(storedMeetings));
      if (storedLogs) setLogs(JSON.parse(storedLogs));
    } catch { /* keep valid defaults */ }
    setHydrated(true);
  },[]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('chencheng-input',JSON.stringify(input));
    localStorage.setItem('chencheng-profile',JSON.stringify(profile));
    localStorage.setItem('chencheng-dataset',JSON.stringify(dataset));
    localStorage.setItem('chencheng-meetings',JSON.stringify(meetings));
    localStorage.setItem('chencheng-logs',JSON.stringify(logs.slice(0,200)));
    if (plan) localStorage.setItem('chencheng-plan',JSON.stringify(plan)); else localStorage.removeItem('chencheng-plan');
  },[input,profile,dataset,plan,meetings,logs,hydrated]);

  const ranked = useMemo(() => rankExhibitors(dataset,{...input,query:search.trim() || input.query}),[dataset,input,search]);
  const categories = useMemo(() => ['全部',...new Set(dataset.exhibitors.map((item) => item.category))],[dataset]);
  const visibleMatches = ranked.filter(({exhibitor}) => category === '全部' || exhibitor.category === category);
  const selected = dataset.exhibitors.find((item) => item.id === selectedId) ?? dataset.exhibitors[0];
  const activeStop = plan?.stops.find((stop) => stop.status === 'arrived') ?? plan?.stops.find((stop) => stop.status === 'pending');

  function notify(message:string) { setToast(message); window.setTimeout(() => setToast(''),2200); }
  function log(type:string,label:string) { setLogs((current) => [{id:crypto.randomUUID(),type,label,at:new Date().toISOString()},...current]); }
  function go(page:string) { setActive(page); window.scrollTo({top:0,behavior:'smooth'}); }

  function buildPlan(queryOverride?:string):GeneratedPlan|null {
    const source={...input,query:queryOverride?.trim()||input.query};
    if (!source.query.trim()) { notify('请先描述一个真实目标'); return null; }
    const resolved = {...source};
    const range = source.query.match(/(\d{1,2})(?::(\d{2}))?\s*[到至—-]\s*(\d{1,2})(?::(\d{2}))?/);
    const duration = source.query.match(/(\d+(?:\.\d+)?|[一二两三四五六七八九十半]+)\s*(?:个)?小时/);
    if (range) {
      resolved.startTime = `${range[1].padStart(2,'0')}:${(range[2]??'00').padStart(2,'0')}`;
      resolved.endTime = `${range[3].padStart(2,'0')}:${(range[4]??'00').padStart(2,'0')}`;
    } else if (duration) {
      const hourMap:Record<string,number>={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,半:.5};
      const hours = Number(duration[1]) || hourMap[duration[1]] || (duration[1].endsWith('半') ? (hourMap[duration[1][0]]||0)+.5 : 0);
      if (hours>0) resolved.endTime = toTime(toMinutes(resolved.startTime) + Math.round(hours * 60));
    }
    if (/东(?:门|入口)/.test(source.query)) resolved.entranceId='east';
    if (/北(?:门|入口)/.test(source.query)) resolved.entranceId='north';
    if (/南(?:门|入口)/.test(source.query)) resolved.entranceId='south';
    if (/近一点|少走|不想走|少步行/.test(source.query)) resolved.lessWalking=true;
    if (/不在意距离|不用少走/.test(source.query)) resolved.lessWalking=false;
    if (/吃饭|用餐|午餐|晚餐|餐厅|美食/.test(source.query)) resolved.mealNeeded=true;
    if (/不(?:吃饭|用餐)|无需(?:吃饭|用餐)/.test(source.query)) resolved.mealNeeded=false;
    if (toMinutes(resolved.endTime) <= toMinutes(resolved.startTime)) { notify('结束时间需要晚于开始时间'); return null; }
    setInput(resolved);
    const next = generatePlan(dataset,resolved);
    setPlan(next);
    if (next.stops[0]) setSelectedId(next.stops[0].sourceId);
    log('plan_generated',`生成 ${next.stops.length} 站行程`);
    notify(`已计算 ${next.stops.length} 个可执行目标`);
    return next;
  }

  function recalculate(stops:PlanStop[]) {
    if (!plan) return;
    const entrance = ENTRANCES.find((item) => item.id === plan.input.entranceId) ?? ENTRANCES[0];
    let cursor = entrance.position;
    let clock = toMinutes(plan.input.startTime);
    let walking = 0;
    const updated = stops.map((stop) => {
      const walk = distance(cursor,stop.position);
      clock += Math.max(2,Math.ceil(walk/65));
      const duration = Math.max(20,toMinutes(stop.end)-toMinutes(stop.start));
      if (stop.type === 'event') clock = Math.max(clock,toMinutes(stop.start));
      const next = {...stop,start:toTime(clock),end:toTime(clock+duration)};
      clock += duration; cursor=stop.position; walking+=walk;
      return next;
    });
    setPlan({...plan,stops:updated,walkingMeters:walking,estimatedMinutes:clock-toMinutes(plan.input.startTime)});
  }

  function addToPlan(exhibitor:Exhibitor) {
    const match = ranked.find((item) => item.exhibitor.id === exhibitor.id);
    if (plan?.stops.some((stop) => stop.sourceId === exhibitor.id)) return notify('这个展商已经在行程中');
    const base = plan ?? generatePlan(dataset,{...input,query:input.query || exhibitor.keywords.join(' ')});
    if (base.stops.some((stop) => stop.sourceId === exhibitor.id)) {
      setPlan(base);
      notify(`${exhibitor.booth} 已在自动生成的行程中`);
      return;
    }
    const stop:PlanStop = { uid:`manual-${crypto.randomUUID()}`,sourceId:exhibitor.id,type:'exhibitor',booth:exhibitor.booth,title:exhibitor.name,subtitle:`${exhibitor.contact} · ${exhibitor.role}`,start:input.startTime,end:toTime(toMinutes(input.startTime)+25),position:exhibitor.position,score:match?.score ?? 60,reasons:match?.reasons ?? ['手动加入'],status:'pending' };
    const stops=[...base.stops,stop];
    let cursor=ENTRANCES.find((item)=>item.id===base.input.entranceId)?.position ?? ENTRANCES[0].position;
    let clock=toMinutes(base.input.startTime); let walking=0;
    const updated=stops.map((item)=>{const walk=distance(cursor,item.position);clock+=Math.max(2,Math.ceil(walk/65));const duration=item.type==='food'?35:25;const next={...item,start:toTime(clock),end:toTime(clock+duration)};clock+=duration;cursor=item.position;walking+=walk;return next;});
    setPlan({...base,stops:updated,walkingMeters:walking,estimatedMinutes:clock-toMinutes(base.input.startTime)});
    log('recommendation_accepted',`加入 ${exhibitor.booth} ${exhibitor.name}`);
    notify(`${exhibitor.booth} 已加入行程`);
  }

  function removeStop(index:number) { if (!plan) return; recalculate(plan.stops.filter((_,i)=>i!==index)); }
  function moveStop(index:number,direction:-1|1) { if (!plan) return; const target=index+direction;if(target<0||target>=plan.stops.length)return;const stops=[...plan.stops];[stops[index],stops[target]]=[stops[target],stops[index]];recalculate(stops); }
  function updateStop(index:number,status:PlanStop['status']) { if(!plan)return;const stops=plan.stops.map((stop,i)=>i===index?{...stop,status}:stop);setPlan({...plan,stops});const stop=stops[index];log(status==='arrived'?'checkin':'stop_updated',`${stop.booth} ${status}`);if(status==='arrived'&&stop.type==='exhibitor'){setSelectedId(stop.sourceId);go('meetings');} }

  function saveMeeting() {
    if (!selected || !meetingDraft.notes.trim()) return notify('请先记录会谈内容');
    const summary=meetingDraft.notes.trim().slice(0,120);
    const nextAction=meetingDraft.nextAction.trim() || '发送资料并确认下一次沟通时间';
    const followup=`${selected.contact}老师您好，感谢今天在${selected.booth}的交流。我们讨论了：${summary}。下一步计划：${nextAction}${meetingDraft.deadline?`，希望在${meetingDraft.deadline}前完成`:''}。期待继续沟通。`;
    const meeting:Meeting={id:crypto.randomUUID(),sourceId:selected.id,company:selected.name,contact:selected.contact,createdAt:new Date().toISOString(),notes:meetingDraft.notes,nextAction,deadline:meetingDraft.deadline,summary,followup};
    setMeetings((current)=>[meeting,...current]);setMeetingDraft({notes:'',nextAction:'',deadline:''});
    if(plan)setPlan({...plan,stops:plan.stops.map((stop)=>stop.sourceId===selected.id?{...stop,status:'completed'}:stop)});
    log('meeting_completed',`完成与 ${selected.name} 的会面`);notify('会面纪要和跟进消息已保存');
  }

  async function importData(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];if(!file)return;
    try {
      const text=await file.text();let next:ExpoDataset;
      if(file.name.toLowerCase().endsWith('.json')) { const parsed=JSON.parse(text);next=Array.isArray(parsed)?{...dataset,exhibitors:parsed}:{...dataset,...parsed}; }
      else { const lines=text.split(/\r?\n/).filter(Boolean);const headers=lines[0].split(',').map((item)=>item.trim());const exhibitors=lines.slice(1).map((line,index)=>{const values=line.split(',').map((item)=>item.trim());const row=Object.fromEntries(headers.map((header,i)=>[header,values[i]??'']));return {id:row.id||`import-${Date.now()}-${index}`,name:row.name,booth:row.booth,category:row.category||'未分类',offers:(row.offers||'').split('|').filter(Boolean),wants:(row.wants||'').split('|').filter(Boolean),keywords:(row.keywords||row.offers||'').split('|').filter(Boolean),intro:row.intro||'',position:{x:Number(row.x)||15+(index*11)%75,y:Number(row.y)||20+(index*17)%65},availability:[row.available_from||'09:00',row.available_to||'17:00'] as [string,string],contact:row.contact||'现场负责人',role:row.role||'商务'};});next={...dataset,exhibitors}; }
      if(!Array.isArray(next.exhibitors)||next.exhibitors.length===0||!next.exhibitors.every((item)=>item.name&&item.booth))throw new Error('数据为空，或缺少 name / booth');
      setDataset(next);setPlan(null);log('data_imported',`导入 ${next.exhibitors.length} 家展商`);notify(`已导入 ${next.exhibitors.length} 家展商`);
    } catch(error) { notify(`导入失败：${error instanceof Error?error.message:'格式错误'}`); }
    event.target.value='';
  }

  function exportData() { const blob=new Blob([JSON.stringify(dataset,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='辰程AI-会展数据.json';anchor.click();URL.revokeObjectURL(url); }
  function addExhibitor() { if(!newExhibitor.name||!newExhibitor.booth)return notify('请填写企业名称和展位号');const index=dataset.exhibitors.length;const item:Exhibitor={id:`custom-${crypto.randomUUID()}`,name:newExhibitor.name,booth:newExhibitor.booth,category:newExhibitor.category||'未分类',offers:newExhibitor.offers.split(/[、|,]/).filter(Boolean),wants:newExhibitor.wants.split(/[、|,]/).filter(Boolean),keywords:`${newExhibitor.offers} ${newExhibitor.wants}`.split(/[、|,\s]/).filter(Boolean),intro:'现场新增展商',position:{x:15+(index*13)%75,y:18+(index*19)%68},availability:['09:00','17:00'],contact:newExhibitor.contact||'现场负责人',role:'商务'};setDataset({...dataset,exhibitors:[...dataset.exhibitors,item]});setNewExhibitor({name:'',booth:'',category:'',offers:'',wants:'',contact:''});log('exhibitor_added',`新增 ${item.name}`);notify('展商已加入数据集'); }

  const [pageTitle,pageSubtitle]=PAGE_META[active];
  return (
    <main className="app-shell">
      <aside className="side-nav"><button className="app-brand" type="button" onClick={()=>go('home')}><span>辰</span><b>辰程 AI</b></button><nav>{NAV.map(([id,label,icon])=><button key={id} className={active===id?'active':''} type="button" onClick={()=>go(id)}><i>{icon}</i><span>{label}</span>{id==='plan'&&plan?.stops.length?<em>{plan.stops.length}</em>:null}</button>)}</nav><div className="sync-state"><i/>数据保存在当前设备</div></aside>
      <section className="app-main">
        <header className="app-topbar"><div><small>2026 首都会展 · 国家会议中心</small><b>{pageTitle}</b></div><div className="top-actions"><button type="button" className="ops-shortcut" onClick={()=>go('ops')}>运营</button><button className="user-chip" type="button" onClick={()=>setProfileOpen(true)}><span>{profile.company}</span><i>{profile.name.slice(0,1)}</i></button></div></header>
        <div className={`workspace workspace-${active}`}>
          {active!=='home'&&<div className="page-heading"><div><span>{pageTitle}</span><h1>{pageSubtitle}</h1></div><button type="button" onClick={()=>go('home')}>＋ 新建行程</button></div>}
          {active==='home'&&<HomePage buildPlan={buildPlan} go={go} />}
          {active==='match'&&<MatchPage matches={visibleMatches} search={search} setSearch={setSearch} category={category} setCategory={setCategory} categories={categories} plan={plan} select={(id)=>setSelectedId(id)} addToPlan={addToPlan} />}
          {active==='plan'&&<PlanPage plan={plan} move={moveStop} remove={removeStop} update={updateStop} go={go} />}
          {active==='map'&&<MapPage dataset={dataset} plan={plan} selected={selected} selectedId={selectedId} select={setSelectedId} input={input} setInput={setInput} addToPlan={addToPlan} go={go} update={updateStop} />}
          {active==='meetings'&&<MeetingsPage exhibitors={dataset.exhibitors} selected={selected} select={setSelectedId} draft={meetingDraft} setDraft={setMeetingDraft} save={saveMeeting} meetings={meetings} notify={notify} />}
          {active==='ops'&&<OpsPage dataset={dataset} plan={plan} meetings={meetings} logs={logs} importData={importData} exportData={exportData} newExhibitor={newExhibitor} setNewExhibitor={setNewExhibitor} addExhibitor={addExhibitor} reset={()=>{if(confirm('确定恢复演示数据？已导入展商会被替换。')){setDataset(DEFAULT_DATASET);setPlan(null);notify('已恢复演示数据');}}} />}
        </div>
      </section>
      <nav className="mobile-tabs">{NAV.slice(0,5).map(([id,label,icon])=><button key={id} className={active===id?'active':''} type="button" onClick={()=>go(id)}><i>{icon}</i><span>{label.replace('我的','')}</span></button>)}</nav>
      {profileOpen&&<div className="modal-layer" onMouseDown={(event)=>{if(event.target===event.currentTarget)setProfileOpen(false)}}><section className="profile-modal"><header><div><small>本地个人档案</small><h2>让匹配更了解你</h2></div><button type="button" onClick={()=>setProfileOpen(false)}>×</button></header><label>姓名<input value={profile.name} onChange={(e)=>setProfile({...profile,name:e.target.value})}/></label><label>公司/团队<input value={profile.company} onChange={(e)=>setProfile({...profile,company:e.target.value})}/></label><label>参展身份<input value={profile.role} onChange={(e)=>setProfile({...profile,role:e.target.value})}/></label><label>你能提供什么<textarea rows={3} value={profile.offers} onChange={(e)=>setProfile({...profile,offers:e.target.value})}/></label><button className="solid-button" type="button" onClick={()=>{setProfileOpen(false);notify('个人档案已保存')}}>保存档案</button></section></div>}
      {toast&&<div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function HomePage({buildPlan,go}:{buildPlan:(query:string)=>GeneratedPlan|null;go:(page:string)=>void}) {
  const [messages,setMessages]=useState<HomeMessage[]>([]);
  const [draft,setDraft]=useState('');
  const [lastQuery,setLastQuery]=useState('');
  const [thinking,setThinking]=useState(false);
  const [listening,setListening]=useState(false);
  const [voiceHint,setVoiceHint]=useState('');
  const endRef=useRef<HTMLDivElement>(null);
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);

  useEffect(()=>{try{const stored=localStorage.getItem('chencheng-home-chat-v2');if(stored)setMessages(JSON.parse(stored));const query=localStorage.getItem('chencheng-home-query-v2');if(query)setLastQuery(query);}catch{/* use fresh chat */}},[]);
  useEffect(()=>{localStorage.setItem('chencheng-home-chat-v2',JSON.stringify(messages.slice(-30)));localStorage.setItem('chencheng-home-query-v2',lastQuery);endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages,lastQuery,thinking]);
  useEffect(()=>()=>recognitionRef.current?.stop(),[]);

  function submit(event?:FormEvent){event?.preventDefault();const text=draft.trim();if(!text||thinking)return;const modifier=text.length<=18&&/近一点|少走|吃饭|用餐|东门|南门|北门|入口|重新/.test(text);const query=modifier&&lastQuery?`${lastQuery}，${text}`:text;setMessages((current)=>[...current,{id:crypto.randomUUID(),role:'user',text}]);setDraft('');setThinking(true);window.setTimeout(()=>{const next=buildPlan(query);if(next){const reply=next.stops.length?`安排好了。共 ${next.stops.length} 站，预计 ${next.estimatedMinutes} 分钟、步行约 ${next.walkingMeters} 米。`: '这段时间没有找到可执行目标，可以换个入口或延长时间。';setMessages((current)=>[...current,{id:crypto.randomUUID(),role:'assistant',text:reply,plan:next}]);setLastQuery(query);}setThinking(false);},280);}
  function keyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submit();}}
  function toggleVoice(){if(listening){recognitionRef.current?.stop();return;}const Recognition=window.SpeechRecognition??window.webkitSpeechRecognition;if(!Recognition){setVoiceHint('请使用 Chrome 或微信浏览器进行语音输入');return;}const recognition=new Recognition();recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=true;recognition.onresult=(event)=>{let text='';for(let index=0;index<event.results.length;index+=1)text+=event.results[index][0]?.transcript??'';setDraft(text.trim());};recognition.onerror=()=>{setListening(false);setVoiceHint('没有听清，请再说一次');};recognition.onend=()=>{setListening(false);setVoiceHint('语音已转成文字，确认后发送');};recognitionRef.current=recognition;setListening(true);setVoiceHint('正在听…');recognition.start();}
  function speak(message:HomeMessage){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const route=message.plan?.stops.map((stop,index)=>`第${index+1}站，${stop.start}，${stop.booth}，${stop.title}`).join('。')??'';const utterance=new SpeechSynthesisUtterance(`${message.text}。${route}`);utterance.lang='zh-CN';window.speechSynthesis.speak(utterance);}
  function reset(){recognitionRef.current?.stop();setMessages([]);setDraft('');setLastQuery('');setVoiceHint('');}

  const isFresh=messages.length===0&&!thinking;
  const avatar=<span className="home-avatar" aria-hidden="true"><img src="/chencheng-bear.png" alt=""/></span>;

  return <section className="home-chat">
    <div className="home-chat-toolbar">
      <div className="home-assistant-label"><i/><b>辰程</b><span>AI 会展向导</span></div>
      <button type="button" onClick={reset}>＋ 新对话</button>
    </div>
    <div className="home-chat-stream">
      {isFresh&&<section className="home-chat-intro">
        <div className="home-mascot-stage"><span>在线</span><img src="/chencheng-bear.png" alt="辰程导航熊"/></div>
        <small>CHENCHENG EXPO GUIDE</small>
        <h1>今天想在展会完成什么？</h1>
        <p>说出目标、时间和入口，我来找展位、排路线。</p>
        <div className="home-example-list">{HOME_EXAMPLES.map((example)=><button type="button" key={example} onClick={()=>setDraft(example)}>{example}<span>↗</span></button>)}</div>
      </section>}
      {messages.length>0&&<div className="home-chat-date">今天</div>}
      {messages.map((message)=><article className={`home-message home-message-${message.role}`} key={message.id}>{message.role==='assistant'&&avatar}<div><p>{message.text}</p>{message.plan&&message.plan.stops.length>0&&<section className="home-inline-plan"><header><span>{message.plan.input.startTime}–{message.plan.input.endTime}</span><b>{message.plan.stops.length} 站</b></header><ol>{message.plan.stops.map((stop,index)=><li key={stop.uid}><i>{index+1}</i><time>{stop.start}</time><span><b>{stop.booth} · {stop.title}</b><small>{stop.subtitle}</small></span></li>)}</ol><footer><button type="button" onClick={()=>speak(message)}>◉ 朗读</button><button type="button" onClick={()=>go('map')}>查看地图</button><button type="button" onClick={()=>go('plan')}>打开行程 →</button></footer></section>}</div></article>)}
      {thinking&&<article className="home-message home-message-assistant">{avatar}<div className="home-thinking"><i/><i/><i/></div></article>}
      <div ref={endRef}/>
    </div>
    <form className={`home-composer ${listening?'is-listening':''}`} onSubmit={submit}>
      <textarea rows={1} value={draft} onChange={(event)=>setDraft(event.target.value)} onKeyDown={keyDown} placeholder={listening?'正在听…':'告诉辰程，你想找什么…'} aria-label="给辰程发送消息"/>
      <div><button className="home-voice" type="button" onClick={toggleVoice} aria-label={listening?'停止语音输入':'开始语音输入'}><i/>{listening?'停止':'按住说话'}</button><span>{voiceHint||'Enter 发送 · Shift + Enter 换行'}</span><button className="home-send" type="submit" disabled={!draft.trim()||thinking} aria-label="发送消息">↑</button></div>
    </form>
    <small className="home-local-note">内容仅保存在当前设备</small>
  </section>;
}

function MatchPage({matches,search,setSearch,category,setCategory,categories,plan,select,addToPlan}:{matches:ReturnType<typeof rankExhibitors>;search:string;setSearch:(v:string)=>void;category:string;setCategory:(v:string)=>void;categories:string[];plan:GeneratedPlan|null;select:(id:string)=>void;addToPlan:(e:Exhibitor)=>void}) {
  return <><div className="filter-bar"><label className="search-box">⌕<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="搜索企业、产品、能力或需求"/></label><select value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select><span>{matches.length} 个结果</span></div><div className="match-grid">{matches.map(({exhibitor,score,reasons,distance:meters})=><article className="match-card" key={exhibitor.id}><header><span>{exhibitor.booth}</span><b>{score}<small>%</small></b></header><small>{exhibitor.category}</small><h2>{exhibitor.name}</h2><p>{exhibitor.intro}</p><div className="tag-row">{exhibitor.offers.slice(0,3).map((tag)=><span key={tag}>{tag}</span>)}</div><div className="reason-list">{reasons.slice(0,2).map((reason)=><p key={reason}>✓ {reason}</p>)}</div><footer><span>距入口约 {meters}m</span><div><button type="button" onClick={()=>select(exhibitor.id)}>详情</button><button className="primary-small" type="button" onClick={()=>addToPlan(exhibitor)}>{plan?.stops.some((stop)=>stop.sourceId===exhibitor.id)?'已在行程':'加入行程'}</button></div></footer></article>)}</div></>;
}

function PlanPage({plan,move,remove,update,go}:{plan:GeneratedPlan|null;move:(i:number,d:-1|1)=>void;remove:(i:number)=>void;update:(i:number,s:PlanStop['status'])=>void;go:(p:string)=>void}) {
  if(!plan)return <EmptyPanel icon="◷" title="还没有行程" text="先在行动台输入目标，系统会计算访问顺序和时间。" action="去生成行程" onAction={()=>go('home')}/>;
  const completed=plan.stops.filter((s)=>s.status==='completed').length;
  return <><section className="plan-dashboard"><div><small>执行进度</small><h2>{completed} / {plan.stops.length} 站已完成</h2><p>用上下按钮调整顺序，时间与距离会自动重算。</p></div><div className="progress-ring" style={{'--progress':`${plan.stops.length?completed/plan.stops.length*360:0}deg`} as CSSProperties}><span>{Math.round(plan.stops.length?completed/plan.stops.length*100:0)}%</span></div></section><ol className="editable-plan">{plan.stops.map((stop,index)=><li key={stop.uid} className={`status-${stop.status}`}><div className="stop-time"><b>{stop.start}</b><small>{stop.end}</small></div><i>{index+1}</i><div className="stop-main"><small>{stop.type==='exhibitor'?`${stop.booth} · ${stop.score}% 匹配`:stop.booth}</small><h3>{stop.title}</h3><p>{stop.subtitle}</p><span>{stop.status==='pending'?'待前往':stop.status==='arrived'?'已到场':stop.status==='completed'?'已完成':'已跳过'}</span></div><div className="stop-actions"><button type="button" disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===plan.stops.length-1} onClick={()=>move(index,1)}>↓</button><button type="button" onClick={()=>remove(index)}>移除</button>{stop.status==='pending'&&<button className="primary-small" type="button" onClick={()=>update(index,'arrived')}>我已到达</button>}{stop.status==='arrived'&&<button className="primary-small" type="button" onClick={()=>update(index,'completed')}>完成</button>}</div></li>)}</ol><div className="plan-footer"><span>预计步行 <b>{plan.walkingMeters} 米</b></span><span>行程用时 <b>{plan.estimatedMinutes} 分钟</b></span><button type="button" onClick={()=>go('map')}>打开地图导航 →</button></div></>;
}

function MapPage({dataset,plan,selected,selectedId,select,input,setInput,addToPlan,go,update}:{dataset:ExpoDataset;plan:GeneratedPlan|null;selected:Exhibitor;selectedId:string;select:(id:string)=>void;input:PlannerInput;setInput:(v:PlannerInput)=>void;addToPlan:(e:Exhibitor)=>void;go:(p:string)=>void;update:(i:number,s:PlanStop['status'])=>void}) {
  const stopIndex=plan?.stops.findIndex((stop)=>stop.sourceId===selectedId)??-1;
  return <div className="map-workspace"><section className="map-stage"><header><label>当前位置<select value={input.entranceId} onChange={(e)=>setInput({...input,entranceId:e.target.value})}>{ENTRANCES.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><span><i className="route-key"/>行程路线</span><span><i className="target-key"/>目标展位</span></div></header><div className="canvas-wrap"><MapCanvas dataset={dataset} stops={plan?.stops??[]} entranceId={input.entranceId} selectedId={selectedId} onSelect={select}/></div></section><aside className="map-detail-panel"><span className="booth-badge">{selected.booth}</span><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.intro}</p><dl><div><dt>现场联系人</dt><dd>{selected.contact} · {selected.role}</dd></div><div><dt>可接待时间</dt><dd>{selected.availability.join('–')}</dd></div><div><dt>提供能力</dt><dd>{selected.offers.join('、')}</dd></div><div><dt>希望对接</dt><dd>{selected.wants.join('、')}</dd></div></dl>{stopIndex>=0?<><button className="solid-button" type="button" onClick={()=>update(stopIndex,'arrived')}>我已到达，开始会面</button><button className="ghost-button" type="button" onClick={()=>go('plan')}>查看完整行程</button></>:<button className="solid-button" type="button" onClick={()=>addToPlan(selected)}>加入我的行程</button>}</aside></div>;
}

function MeetingsPage({exhibitors,selected,select,draft,setDraft,save,meetings,notify}:{exhibitors:Exhibitor[];selected:Exhibitor;select:(id:string)=>void;draft:{notes:string;nextAction:string;deadline:string};setDraft:(v:{notes:string;nextAction:string;deadline:string})=>void;save:()=>void;meetings:Meeting[];notify:(m:string)=>void}) {
  return <div className="meeting-grid"><section className="meeting-editor"><header><div><small>记录一次真实会面</small><h2>{selected.name}</h2></div><select value={selected.id} onChange={(e)=>select(e.target.value)}>{exhibitors.map((item)=><option key={item.id} value={item.id}>{item.booth} · {item.name}</option>)}</select></header><div className="contact-strip"><span>{selected.contact.slice(0,1)}</span><div><b>{selected.contact}</b><small>{selected.role} · {selected.booth}</small></div><i>现场可接待</i></div><label>会谈记录<textarea rows={7} value={draft.notes} onChange={(e)=>setDraft({...draft,notes:e.target.value})} placeholder="记录需求、报价、样品、双方承诺等。系统会据此生成纪要。"/></label><div className="meeting-fields"><label>下一步行动<input value={draft.nextAction} onChange={(e)=>setDraft({...draft,nextAction:e.target.value})} placeholder="例如：发送包装尺寸"/></label><label>截止日期<input type="date" value={draft.deadline} onChange={(e)=>setDraft({...draft,deadline:e.target.value})}/></label></div><button className="solid-button" type="button" onClick={save}>保存纪要并生成跟进消息</button></section><section className="meeting-history"><header><div><small>MEETING MEMORY</small><h2>已保存 {meetings.length} 次会面</h2></div></header>{meetings.length?meetings.map((meeting)=><article key={meeting.id}><div><span>{meeting.company.slice(0,1)}</span><div><b>{meeting.company}</b><small>{new Date(meeting.createdAt).toLocaleString('zh-CN')}</small></div></div><p>{meeting.summary}</p><dl><dt>下一步</dt><dd>{meeting.nextAction}{meeting.deadline?` · ${meeting.deadline}`:''}</dd></dl><button type="button" onClick={()=>{navigator.clipboard?.writeText(meeting.followup);notify('跟进消息已复制')}}>复制跟进消息</button></article>):<EmptyPanel icon="◇" title="还没有会面记录" text="到达展位后，在这里记录交流内容和下一步。"/>}</section></div>;
}

function OpsPage({dataset,plan,meetings,logs,importData,exportData,newExhibitor,setNewExhibitor,addExhibitor,reset}:{dataset:ExpoDataset;plan:GeneratedPlan|null;meetings:Meeting[];logs:EventLog[];importData:(e:ChangeEvent<HTMLInputElement>)=>void;exportData:()=>void;newExhibitor:{name:string;booth:string;category:string;offers:string;wants:string;contact:string};setNewExhibitor:(v:typeof newExhibitor)=>void;addExhibitor:()=>void;reset:()=>void}) {
  const arrived=plan?.stops.filter((s)=>s.status==='arrived'||s.status==='completed').length??0;
  return <><div className="metric-row"><article><small>展商数据</small><b>{dataset.exhibitors.length}</b><span>家企业</span></article><article><small>当前行程</small><b>{plan?.stops.length??0}</b><span>个目标</span></article><article><small>确认到场</small><b>{arrived}</b><span>次</span></article><article><small>有效会面</small><b>{meetings.length}</b><span>条记录</span></article></div><div className="ops-grid"><section className="data-panel"><header><div><small>企业数据</small><h2>导入与维护</h2></div><div><label className="file-button">导入 JSON / CSV<input type="file" accept=".json,.csv" onChange={importData}/></label><button type="button" onClick={exportData}>导出</button></div></header><p className="data-help">CSV 字段：name, booth, category, offers, wants, keywords, intro, x, y, available_from, available_to, contact, role。多个标签用 | 分隔。</p><div className="add-form"><input placeholder="企业名称*" value={newExhibitor.name} onChange={(e)=>setNewExhibitor({...newExhibitor,name:e.target.value})}/><input placeholder="展位号*" value={newExhibitor.booth} onChange={(e)=>setNewExhibitor({...newExhibitor,booth:e.target.value})}/><input placeholder="类别" value={newExhibitor.category} onChange={(e)=>setNewExhibitor({...newExhibitor,category:e.target.value})}/><input placeholder="能提供什么，用、分隔" value={newExhibitor.offers} onChange={(e)=>setNewExhibitor({...newExhibitor,offers:e.target.value})}/><input placeholder="希望对接什么" value={newExhibitor.wants} onChange={(e)=>setNewExhibitor({...newExhibitor,wants:e.target.value})}/><input placeholder="联系人" value={newExhibitor.contact} onChange={(e)=>setNewExhibitor({...newExhibitor,contact:e.target.value})}/><button className="solid-button" type="button" onClick={addExhibitor}>添加展商</button></div><div className="data-table"><div className="table-head"><span>展位</span><span>企业</span><span>类别</span><span>提供能力</span></div>{dataset.exhibitors.slice(0,12).map((item)=><div key={item.id}><span>{item.booth}</span><b>{item.name}</b><span>{item.category}</span><span>{item.offers.slice(0,2).join('、')}</span></div>)}</div><button className="danger-link" type="button" onClick={reset}>恢复内置演示数据</button></section><aside className="activity-panel"><header><small>真实操作日志</small><h2>最近活动</h2></header>{logs.length?logs.slice(0,12).map((item)=><div className="log-row" key={item.id}><i/><span><b>{item.label}</b><small>{new Date(item.at).toLocaleString('zh-CN')}</small></span></div>):<p className="no-log">生成行程、加入展商、到场和保存会面后，这里会出现真实记录。</p>}</aside></div></>;
}

function EmptyPanel({icon,title,text,action,onAction}:{icon:string;title:string;text:string;action?:string;onAction?:()=>void}) { return <section className="empty-state"><i className="empty-icon">{icon}</i><h2>{title}</h2><p>{text}</p>{action&&<button type="button" onClick={onAction}>{action} →</button>}</section>; }
