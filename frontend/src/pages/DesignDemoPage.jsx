import { useState, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   JUST Hall Management · Fully Responsive Design Demo
   Mobile-first · Bottom tab nav · Drawer sidebar · Smooth UX
   Fonts: Clash Display + DM Sans + DM Mono
═══════════════════════════════════════════════════════════════ */

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap");
@import url("https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap");

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
button { cursor: pointer; font: inherit; -webkit-tap-highlight-color: transparent; }
input, select { font: inherit; -webkit-tap-highlight-color: transparent; }

.ur {
  --void:   #080c17;
  --deep:   #0c1220;
  --surf:   #111927;
  --card:   #151f30;
  --raised: #1c2840;
  --hover:  #222f4a;
  --hi:     #f0f4ff;
  --mid:    #a0b2d4;
  --low:    #526080;
  --xlow:   #334060;
  --bd:     rgba(80,100,140,0.15);
  --bds:    rgba(80,100,140,0.28);
  --blue:   #3b82f6; --blue-g: linear-gradient(135deg,#3b82f6,#6366f1); --blue-bg:rgba(59,130,246,.10); --blue-b:rgba(59,130,246,.22);
  --green:  #10b981; --green-g:linear-gradient(135deg,#10b981,#06b6d4); --green-bg:rgba(16,185,129,.10);--green-b:rgba(16,185,129,.20);
  --amber:  #f59e0b; --amber-g:linear-gradient(135deg,#f59e0b,#ef4444); --amber-bg:rgba(245,158,11,.10); --amber-b:rgba(245,158,11,.22);
  --violet: #a855f7; --violet-g:linear-gradient(135deg,#a855f7,#ec4899);--violet-bg:rgba(168,85,247,.10);--violet-b:rgba(168,85,247,.22);
  --indigo: #6366f1; --indigo-g:linear-gradient(135deg,#6366f1,#8b5cf6);
  --ok:#10b981; --wrn:#f59e0b; --inf:#3b82f6; --err:#ef4444;
  --shadow: 0 4px 24px rgba(0,0,0,.5);
  --ac:       #6366f1;
  --ac-g:     linear-gradient(135deg,#6366f1,#8b5cf6);
  --ac-bg:    rgba(99,102,241,.10);
  --ac-b:     rgba(99,102,241,.22);
  --ac-shadow:rgba(99,102,241,.28);
  font-family:"DM Sans",system-ui,sans-serif;
  font-size:14px; line-height:1.5; color:var(--hi);
  background:var(--void); height:100%; overflow:hidden;
}

.ur[data-theme="light"] {
  --void:#eef2fa; --deep:#e5eaf5; --surf:#dce4f2; --card:#f5f8fe; --raised:#fff; --hover:#edf1fb;
  --hi:#0d1321; --mid:#3a4e70; --low:#6b80a8; --xlow:#a0b4cc;
  --bd:rgba(80,100,140,.09); --bds:rgba(80,100,140,.20);
  --shadow:0 4px 20px rgba(13,19,33,.10);
}

/* ── App Shell ── */
.app { display:grid; grid-template-columns:260px 1fr; height:100dvh; overflow:hidden; }

/* ══ Sidebar ══ */
.sb {
  background:var(--surf); border-right:1px solid var(--bd);
  display:flex; flex-direction:column; overflow:hidden;
}

.sb-top { flex-shrink:0; }

.sb-brand {
  padding:18px 16px; border-bottom:1px solid var(--bd);
  display:flex; align-items:center; gap:11px;
}

.sb-logo {
  width:38px; height:38px; border-radius:11px;
  background:var(--ac-g); display:grid; place-items:center;
  font-family:"Clash Display",sans-serif; font-size:14px; font-weight:700; color:#fff;
  box-shadow:0 4px 12px var(--ac-shadow); flex-shrink:0;
  transition:box-shadow .3s;
}

.sb-brand-text strong { display:block; font-family:"Clash Display",sans-serif; font-size:14.5px; font-weight:600; color:var(--hi); }
.sb-brand-text span   { font-size:11px; color:var(--low); }

.sb-profile {
  padding:12px 16px; border-bottom:1px solid var(--bd);
  display:flex; align-items:center; gap:10px;
}

.sb-avatar {
  width:36px; height:36px; border-radius:999px;
  background:var(--ac-g); display:grid; place-items:center;
  font-size:15px; flex-shrink:0;
  box-shadow:0 2px 10px var(--ac-shadow); transition:box-shadow .3s;
}

.sb-name { font-size:13.5px; font-weight:600; color:var(--hi); }

.sb-pill {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; font-weight:600; color:var(--ac);
  background:var(--ac-bg); border:1px solid var(--ac-b);
  border-radius:999px; padding:2px 8px; margin-top:3px;
  transition:color .3s,background .3s,border-color .3s;
}

.sb-pill-dot { width:5px; height:5px; border-radius:999px; background:currentColor; }

.sb-nav { flex:1; overflow-y:auto; padding:12px 10px; scrollbar-width:thin; scrollbar-color:var(--bds) transparent; }
.sb-nav-label { font-size:10px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:var(--xlow); padding:0 8px 8px; }

.sb-item {
  display:flex; align-items:center; gap:10px; width:100%;
  padding:9px 11px; border-radius:10px; border:1px solid transparent;
  background:transparent; color:var(--mid);
  font-size:13.5px; font-weight:500; text-align:left; margin-bottom:2px;
  transition:background .15s,color .15s,border-color .15s;
}

.sb-item:hover:not(.on) { background:var(--hover); color:var(--hi); }

.sb-item.on { color:#fff; font-weight:600; background:var(--i-bg,var(--ac-bg)); border-color:var(--i-b,var(--ac-b)); }
.sb-item.on .sb-icon { background:var(--i-g,var(--ac-g)); box-shadow:0 2px 10px var(--i-s,var(--ac-shadow)); }

.sb-icon { width:30px; height:30px; border-radius:8px; background:var(--raised); display:grid; place-items:center; font-size:14px; flex-shrink:0; transition:background .2s,box-shadow .2s; }
.sb-badge { margin-left:auto; font-size:10.5px; font-weight:700; background:var(--ac-bg); color:var(--ac); border:1px solid var(--ac-b); border-radius:999px; padding:1px 7px; min-width:20px; text-align:center; transition:all .3s; }

/* ══ Main ══ */
.main { display:grid; grid-template-rows:58px 1fr; min-width:0; overflow:hidden; background:var(--deep); }

/* Topbar */
.topbar {
  border-bottom:1px solid var(--bd); background:rgba(8,12,23,.85);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  display:flex; align-items:center; gap:10px; padding:0 18px;
  flex-shrink:0; z-index:10;
}

.t-ham {
  display:none; width:36px; height:36px; border-radius:9px;
  border:1px solid var(--bds); background:var(--card); color:var(--mid);
  align-items:center; justify-content:center; font-size:20px; flex-shrink:0;
  transition:background .15s;
}

.t-ham:hover { background:var(--raised); }

.tb-left { flex:1; min-width:0; }

.tb-crumb { display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--low); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tb-crumb strong { color:var(--hi); font-weight:600; }

.tb-row { display:flex; align-items:center; gap:8px; margin-top:1px; }

.tb-dot { width:7px; height:7px; border-radius:999px; background:var(--ac); box-shadow:0 0 6px var(--ac); animation:dot-pulse 2.5s ease-in-out infinite; flex-shrink:0; transition:background .3s,box-shadow .3s; }
@keyframes dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.75)} }

