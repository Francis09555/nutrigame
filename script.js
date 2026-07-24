/* Nutrition Quest: Healthy Heroes
   A complete, dependency-free Canvas survival game. */
'use strict';

// ---------- DOM, save data, and constants ----------
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#game'), ctx=canvas.getContext('2d');
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
// Classic maps remain compact; Endless uses a much larger battlefield.
const isSurvivalMode=()=>G?.mode==='endless'||G?.mode==='multiplayer';
const worldLimit=()=>isSurvivalMode()?7000:1650;
let W=innerWidth,H=innerHeight,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)} addEventListener('resize',resize);resize();
const defaults={unlocked:1,highScore:0,music:true,sfx:true,shake:true,volume:.55,companions:[],profile:null,coins:0,records:{classic:{highestLevel:0,highestScore:0,longestTime:0,totalKills:0,bosses:0},endless:{longestTime:0,highestScore:0,highestLevel:0,bosses:0,bestBosses:0}}};
const loadedSave=JSON.parse(localStorage.getItem('nutritionQuestSave')||'{}');
let save={...defaults,...loadedSave,records:{classic:{...defaults.records.classic,...(loadedSave.records?.classic||{})},endless:{...defaults.records.endless,...(loadedSave.records?.endless||{})}}};
if(save.profile)save.profile={registrationDate:new Date().toISOString(),totalGames:0,totalWins:0,totalPlayTime:0,totalKills:0,favoriteWeapon:null,evolutionsUnlocked:[],...save.profile};
const store=()=>localStorage.setItem('nutritionQuestSave',JSON.stringify(save));
const maps=[
 ['Healthy Garden','#78c96b','#427f43','🌳','🌼'],['School Cafeteria','#e7bd72','#a86d48','🪑','🍽️'],['Public Market','#e6a95e','#9d6144','⛺','🧺'],['Playground','#70c8df','#4788ad','🎠','⚽'],['City Park','#5fbe75','#356f4b','🌲','🌷'],['Hospital Garden','#a3dccc','#62a9a6','🏥','🌿'],['Farm','#b5b759','#816c3c','🌾','🚜'],['Nutrition Laboratory','#77b8cc','#53649c','🧪','🔬'],['Healthy Kingdom','#dab85d','#7d6b92','🏰','✨'],['Junk Food Castle','#6d5269','#382f49','🏚️','🔥']
];
const enemyDefs={
 Burger:{icon:'🍔',hp:32,speed:48,damage:10,size:20},Fries:{icon:'🍟',hp:18,speed:83,damage:7,size:16},Pizza:{icon:'🍕',hp:80,speed:30,damage:15,size:24},Soda:{icon:'🥤',hp:40,speed:37,damage:9,size:19,shoot:1},Candy:{icon:'🍬',hp:34,speed:52,damage:8,size:17,split:1},Donut:{icon:'🍩',hp:47,speed:43,damage:11,size:20,teleport:1},IceCream:{icon:'🍦',hp:55,speed:39,damage:8,size:20,slow:1},Hotdog:{icon:'🌭',hp:62,speed:46,damage:13,size:21,charge:1},Chocolate:{icon:'🍫',hp:70,speed:36,damage:12,size:22,bounce:1},Cake:{icon:'🍰',hp:85,speed:29,damage:18,size:24,explode:1}
};
const weaponDefs={
 carrot:{name:'Carrot Shooter',icon:'🥕',desc:'Rapid shots at the nearest foe',passive:'damage',evolved:'Golden Carrot Cannon'},
 apple:{name:'Apple Boomerang',icon:'🍎',desc:'Arcing fruit returns to you',passive:'speed',evolved:'Rainbow Apple Boomerang'},
 broccoli:{name:'Broccoli Bomb',icon:'🥦',desc:'Explosive area damage',passive:'size',evolved:'Mega Broccoli Bomb'},
 banana:{name:'Banana Peel Trap',icon:'🍌',desc:'Leaves damaging slow traps',passive:'pickup',evolved:'Golden Banana Minefield'},
 water:{name:'Water Splash',icon:'💧',desc:'Wide waves push enemies back',passive:'knockback',evolved:'Tsunami Wave'},
 milk:{name:'Milk Beam',icon:'🥛',desc:'Piercing beam of calcium',passive:'attackSpeed',evolved:'Holy Milk Laser'},
 fish:{name:'Fish Missile',icon:'🐟',desc:'Homing high-damage missiles',passive:'projectileSpeed',evolved:'Omega Fish Squadron'},
 egg:{name:'Egg Orbit',icon:'🥚',desc:'Eggs orbit and protect you',passive:'armor',evolved:'Dragon Egg Orbit'},
 vitamin:{name:'Vitamin Burst',icon:'💊',desc:'Radial vitamin projectiles',passive:'count',evolved:'Super Vitamin Nova'},
 rice:{name:'Rice Storm',icon:'🍚',desc:'Healthy grains rain nearby',passive:'crit',evolved:'Celestial Rice Tempest'},
 orange:{name:'Orange Cannon',icon:'🍊',desc:'Heavy ricocheting citrus shots',passive:'ricochet',evolved:'Solar Orange Artillery'},
 tomato:{name:'Tomato Grenade',icon:'🍅',desc:'Arcing grenades with delayed blasts',passive:'explosionRadius',evolved:'Volcanic Tomato Cluster'},
 corn:{name:'Corn Launcher',icon:'🌽',desc:'Accelerating corn volleys',passive:'piercing',evolved:'Golden Corn Gatling'},
 cucumber:{name:'Cucumber Spear',icon:'🥒',desc:'Long-range penetrating spears',passive:'projectileSpeed',evolved:'Emerald Cucumber Lance'},
 smoothie:{name:'Healthy Smoothie Blast',icon:'🥤',desc:'Wide slowing smoothie spray',passive:'areaDamage',evolved:'Superfood Smoothie Flood'},
 chakram:{name:'Fruit Chakram',icon:'🥝',desc:'Bouncing fruit discs that return',passive:'bounce',evolved:'Prismatic Fruit Chakram'},
 laser:{name:'Vitamin Laser',icon:'🔆',desc:'Charged precision energy beam',passive:'cooldown',evolved:'Spectrum Vitamin Ray'},
 leaf:{name:'Leaf Storm',icon:'🍃',desc:'Spiraling leaves fill nearby space',passive:'status',evolved:'Ancient Forest Tempest'},
 pulse:{name:'Nutrition Pulse',icon:'🌟',desc:'Expanding area-damage shockwave',passive:'areaDamage',evolved:'Perfect Nutrition Supernova'},
 seed:{name:'Seed Launcher',icon:'🌱',desc:'Rapid bouncing seed projectiles',passive:'bounce',evolved:'World Tree Seed Barrage'}
};
const passives={speed:['Movement Speed','👟'],damage:['Attack Damage','💪'],attackSpeed:['Attack Speed','⚡'],cooldown:['Cooldown Reduction','⏱️'],crit:['Critical Chance','🎯'],critDamage:['Critical Damage','💥'],health:['Max Health','❤'],regen:['Health Regeneration','➕'],armor:['Armor','🛡️'],projectileSpeed:['Projectile Speed','🚀'],size:['Projectile Size','🔵'],count:['Projectile Count','➗'],knockback:['Knockback','👊'],explosionRadius:['Explosion Radius','💣'],areaDamage:['Area Damage','🌐'],piercing:['Piercing','📌'],ricochet:['Ricochet Count','↗️'],bounce:['Bounce Count','🏀'],bossDamage:['Boss Damage','👑'],status:['Status Duration','🕒'],pickup:['Pickup Radius','🧲'],xp:['Experience Gain','🧠'],luck:['Luck','🍀']};
const ultimateDefs={frenzy:['Nutrition Frenzy','🌈','Rapid-fire healthy attacks'],shield:['Healthy Shield','🛡️','Periodic invulnerable shield'],vitamins:['Super Vitamins','💊','Massive healing pulse'],nature:['Nature’s Wrath','🌿','Roots damage every enemy'],hurricane:['Fruit Hurricane','🍊','A storm of orbiting fruit'],vitaminStorm:['Vitamin Storm','⚕️','Repeated expanding vitamin novas'],rainbow:['Rainbow Harvest','🌈','Seven elemental food barrages'],guardian:['Guardian Garden','🌳','Healing garden with protective thorns']};
const quizzes=[
 ['Which nutrient helps build and repair muscles?',['Protein','Sugar','Salt','Food coloring'],0],['What is the best everyday drink for hydration?',['Soda','Water','Energy drink','Syrup'],1],['Which food is a good source of vitamin C?',['Orange','Candy','Butter','White sugar'],0],['Why is dietary fiber important?',['It supports digestion','It adds food coloring','It causes thirst','It replaces sleep'],0],['Which is part of a balanced meal?',['Only sweets','Different food groups','Only meat','No water'],1],['Which nutrient is the body’s main energy source?',['Carbohydrates','Food dye','Salt','Caffeine'],0],['What mineral supports strong bones and teeth?',['Calcium','Sodium','Caffeine','Glucose'],0],['A healthy snack choice is…',['Fresh fruit','Candy bar','Frosting','Soda'],0],['Why should we limit excess salt?',['To support heart health','To remove vitamins','To avoid protein','To stop digestion'],0],['Which habit supports good health?',['Regular activity','Skipping all meals','Very little sleep','Only sugary drinks'],0]
];

// ---------- Procedural Web Audio (no external assets) ----------
let AC, musicTimer, musicStep=0;
function audioStart(){if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();startMusic()}
function tone(freq=.01,dur=.08,type='sine',vol=.12,slide=0){if(!AC||(!save.sfx&&freq>0))return;let o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(freq,AC.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),AC.currentTime+dur);g.gain.setValueAtTime(vol*save.volume,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+dur)}
function sfx(n){if(!save.sfx)return;({shoot:()=>tone(520,.06,'square',.05,-150),evoShoot:()=>{tone(610,.09,'sawtooth',.055,-180);tone(920,.07,'triangle',.035,-260)},hit:()=>tone(120,.07,'sawtooth',.06,-40),evoHit:()=>{tone(105,.12,'sawtooth',.075,-45);tone(260,.08,'square',.035,-90)},xp:()=>tone(850,.08,'sine',.07,250),level:()=>[420,560,720].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.1),i*90)),dash:()=>tone(180,.14,'sawtooth',.09,500),boss:()=>tone(70,.7,'sawtooth',.18,80),win:()=>[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,.35,'triangle',.12),i*150)),evolve:()=>[330,440,554,659,880,1108].forEach((f,i)=>setTimeout(()=>tone(f,.3,'triangle',.14),i*70)),bad:()=>tone(180,.35,'square',.1,-100),click:()=>tone(380,.04,'square',.04)})[n]?.()}
function weaponSfx(id,e=false){if(!save.sfx)return;const tones={carrot:620,apple:430,broccoli:150,banana:280,water:740,milk:920,fish:330,vitamin:810,rice:510,orange:210,tomato:125,corn:680,cucumber:560,smoothie:760,chakram:470,laser:1050,leaf:860,pulse:190,seed:720};const f=tones[id]||500;tone(f,e?.13:.06,e?'sawtooth':'triangle',e?.075:.04,e?f*.35:-80)}
function startMusic(){clearInterval(musicTimer);if(!AC||!save.music)return;musicTimer=setInterval(()=>{let menu=!G.running, seq=menu?[262,330,392,330,294,349,440,349]:G.boss?[110,131,147,165,147,131]:[196,247,294,392,294,247,220,277];let f=seq[musicStep++%seq.length];tone(f,.22,'triangle',.025)},260)}