.tb-title { font-family:"Clash Display",sans-serif; font-size:14.5px; font-weight:600; color:var(--hi); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.tb-right { display:flex; align-items:center; gap:7px; flex-shrink:0; }

.t-btn { height:34px; padding:0 13px; border-radius:9px; border:1px solid var(--bds); background:var(--card); color:var(--mid); font-size:12.5px; font-weight:600; white-space:nowrap; transition:background .12s,color .12s; }
.t-btn:hover { background:var(--raised); color:var(--hi); }
.t-btn.ic { width:34px; padding:0; display:grid; place-items:center; font-size:17px; }

/* Content */
.content { overflow-y:auto; overflow-x:hidden; padding:20px 18px 32px; scrollbar-width:thin; scrollbar-color:var(--bds) transparent; scroll-behavior:smooth; }

.page-in { animation:pg-in .22s ease both; }
@keyframes pg-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.wrap { max-width:1140px; margin:0 auto; display:flex; flex-direction:column; gap:18px; }

/* Page header */
.ph { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.eyebrow { display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ac); margin-bottom:7px; transition:color .3s; }
.eyebrow::before { content:""; width:14px; height:2px; border-radius:1px; background:currentColor; }
.ph-title { font-family:"Clash Display",sans-serif; font-size:clamp(20px,4vw,30px); font-weight:700; color:var(--hi); line-height:1.1; letter-spacing:-.02em; }
.ph-sub { margin-top:7px; font-size:13px; color:var(--low); max-width:500px; line-height:1.6; }
.ph-acts { display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap; }

.a-btn { height:38px; padding:0 16px; border-radius:10px; border:1px solid var(--bds); background:var(--card); color:var(--mid); font-size:13px; font-weight:600; transition:background .12s,color .12s; }
.a-btn:hover { background:var(--raised); color:var(--hi); }
.a-btn.pri { background:var(--ac); border-color:transparent; color:#fff; box-shadow:0 4px 14px var(--ac-shadow); transition:filter .15s,background .3s,box-shadow .3s; }
.a-btn.pri:hover { filter:brightness(1.1); }

/* Role strip */
.rs { background:var(--card); border:1px solid var(--bd); border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.rs-lbl { font-size:11.5px; color:var(--low); font-weight:500; }

.r-btn { display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; border:1px solid var(--bds); background:var(--surf); color:var(--mid); font-size:13px; font-weight:600; transition:all .18s; }
.r-btn:hover { background:var(--hover); color:var(--hi); }
.r-btn.on { color:#fff; border-color:transparent; }
.r-btn.on[data-r="student"] { background:var(--blue);  box-shadow:0 3px 12px rgba(59,130,246,.35); }
.r-btn.on[data-r="staff"]   { background:var(--green); box-shadow:0 3px 12px rgba(16,185,129,.32); }
.r-btn.on[data-r="provost"] { background:var(--indigo);box-shadow:0 3px 12px rgba(99,102,241,.32); }

.r-sw { width:9px; height:9px; border-radius:999px; flex-shrink:0; }

/* Module legend */
.ml { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.ml-lbl { font-size:10.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--xlow); margin-right:2px; }
.chip { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:7px; font-size:11.5px; font-weight:600; border:1px solid var(--chip-b); background:var(--chip-bg); color:var(--chip-c); }
.chip-d { width:7px; height:7px; border-radius:999px; background:currentColor; }

/* Stats */
.stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }

.stat { border-radius:14px; border:1px solid var(--bd); background:var(--card); padding:16px; position:relative; overflow:hidden; transition:transform .18s,box-shadow .18s; }
.stat:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.4); }
.stat::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; background:var(--s-g); border-radius:14px 14px 0 0; }
.stat::after  { content:""; position:absolute; top:-28px; right:-18px; width:90px; height:90px; border-radius:999px; background:var(--s-glow); pointer-events:none; }

.stat-icon { width:36px; height:36px; border-radius:9px; background:var(--s-g); display:grid; place-items:center; font-size:17px; margin-bottom:12px; box-shadow:0 2px 10px rgba(0,0,0,.25); }
.stat-lbl { font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; font-weight:600; color:var(--low); margin-bottom:5px; }
.stat-val { font-family:"Clash Display",sans-serif; font-size:clamp(22px,3.5vw,30px); font-weight:700; color:var(--hi); line-height:1; letter-spacing:-.02em; }
.stat-hint { margin-top:6px; font-size:11.5px; color:var(--low); display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
.delta { font-size:10.5px; font-weight:700; border-radius:5px; padding:1px 5px; }
.delta.up { color:var(--ok);  background:rgba(16,185,129,.12); }
.delta.dn { color:var(--err); background:rgba(239,68,68,.12); }

/* Cards */
.card { background:var(--card); border:1px solid var(--bd); border-radius:16px; overflow:hidden; box-shadow:var(--shadow); }

.ch { padding:14px 16px 12px; border-bottom:1px solid var(--bd); display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.ch-t { font-family:"Clash Display",sans-serif; font-size:15px; font-weight:600; color:var(--hi); display:flex; align-items:center; gap:7px; }
.ch-dot { width:7px; height:7px; border-radius:999px; flex-shrink:0; }
.ch-sub { font-size:11.5px; color:var(--low); margin-top:2px; }
.ch-r { display:flex; align-items:center; gap:6px; flex-shrink:0; }

/* Grids */
.split { display:grid; grid-template-columns:1.55fr 1fr; gap:14px; }
.trio  { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }

/* Table */
.tw { overflow-x:auto; -webkit-overflow-scrolling:touch; }
table { width:100%; border-collapse:collapse; font-size:13px; }
thead { background:var(--surf); }
th { padding:10px 14px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--low); border-bottom:1px solid var(--bd); white-space:nowrap; text-align:left; }
td { padding:11px 14px; border-bottom:1px solid var(--bd); color:var(--mid); vertical-align:middle; }
tbody tr:last-child td { border-bottom:none; }
tbody tr { transition:background .1s; }
tbody tr:hover { background:var(--surf); }
.cm { font-weight:600; color:var(--hi); font-size:13.5px; }
.cs { font-size:11.5px; color:var(--low); margin-top:1px; }

/* Badges */
.badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border:1px solid; white-space:nowrap; }
.badge::before { content:""; width:5px; height:5px; border-radius:999px; background:currentColor; flex-shrink:0; }
.badge.ok     { color:var(--ok);    border-color:rgba(16,185,129,.28);  background:rgba(16,185,129,.09); }
.badge.warn   { color:var(--wrn);   border-color:rgba(245,158,11,.28);  background:rgba(245,158,11,.09); }
.badge.info   { color:var(--inf);   border-color:rgba(59,130,246,.28);  background:rgba(59,130,246,.09); }
.badge.err    { color:var(--err);   border-color:rgba(239,68,68,.28);   background:rgba(239,68,68,.09); }
.badge.live   { color:var(--ok);    border-color:rgba(16,185,129,.28);  background:rgba(16,185,129,.09); animation:live-blink 2s ease-in-out infinite; }
@keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:.6} }