// ---------- Optional secure online leaderboard client ----------
const Online={
 cfg:window.NQ_ONLINE||{},session:null,category:'score',checkpointAt:30,busy:false,
 enabled(){return !!(this.cfg.url&&this.cfg.anonKey)},
 headers(token=true){const h={'apikey':this.cfg.anonKey,'Content-Type':'application/json'};if(token&&save.onlineAuth?.access_token)h.Authorization='Bearer '+save.onlineAuth.access_token;return h},
 async auth(){
  if(!this.enabled())throw new Error('Online leaderboard is not configured');
  if(save.onlineAuth?.access_token&&save.onlineAuth.expires_at>Date.now()+60000)return save.onlineAuth.access_token;
  if(save.onlineAuth?.refresh_token){const r=await fetch(`${this.cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:this.headers(false),body:JSON.stringify({refresh_token:save.onlineAuth.refresh_token})});if(r.ok){const a=await r.json();save.onlineAuth={...a,expires_at:Date.now()+a.expires_in*1000};store();return a.access_token}}
  const r=await fetch(`${this.cfg.url}/auth/v1/signup`,{method:'POST',headers:this.headers(false),body:'{}'});if(!r.ok)throw new Error('Enable Anonymous Sign-Ins in Supabase Auth');const a=await r.json();save.onlineAuth={...a,expires_at:Date.now()+a.expires_in*1000};store();return a.access_token;
 },
 async call(fn,body){await this.auth();const r=await fetch(`${this.cfg.url}/functions/v1/${fn}`,{method:'POST',headers:this.headers(),body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`${fn} failed`);return data},
 async syncProfile(){if(!this.enabled()||!navigator.onLine||!save.profile)return null;try{return await this.call('sync-profile',{playerName:save.profile.name,avatar:save.profile.avatar})}catch(e){toast(e.message);return null}},
 async startRun(){this.session=null;if(!this.enabled()||!navigator.onLine)return;try{const d=await this.call('start-run',{playerName:save.profile.name,avatar:save.profile.avatar});this.session=d.session;this.checkpointAt=30}catch(e){console.warn(e.message);toast('Global run unavailable — playing offline') }},
 async checkpoint(){if(!this.session||this.busy||G.mode!=='endless')return;this.busy=true;try{await this.call('checkpoint',{sessionId:this.session.id,elapsed:Math.floor(G.time),score:Math.floor(G.score)});this.checkpointAt+=30}catch(e){console.warn(e.message);this.checkpointAt+=15}finally{this.busy=false}},
 payload(){const used=Object.entries(G.weaponUse||{}).sort((a,b)=>b[1]-a[1]),evolutions=Object.entries(player.weapons).filter(([,w])=>w.evolved).map(([id])=>weaponDefs[id].evolved);return{sessionId:this.session?.id,score:Math.floor(G.score),survivalTime:Math.floor(G.time),level:player.level,bosses:G.bossesDefeated,kills:player.kills,favoriteWeapon:used[0]?.[0]||null,evolutions}},
 async finish(){if(G.mode!=='endless'||!this.session)return null;const item=this.payload();save.pendingOnline=save.pendingOnline||[];try{const d=await this.call('finish-run',item);this.session=null;return d}catch(e){save.pendingOnline.push(item);store();this.session=null;return null}},
 async flush(){if(!this.enabled()||!navigator.onLine||!save.pendingOnline?.length)return;for(const item of [...save.pendingOnline]){try{await this.call('finish-run',item);save.pendingOnline.shift();store()}catch(e){break}}},
 async load(search=''){
  const status=$('#leaderStatus');if(!this.enabled()){status.textContent='Online leaderboard is ready for deployment. Add your Supabase URL and anon key in leaderboard-config.js.';this.render([]);return}
  status.className='leader-status loading';status.textContent='Loading worldwide rankings…';
  try{await this.auth();const uid=save.onlineAuth?.user?.id||null,url=new URL(`${this.cfg.url}/rest/v1/rpc/get_global_leaderboard`);const r=await fetch(url,{method:'POST',headers:this.headers(),body:JSON.stringify({p_category:this.category,p_search:search||null,p_player:uid})});if(!r.ok)throw new Error('Leaderboard request failed');const rows=await r.json();this.render(rows);status.className='leader-status';status.textContent=rows.length?`${rows.length} ranked hero${rows.length===1?'':'es'} shown`:'No matching players yet';$('#leaderUpdated').textContent='Last updated: '+new Date().toLocaleString() }catch(e){status.className='leader-status';status.textContent=navigator.onLine?'Unable to load leaderboard: '+e.message:'Offline — rankings will sync when your connection returns'}
 },
 render(rows){const uid=save.onlineAuth?.user?.id,podium=$('#leaderPodium'),list=$('#leaderList'),labels={score:'Score',survival:'Survival Time',level:'Highest Level',bosses:'Bosses Defeated'},metric=r=>this.category==='survival'?formatClock(r.survival_time):this.category==='level'?`Level ${r.level}`:this.category==='bosses'?`${r.bosses} Bosses`:`${Number(r.score).toLocaleString()} pts`;podium.innerHTML=rows.filter(r=>r.global_rank<=3).map(r=>`<article class="podium-card ${r.player_id===uid?'current':''}"><b>#${r.global_rank}</b><span class="avatar">${r.avatar}</span><b>${escapeHTML(r.player_name)}</b><span>${labels[this.category]}</span><strong>${metric(r)}</strong></article>`).join('');list.innerHTML=`<div class="leader-row header"><span>Rank</span><span>Player</span><span>${labels[this.category]}</span><span>Score</span><span>Time</span><span>Level</span><span>Bosses</span><span>Date</span></div>`+rows.filter(r=>r.global_rank>3).map(r=>`<div class="leader-row ${r.player_id===uid?'current':''}"><b>#${r.global_rank}</b><span class="leader-player"><i>${r.avatar}</i>${escapeHTML(r.player_name)}</span><b>${metric(r)}</b><span>${Number(r.score).toLocaleString()}</span><span>${formatClock(r.survival_time)}</span><span>Lv.${r.level}</span><span>${r.bosses}</span><small>${new Date(r.achieved_at).toLocaleDateString()}</small></div>`).join('');const me=rows.find(r=>r.player_id===uid);$('#myGlobalRank').textContent=me?`Your ${labels[this.category]} Rank: #${me.global_rank}`:''}
};
function escapeHTML(v){const d=document.createElement('div');d.textContent=String(v);return d.innerHTML}
addEventListener('online',()=>{Online.flush();if($('#global').classList.contains('active'))Online.load()});

// ---------- Menus ----------
function showScreen(id){$$('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');$('#hud').classList.add('hidden');$('#touchControls').classList.remove('game-on');G.running=false;updateSummary();if(id==='global')Online.load()}
function formatClock(total){total=Math.max(0,Math.floor(total));return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`}
function updateSummary(){const who=save.profile?`${save.profile.avatar} ${save.profile.name}  •  `:'';$('#saveSummary').textContent=`${who}Highest Score: ${save.highScore.toLocaleString()}  •  Levels Unlocked: ${save.unlocked}/10  •  Coins: ${save.coins||0}`;renderLevels();renderScores()}
function renderScores(){const box=$('#scoreBoards');if(!box)return;const c=save.records.classic,e=save.records.endless;const p=save.profile||{};box.innerHTML=`<article class="score-board"><h3>${p.avatar||'🦸'} Player Profile</h3><div class="record-row"><span>Player</span><b>${escapeHTML(p.name||'Healthy Hero')}</b></div><div class="record-row"><span>Registered</span><b>${p.registrationDate?new Date(p.registrationDate).toLocaleDateString():'—'}</b></div><div class="record-row"><span>Total Games / Wins</span><b>${p.totalGames||0} / ${p.totalWins||0}</b></div><div class="record-row"><span>Total Play Time</span><b>${formatClock(p.totalPlayTime||0)}</b></div><div class="record-row"><span>Total Kills</span><b>${(p.totalKills||0).toLocaleString()}</b></div><div class="record-row"><span>Favorite Weapon</span><b>${p.favoriteWeapon?(weaponDefs[p.favoriteWeapon]?.name||p.favoriteWeapon):'—'}</b></div><div class="record-row"><span>Evolutions Unlocked</span><b>${(p.evolutionsUnlocked||[]).length}</b></div></article><article class="score-board"><h3>🗺️ Classic Mode</h3><div class="record-row"><span>Highest Level</span><b>${c.highestLevel}</b></div><div class="record-row"><span>Highest Score</span><b>${c.highestScore.toLocaleString()}</b></div><div class="record-row"><span>Longest Survival</span><b>${formatClock(c.longestTime)}</b></div><div class="record-row"><span>Total Enemies Defeated</span><b>${c.totalKills.toLocaleString()}</b></div><div class="record-row"><span>Bosses Defeated</span><b>${c.bosses}</b></div></article><article class="score-board endless"><h3>♾️ Endless Mode</h3><div class="record-row"><span>Longest Survival</span><b>${formatClock(e.longestTime)}</b></div><div class="record-row"><span>Highest Score</span><b>${e.highestScore.toLocaleString()}</b></div><div class="record-row"><span>Highest Level</span><b>${e.highestLevel}</b></div><div class="record-row"><span>Most Bosses in One Run</span><b>${e.bestBosses||0}</b></div><div class="record-row"><span>Total Bosses Defeated</span><b>${e.bosses}</b></div></article>`}
function renderLevels(){let g=$('#levelGrid');if(!g)return;g.innerHTML='';maps.forEach((m,i)=>{let locked=i+1>save.unlocked,b=document.createElement('button');b.className='level-card'+(locked?' locked':'');b.style.background=`linear-gradient(145deg,${m[1]},${m[2]})`;b.innerHTML=`<b>${i+1}</b><span>${m[3]} ${m[0]}</span><small>${5+Math.floor(i/2)}:${i%2?'30':'00'} survival</small>${locked?'<i class="lock">🔒</i>':''}`;if(!locked)b.onclick=()=>startGame(i+1,'classic');g.appendChild(b)})}
let selectedAvatar=save.profile?.avatar||'🦸';
$$('.avatar-choice').forEach(b=>b.onclick=()=>{selectedAvatar=b.dataset.avatar;$$('.avatar-choice').forEach(x=>x.classList.toggle('selected',x===b));sfx('click')});
$('#registerBtn').onclick=()=>{const name=$('#registerName').value.trim();if(!name){$('#registerError').textContent='Please enter a player name.';return}save.profile={name,avatar:selectedAvatar,registrationDate:new Date().toISOString(),totalGames:0,totalWins:0,totalPlayTime:0,totalKills:0,favoriteWeapon:null,evolutionsUnlocked:[]};store();$('#settingsName').value=name;audioStart();showScreen('menu');Online.syncProfile()};
$$('[data-action]').forEach(b=>b.onclick=()=>{audioStart();sfx('click');let a=b.dataset.action;if(a==='exit'){alert('Thanks for playing Nutrition Quest! You may now close this tab.');}else showScreen(a)});$$('[data-back]').forEach(b=>b.onclick=()=>showScreen('menu'));
$('#classicMode').onclick=()=>showScreen('levels');
$('#endlessMode').onclick=()=>startGame(1,'endless');
$$('#leaderTabs button').forEach(b=>b.onclick=()=>{$$('#leaderTabs button').forEach(x=>x.classList.toggle('active',x===b));Online.category=b.dataset.category;Online.load($('#leaderSearch').value.trim())});
$('#leaderRefresh').onclick=()=>Online.load($('#leaderSearch').value.trim());
$('#leaderSearchBtn').onclick=()=>Online.load($('#leaderSearch').value.trim());
$('#leaderSearch').onkeydown=e=>{if(e.key==='Enter')Online.load(e.target.value.trim())};
function loadSettings(){$('#musicToggle').checked=save.music;$('#sfxToggle').checked=save.sfx;$('#shakeToggle').checked=save.shake;$('#volume').value=save.volume;$('#settingsName').value=save.profile?.name||''}loadSettings();
$('#saveName').onclick=()=>{const name=$('#settingsName').value.trim();if(!name)return toast('Player name cannot be empty');save.profile={...(save.profile||{avatar:'🦸'}),name};store();updateSummary();toast('Player name saved!');Online.syncProfile()};
$('#changePlayer').onclick=()=>{if(!confirm('Change to a new player? Current unlocked stages and settings will remain, but personal records on this device will start fresh for the new user.'))return;save.profile=null;save.onlineAuth=null;save.pendingOnline=[];save.globalRank=null;save.highScore=0;save.records={classic:{...defaults.records.classic},endless:{...defaults.records.endless}};selectedAvatar='🦸';$('#registerName').value='';$('#registerError').textContent='';$$('.avatar-choice').forEach((b,i)=>b.classList.toggle('selected',i===0));store();showScreen('register')};
['music','sfx','shake'].forEach(k=>$('#'+k+'Toggle').onchange=e=>{save[k]=e.target.checked;store();startMusic()});$('#volume').oninput=e=>{save.volume=+e.target.value;store()};$('#resetSave').onclick=()=>{if(confirm('Reset all progress and settings?')){save={...defaults};store();loadSettings();showScreen('register')}};

// ---------- Runtime state ----------
const keys={}, G={running:false,paused:false,mode:'classic',time:0,duration:300,stage:1,score:0,boss:null,bossesDefeated:0,nextBossAt:300,coins:0,newRecords:[],cam:{x:0,y:0},shake:0,quizAt:[],quizDone:0};
let player,enemies=[],projectiles=[],enemyShots=[],gems=[],particles=[],texts=[],traps=[],decor=[];
// Small reusable pools reduce garbage-collection spikes during dense battles.
const objectPools={projectiles:[],particles:[]};
function pooledProjectile(data){const o=objectPools.projectiles.pop()||{};for(const k in o)delete o[k];return Object.assign(o,data)}
function pooledParticle(data){const o=objectPools.particles.pop()||{};for(const k in o)delete o[k];return Object.assign(o,data)}
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();if(e.code==='Space')dash();if((e.key==='Escape'||e.key.toLowerCase()==='p')&&G.running)togglePause()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function makePlayer(){return{x:0,y:0,r:19,hp:100,maxHp:100,speed:190,level:1,xp:0,nextXp:1,damage:1,attackSpeed:1,crit:.05,critDamage:1.75,regen:0,armor:0,projectileSpeed:1,size:1,count:0,knockback:1,cooldown:0,explosionRadius:1,areaDamage:1,piercing:0,ricochet:0,bounce:0,bossDamage:1,statusDuration:1,pickup:100,xpGain:1,luck:0,weapons:{carrot:{level:1,cd:0}},passives:{},ultimates:{},dashCd:0,dashMax:2.5,dashTime:0,invuln:0,slow:0,dir:{x:1,y:0},kills:0,companion:null,idle:0}}
function startGame(stage,mode='classic'){audioStart();G.running=true;G.paused=false;G.mode=mode;G.stage=stage;G.time=0;G.duration=mode==='classic'?300+(stage-1)*30:Infinity;G.score=0;G.boss=null;G.bossesDefeated=0;G.nextBossAt=mode==='classic'?300:600;G.coins=0;G.newRecords=[];G.weaponUse={};G.eliteCount=0;G.swarmCycle=0;G.swarm=null;G.nextSwarmAt=mode==='classic'?Infinity:rnd(60,480);G.shake=0;if(mode==='endless')Online.startRun();G.quizAt=mode==='endless'?[150,330]:[G.duration*.38,G.duration*.72];G.quizDone=0;player=makePlayer();enemies=[];projectiles=[];enemyShots=[];gems=[];particles=[];texts=[];traps=[];makeDecor();$$('.screen,.overlay').forEach(x=>x.classList.remove('active'));$$('.overlay').forEach(x=>x.classList.add('hidden'));$('#hud').classList.remove('hidden');$('#touchControls').classList.add('game-on');$('#bossHud').classList.add('hidden');startMusic();last=performance.now();requestAnimationFrame(loop);toast(`${maps[stage-1][3]} ${maps[stage-1][0]}`)}
function makeDecor(){decor=[];let seed=G.stage*991+(isSurvivalMode()?777:0),limit=worldLimit(),count=isSurvivalMode()?520:180;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;for(let i=0;i<count;i++)decor.push({x:(rand()*2-1)*limit,y:(rand()*2-1)*limit,t:rand()>.35?maps[G.stage-1][3]:maps[G.stage-1][4],s:15+rand()*20})}

// ---------- Enemies and combat ----------
function endlessCurve(minutes){
 // Easy introduction, pronounced mid-game ramp, then controlled long-run growth.
 if(minutes<2)return .72+minutes*.12;
 if(minutes<10)return .96+(minutes-2)*.18;
 return 2.40+Math.sqrt(minutes-10)*.18;
}
function spawnEnemy(type,x,y,small=false){let d=enemyDefs[type],minutes=G.time/60,scale=isSurvivalMode()?endlessCurve(minutes):(.78+(G.stage-1)*.19+G.time/G.duration*.65),elite=isSurvivalMode()&&!G.spawningSwarm&&minutes>3&&(G.eliteCount||0)<8&&Math.random()<Math.min(.04,(minutes-3)*.0025);if(elite){scale*=1.75;G.eliteCount=(G.eliteCount||0)+1;}if(x==null){let a=rnd(0,TAU),r=Math.max(W,H)*.7+100;x=player.x+Math.cos(a)*r;y=player.y+Math.sin(a)*r}enemies.push({type,x,y,r:d.size*(small?.65:1),hp:d.hp*scale*(small?.45:1),maxHp:d.hp*scale,damage:d.damage*scale,speed:d.speed*(isSurvivalMode()?Math.min(1.45,1.02+minutes*.055):1.5)*(1+(G.stage-1)*.025),icon:d.icon,cd:rnd(.2,2),hit:0,state:0,small,elite,dead:false});}
function availableEnemies(){const unlocked=isSurvivalMode()?2+Math.floor(G.time/120):2+G.stage+Math.floor(G.time/G.duration*3);return Object.keys(enemyDefs).slice(0,Math.min(10,unlocked))}
function startJunkSwarm(){
 const types=Object.keys(enemyDefs),combined=G.swarmCycle>=types.length,type=combined?'Combined Junk Food':types[G.swarmCycle];
 G.swarmCycle++;G.swarm={id:Date.now(),type,combined,remaining:Math.min(150,55+Math.floor(G.time/60)*3),alive:0,timer:0};
 const windowStart=Math.floor(G.time/600)*600;G.nextSwarmAt=windowStart+600+rnd(60,480);
 tone(145,.65,'sawtooth',.14,220);toast(combined?'⚠ COMBINED JUNK FOOD SWARM!':`⚠ ${type.toUpperCase()} SWARM!`);
}
function updateJunkSwarm(dt){const s=G.swarm;if(!s)return;s.timer-=dt;if(s.remaining>0&&s.timer<=0&&enemies.length<430){const batch=Math.min(3,s.remaining);G.spawningSwarm=true;for(let i=0;i<batch;i++){const type=s.combined?pick(Object.keys(enemyDefs)):s.type;spawnEnemy(type);const spawned=enemies[enemies.length-1];spawned.swarmId=s.id;s.alive++;s.remaining--}G.spawningSwarm=false;s.timer=.11}if(s.remaining===0&&s.alive===0){toast('✅ Junk food swarm cleared!');G.swarm=null}}
function spawnBoss(){let names=['Burger Baron','Fry Captain','Pizza Brute','Soda Sorcerer','Candy Crusher','Donut Phantom','Ice Cream Titan','Hotdog General','Chocolate Emperor','Junk Food King'],wave=isSurvivalMode()?Math.floor(G.time/600):G.stage,bossTier=isSurvivalMode()?Math.max(1,wave):G.stage,nameIndex=(bossTier-1)%names.length;let hp=isSurvivalMode()?1800*Math.pow(1.48,bossTier-1):1600*Math.pow(1.43,G.stage-1);G.boss={type:'Boss',name:names[nameIndex]+(isSurvivalMode()?` · Wave ${bossTier}`:''),icon:nameIndex===9?'👑':'👹',x:player.x+500,y:player.y,r:48+Math.min(20,bossTier*2),hp,maxHp:hp,damage:18+bossTier*5,speed:48+Math.min(35,bossTier*3),tier:bossTier,cd:1,ability:0,phase:1,hit:0,dead:false};G.bossEntrance=1.4;G.shake=14;enemies.push(G.boss);$('#bossHud').classList.remove('hidden');$('#bossName').textContent=G.boss.name;sfx('boss');startMusic();toast(`⚠ ${G.boss.name} has appeared!`)}
function hurtEnemy(e,dmg,knock=0,ang=0,critBonus=0){if(e.dead)return false;let crit=Math.random()<clamp(player.crit+critBonus,0,.95);dmg*=player.damage*(e===G.boss?player.bossDamage:1)*(crit?player.critDamage:1);e.hp-=dmg;e.hit=.09;if(knock&&e!==G.boss){e.x+=Math.cos(ang)*knock*player.knockback;e.y+=Math.sin(ang)*knock*player.knockback}damageText(e.x,e.y,Math.round(dmg),crit?'#ffe34c':'#fff',crit?20:14);burst(e.x,e.y,crit?'#ffd82f':'#9af37c',crit?8:3);if(e.hp<=0)killEnemy(e);return crit}
function killEnemy(e){if(e.dead)return;e.dead=true;if(e.elite)G.eliteCount=Math.max(0,(G.eliteCount||1)-1);if(e.swarmId&&G.swarm?.id===e.swarmId)G.swarm.alive=Math.max(0,G.swarm.alive-1);player.kills++;G.score+=e===G.boss?5000:G.stage*10;burst(e.x,e.y,'#fff06b',12);if(e===G.boss){if(isSurvivalMode()){G.bossesDefeated++;if(G.mode==='endless')save.records.endless.bosses++;G.coins+=50+G.bossesDefeated*15;save.coins=(save.coins||0)+50+G.bossesDefeated*15;G.score+=2500*G.bossesDefeated;G.boss=null;$('#bossHud').classList.add('hidden');G.forceQuality=true;gainXp(player.nextXp*2.1);store();sfx('win');toast(`🎁 Boss chest! +${50+G.bossesDefeated*15} coins and massive XP`);return}else{G.bossesDefeated++;victory();return}}let n=e.type==='Pizza'?3:1,xpScale=G.mode==='endless'?(1+G.time/300*.12):1,xpValue=(e.type==='Pizza'?3:1)*xpScale*(e.elite?6:1);for(let i=0;i<n;i++)gems.push({x:e.x+rnd(-12,12),y:e.y+rnd(-12,12),v:xpValue,r:e.elite?9:6});if(e.type==='Candy'&&!e.small){spawnEnemy('Candy',e.x-12,e.y,true);const c1=enemies[enemies.length-1];spawnEnemy('Candy',e.x+12,e.y,true);const c2=enemies[enemies.length-1];if(e.swarmId&&G.swarm?.id===e.swarmId){c1.swarmId=c2.swarmId=e.swarmId;G.swarm.alive+=2}}}
function hurtPlayer(dmg){if(player.invuln>0||!G.running)return;dmg=Math.max(1,dmg*(1-player.armor*.05));player.hp-=dmg;player.invuln=.55;G.shake=9;sfx('bad');damageText(player.x,player.y,Math.round(dmg),'#ff6b6b',20);if(player.hp<=0){if(G.mode==='multiplayer'){player.hp=0;player.dead=true;toast('You are down! A teammate can revive you.')}else endGame(false)}}
function shoot(x,y,ang,speed,dmg,kind='carrot',life=3,extra={}){if(projectiles.length>=2600)return;projectiles.push(pooledProjectile({x,y,vx:Math.cos(ang)*speed*player.projectileSpeed,vy:Math.sin(ang)*speed*player.projectileSpeed,r:(extra.r||6)*player.size,dmg,kind,life,pierce:extra.pierce||0,returning:extra.returning||false,age:0,hit:new Set(),...extra}))}
function nearest(max=9999){let best=null,bd=max;for(let e of enemies)if(!e.dead){let d=Math.hypot(e.x-player.x,e.y-player.y);if(d<bd){bd=d;best=e}}return best}
function selectWeaponTarget(id,max){const list=enemies.filter(e=>!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<max);if(!list.length)return null;if(id==='orange')return list.reduce((a,b)=>a.hp>b.hp?a:b);if(id==='cucumber')return list.reduce((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)>Math.hypot(b.x-player.x,b.y-player.y)?a:b);if(id==='seed'||id==='chakram')return pick(list);if(id==='tomato')return list.reduce((a,b)=>{const ca=nearbyEnemies(a.x,a.y,130).length,cb=nearbyEnemies(b.x,b.y,130).length;return ca>cb?a:b});return nearest(max)}
function updateWeapons(dt){
 for(const [id,w] of Object.entries(player.weapons)){
  w.cd-=dt; const lv=w.level, e=!!w.evolved;
  if(id==='egg'){w.angle=(w.angle||0)+dt*(e?3.1:1.7+.12*lv);continue}
  if(w.cd>0)continue;
  const target=selectWeaponTarget(id,e?1200:(id==='cucumber'?1050:800));
  if(!target&&!['banana','vitamin','rice','leaf','pulse'].includes(id))continue;
  let rate=(1+Math.min(lv,5)*.1)*player.attackSpeed*(e?1.35:1);
  w.cd=({carrot:.65,apple:1.4,broccoli:2.4,banana:2.2,water:1.6,milk:2.5,fish:1.9,vitamin:2.8,rice:1.5,orange:1.35,tomato:2.15,corn:.9,cucumber:1.65,smoothie:1.45,chakram:1.7,laser:2.8,leaf:1.15,pulse:2.4,seed:.48}[id]||1)/rate*(1-player.cooldown);
  const a=target?Math.atan2(target.y-player.y,target.x-player.x):rnd(0,TAU);
  G.weaponUse[id]=(G.weaponUse[id]||0)+1;
  const normalCount=1+player.count+(lv>=2?1:0)+(lv>=4?1:0);

  if(id==='carrot'){
   const count=e?clamp(5+player.count,5,7):normalCount;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*(e?.19:.12),e?560:440,e?58:18+lv*7,'carrot',e?2.8:2,{pierce:e?999:0,r:e?11:6,trail:e,critBonus:.04});
  }
  if(id==='apple'){
   const count=e?Math.min(6,3+player.count):normalCount;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.18,e?500:300,e?72:28+lv*9,'apple',e?2.8:1.5,{returning:true,returnDelay:e?1.15:.65,pierce:99,r:e?18:10,multiHit:e,critBonus:.08});
  }
  if(id==='broccoli'){
   shoot(player.x,player.y,a,e?300:230,e?105:35+lv*14,'broccoli',2.5,{explode:true,blast:e?190:85+lv*7,r:e?18:12,multiBlast:e,poison:e});
  }
  if(id==='banana'){
   const count=e?Math.min(7,4+player.count):1;
   for(let i=0;i<count;i++)traps.push({x:player.x+rnd(e?-100:-20,e?100:20),y:player.y+rnd(e?-100:-20,e?100:20),r:e?48:32+lv*4,life:e?18:9,dmg:e?62:11+lv*6,cd:0,slow:e?2.5:.5,kind:'banana'});
  }
  if(id==='water'){
   const count=e?Math.min(13,8+player.count):3+lv+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*(e?.11:.14),e?420:250,e?48:10+lv*5,'water',e?2.2:1,{r:e?18:9,pierce:e?6:2,knock:e?105:30});
  }
  if(id==='milk'){
   projectiles.push({x:player.x,y:player.y,vx:Math.cos(a),vy:Math.sin(a),r:(e?24:8)*player.size,dmg:e?75:11+lv*5,kind:'beam',life:e?1.3:.45,pierce:999,hit:new Set(),length:(e?1100:600)*player.projectileSpeed,age:0,repeatHit:e,hitClock:0});
  }
  if(id==='fish'){
   const count=e?Math.min(7,4+player.count):normalCount;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.12,e?360:240,e?82:38+lv*13,'fish',4,{homing:true,turn:e?7:3,r:e?15:11,explode:e,blast:e?100:0,critBonus:.11});
  }
  if(id==='vitamin'){
   const rings=e?3:1, base=e?16+player.count*2:6+lv*2+player.count;
   for(let ring=0;ring<rings;ring++)for(let i=0;i<base;i++)shoot(player.x,player.y,i/base*TAU+ring*.1,e?330+ring*90:280,e?48:14+lv*6,'vitamin',2.4,{pierce:e?2:1,r:e?10:7});
  }
  if(id==='rice'){
   const count=e?Math.min(18,10+player.count*2):2+lv;
   for(let i=0;i<count;i++){
    const spread=e?230:100, tx=target?target.x+rnd(-spread,spread):player.x+rnd(-spread*2,spread*2),ty=target?target.y+rnd(-spread,spread):player.y+rnd(-spread*2,spread*2);
    projectiles.push({x:tx,y:ty-(e?600:450),vx:0,vy:e?720:480,r:e?9:6,dmg:e?52:15+lv*7,kind:'rice',life:1.3,pierce:0,hit:new Set(),age:0,explode:e,blast:e?65:0});
   }
  }
  if(id==='orange'){
   const count=e?4+Math.min(2,player.count):1+Math.floor(lv/3)+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.16,e?500:330,e?96:30+lv*10,'orange',e?3.2:2.2,{r:e?19:13,ricochet:(e?6:1)+player.ricochet,pierce:e?2:0,knock:e?85:38,trail:e,critBonus:.03});
  }
  if(id==='tomato'){
   const count=e?4:1+Math.floor(lv/4);
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+rnd(-.14,.14),e?390:280,e?105:38+lv*12,'tomato',e?1.25:1.65,{r:e?18:12,gravity:e?260:420,explode:true,detonateOnEnd:true,blast:e?190:82+lv*8,multiBlast:e,cluster:e,knock:e?80:35,critBonus:.02});
  }
  if(id==='corn'){
   const count=e?Math.min(9,6+player.count):2+Math.floor(lv/2)+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.075,e?330:220,e?42:13+lv*6,'corn',e?2.8:2,{r:e?10:7,accel:e?520:270,pierce:(e?8:1+Math.floor(lv/2))+player.piercing,trail:e,critBonus:.06});
  }
  if(id==='cucumber'){
   const count=e?3+player.count:1+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.09,e?920:680,e?125:42+lv*13,'cucumber',e?2.2:1.45,{r:e?15:9,pierce:(e?999:3+lv)+player.piercing,decel:e?.97:.985,knock:e?110:48,trail:e,critBonus:.12});
  }
  if(id==='smoothie'){
   const count=e?14:5+lv+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+rnd(e?-.75:-.42,e?.75:.42),e?380:270,e?44:9+lv*5,'smoothie',e?1.7:1.05,{r:e?16:9,pierce:e?3:0,knock:e?58:20,statusSlow:e?2.8:1,trail:e,critBonus:-.02});
  }
  if(id==='chakram'){
   const count=e?5+Math.min(2,player.count):1+Math.floor(lv/3)+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+(i-(count-1)/2)*.2,e?560:380,e?85:28+lv*9,'chakram',e?3.4:2.3,{r:e?20:13,returning:true,returnDelay:e?1.35:.85,multiHit:true,pierce:99,bounce:(e?5:1)+player.bounce,spin:true,trail:e,critBonus:.05});
  }
  if(id==='laser'){
   projectiles.push({x:player.x,y:player.y,vx:Math.cos(a),vy:Math.sin(a),r:(e?30:7+lv)*player.size,dmg:e?92:16+lv*7,kind:'laserBeam',life:e?1.8:.35+lv*.05,pierce:999,hit:new Set(),length:(e?1350:520+lv*55)*player.projectileSpeed,age:0,repeatHit:true,hitClock:0,charged:true});
  }
  if(id==='leaf'){
   const count=e?18:4+lv+player.count;
   for(let i=0;i<count;i++){const aa=a+i/count*TAU;shoot(player.x,player.y,aa,e?360:240,e?50:12+lv*5,'leaf',e?3.8:2.4,{r:e?13:8,spiral:e?.13:.06,pierce:e?4:1,statusSlow:e?2:1,trail:e,critBonus:.04})}
  }
  if(id==='pulse'){
   projectiles.push({x:player.x,y:player.y,vx:0,vy:0,r:18,dmg:e?130:28+lv*11,kind:'pulse',life:e?1.25:.8,pierce:999,hit:new Set(),age:0,growth:e?620:330,maxR:e?520:220+lv*22,knock:e?130:60,critBonus:.08});
  }
  if(id==='seed'){
   const count=e?Math.min(10,6+player.count):1+Math.floor(lv/2)+player.count;
   for(let i=0;i<count;i++)shoot(player.x,player.y,a+rnd(-.22,.22),e?620:470,e?38:10+lv*5,'seed',e?3:1.8,{r:e?9:5,bounce:(e?8:2)+player.bounce,ricochet:(e?3:0)+player.ricochet,accel:e?130:0,trail:e,critBonus:.1});
  }
  weaponSfx(id,e);
 }
}
function updateProjectiles(dt){
 for(const p of projectiles){
  p.age+=dt;p.life-=dt;
  if(p.trail&&Math.random()<.7)particles.push({x:p.x,y:p.y,vx:rnd(-25,25),vy:rnd(-25,25),life:.28,max:1,color:'#ffe65d',r:rnd(2,5)});
  if((p.kind==='water'&&p.r>12||p.kind==='fish'&&p.explode)&&Math.random()<.45)particles.push({x:p.x,y:p.y,vx:rnd(-45,45),vy:rnd(-45,45),life:.32,max:1,color:'#7eeaff',r:rnd(2,6)});
  if(p.accel){const sp=Math.hypot(p.vx,p.vy)||1;p.vx+=p.vx/sp*p.accel*dt;p.vy+=p.vy/sp*p.accel*dt}
  if(p.gravity)p.vy+=p.gravity*dt;
  if(p.decel){p.vx*=Math.pow(p.decel,dt*60);p.vy*=Math.pow(p.decel,dt*60)}
  if(p.spiral){const ca=Math.cos(p.spiral),sa=Math.sin(p.spiral),vx=p.vx;p.vx=vx*ca-p.vy*sa;p.vy=vx*sa+p.vy*ca}
  if(p.kind==='pulse'){p.r=Math.min(p.maxR,p.r+p.growth*dt);p.x+=0;p.y+=0}
  if(p.homing){const e=nearestFrom(p.x,p.y,700);if(e){const a=Math.atan2(e.y-p.y,e.x-p.x),turn=p.turn||3;p.vx+=(Math.cos(a)*(p.kind==='fish'&&p.explode?430:330)-p.vx)*dt*turn;p.vy+=(Math.sin(a)*(p.kind==='fish'&&p.explode?430:330)-p.vy)*dt*turn}}
  if(p.returning&&p.age>(p.returnDelay||.65)){
   const a=Math.atan2(player.y-p.y,player.x-p.x);p.vx=Math.cos(a)*(p.multiHit?560:380);p.vy=Math.sin(a)*(p.multiHit?560:380);
   if(p.multiHit&&!p.returnCleared){p.hit.clear();p.returnCleared=true}
  }
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.bounce>0){const edge=worldLimit()-10;if(Math.abs(p.x)>edge||Math.abs(p.y)>edge){if(Math.abs(p.x)>edge)p.vx*=-1;if(Math.abs(p.y)>edge)p.vy*=-1;p.x=clamp(p.x,-edge+2,edge-2);p.y=clamp(p.y,-edge+2,edge-2);p.bounce--;p.hit.clear();burst(p.x,p.y,'#b7f36b',5)}}
  if(p.kind==='beam'||p.kind==='laserBeam'){
   p.x=player.x;p.y=player.y;
   if(p.repeatHit){p.hitClock-=dt;if(p.hitClock<=0){p.hit.clear();p.hitClock=.16}}
  }
  const collisionCandidates=(p.kind==='beam'||p.kind==='laserBeam'||p.kind==='pulse')?enemies:nearbyEnemies(p.x,p.y,p.r+45);
  for(const e of collisionCandidates)if(!e.dead&&!p.hit.has(e)){
   let hit=false;
   if(p.kind==='beam'||p.kind==='laserBeam'){const ex=e.x-p.x,ey=e.y-p.y,along=ex*p.vx+ey*p.vy,side=Math.abs(ex*p.vy-ey*p.vx);hit=along>0&&along<p.length&&side<e.r+p.r}
   else hit=Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r;
   if(hit){
    p.hit.add(e);const wasCrit=hurtEnemy(e,p.dmg*(p.kind==='pulse'?player.areaDamage:1),p.knock||8,Math.atan2(p.vy,p.vx),p.critBonus||0);if(p.statusSlow)e.slowTimer=Math.max(e.slowTimer||0,p.statusSlow*player.statusDuration);
    // Golden Carrot critical hits burst into a compact healthy explosion.
    if(p.kind==='carrot'&&p.trail&&wasCrit){for(const q of enemies)if(q!==e&&!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<65)hurtEnemy(q,p.dmg*.45);burst(e.x,e.y,'#ffe55a',18);sfx('evoHit')}
    if(p.explode){p.detonated=true;
     const pulses=p.multiBlast?3:1;
     for(let pulse=0;pulse<pulses;pulse++)setTimeout(()=>{
      if(!G.running)return;
      for(const q of enemies)if(!q.dead&&Math.hypot(q.x-p.x,q.y-p.y)<p.blast*player.explosionRadius)hurtEnemy(q,p.dmg*(p.multiBlast?.65:.8)*player.areaDamage);
      burst(p.x,p.y,p.poison?'#6cff65':'#9ee85b',p.multiBlast?26:18);
     },pulse*170);
     if(p.poison)traps.push({x:p.x,y:p.y,r:p.blast*.72,life:5,dmg:p.dmg*.22,cd:0,slow:.6,kind:'poison'});
     p.life=0;
    }
    if(p.ricochet>0){const next=enemies.find(q=>!q.dead&&q!==e&&!p.hit.has(q)&&Math.hypot(q.x-e.x,q.y-e.y)<420);if(next){const ra=Math.atan2(next.y-p.y,next.x-p.x),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(ra)*sp;p.vy=Math.sin(ra)*sp;p.ricochet--;p.life=Math.max(p.life,.45);burst(e.x,e.y,'#fff2a1',6)}}
    if(p.pierce--<=0&&!p.returning&&p.ricochet<=0)p.life=0;
   }
  }
  // Grenades and evolved rice detonate at the end of their flight.
  if(p.explode&&p.life<=0&&!p.detonated){p.detonated=true;for(const q of enemies)if(!q.dead&&Math.hypot(q.x-p.x,q.y-p.y)<p.blast*player.explosionRadius)hurtEnemy(q,p.dmg*.8*player.areaDamage,20,0,p.critBonus||0);burst(p.x,p.y,p.kind==='tomato'?'#ff594c':'#fff0b0',p.cluster?30:14);if(p.cluster)for(let i=0;i<5;i++)shoot(p.x,p.y,i/5*TAU,220,p.dmg*.32,'tomato',.45,{r:7,explode:true,blast:p.blast*.42});sfx('evoHit')}
 }
 for(const p of projectiles)if(p.life<=0&&!p.multiBlast&&objectPools.projectiles.length<800)objectPools.projectiles.push(p);
 projectiles=projectiles.filter(p=>p.life>0);
}
const spatialGrid=new Map(),GRID_SIZE=180;
function rebuildSpatialGrid(){spatialGrid.clear();for(const e of enemies)if(!e.dead){const k=`${Math.floor(e.x/GRID_SIZE)},${Math.floor(e.y/GRID_SIZE)}`;let cell=spatialGrid.get(k);if(!cell)spatialGrid.set(k,cell=[]);cell.push(e)}}
function nearbyEnemies(x,y,r=80){const out=[],minX=Math.floor((x-r)/GRID_SIZE),maxX=Math.floor((x+r)/GRID_SIZE),minY=Math.floor((y-r)/GRID_SIZE),maxY=Math.floor((y+r)/GRID_SIZE);for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++){const cell=spatialGrid.get(`${gx},${gy}`);if(cell)out.push(...cell)}return out}
function nearestFrom(x,y,max){let b=null;for(let e of nearbyEnemies(x,y,max))if(!e.dead&&Math.hypot(e.x-x,e.y-y)<max){max=Math.hypot(e.x-x,e.y-y);b=e}return b}

// ---------- Enemy and boss AI ----------
const MAX_ENEMY_ORBS=160;
function addEnemyShot(data){if(enemyShots.length>=MAX_ENEMY_ORBS)return false;enemyShots.push({age:0,grace:.2,...data});return true}
function enemyProjectile(e,a,speed=180,n=1,bounce=0){if(e!==G.boss&&(G.enemyOrbCooldown||0)>0)return;if(e!==G.boss)G.enemyOrbCooldown=.16;if(e===G.boss)tone(95,.14,'sawtooth',.07,120);else if(Math.random()<.12)tone(185,.05,'square',.025,-40);const lateSlow=G.time>600?Math.max(.82,1-(G.time-600)/7200):1,safeCount=Math.min(n,MAX_ENEMY_ORBS-enemyShots.length);for(let i=0;i<safeCount;i++){let aa=a+(i-(safeCount-1)/2)*.22;addEnemyShot({x:e.x,y:e.y,ox:e.x,oy:e.y,maxRange:e===G.boss?900:580,vx:Math.cos(aa)*speed*lateSlow,vy:Math.sin(aa)*speed*lateSlow,r:e===G.boss?9:7,dmg:e.damage*.7,life:e===G.boss?4.5:3.2,bounce})}}
function updateEnemies(dt){for(let e of enemies){if(e.dead)continue;e.cd-=dt;e.hit-=dt;let target=player;if(G.mode==='multiplayer'&&MP.isHost){for(const rp of MP.remotePlayers.values())if(rp.alive&&Math.hypot(rp.x-e.x,rp.y-e.y)<Math.hypot(target.x-e.x,target.y-e.y))target=rp}let dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);e.targetId=target===player?MP.uid?.()||'local':target.id;if(e===G.boss){updateBoss(e,dt,a,d);continue}e.slowTimer=Math.max(0,(e.slowTimer||0)-dt);let idlePressure=isSurvivalMode()&&G.time>300&&player.idle>4?1+Math.min(.75,(player.idle-4)*.045):1,sp=e.speed*(e.slowTimer>0?.48:1)*idlePressure;if(e.type==='Soda'&&d<430){sp=d<240?-sp*.5:sp*.2;if(e.cd<=0){enemyProjectile(e,a,190);e.cd=2.2}}
 if(e.type==='Donut'&&e.cd<=0){e.x=player.x+Math.cos(rnd(0,TAU))*rnd(180,330);e.y=player.y+Math.sin(rnd(0,TAU))*rnd(180,330);e.cd=3.5;burst(e.x,e.y,'#df8cff',10)}
 if(e.type==='Hotdog'&&e.cd<=0){e.state=.6;e.cd=3}if(e.state>0){e.state-=dt;sp*=3}
 if(e.type==='Chocolate'&&e.cd<=0){enemyProjectile(e,a,210,3,2);e.cd=2.8}
 if(e.type==='Cake'&&d<140&&e.cd<=0){e.state=1;e.cd=99}if(e.type==='Cake'&&e.state>0){e.state-=dt;if(e.state<=0){if(d<180)hurtPlayer(e.damage*1.5);burst(e.x,e.y,'#ff8b5c',40);killEnemy(e)}}
 e.x+=dx/d*sp*dt;e.y+=dy/d*sp*dt;if(d<e.r+player.r){if(target===player)hurtPlayer(e.damage);else if(G.mode==='multiplayer'&&MP.isHost){target.hp=Math.max(0,target.hp-e.damage);MP.broadcast('damage_player',{id:target.id,damage:e.damage})}if(e.type==='IceCream'&&target===player)player.slow=2;e.x-=dx/d*18;e.y-=dy/d*18}}
 enemies=enemies.filter(e=>!e.dead)}
function updateBoss(b,dt,a,d){let tier=b.tier||G.stage;let phase=Math.min(tier>=10?5:3,1+Math.floor((1-b.hp/b.maxHp)*(tier>=10?5:3)));b.phase=phase;let rage=tier>=10&&b.hp/b.maxHp<.2?1.65:1;b.x+=Math.cos(a)*b.speed*rage*dt*(d>180?1:-.25);b.y+=Math.sin(a)*b.speed*rage*dt*(d>180?1:-.25);if(d<b.r+player.r)hurtPlayer(b.damage);if(b.cd>0)return;b.ability=(b.ability+1)%Math.min(10,2+tier);let ab=b.ability;b.cd=Math.max(.75,2.6-tier*.08)/rage;
 if(ab===0){b.x+=Math.cos(a)*180;b.y+=Math.sin(a)*180;G.shake=8}
 else if(ab===1){enemyProjectile(b,a,230,3+(tier>3?4:0))}
 else if(ab===2){for(let i=0;i<10+tier;i++){let aa=rnd(0,TAU);addEnemyShot({x:player.x+Math.cos(aa)*rnd(220,470),y:player.y-500-rnd(0,300),vx:0,vy:235,r:10,dmg:b.damage*.55,life:4.4,maxRange:850,bounce:0,grace:.3})}}
 else if(ab===3){for(let i=0;i<2+phase;i++)spawnEnemy(pick(availableEnemies()),b.x+rnd(-80,80),b.y+rnd(-80,80))}
 else if(ab===4){for(let i=0;i<16+tier;i++)enemyProjectile(b,i/(16+tier)*TAU,190+phase*20)}
 else if(ab===5){b.slam=.65;for(let i=0;i<24;i++)enemyProjectile(b,i/24*TAU,150,1)}
 else if(ab===6){addEnemyShot({x:b.x,y:b.y,ox:b.x,oy:b.y,vx:Math.cos(a)*310,vy:Math.sin(a)*310,r:18,dmg:b.damage,life:2,maxRange:720,bounce:1,grace:.25})}
 else if(ab===7){for(let j=0;j<3;j++)setTimeout(()=>{if(G.running){let aa=Math.atan2(player.y-b.y,player.x-b.x);b.x+=Math.cos(aa)*150;b.y+=Math.sin(aa)*150}},j*180)}
 else if(ab===8){for(let i=0;i<30;i++)enemyProjectile(b,i/30*TAU,120+(i%3)*70)}
 else {for(let i=0;i<8;i++)addEnemyShot({x:player.x+rnd(-430,430),y:player.y-600-rnd(0,400),vx:0,vy:300,r:16,dmg:b.damage*.8,life:4.5,maxRange:950,bounce:0,grace:.35})}}
function updateEnemyShots(dt){
 G.enemyOrbCooldown=Math.max(0,(G.enemyOrbCooldown||0)-dt);
 for(const p of enemyShots){
  if(p.ox==null){p.ox=p.x;p.oy=p.y;p.maxRange=p.maxRange||800}
  p.age=(p.age||0)+dt;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(Math.hypot(p.x-p.ox,p.y-p.oy)>p.maxRange)p.life=0;
  if(p.bounce&&Math.abs(p.x-player.x)>W*.55){p.vx*=-1;p.bounce--;p.grace=.12}
  // Smaller effective collision circles and a short spawn grace period prevent
  // projectiles from damaging a player before they are visually readable.
  const fairHit=(p.r*.72)+(player.r*.78);
  if(p.age>(p.grace||.2)&&Math.hypot(p.x-player.x,p.y-player.y)<fairHit){hurtPlayer(p.dmg);p.life=0}
  else if(G.mode==='multiplayer'&&MP.isHost&&p.age>(p.grace||.2)){for(const rp of MP.remotePlayers.values())if(rp.alive&&Math.hypot(p.x-rp.x,p.y-rp.y)<p.r*.72+15){rp.hp=Math.max(0,rp.hp-p.dmg);MP.broadcast('damage_player',{id:rp.id,damage:p.dmg});p.life=0;break}}
 }
 enemyShots=enemyShots.filter(p=>p.life>0);
}

// ---------- Progression, upgrades, quiz ----------
function gainXp(v){player.xp+=v*player.xpGain;while(player.xp>=player.nextXp){player.xp-=player.nextXp;player.level++;
 // Friendly opening: one orb reaches Lv.2, then roughly 3 and 6 basic orbs.
 // The curve becomes meaningful in mid game but stays achievable in long runs.
 if(player.level===2)player.nextXp=3;else if(player.level===3)player.nextXp=6;else if(player.level===4)player.nextXp=10;else if(player.level===5)player.nextXp=15;else if(isSurvivalMode())player.nextXp=Math.floor(player.nextXp*(player.level<12?1.16:1.105)+4);else player.nextXp=Math.floor(player.nextXp*1.19+5);
 showLevelUp();break}}
function upgradePool(){let arr=[];for(const [id,d] of Object.entries(weaponDefs)){const w=player.weapons[id];if(!w)arr.push({type:'weapon',id,name:d.name,icon:d.icon,desc:'Unlock: '+d.desc});else if(w.level<5)arr.push({type:'weapon',id,targetLevel:w.level+1,name:d.name+' Lv.'+(w.level+1),icon:d.icon,desc:'Improves its unique damage, physics, range, and attack pattern'});else if(w.level===5&&!w.evolved)arr.push({type:'weapon',id,targetLevel:6,evolution:true,name:d.name+' Lv.6',icon:d.icon,desc:'Evolves into '+d.evolved+' — a completely new maximum form'})}for(const [id,d] of Object.entries(passives))if((player.passives[id]||0)<5)arr.push({type:'passive',id,name:d[0],icon:d[1],desc:'Improve '+d[0].toLowerCase()});for(const [id,d] of Object.entries(ultimateDefs))if(!player.ultimates[id])arr.push({type:'ultimate',id,name:d[0],icon:d[1],desc:d[2],rare:true});const companions=[['apple','Baby Apple','🍎'],['bee','Healthy Bee','🐝'],['fairy','Vitamin Fairy','🧚'],['farmer','Mini Farmer','🧑‍🌾'],['chicken','Golden Chicken','🐔']];if(save.unlocked>=3){if(!player.companion)for(const c of companions)arr.push({type:'companion',id:c[0],name:c[1],icon:c[2],desc:'A unique following companion'});else if(player.companion.level<5)arr.push({type:'companionLevel',id:player.companion.type,name:player.companion.name+' Lv.'+(player.companion.level+1),icon:player.companion.icon,desc:'Improve companion AI, attack, support, and projectiles'})}return arr}
function showLevelUp(){if(G.mode!=='multiplayer')G.paused=true;sfx('level');let pool=upgradePool(),choices=[];if(G.forceQuality){const quality=pool.filter(x=>x.type==='weapon'||x.type==='ultimate'||x.evolution);if(quality.length>=3)pool=quality;G.forceQuality=false;}while(choices.length<3&&pool.length){let weights=pool.filter(x=>!x.rare||Math.random()<.2+player.luck*.05);let q=pick(weights.length?weights:pool);choices.push(q);pool=pool.filter(x=>x!==q)}$('#choices').innerHTML='';for(let c of choices){let b=document.createElement('button');b.className='choice'+(c.rare?' rare':'')+(c.evolution?' evolution-choice':'');b.innerHTML=`<span class="icon">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small>`;b.onclick=()=>applyUpgrade(c);$('#choices').appendChild(b)}$('#choiceModal').classList.remove('hidden')}
function applyUpgrade(c){if(c.type==='weapon'){if(!player.weapons[c.id])player.weapons[c.id]={level:1,cd:0,evolved:false};else if(player.weapons[c.id].level===5){player.weapons[c.id].level=6;player.weapons[c.id].evolved=true;G.evolution=1.15;sfx('evolve');burst(player.x,player.y,'#ffe45c',90);burst(player.x,player.y,'#ffffff',45);}else player.weapons[c.id].level=Math.min(5,player.weapons[c.id].level+1)}if(c.type==='passive'){player.passives[c.id]=(player.passives[c.id]||0)+1;let n=player.passives[c.id];if(c.id==='speed')player.speed*=1.08;if(c.id==='damage')player.damage*=1.12;if(c.id==='attackSpeed')player.attackSpeed*=1.09;if(c.id==='cooldown')player.cooldown=Math.min(.45,player.cooldown+.06);if(c.id==='crit')player.crit+=.04;if(c.id==='critDamage')player.critDamage+=.18;if(c.id==='health'){player.maxHp+=20;player.hp+=20}if(c.id==='regen')player.regen+=.35;if(c.id==='armor')player.armor++;if(c.id==='projectileSpeed')player.projectileSpeed+=.12;if(c.id==='size')player.size+=.12;if(c.id==='count')player.count++;if(c.id==='knockback')player.knockback+=.18;if(c.id==='explosionRadius')player.explosionRadius+=.14;if(c.id==='areaDamage')player.areaDamage+=.12;if(c.id==='piercing')player.piercing++;if(c.id==='ricochet')player.ricochet++;if(c.id==='bounce')player.bounce++;if(c.id==='bossDamage')player.bossDamage+=.15;if(c.id==='status')player.statusDuration+=.18;if(c.id==='pickup')player.pickup+=25;if(c.id==='xp')player.xpGain+=.1;if(c.id==='luck')player.luck++}if(c.type==='ultimate')player.ultimates[c.id]={cd:3,max:18};if(c.type==='companion')player.companion={type:c.id,name:c.name,icon:c.icon,level:1,x:player.x-50,y:player.y+35,cd:0,phase:0};if(c.type==='companionLevel')player.companion.level++;$('#choiceModal').classList.add('hidden');G.paused=false;toast(`${c.icon} ${c.name}`)}
function updateUltimates(dt){for(let [id,u] of Object.entries(player.ultimates)){u.cd-=dt;if(u.cd>0)continue;u.cd=u.max;if(id==='frenzy'){for(let i=0;i<36;i++)shoot(player.x,player.y,i/36*TAU,500,50,'vitamin',1.5,{pierce:2,r:9})}if(id==='shield'){player.invuln=5;burst(player.x,player.y,'#77ecff',50)}if(id==='vitamins'){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.35);burst(player.x,player.y,'#ffec52',60)}if(id==='nature'){enemies.forEach(e=>hurtEnemy(e,70));burst(player.x,player.y,'#48e46e',80)}if(id==='hurricane'){for(let i=0;i<28;i++)shoot(player.x,player.y,i/28*TAU,200,42,'apple',2,{pierce:5,r:12})}if(id==='vitaminStorm'){for(let ring=0;ring<4;ring++)setTimeout(()=>{if(G.running)for(let i=0;i<24;i++)shoot(player.x,player.y,i/24*TAU+ring*.12,360+ring*55,58,'vitamin',2.3,{pierce:3,r:11,trail:true})},ring*170)}if(id==='rainbow'){const kinds=['carrot','apple','orange','water','corn','leaf','vitamin'];for(let k=0;k<7;k++)for(let i=0;i<8;i++)shoot(player.x,player.y,i/8*TAU+k*.08,280+k*35,65,kinds[k],2.5,{pierce:4,r:11,trail:true})}if(id==='guardian'){player.invuln=4;player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.25);traps.push({x:player.x,y:player.y,r:260,life:9,dmg:48,cd:0,slow:2,kind:'garden'});burst(player.x,player.y,'#72ff78',90)}sfx('level')}}
function showQuiz(){G.paused=true;let q=pick(quizzes);$('#quizQuestion').textContent=q[0];$('#quizAnswers').innerHTML='';$('#quizFeedback').textContent='';q[1].forEach((a,i)=>{let b=document.createElement('button');b.textContent=a;b.onclick=()=>answerQuiz(i===q[2]);$('#quizAnswers').appendChild(b)});$('#quizModal').classList.remove('hidden')}
function answerQuiz(ok){if(ok){G.score+=500;player.hp=Math.min(player.maxHp,player.hp+25);gainXp(player.nextXp*.35);$('#quizFeedback').textContent='✅ Correct! +500 score, healing, and bonus XP';sfx('level')}else{G.score=Math.max(0,G.score-200);player.hp=Math.max(1,player.hp-15);$('#quizFeedback').textContent='❌ Not quite. Stay curious and keep learning!';sfx('bad')}setTimeout(()=>{$('#quizModal').classList.add('hidden');G.paused=false},1100)}

// ---------- Movement, collision, companions ----------
function dash(){if(!G.running||G.paused||player.dashCd>0)return;let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(!dx&&!dy){dx=player.dir.x;dy=player.dir.y}let d=Math.hypot(dx,dy)||1;player.dir={x:dx/d,y:dy/d};player.dashTime=.2;player.dashCd=player.dashMax;player.invuln=.35;sfx('dash');burst(player.x,player.y,'#a7ffff',20)}
function updatePlayer(dt){if(player.dead){player.invuln=Math.max(0,player.invuln-dt);return}let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(touch.active){dx=touch.x;dy=touch.y}let d=Math.hypot(dx,dy);if(d){dx/=d;dy/=d;player.dir={x:dx,y:dy};player.idle=0}else player.idle=(player.idle||0)+dt;let sp=player.speed*(player.slow>0?.62:1)*(player.dashTime>0?4:1);player.x+=dx*sp*dt;player.y+=dy*sp*dt;if(player.dashTime>0){for(let i=0;i<3;i++)particles.push({x:player.x-rnd(-10,10),y:player.y-rnd(-10,10),vx:-player.dir.x*rnd(60,180)+rnd(-30,30),vy:-player.dir.y*rnd(60,180)+rnd(-30,30),life:.28,max:1,color:'#a7ffff',r:rnd(3,7)})}const limit=worldLimit();player.x=clamp(player.x,-limit,limit);player.y=clamp(player.y,-limit,limit);player.dashCd=Math.max(0,player.dashCd-dt);player.dashTime=Math.max(0,player.dashTime-dt);player.invuln=Math.max(0,player.invuln-dt);player.slow=Math.max(0,player.slow-dt);player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);for(let g of gems){let dd=Math.hypot(g.x-player.x,g.y-player.y);if(dd<player.pickup){g.x+=(player.x-g.x)*dt*clamp(500/dd,5,18);g.y+=(player.y-g.y)*dt*clamp(500/dd,5,18)}if(dd<player.r+9){g.dead=true;if(G.mode==='multiplayer'&&!MP.isHost&&g.netId)MP.broadcast('collect_gem',{id:MP.uid(),gemId:g.netId});gainXp(g.v);sfx('xp')}}gems=gems.filter(g=>!g.dead);for(let t of traps){t.life-=dt;t.cd-=dt;if(t.cd<=0){for(let e of enemies)if(Math.hypot(e.x-t.x,e.y-t.y)<t.r+e.r){hurtEnemy(e,t.dmg,12);e.slowTimer=Math.max(e.slowTimer||0,t.slow||.5);e.x+=(e.x-t.x)*.04;e.y+=(e.y-t.y)*.04}t.cd=.45}}traps=traps.filter(t=>t.life>0);updateCompanion(dt)}
function updateCompanion(dt){
 const c=player.companion;if(!c)return;c.level=c.level||1;c.phase=(c.phase||0)+dt;
 // Each helper follows a different offset with spring-like movement; none orbit.
 const offsets={apple:[-62,42],bee:[-48,-52],fairy:[58,-48],farmer:[-82,68],chicken:[72,48]},off=offsets[c.type]||[-55,45];
 let tx=player.x+off[0]*player.dir.x-off[1]*player.dir.y,ty=player.y+off[0]*player.dir.y+off[1]*player.dir.x;
 if(c.type==='bee'){tx+=Math.sin(c.phase*5)*24;ty+=Math.cos(c.phase*4)*15}
 c.x+=(tx-c.x)*Math.min(1,dt*(c.type==='fairy'?7:5));c.y+=(ty-c.y)*Math.min(1,dt*(c.type==='chicken'?4:6));c.cd-=dt;
 if(c.type==='fairy')player.hp=Math.min(player.maxHp,player.hp+dt*(.45+c.level*.22));
 if(c.type==='farmer'&&c.cd<=0){traps.push({x:c.x,y:c.y,r:25+c.level*3,life:5+c.level,dmg:7+c.level*5,cd:0,slow:.8,kind:'garden'});c.cd=Math.max(1.4,3.3-c.level*.3);return}
 const e=nearestFrom(c.x,c.y,500+c.level*45);if(!e||c.cd>0)return;const a=Math.atan2(e.y-c.y,e.x-c.x),dmg=10+c.level*8;
 if(c.type==='apple')shoot(c.x,c.y,a,330+c.level*20,dmg,'apple',1.6,{returning:true,returnDelay:.55,pierce:2+c.level,r:9+c.level});
 if(c.type==='bee')shoot(c.x,c.y,a,470,dmg*.7,'seed',1.4,{homing:true,turn:6,pierce:1,r:5,critBonus:.12});
 if(c.type==='fairy')shoot(c.x,c.y,a,390,dmg,'vitamin',1.8,{pierce:c.level,r:7,trail:c.level>=4});
 if(c.type==='chicken')shoot(c.x,c.y,a,280,dmg*1.4,'eggShot',2.4,{gravity:90,bounce:1+c.level,r:10,knock:35});
 c.cd=Math.max(.3,1.25-c.level*.14);
}

// ---------- Drawing ----------
function worldToScreen(x,y){return{x:x-G.cam.x+W/2,y:y-G.cam.y+H/2}}
function emoji(t,x,y,size,alpha=1){ctx.globalAlpha=alpha;ctx.font=`${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y);ctx.globalAlpha=1}
function draw(){let m=maps[G.stage-1],sx=G.shake?rnd(-G.shake,G.shake):0,sy=G.shake?rnd(-G.shake,G.shake):0;G.shake*=.86;ctx.save();ctx.translate(sx,sy);if(G.bossEntrance>0){const z=1+Math.sin((1.4-G.bossEntrance)/1.4*Math.PI)*.07;ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2)}ctx.fillStyle=m[1];ctx.fillRect(-10,-10,W+20,H+20);let grid=90,ox=(-G.cam.x+W/2)%grid,oy=(-G.cam.y+H/2)%grid;ctx.strokeStyle=m[2]+'25';ctx.lineWidth=2;for(let x=ox;x<W;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=oy;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}// Lightweight procedural weather and animated ambience.
 const weather=G.stage%3;ctx.save();ctx.globalAlpha=.18;if(weather===0){ctx.strokeStyle='#dffaff';for(let i=0;i<35;i++){let x=(i*97+G.time*75)%W,y=(i*53+G.time*170)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-8,y+18);ctx.stroke()}}else if(weather===1){ctx.fillStyle='#fff6a6';for(let i=0;i<24;i++){let x=(i*137+Math.sin(G.time+i)*40+W)%W,y=(i*71+G.time*18)%H;ctx.fillRect(x,y,3,3)}}else{for(let i=0;i<18;i++)emoji('🍃',(i*151+G.time*32)%W,(i*89+G.time*24)%H,12,.3)}ctx.restore();
 for(let d of decor){let p=worldToScreen(d.x,d.y);if(p.x>-50&&p.x<W+50&&p.y>-50&&p.y<H+50)emoji(d.t,p.x,p.y,d.s,.75)}
 for(let g of gems){let p=worldToScreen(g.x,g.y);ctx.fillStyle='#66ffbd';ctx.beginPath();ctx.moveTo(p.x,p.y-7);ctx.lineTo(p.x+6,p.y);ctx.lineTo(p.x,p.y+7);ctx.lineTo(p.x-6,p.y);ctx.fill()}
 for(let t of traps){let p=worldToScreen(t.x,t.y);if(t.kind==='poison'){ctx.globalAlpha=.38;ctx.fillStyle='#52db63';ctx.beginPath();ctx.arc(p.x,p.y,t.r,0,TAU);ctx.fill();ctx.globalAlpha=1;emoji('☁️',p.x,p.y,34)}else if(t.kind==='garden'){ctx.globalAlpha=.28;ctx.fillStyle='#57ef78';ctx.beginPath();ctx.arc(p.x,p.y,t.r,0,TAU);ctx.fill();ctx.globalAlpha=1;emoji('🌿',p.x,p.y,30)}else emoji('🍌',p.x,p.y,t.r>40?34:26,1)}
 for(let p of projectiles){let pp=worldToScreen(p.x,p.y);if(p.kind==='beam'||p.kind==='laserBeam'||(pp.x>-120&&pp.x<W+120&&pp.y>-120&&pp.y<H+120))drawProjectile(p)}for(let p of enemyShots){let q=worldToScreen(p.x,p.y);if(q.x<-60||q.x>W+60||q.y<-60||q.y>H+60)continue;ctx.globalAlpha=clamp((p.age||0)/Math.max(.12,p.grace||.2),.28,1);ctx.fillStyle='#ff5277';ctx.beginPath();ctx.arc(q.x,q.y,p.r,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke();ctx.globalAlpha=1}
 for(let e of enemies){const ep=worldToScreen(e.x,e.y);if(ep.x>-100&&ep.x<W+100&&ep.y>-100&&ep.y<H+100)drawEnemy(e)}if(player.companion){let p=worldToScreen(player.companion.x,player.companion.y);emoji(player.companion.icon,p.x,p.y,27)}drawPlayer();if(G.mode==='multiplayer')MP.draw(ctx,worldToScreen,emoji);drawParticles();if(G.evolution>0){const a=clamp(G.evolution,0,1);const glow=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,Math.max(W,H)*.55);glow.addColorStop(0,`rgba(255,244,116,${a*.6})`);glow.addColorStop(.45,`rgba(255,198,43,${a*.18})`);glow.addColorStop(1,'rgba(255,180,20,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.globalAlpha=a;ctx.fillStyle='#fff7a0';ctx.font='1000 34px sans-serif';ctx.textAlign='center';ctx.fillText('⭐ WEAPON EVOLVED! ⭐',W/2,H*.27);ctx.globalAlpha=1}ctx.restore()}
function drawEnemy(e){
  const p=worldToScreen(e.x,e.y);
  ctx.save();
  // Enemies are always fully opaque. Damage is shown with a bright flash/ring
  // instead of lowering alpha, which previously made them hard to see.
  ctx.globalAlpha=1;
  ctx.fillStyle='rgba(15,35,32,.28)';
  ctx.beginPath();ctx.ellipse(p.x,p.y+e.r*.78,e.r*.86,e.r*.38,0,0,TAU);ctx.fill();

  // Draw a solid outlined glyph. The outline is the exact food silhouette,
  // not a circular badge, and prevents native emoji shading from looking faint.
  const enemySize=e===G.boss?e.r*1.7:e.r*1.95;
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-over';
  // Canvas filters on hundreds of emoji are expensive. Elites use a cheap star
  // marker and gold health bar instead of per-frame blur/saturation filters.
  ctx.filter='none';
  ctx.font=`900 ${enemySize}px "Arial Black","Segoe UI Emoji","Apple Color Emoji",sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.miterLimit=2;
  ctx.strokeStyle='#263b31';ctx.lineWidth=Math.max(4,enemySize*.13);
  ctx.strokeText(e.icon,p.x,p.y);
  ctx.fillStyle='#ffffff';
  ctx.fillText(e.icon,p.x,p.y);
  if(e.elite){emoji('★',p.x+e.r*.72,p.y-e.r*.75,13,1)}

  if(e.hp<e.maxHp){
    const bw=e.r*2.1, by=p.y-e.r-13;
    ctx.fillStyle='#263b38';ctx.beginPath();ctx.roundRect(p.x-bw/2,by,bw,6,3);ctx.fill();
    ctx.fillStyle=e===G.boss?'#ff536e':e.elite?'#ffd83d':'#69ed72';ctx.beginPath();ctx.roundRect(p.x-bw/2,by,bw*clamp(e.hp/e.maxHp,0,1),6,3);ctx.fill();
  }
  ctx.restore();
}
function drawPlayer(){let p=worldToScreen(player.x,player.y);ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(p.x,p.y+18,20,9,0,0,TAU);ctx.fill();// Draw the hero fully opaque without a circular background.
ctx.globalAlpha=1;
ctx.globalCompositeOperation='source-over';
ctx.filter='none';
ctx.font='900 42px "Arial Black","Segoe UI Emoji","Apple Color Emoji",sans-serif';
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.shadowColor='rgba(16,55,43,.75)';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
const heroAvatar=save.profile?.avatar||'🦸';ctx.fillStyle='#ffffff';ctx.fillText(heroAvatar,p.x,p.y-2);ctx.shadowBlur=0;ctx.shadowOffsetY=0;if(player.ultimates.shield&&player.invuln>1){ctx.strokeStyle='#72efff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,31+Math.sin(G.time*8)*3,0,TAU);ctx.stroke()}let egg=player.weapons.egg;if(egg){const total=egg.evolved?egg.level+5:egg.level,orbit=egg.evolved?(48+egg.level*3)*1.6:48+egg.level*3;if(egg.evolved){ctx.strokeStyle='rgba(255,225,89,.65)';ctx.shadowColor='#ffe45b';ctx.shadowBlur=14;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,orbit,0,TAU);ctx.stroke();ctx.shadowBlur=0}for(let i=0;i<total;i++){let a=(egg.angle||0)+i/total*TAU,x=player.x+Math.cos(a)*orbit,y=player.y+Math.sin(a)*orbit,q=worldToScreen(x,y);emoji(egg.evolved?'🐉':'🥚',q.x,q.y,egg.evolved?32:20);for(let e of enemies)if(Math.hypot(e.x-x,e.y-y)<e.r+(egg.evolved?19:12)&&(!e.eggHit||G.time-e.eggHit>.3)){e.eggHit=G.time;hurtEnemy(e,egg.evolved?75:10+egg.level*7,egg.evolved?28:0,a)}}}ctx.restore()}
function drawProjectile(p){
 const q=worldToScreen(p.x,p.y);
 if(p.kind==='beam'||p.kind==='laserBeam'){
  const evolved=p.r>15;
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.strokeStyle=evolved?'rgba(255,248,174,.3)':'rgba(233,249,255,.3)';ctx.lineWidth=p.r*(evolved?3.2:2.4);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+p.vx*p.length,q.y+p.vy*p.length);ctx.stroke();
  ctx.strokeStyle=evolved?'#fffbd0':'#e9f9ff';ctx.lineWidth=p.r*(evolved?1.5:1);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+p.vx*p.length,q.y+p.vy*p.length);ctx.stroke();ctx.restore();return;
 }
 if(p.kind==='pulse'){ctx.save();ctx.globalAlpha=clamp(p.life*1.4,0,.75);ctx.strokeStyle='#fff477';ctx.shadowColor='#7effa0';ctx.shadowBlur=18;ctx.lineWidth=10;ctx.beginPath();ctx.arc(q.x,q.y,p.r,0,TAU);ctx.stroke();ctx.restore();return}
 const icons={carrot:'🥕',apple:'🍎',broccoli:'🥦',water:'💧',fish:'🐟',vitamin:'💊',rice:'•',orange:'🍊',tomato:'🍅',corn:'🌽',cucumber:'🥒',smoothie:'🫧',chakram:'🥝',leaf:'🍃',seed:'🌱',pulse:'✨',eggShot:'🥚'};
 ctx.save();
 const evolved=p.trail||p.multiHit||p.multiBlast||p.r>14||p.explode;
 if(evolved){ctx.shadowColor=p.kind==='water'||p.kind==='fish'?'#69e9ff':'#ffe45b';ctx.shadowBlur=14;}
 if(p.kind==='apple'){ctx.translate(q.x,q.y);ctx.rotate(p.age*(p.multiHit?14:8));emoji(icons[p.kind],0,0,p.r*2.3);}
 else emoji(icons[p.kind]||'●',q.x,q.y,p.r*2.3);
 ctx.restore();
}
function burst(x,y,color,n){n=Math.min(n,80);for(let i=0;i<n&&particles.length<1400;i++)particles.push(pooledParticle({x,y,vx:rnd(-150,150),vy:rnd(-150,150),life:rnd(.25,.75),max:1,color,r:rnd(2,6)}))}function damageText(x,y,text,color,size){if(texts.length>260)return;texts.push({x,y,text,color,size,life:.7})}function drawParticles(){for(let p of particles){let q=worldToScreen(p.x,p.y);ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,p.r,0,TAU);ctx.fill()}for(let t of texts){let q=worldToScreen(t.x,t.y);ctx.globalAlpha=clamp(t.life*2,0,1);ctx.fillStyle=t.color;ctx.font=`900 ${t.size}px sans-serif`;ctx.fillText(t.text,q.x,q.y)}ctx.globalAlpha=1}
function updateParticles(dt){for(let p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94}for(const p of particles)if(p.life<=0&&objectPools.particles.length<900)objectPools.particles.push(p);particles=particles.filter(p=>p.life>0);for(let t of texts){t.life-=dt;t.y-=35*dt}texts=texts.filter(t=>t.life>0)}

// ---------- Main loop and HUD ----------
let last=performance.now(),spawnClock=0;
function loop(now){
 if(!G.running)return;const dt=Math.min(.033,(now-last)/1000);last=now;
 if(!G.paused){
  G.time+=dt;const survival=isSurvivalMode(),mpClient=G.mode==='multiplayer'&&!MP.isHost;
  if(G.mode==='endless'&&G.time>=Online.checkpointAt)Online.checkpoint();
  if(survival&&G.nextBossAt-G.time<=60&&G.nextBossAt-G.time>59.9&&G.lastWarnBoss!==G.nextBossAt){G.lastWarnBoss=G.nextBossAt;tone(120,.5,'sawtooth',.13,280);toast('⚠ Boss Approaching in 60 seconds!')}
  if(!mpClient){
   if(survival&&G.time>=G.nextBossAt&&!G.boss){spawnBoss();G.nextBossAt+=600}
   if(survival&&G.time>=G.nextSwarmAt&&!G.swarm)startJunkSwarm();if(survival)updateJunkSwarm(dt);
   if(!survival&&G.time>=G.duration&&!G.boss)spawnBoss();spawnClock-=dt;
   const mins=G.time/60;
   // Late-game population expansion: after 15 minutes both the active enemy
   // cap and each spawn batch rise substantially. Spatial collision and
   // off-screen rendering culling keep these larger battles manageable.
   const enemyCap=survival?(mins<15?450:Math.min(900,450+Math.floor((mins-15)*35))):220;
   if((survival||G.time<G.duration)&&!G.swarm&&spawnClock<=0&&enemies.length<enemyCap){
    const intensity=survival?(mins<2?.82+mins*.18:mins<10?1.18+(mins-2)*.38:mins<15?4.22+(mins-10)*.22:Math.min(9.5,6.2+Math.sqrt(mins-15)*.65)):(.8+G.stage*.13+G.time/G.duration*2.2);
    const amount=Math.min(survival?7:5,1+Math.floor(intensity/2));
    for(let i=0;i<amount&&enemies.length<enemyCap;i++)spawnEnemy(pick(availableEnemies()));
    spawnClock=Math.max(survival?.14:.13,1.05/intensity);
   }
   if(G.quizDone<G.quizAt.length&&G.time>=G.quizAt[G.quizDone]){G.quizDone++;if(survival&&G.quizDone===G.quizAt.length)G.quizAt.push(G.time+240);showQuiz()}
  }
  G.evolution=Math.max(0,(G.evolution||0)-dt);G.bossEntrance=Math.max(0,(G.bossEntrance||0)-dt);updatePlayer(dt);
  if(!mpClient){updateWeapons(dt);updateUltimates(dt);rebuildSpatialGrid();updateProjectiles(dt);updateEnemies(dt);updateEnemyShots(dt)}else{updateParticles(dt)}
  if(!mpClient)updateParticles(dt);if(G.mode==='multiplayer')MP.tick(dt);
  G.cam.x+=(player.x-G.cam.x)*Math.min(1,dt*5);G.cam.y+=(player.y-G.cam.y)*Math.min(1,dt*5);updateHud();
 }
 draw();requestAnimationFrame(loop);
}
function updateHud(){
 $('#hpBar').style.width=clamp(player.hp/player.maxHp*100,0,100)+'%';$('#hpText').textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;$('#playerLevel').textContent=player.level;$('#xpBar').style.width=player.xp/player.nextXp*100+'%';
 const endless=isSurvivalMode();
 if(endless){
  $('#timerText').textContent=formatClock(G.time);$('#stageText').textContent=G.mode==='multiplayer'?'🤝 ONLINE CO-OP · SURVIVAL TIME':'♾ ENDLESS · SURVIVAL TIME';
  $('#endlessStats').textContent=`KILLS ${player.kills}\nDIFFICULTY ${1+Math.floor(G.time/60)}`;
  const until=G.nextBossAt-G.time;$('#bossWarning').textContent=G.swarm?`⚠ ${G.swarm.type} Swarm · ${G.swarm.remaining+G.swarm.alive} remaining` : (!G.boss&&until>0&&until<=60?`⚠ Boss Approaching ⚠ ${Math.ceil(until)}s`:'');
 }else{
  const remain=Math.max(0,G.duration-G.time),min=Math.floor(remain/60),sec=Math.floor(remain%60);$('#timerText').textContent=G.boss?'BOSS':`${min}:${String(sec).padStart(2,'0')}`;$('#stageText').textContent=`STAGE ${G.stage} · ${maps[G.stage-1][0]}`;$('#endlessStats').textContent='';$('#bossWarning').textContent='';
 }
 $('#hudPlayer').textContent=`${save.profile?.avatar||'🦸'} ${save.profile?.name||'Healthy Hero'}`;$('#scoreText').textContent=Math.floor(G.score).toLocaleString();$('#dashHud i').style.width=(1-player.dashCd/player.dashMax)*100+'%';if(G.boss)$('#bossBar').style.width=clamp(G.boss.hp/G.boss.maxHp*100,0,100)+'%';
 const trayHTML=Object.entries(player.weapons).map(([id,w])=>`<div class="${w.evolved?'evolved':''}" title="${weaponDefs[id].name}">${weaponDefs[id].icon} ${w.evolved?'⭐ '+weaponDefs[id].evolved+' (Lv.6)':weaponDefs[id].name.split(' ')[0]+' Lv.'+w.level}</div>`).join('');if(trayHTML!==G.lastTrayHTML){G.lastTrayHTML=trayHTML;$('#weaponTray').innerHTML=trayHTML}
}
function togglePause(){
  if(G.mode==='multiplayer'){toast('Online co-op cannot be paused');return}
  // If the pause menu itself is open, always allow it to close.
  const pauseOpen=!$('#pauseModal').classList.contains('hidden');
  if(pauseOpen){
    G.paused=false;
    $('#pauseModal').classList.add('hidden');
    last=performance.now(); // prevent a large time jump after resuming
    return;
  }
  // Level-up, quiz, and result dialogs manage their own paused state.
  const blockingOverlay=[...document.querySelectorAll('.overlay:not(.hidden)')]
    .some(el=>el.id!=='pauseModal');
  if(blockingOverlay||!G.running)return;
  G.paused=true;
  $('#pauseModal').classList.remove('hidden');
}
$('#pauseBtn').onclick=togglePause;
$('#resumeBtn').onclick=togglePause;$('#quitBtn').onclick=()=>{G.running=false;$('#pauseModal').classList.add('hidden');showScreen('menu');startMusic()};
function updateRecords(){
 const score=Math.floor(G.score),time=Math.floor(G.time);G.newRecords=[];
 if(save.profile){const used=Object.entries(G.weaponUse||{}).sort((a,b)=>b[1]-a[1]);save.profile.totalGames=(save.profile.totalGames||0)+1;save.profile.totalWins=(save.profile.totalWins||0)+(player.hp>0?1:0);save.profile.totalPlayTime=(save.profile.totalPlayTime||0)+time;save.profile.totalKills=(save.profile.totalKills||0)+player.kills;save.profile.favoriteWeapon=used[0]?.[0]||save.profile.favoriteWeapon;save.profile.evolutionsUnlocked=[...new Set([...(save.profile.evolutionsUnlocked||[]),...Object.entries(player.weapons).filter(([,w])=>w.evolved).map(([id])=>weaponDefs[id].evolved)])];}
 if(G.mode==='endless'){
  const r=save.records.endless;
  for(const [key,val,label] of [['longestTime',time,'Longest Survival'],['highestScore',score,'Highest Score'],['highestLevel',player.level,'Highest Level'],['bestBosses',G.bossesDefeated,'Most Bosses in One Run']])if(val>(r[key]||0)){r[key]=val;G.newRecords.push(label)}
 }else{
  const r=save.records.classic;
  if(G.stage>r.highestLevel){r.highestLevel=G.stage;G.newRecords.push('Highest Stage')}
  if(score>r.highestScore){r.highestScore=score;G.newRecords.push('Highest Score')}
  if(time>r.longestTime){r.longestTime=time;G.newRecords.push('Longest Survival')}
  r.totalKills+=player.kills;r.bosses+=G.bossesDefeated;
 }
 save.highScore=Math.max(save.highScore,score);store();renderScores();
}
function victory(){
 G.paused=true;G.score+=Math.floor(player.hp*20+G.stage*1000);G.coins+=G.stage*25;save.coins=(save.coins||0)+G.stage*25;
 if(G.stage<10)save.unlocked=Math.max(save.unlocked,G.stage+1);if(G.stage>=2&&!save.companions.includes('helpers'))save.companions.push('helpers');
 updateRecords();sfx('win');setTimeout(()=>showResult(true),500);
}
function endGame(win){
 G.paused=true;if(G.mode==='endless'){const earned=Math.floor(G.score/700);G.coins+=earned;save.coins=(save.coins||0)+earned}updateRecords();showResult(false);
 if(G.mode==='endless')Online.finish().then(d=>{if(d?.rank){const improved=!save.globalRank||d.rank<save.globalRank;save.globalRank=d.rank;store();if(improved){const el=document.createElement('div');el.className='new-record';el.textContent=`🌍 NEW GLOBAL RANK! #${d.rank} Worldwide`;$('#resultStats').appendChild(el)}}});
}
function showResult(win){
 $('#resultModal').classList.remove('hidden');$('#resultIcon').textContent=win?'🏆':'💔';
 $('#resultTitle').textContent=win?(G.stage===10?'The City Is Healthy Again!':'Stage Cleared!'):(G.mode==='endless'?'Endless Run Complete':'The Junk Food Wave Won');
 const records=G.newRecords.length?`<div class="new-record">⭐ ${G.mode==='endless'?'NEW PERSONAL BEST!':'NEW HIGH SCORE!'} ⭐</div><small>${G.newRecords.join(' · ')}</small>`:'<small>No new personal record—keep growing!</small>';
 $('#resultBody').innerHTML=win?(G.stage<10?`Level ${G.stage+1} is now unlocked.`:'The Junk Food King is defeated. Healthy foods return across the kingdom!'):'Grow stronger, choose new upgrades, and try again.';
 $('#resultStats').innerHTML=`Player: <b>${save.profile?.avatar||'🦸'} ${save.profile?.name||'Healthy Hero'}</b><br>Mode: <b>${G.mode==='endless'?'Endless Mode':'Classic Mode'}</b><br>Survival Time: <b>${formatClock(G.time)}</b> · Highest Level: <b>${player.level}</b><br>Score: <b>${Math.floor(G.score).toLocaleString()}</b> · Kills: <b>${player.kills}</b><br>Bosses Defeated: <b>${G.bossesDefeated}</b> · Coins Earned: <b>${G.coins}</b><br>${records}`;
 $('#continueBtn').textContent=win&&G.mode==='classic'&&G.stage<10?'Next Level':'Play Again';
 $('#continueBtn').onclick=()=>{$('#resultModal').classList.add('hidden');startGame(win&&G.mode==='classic'&&G.stage<10?G.stage+1:G.stage,G.mode)};
}
$('#resultMenuBtn').onclick=()=>{$('#resultModal').classList.add('hidden');G.running=false;showScreen('credits');startMusic();clearTimeout(G.creditTimer);G.creditTimer=setTimeout(()=>{if($('#credits').classList.contains('active'))showScreen('menu')},4500)};
$('#resultScoresBtn').onclick=()=>{$('#resultModal').classList.add('hidden');G.running=false;showScreen('scores')};
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1800)}

// ---------- Touch joystick ----------
const touch={active:false,x:0,y:0};let joy=$('#joystick'),knob=joy.querySelector('i');
function joyMove(e){let r=joy.getBoundingClientRect(),t=e.touches?e.touches[0]:e,dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy),max=40;if(d>max){dx=dx/d*max;dy=dy/d*max}touch.x=dx/max;touch.y=dy/max;touch.active=true;knob.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('touchstart',joyMove,{passive:false});joy.addEventListener('touchmove',e=>{e.preventDefault();joyMove(e)},{passive:false});joy.addEventListener('touchend',()=>{touch.active=false;touch.x=touch.y=0;knob.style.transform='' });$('#dashTouch').ontouchstart=e=>{e.preventDefault();dash()};

updateSummary();showScreen(save.profile?'menu':'register');Online.flush();