.rb { height:28px; padding:0 10px; border-radius:7px; border:1px solid var(--bds); background:var(--raised); color:var(--mid); font-size:12px; font-weight:600; transition:background .12s,color .12s; }
.rb:hover { background:var(--hover); color:var(--hi); }

/* Form */
.fb-body { padding:16px; }
.field { display:grid; gap:5px; margin-bottom:12px; }
label { font-size:11px; font-weight:700; color:var(--low); text-transform:uppercase; letter-spacing:.07em; }
.inp,.sel { height:40px; border-radius:10px; border:1px solid var(--bds); background:var(--surf); color:var(--hi); padding:0 12px; width:100%; transition:border-color .15s,box-shadow .15s; appearance:none; -webkit-appearance:none; }
.inp:focus,.sel:focus { outline:none; border-color:var(--ac); box-shadow:0 0 0 3px var(--ac-bg); }
.sel { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23526080' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
.f2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.factions { display:flex; gap:8px; margin-top:4px; }
.fb { flex:1; height:40px; border-radius:10px; border:1px solid var(--bds); background:var(--raised); color:var(--mid); font-size:13px; font-weight:600; transition:background .12s,color .12s; }
.fb:hover { background:var(--hover); color:var(--hi); }
.fb.pri { background:var(--ac); border-color:transparent; color:#fff; box-shadow:0 4px 14px var(--ac-shadow); transition:filter .15s,background .3s,box-shadow .3s; }
.fb.pri:hover { filter:brightness(1.1); }

/* Events */
.ev-list { padding:4px 0; }
.ev { display:flex; align-items:flex-start; gap:11px; padding:11px 15px; border-bottom:1px solid var(--bd); transition:background .1s; }
.ev:last-child { border-bottom:none; }
.ev:hover { background:var(--surf); }
.ev-stripe { width:3px; border-radius:999px; align-self:stretch; flex-shrink:0; min-height:36px; }
.ev-icon { width:34px; height:34px; border-radius:9px; display:grid; place-items:center; font-size:16px; flex-shrink:0; }
.ev-body { flex:1; min-width:0; }
.ev-title { font-size:13px; font-weight:600; color:var(--hi); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ev-meta { font-size:11.5px; color:var(--low); margin-top:1px; }
.ev-time { font-size:11px; color:var(--xlow); font-family:"DM Mono",monospace; flex-shrink:0; margin-top:2px; }

/* Occupancy */
.occ { padding:15px 16px; }
.occ-hdr { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
.occ-pct { font-family:"Clash Display",sans-serif; font-size:28px; font-weight:700; color:var(--hi); letter-spacing:-.02em; }
.occ-sub { font-size:11.5px; color:var(--low); }
.occ-track { height:9px; border-radius:999px; background:var(--surf); overflow:hidden; }
.occ-fill { height:100%; border-radius:999px; background:var(--blue-g); box-shadow:0 0 10px rgba(59,130,246,.38); animation:occ-grow 1.2s cubic-bezier(.22,1,.36,1) both; animation-delay:.2s; }
@keyframes occ-grow { from { width:0 !important; } }
.occ-segs { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px; }
.occ-seg { border-radius:10px; background:var(--surf); padding:10px 11px; border:1px solid var(--bd); }
.occ-val { font-family:"Clash Display",sans-serif; font-size:18px; font-weight:700; color:var(--hi); }
.occ-lbl { font-size:11px; color:var(--low); margin-top:1px; }
.pay-rows { padding:12px 16px; border-top:1px solid var(--bd); }
.pay-head { font-size:10px; font-weight:700; color:var(--xlow); text-transform:uppercase; letter-spacing:.12em; margin-bottom:10px; }
.pay-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px; }
.pay-row:last-child { margin-bottom:0; }
.pay-lbl { font-size:12.5px; color:var(--mid); }
.pay-r { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.pay-val { font-family:"DM Mono",monospace; font-size:13px; color:var(--hi); font-weight:500; }

/* State cards */
.sc-grid { display:flex; flex-direction:column; gap:10px; padding:14px; }
.sc { display:flex; align-items:flex-start; gap:11px; padding:12px; border-radius:11px; border:1px solid var(--bd); background:var(--surf); }
.sc-icon { width:32px; height:32px; border-radius:8px; display:grid; place-items:center; font-size:16px; flex-shrink:0; }
.sc-text h4 { font-size:13px; font-weight:600; color:var(--hi); margin-bottom:3px; }
.sc-text p  { font-size:12px; color:var(--low); line-height:1.5; }
.sc.error   { border-color:rgba(239,68,68,.22);   background:rgba(239,68,68,.07); }
.sc.success { border-color:rgba(16,185,129,.18);  background:rgba(16,185,129,.07); }
.sc-bar { height:3px; border-radius:999px; background:var(--hover); margin-top:8px; overflow:hidden; position:relative; }
.sc-bar::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,var(--ac),transparent); animation:bar-slide 1.6s ease-in-out infinite; }
@keyframes bar-slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }

/* ══ Mobile Drawer overlay ══ */
.ov { position:fixed; inset:0; z-index:300; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); opacity:0; pointer-events:none; transition:opacity .28s; }
.ov.open { opacity:1; pointer-events:all; }

.drawer {
  position:fixed; top:0; left:0; bottom:0;
  width:min(280px,80vw); z-index:400;
  background:var(--surf); border-right:1px solid var(--bd);
  display:flex; flex-direction:column;
  transform:translateX(-100%);
  transition:transform .3s cubic-bezier(.22,1,.36,1);
  overflow:hidden;
}

.drawer.open { transform:translateX(0); }

.drawer-close {
  position:absolute; top:14px; right:14px;
  width:30px; height:30px; border-radius:8px;
  border:1px solid var(--bds); background:var(--card);
  color:var(--mid); display:grid; place-items:center; font-size:16px;
  transition:background .12s;
}

.drawer-close:hover { background:var(--raised); color:var(--hi); }

/* ══ Bottom Nav ══ */
.bot-nav {
  display:none; position:fixed; bottom:0; left:0; right:0;
  background:var(--surf); border-top:1px solid var(--bd);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));
  z-index:100;
  flex-direction:row; justify-content:space-around; gap:2px;
}

.bn {
  display:flex; flex-direction:column; align-items:center; gap:3px;
  flex:1; max-width:72px; padding:6px 4px;
  border-radius:12px; border:none; background:transparent;
  color:var(--low); font-size:10px; font-weight:600; letter-spacing:.01em;
  transition:color .2s; position:relative;
}

.bn.on { color:var(--ac); }

.bn-icon { font-size:20px; line-height:1; transition:transform .2s; }
.bn.on .bn-icon { transform:scale(1.15) translateY(-1px); }
.bn-lbl { font-size:9.5px; white-space:nowrap; }

.bn-pip { position:absolute; top:5px; right:16px; width:7px; height:7px; border-radius:999px; background:var(--err); border:2px solid var(--surf); display:none; }
.bn-pip.show { display:block; }

/* ══ Responsive ══ */
@media(max-width:1060px) {
  .split { grid-template-columns:1fr; }
  .trio  { grid-template-columns:1fr 1fr; }
  .stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

@media(max-width:720px) {
  .app { grid-template-columns:1fr; }
  .sb  { display:none; }
  .t-ham { display:flex !important; }
  .content { padding:14px 12px 88px; }
  .stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .trio  { grid-template-columns:1fr; }
  .split { grid-template-columns:1fr; }
  .ph { flex-direction:column; gap:12px; }
  .ph-acts { width:100%; }
  .a-btn { flex:1; justify-content:center; display:flex; align-items:center; }
  .f2 { grid-template-columns:1fr; }
  .bot-nav { display:flex; }
  .hide-sm { display:none; }
  th,td { padding:10px 12px; }
}

@media(max-width:380px) {
  .stats { grid-template-columns:1fr; }
}
`;

/* ─── Data ─── */
const MC = {
  students: { c:"#3b82f6", g:"linear-gradient(135deg,#3b82f6,#6366f1)", bg:"rgba(59,130,246,.10)", b:"rgba(59,130,246,.22)", s:"rgba(59,130,246,.30)" },
  staff:    { c:"#10b981", g:"linear-gradient(135deg,#10b981,#06b6d4)", bg:"rgba(16,185,129,.10)", b:"rgba(16,185,129,.20)", s:"rgba(16,185,129,.28)" },
  hall:     { c:"#f59e0b", g:"linear-gradient(135deg,#f59e0b,#ef4444)", bg:"rgba(245,158,11,.10)",  b:"rgba(245,158,11,.22)", s:"rgba(245,158,11,.28)" },
  payments: { c:"#a855f7", g:"linear-gradient(135deg,#a855f7,#ec4899)", bg:"rgba(168,85,247,.10)", b:"rgba(168,85,247,.22)", s:"rgba(168,85,247,.28)" },
};

const ROLES = [
  { v:"student", l:"Student", icon:"🎓", c:"#3b82f6", g:"linear-gradient(135deg,#3b82f6,#6366f1)", bg:"rgba(59,130,246,.10)", b:"rgba(59,130,246,.22)", s:"rgba(59,130,246,.28)" },
  { v:"staff",   l:"Staff",   icon:"🧑‍💼", c:"#10b981", g:"linear-gradient(135deg,#10b981,#06b6d4)", bg:"rgba(16,185,129,.10)", b:"rgba(16,185,129,.20)", s:"rgba(16,185,129,.26)" },
  { v:"provost", l:"Provost", icon:"🏛️", c:"#6366f1", g:"linear-gradient(135deg,#6366f1,#8b5cf6)", bg:"rgba(99,102,241,.10)", b:"rgba(99,102,241,.22)", s:"rgba(99,102,241,.28)" },
];

const NAV = [
  { l:"Dashboard",    short:"Home",     icon:"🏠", mod:null,       badge:null  },
  { l:"Students",     short:"Students", icon:"🎓", mod:"students", badge:"982" },
  { l:"Staff",        short:"Staff",    icon:"🧑‍💼", mod:"staff",    badge:"54"  },
  { l:"Hall & Rooms", short:"Hall",     icon:"🏠", mod:"hall",     badge:"37"  },
  { l:"Payments",     short:"Pay",      icon:"💳", mod:"payments", badge:null  },
];

const EVENTS = [
  { title:"New Hall Application",   meta:"Room 204 · Block C", time:"10:32 AM",  mod:"hall",     icon:"📋" },
  { title:"Fee Payment Confirmed",  meta:"Farhan R. · Sem 2",  time:"09:14 AM",  mod:"payments", icon:"💰" },
  { title:"Student Record Updated", meta:"ID #4821 · Profile",  time:"Yesterday", mod:"students", icon:"🎓" },
  { title:"Staff Shift Change",     meta:"Dining Dept.",        time:"Yesterday", mod:"staff",    icon:"🔄" },
  { title:"Maintenance Request",    meta:"Block A · Urgent",    time:"Mar 9",     mod:"hall",     icon:"🔧" },
];

const STAFF = [
  { name:"Nabila Khan",  email:"nabila@hall.edu", dept:"Dining",      s:"ok",   sl:"Active"  },
  { name:"Rafi Hasan",   email:"rafi@hall.edu",   dept:"Maintenance", s:"warn", sl:"Pending" },
  { name:"Mim Akter",    email:"mim@hall.edu",    dept:"Operations",  s:"info", sl:"Review"  },
  { name:"Tanvir Ahmed", email:"tanvir@hall.edu",  dept:"Security",    s:"ok",   sl:"Active"  },
];

/* ─── Shared Nav Content ─── */
function NavContent({ role, activeNav, onNav }) {
  return (
    <>
      <div className="sb-brand">
        <div className="sb-logo">UH</div>
        <div className="sb-brand-text">
          <strong>JUST Hall Management System</strong>
          <span>Shaheed Mashiur Rahman Hall</span>
        </div>
      </div>
      <div className="sb-profile">
        <div className="sb-avatar">{role.icon}</div>
        <div>
          <div className="sb-name">Ariya Paul</div>
          <div className="sb-pill" style={{ color:role.c, background:role.bg, borderColor:role.b }}>
            <span className="sb-pill-dot" />{role.l}
          </div>
        </div>
      </div>
      <nav className="sb-nav">
        <div className="sb-nav-label">Main Menu</div>
        {NAV.map((item, i) => {
          const mc = item.mod ? MC[item.mod] : null;
          const on = activeNav === i;
          return (
            <button key={i} className={`sb-item ${on?"on":""}`}
              style={on && mc ? { "--i-bg":mc.bg, "--i-b":mc.b, "--i-g":mc.g, "--i-s":mc.s } :
                     on       ? { "--i-bg":role.bg,"--i-b":role.b,"--i-g":role.g,"--i-s":role.s } : {}}
              onClick={() => onNav(i)} type="button">
              <span className="sb-icon">{item.icon}</span>
              <span style={{ flex:1 }}>{item.l}</span>
              {item.badge && (
                <span className="sb-badge"
                  style={on && mc ? { background:mc.bg, color:mc.c, borderColor:mc.b } : {}}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* ─── Main Component ─── */
export default function HallManagementDashboardDemo() {
  const [theme, setTheme]     = useState("dark");
  const [ri, setRi]           = useState(2);
  const [nav, setNav]         = useState(0);
  const [drawer, setDrawer]   = useState(false);
  const [pgKey, setPgKey]     = useState(0);
  const contentRef            = useRef(null);

  const role = ROLES[ri];

  const goNav = (i) => {
    setNav(i); setPgKey(k => k+1); setDrawer(false);
    contentRef.current?.scrollTo({ top:0, behavior:"smooth" });
  };

  const vars = { "--ac":role.c, "--ac-g":role.g, "--ac-bg":role.bg, "--ac-b":role.b, "--ac-shadow":role.s };

  return (
    <div className="ur" data-theme={theme} style={vars}>
      <style>{CSS}</style>

      {/* Drawer overlay */}
      <div className={`ov ${drawer?"open":""}`} onClick={() => setDrawer(false)} />
      <div className={`drawer ${drawer?"open":""}`}>
        <button className="drawer-close" onClick={() => setDrawer(false)} type="button">✕</button>
        <NavContent role={role} activeNav={nav} onNav={goNav} />
      </div>

      <div className="app">
        {/* Desktop sidebar */}
        <aside className="sb">
          <NavContent role={role} activeNav={nav} onNav={goNav} />
        </aside>

        <div className="main">
          {/* Topbar */}
          <header className="topbar">
            <button className="t-btn ic t-ham" onClick={() => setDrawer(true)} type="button" aria-label="Menu">☰</button>
            <div className="tb-left">
              <div className="tb-crumb">
                <span>{role.l}</span><span>›</span><strong>{NAV[nav].l}</strong>
              </div>
              <div className="tb-row">
                <span className="tb-dot" />
                <span className="tb-title">JUST Hall Management</span>
              </div>
            </div>
            <div className="tb-right">
              <button className="t-btn ic" onClick={() => setTheme(t => t==="dark"?"light":"dark")} type="button">
                {theme==="dark"?"☀️":"🌙"}
              </button>
              <button className="t-btn ic" type="button" title="Notifications">🔔</button>
            </div>
          </header>

          {/* Scrollable content */}
          <section className="content" ref={contentRef}>
            <div className="wrap page-in" key={pgKey}>

              {/* Header */}
              <div className="ph">
                <div>
                  <div className="eyebrow">Hall Management System</div>
                  <h1 className="ph-title">Role-Aware Dashboard</h1>
                  <p className="ph-sub">Each module has its own color identity. Fully responsive — works beautifully from mobile to desktop.</p>
                </div>
                <div className="ph-acts">
                  <button className="a-btn" type="button">Export</button>
                  <button className="a-btn pri" type="button">＋ New Record</button>
                </div>
              </div>

              {/* Role switcher */}
              <div className="rs">
                <span className="rs-lbl">Role →</span>
                {ROLES.map((r, i) => (
                  <button key={r.v} className={`r-btn ${ri===i?"on":""}`} data-r={r.v}
                    style={ri===i?{background:r.c}:{}}
                    onClick={() => setRi(i)} type="button">
                    <span className="r-sw" style={{background:ri===i?"rgba(255,255,255,.7)":r.c}} />
                    {r.l}
                  </button>
                ))}
              </div>

              {/* Module legend */}
              <div className="ml">
                <span className="ml-lbl">Modules:</span>
                {Object.entries(MC).map(([k,mc]) => (
                  <span key={k} className="chip" style={{"--chip-bg":mc.bg,"--chip-c":mc.c,"--chip-b":mc.b}}>
                    <span className="chip-d" />{k.charAt(0).toUpperCase()+k.slice(1)}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="stats">
                {[
                  { lbl:"Total Students", val:"982", hint:"Residents + applicants", delta:"+12", dir:"up", icon:"🎓", mod:"students" },
                  { lbl:"Active Staff",   val:"54",  hint:"Operations team",        delta:"+3",  dir:"up", icon:"🧑‍💼", mod:"staff" },
                  { lbl:"Pending Apps",   val:"37",  hint:"12 high priority",       delta:"-4",  dir:"dn", icon:"📋", mod:"hall" },
                  { lbl:"Occupancy",      val:"86%", hint:"121 / 140 beds",         delta:"+2%", dir:"up", icon:"🏠", mod:"hall" },
                ].map(s => {
                  const mc = MC[s.mod];
                  return (
                    <article key={s.lbl} className="stat" style={{"--s-g":mc.g,"--s-glow":mc.bg}}>
                      <div className="stat-icon">{s.icon}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                      <div className="stat-val">{s.val}</div>
                      <div className="stat-hint">
                        <span className={`delta ${s.dir}`}>{s.delta}</span>{s.hint}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Table + Events */}
              <div className="split">
                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ch-t"><span className="ch-dot" style={{background:MC.staff.c}} />Staff Directory</div>
                      <div className="ch-sub">Roster with status and department</div>
                    </div>
                    <div className="ch-r">
                      <button className="rb" type="button" style={{color:MC.staff.c,borderColor:MC.staff.b,background:MC.staff.bg}}>+ Add</button>
                    </div>
                  </div>
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th className="hide-sm">Department</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STAFF.map(r => (
                          <tr key={r.email}>
                            <td><div className="cm">{r.name}</div><div className="cs">{r.email}</div></td>
                            <td className="hide-sm" style={{color:"var(--mid)"}}>{r.dept}</td>
                            <td><span className={`badge ${r.s}`}>{r.sl}</span></td>
                            <td><button className="rb" type="button">View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ch-t"><span className="ch-dot" style={{background:"var(--ac)"}} />Activity Feed</div>
                      <div className="ch-sub">Cross-module events</div>
                    </div>
                    <div className="ch-r"><span className="badge live">● Live</span></div>
                  </div>
                  <div className="ev-list">
                    {EVENTS.map((e, i) => {
                      const mc = MC[e.mod];
                      return (
                        <div key={i} className="ev">
                          <div className="ev-stripe" style={{background:mc.g}} />
                          <div className="ev-icon" style={{background:mc.bg,border:`1px solid ${mc.b}`}}>{e.icon}</div>
                          <div className="ev-body">
                            <div className="ev-title">{e.title}</div>
                            <div className="ev-meta">{e.meta}</div>
                          </div>
                          <div className="ev-time">{e.time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Form + Occupancy + States */}
              <div className="trio">
                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ch-t"><span className="ch-dot" style={{background:MC.students.c}} />Add Student</div>
                      <div className="ch-sub">Form sample</div>
                    </div>
                  </div>
                  <div className="fb-body">
                    <div className="f2">
                      <div className="field"><label>Full Name</label><input className="inp" defaultValue="Farhan Rahman" /></div>
                      <div className="field"><label>Student ID</label><input className="inp" defaultValue="#4821" /></div>
                    </div>
                    <div className="field"><label>Email</label><input className="inp" defaultValue="farhan@hall.edu" /></div>
                    <div className="f2">
                      <div className="field"><label>Room</label><input className="inp" defaultValue="204 / Block C" /></div>
                      <div className="field">
                        <label>Department</label>
                        <select className="sel"><option>CSE</option><option>EEE</option><option>MBA</option></select>
                      </div>
                    </div>
                    <div className="factions">
                      <button className="fb pri" type="button">Save Record</button>
                      <button className="fb" type="button">Cancel</button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ch-t"><span className="ch-dot" style={{background:MC.hall.c}} />Hall Occupancy</div>
                      <div className="ch-sub">Real-time allocation</div>
                    </div>
                  </div>
                  <div className="occ">
                    <div className="occ-hdr">
                      <div><div className="occ-pct">86%</div><div className="occ-sub">of beds occupied</div></div>
                      <span className="badge ok">Normal</span>
                    </div>
                    <div className="occ-track"><div className="occ-fill" style={{width:"86%"}} /></div>
                    <div className="occ-segs">
                      {[["121","Occupied"],["19","Vacant"],["140","Total"]].map(([v,l]) => (
                        <div key={l} className="occ-seg"><div className="occ-val">{v}</div><div className="occ-lbl">{l}</div></div>
                      ))}
                    </div>
                  </div>
                  <div className="pay-rows">
                    <div className="pay-head">Payment Overview</div>
                    {[
                      { l:"Collected this month", v:"৳ 4,82,000", b:"ok",   bl:"Done"    },
                      { l:"Pending dues",          v:"৳ 37,500",  b:"warn", bl:"Pending" },
                    ].map(p => (
                      <div key={p.l} className="pay-row">
                        <span className="pay-lbl">{p.l}</span>
                        <div className="pay-r"><span className="pay-val">{p.v}</span><span className={`badge ${p.b}`}>{p.bl}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ch-t"><span className="ch-dot" style={{background:MC.payments.c}} />UI States</div>
                      <div className="ch-sub">Loading · Empty · Error · Success</div>
                    </div>
                  </div>
                  <div className="sc-grid">
                    <div className="sc">
                      <div className="sc-icon" style={{background:"rgba(59,130,246,.12)"}}>⏳</div>
                      <div className="sc-text"><h4>Loading</h4><p>Fetching student records...</p><div className="sc-bar" /></div>
                    </div>
                    <div className="sc">
                      <div className="sc-icon" style={{background:"var(--raised)"}}>📭</div>
                      <div className="sc-text"><h4>Empty State</h4><p>No records found. Adjust filters.</p></div>
                    </div>
                    <div className="sc error">
                      <div className="sc-icon" style={{background:"rgba(239,68,68,.12)"}}>⚠️</div>
                      <div className="sc-text"><h4>Error</h4><p>Could not load data. Retry or contact support.</p></div>
                    </div>
                    <div className="sc success">
                      <div className="sc-icon" style={{background:"rgba(16,185,129,.12)"}}>✅</div>
                      <div className="sc-text"><h4>Success</h4><p>Record saved. Changes are now live.</p></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* Bottom Nav — mobile only */}
      <nav className="bot-nav">
        {NAV.map((item, i) => {
          const mc = item.mod ? MC[item.mod] : null;
          const on = nav === i;
          return (
            <button key={i} className={`bn ${on?"on":""}`}
              style={on ? { color: mc?.c ?? role.c } : {}}
              onClick={() => goNav(i)} type="button">
              {item.badge && !on && <span className="bn-pip show" />}
              <span className="bn-icon">{item.icon}</span>
              <span className="bn-lbl">{item.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
