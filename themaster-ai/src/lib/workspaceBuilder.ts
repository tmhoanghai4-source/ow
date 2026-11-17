import { WorkspaceFile } from '../types';

export interface WorkspaceTemplate {
  id: string;
  name: string;
  stack: string;
  folderName: string;
  files: WorkspaceFile[];
}

export interface BuiltWorkspaceResult {
  html: string;
  mode: 'web' | 'python' | 'java' | 'cpp' | 'gallery' | 'explorer' | 'none';
  framework: string;
  languages: string[];
  pythonEntry?: WorkspaceFile;
  javaEntry?: WorkspaceFile;
  cppEntry?: WorkspaceFile;
  standaloneHtml?: string;
}

export interface WorkspaceBuildCheckResult {
  ok: boolean;
  framework: string;
  errors: string[];
  warnings: string[];
  buildLogs?: string[];
  stats: {
    totalFiles: number;
    codeFiles: number;
    assets: number;
    durationMs: number;
  };
  built: BuiltWorkspaceResult;
}

const makeFile = (path: string, content: string, mimeType = 'text/plain'): WorkspaceFile => ({
  path,
  name: path.split('/').pop() || path,
  mimeType,
  size: new Blob([content]).size,
  content,
  isBinary: false,
});

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'react-effects',
    name: 'React + TS + Motion UI',
    stack: 'React 18 · TypeScript · Tailwind · Motion',
    folderName: 'react-motion-app',
    files: [
      makeFile(
        'package.json',
        JSON.stringify(
          {
            name: 'react-motion-app',
            private: true,
            version: '1.0.0',
            dependencies: {
              react: '^18.3.1',
              'react-dom': '^18.3.1',
              'framer-motion': '^11.0.0',
              'canvas-confetti': '^1.9.3',
              'lucide-react': '^0.460.0',
            },
          },
          null,
          2
        ),
        'application/json'
      ),
      makeFile(
        'index.html',
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interactive Motion Studio</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        'text/html'
      ),
      makeFile(
        'src/styles/effects.css',
        `@keyframes rippleExpand {
  0% { transform: scale(0); opacity: 0.55; }
  100% { transform: scale(4.2); opacity: 0; }
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

.fx-ripple {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.45);
  animation: rippleExpand 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.fx-card-3d {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms ease;
  transform-style: preserve-3d;
}

.fx-pulse-ring {
  animation: floatSlow 3s ease-in-out infinite;
}`,
        'text/css'
      ),
      makeFile(
        'src/App.tsx',
        `import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Play, Sparkles, Zap, Layers, RefreshCw, Check } from 'lucide-react';
import './styles/effects.css';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export default function App() {
  const [activeEffect, setActiveEffect] = useState<'ripple' | 'burst' | 'spring' | 'tilt'>('ripple');
  const [pulseCount, setPulseCount] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    setActiveEffect('ripple');
    setPulseCount(c => c + 1);
  };

  const triggerConfetti = () => {
    setActiveEffect('burst');
    setPulseCount(c => c + 1);
    confetti({ particleCount: 70, spread: 68, origin: { y: 0.6 } });
    showToast('Confetti particle burst triggered');
  };

  const triggerSpringModal = () => {
    setActiveEffect('spring');
    setDrawerOpen(v => !v);
    setPulseCount(c => c + 1);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Interactive Web Workspace</h1>
            <p className="text-sm text-neutral-400 mt-1">
              React + TypeScript + CSS Keyframes · Bấm nút để kích hoạt hiệu ứng trực tiếp
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-400 tabular-nums">
            Events: {pulseCount} · Mode: {activeEffect}
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="fx-card-3d rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 space-y-5"
            style={{ transform: \`perspective(900px) rotateX(\${tilt.rx}deg) rotateY(\${tilt.ry}deg)\` }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
              const rx = -((e.clientY - r.top) / r.height - 0.5) * 12;
              setTilt({ rx, ry });
            }}
            onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-200">Action Triggers</span>
              <span className="text-xs text-neutral-500">3D Tilt Card</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerRipple}
                className="relative overflow-hidden px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Zap size={15} />
                <span>Ripple Wave</span>
                {ripples.map(r => (
                  <span key={r.id} className="fx-ripple" style={{ width: r.size, height: r.size, left: r.x, top: r.y }} />
                ))}
              </button>

              <button
                onClick={triggerConfetti}
                className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] border border-neutral-700 text-neutral-100 text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles size={15} className="text-amber-400" />
                <span>Particle Burst</span>
              </button>

              <button
                onClick={triggerSpringModal}
                className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] border border-neutral-700 text-neutral-100 text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Layers size={15} className="text-emerald-400" />
                <span>{drawerOpen ? 'Hide Panel' : 'Spring Panel'}</span>
              </button>

              <button
                onClick={() => {
                  setPulseCount(0);
                  setDrawerOpen(false);
                  showToast('Workspace state reset');
                }}
                className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={15} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-200">Animated Stage</span>
              <span className="text-xs font-mono text-emerald-400">60 FPS</span>
            </div>

            <div className="flex-1 min-h-[140px] rounded-xl border border-neutral-800 bg-neutral-950/70 flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                {drawerOpen ? (
                  <motion.div
                    key="drawer"
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -12 }}
                    transition={{ duration: 0.22 }}
                    className="w-full p-4 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">Spring Panel Active</div>
                      <div className="text-xs text-neutral-400 mt-0.5">Smooth enter & exit transition</div>
                    </div>
                    <Check size={16} className="text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                  >
                    <Play size={20} className="mx-auto text-blue-400 fx-pulse-ring" />
                    <div className="text-xs text-neutral-400">Click any control on the left to animate</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-5 right-5 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-medium text-neutral-100 shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`,
        'text/typescript'
      ),
    ],
  },
  {
    id: 'vue-interactive',
    name: 'Vue 3 SFC Interactive',
    stack: 'Vue 3 · SFC (.vue) · CSS Transitions',
    folderName: 'vue-effects-app',
    files: [
      makeFile(
        'package.json',
        JSON.stringify(
          {
            name: 'vue-effects-app',
            version: '1.0.0',
            dependencies: { vue: '^3.4.0' },
          },
          null,
          2
        ),
        'application/json'
      ),
      makeFile(
        'src/App.vue',
        `<template>
  <div class="shell">
    <div class="card">
      <div class="head">
        <div>
          <h1>Vue 3 Interactive Builder</h1>
          <p class="sub">Single-File Component (.vue) biên dịch trực tiếp trên trình duyệt</p>
        </div>
        <button class="btn primary" @click="triggerWave">Kích hoạt hiệu ứng ({{ count }})</button>
      </div>

      <div class="actions">
        <button class="btn" @click="addItem">+ Thêm thẻ động</button>
        <button class="btn" @click="shuffleItems">Đảo vị trí</button>
        <button class="btn" @click="flipped = !flipped">Lật thẻ 3D</button>
      </div>

      <div class="stage">
        <div class="flip-box" :class="{ flipped }" @click="flipped = !flipped">
          <div class="face front">Front Face — Click để lật 3D</div>
          <div class="face back">Back Face — Vue Reactive 3D</div>
        </div>
      </div>

      <TransitionGroup name="list" tag="div" class="grid">
        <div v-for="item in items" :key="item.id" class="tile" @click="removeItem(item.id)">
          <span>{{ item.label }}</span>
          <small>Click để xóa</small>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);
const flipped = ref(false);
let nextId = 4;
const items = ref([
  { id: 1, label: 'Motion Card #1' },
  { id: 2, label: 'Motion Card #2' },
  { id: 3, label: 'Motion Card #3' },
]);

function triggerWave() {
  count.value++;
  flipped.value = !flipped.value;
}

function addItem() {
  items.value.unshift({ id: nextId, label: 'Motion Card #' + nextId });
  nextId++;
}

function removeItem(id) {
  items.value = items.value.filter(i => i.id !== id);
}

function shuffleItems() {
  items.value = [...items.value].sort(() => Math.random() - 0.5);
}
</script>

<style scoped>
.shell { min-height: 100vh; background: #0a0a0c; color: #f4f4f5; padding: 32px 20px; font-family: system-ui, sans-serif; }
.card { max-width: 780px; margin: 0 auto; background: #121216; border: 1px solid #27272a; border-radius: 18px; padding: 24px; }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid #27272a; padding-bottom: 16px; }
h1 { margin: 0; font-size: 18px; }
.sub { margin: 4px 0 0; font-size: 12px; color: #a1a1aa; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
.btn { background: #1e1e24; color: #e4e4e7; border: 1px solid #3f3f46; padding: 9px 14px; border-radius: 10px; font-size: 13px; cursor: pointer; transition: transform 140ms ease, background 140ms ease; }
.btn:hover { background: #27272f; }
.btn:active { transform: scale(0.96); }
.btn.primary { background: #2563eb; border-color: #3b82f6; color: #fff; font-weight: 600; }
.stage { perspective: 900px; margin-bottom: 18px; }
.flip-box { position: relative; height: 92px; transform-style: preserve-3d; transition: transform 480ms cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; }
.flip-box.flipped { transform: rotateX(180deg); }
.face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; border: 1px solid #27272a; }
.front { background: #18181d; }
.back { background: #1d4ed8; color: #fff; transform: rotateX(180deg); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.tile { background: #18181b; border: 1px solid #27272a; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; font-size: 13px; }
.tile small { color: #71717a; font-size: 11px; }
.list-move, .list-enter-active, .list-leave-active { transition: all 260ms cubic-bezier(0.16, 1, 0.3, 1); }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(10px) scale(0.95); }
</style>`,
        'text/plain'
      ),
    ],
  },
  {
    id: 'web-fx-lab',
    name: 'HTML + CSS + TypeScript FX',
    stack: 'HTML5 · CSS3 Keyframes · TypeScript DOM',
    folderName: 'web-effects-ts',
    files: [
      makeFile(
        'index.html',
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Web Effects Lab (TS)</title>
</head>
<body>
  <canvas id="fxCanvas"></canvas>
  <main class="container">
    <div class="panel">
      <h1>HTML + CSS + TypeScript FX Lab</h1>
      <p class="desc">Bấm từng nút để kích hoạt hiệu ứng Canvas, Sóng Shockwave và Chuyển động mượt.</p>
      <div class="btn-row">
        <button id="burstBtn" class="btn primary">Pháo hạt Canvas</button>
        <button id="waveBtn" class="btn">Sóng Shockwave</button>
        <button id="morphBtn" class="btn">Biến hình Card</button>
      </div>
      <div id="morphBox" class="morph-box">Sẵn sàng tương tác</div>
    </div>
  </main>
</body>
</html>`,
        'text/html'
      ),
      makeFile(
        'styles/animations.css',
        `* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #09090b; color: #f4f4f5; font-family: system-ui, sans-serif; overflow: hidden; }
#fxCanvas { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
.container { position: relative; z-index: 2; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.panel { width: 100%; max-width: 560px; background: rgba(20, 20, 24, 0.9); border: 1px solid #27272a; border-radius: 18px; padding: 24px; backdrop-filter: blur(8px); }
h1 { margin: 0 0 6px; font-size: 18px; }
.desc { margin: 0 0 18px; font-size: 13px; color: #a1a1aa; }
.btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.btn { background: #18181b; color: #e4e4e7; border: 1px solid #3f3f46; border-radius: 10px; padding: 10px 15px; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), border-color 150ms ease; }
.btn:hover { border-color: #60a5fa; }
.btn:active { transform: scale(0.95); }
.btn.primary { background: #2563eb; border-color: #3b82f6; color: #fff; }
.morph-box { padding: 20px; border-radius: 12px; border: 1px solid #27272a; background: #111115; text-align: center; font-size: 13px; transition: transform 360ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 360ms ease, background 280ms ease; }
.morph-box.active { transform: scale(1.03); border-radius: 26px; background: #172554; border-color: #3b82f6; }`,
        'text/css'
      ),
      makeFile(
        'src/main.ts',
        `interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  color: string;
}

const canvas = document.getElementById('fxCanvas') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') || null;
const particles: Particle[] = [];

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function spawnBurst(cx: number, cy: number, count = 42) {
  const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
    const speed = 2.5 + Math.random() * 5.5;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      radius: 2 + Math.random() * 3,
      color: palette[i % palette.length],
    });
  }
}

function loop() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.alpha -= 0.018;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(loop);
}
loop();

document.getElementById('burstBtn')?.addEventListener('click', (e) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 48);
});

document.getElementById('waveBtn')?.addEventListener('click', (e) => {
  const el = e.currentTarget as HTMLElement;
  el.animate(
    [
      { boxShadow: '0 0 0 0 rgba(59,130,246,0.75)' },
      { boxShadow: '0 0 0 22px rgba(59,130,246,0)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
  spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 24);
});

document.getElementById('morphBtn')?.addEventListener('click', () => {
  const box = document.getElementById('morphBox');
  if (box) {
    box.classList.toggle('active');
    box.textContent = box.classList.contains('active')
      ? 'Hiệu ứng Morph đang kích hoạt'
      : 'Sẵn sàng tương tác';
  }
});`,
        'text/typescript'
      ),
    ],
  },
  {
    id: 'python-multi',
    name: 'Python Multi-File Project',
    stack: 'Python 3 (Pyodide VFS) · JSON',
    folderName: 'python-workspace',
    files: [
      makeFile(
        'data.json',
        JSON.stringify({ project: 'TheMaster Multi-Module Python', tasks: ['Parse JSON', 'Analyze Data', 'Build Output'] }, null, 2),
        'application/json'
      ),
      makeFile(
        'helpers.py',
        `import json

def load_summary(path="data.json"):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data
`,
        'text/x-python'
      ),
      makeFile(
        'main.py',
        `from helpers import load_summary

info = load_summary()
print("Project:", info["project"])
for idx, item in enumerate(info["tasks"], 1):
    print(f"  {idx}. {item}")
print("Multi-file Python VFS build OK!")
`,
        'text/x-python'
      ),
    ],
  },
  {
    id: 'extension-mv3',
    name: 'Browser Extension (MV3)',
    stack: 'Manifest V3 · Popup · Content Script · Background',
    folderName: 'quick-fx-extension',
    files: [
      makeFile(
        'manifest.json',
        JSON.stringify(
          {
            manifest_version: 3,
            name: 'PageFX Controller',
            version: '1.2.0',
            description: 'Interactive MV3 extension with popup, side panel, options, content script & badge background worker.',
            action: {
              default_title: 'PageFX Controller',
              default_popup: 'popup.html',
            },
            side_panel: {
              default_path: 'sidepanel.html',
            },
            options_ui: {
              page: 'options.html',
              open_in_tab: true,
            },
            background: {
              service_worker: 'background.js',
            },
            content_scripts: [
              {
                matches: ['<all_urls>'],
                css: ['content.css'],
                js: ['content.js'],
              },
            ],
            permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'notifications'],
          },
          null,
          2
        ),
        'application/json'
      ),
      makeFile(
        'popup.html',
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>PageFX Popup</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div>
        <h1>PageFX Extension</h1>
        <p id="tabHost" class="sub">Checking active tab...</p>
      </div>
      <span id="badgeCount" class="count">0</span>
    </header>

    <div class="actions">
      <button id="scanBtn" class="btn primary">Quét &amp; Highlight Page</button>
      <button id="burstBtn" class="btn">Scripting Particle Burst</button>
      <button id="focusBtn" class="btn">Toggle Focus Dimmer</button>
      <button id="pingBtn" class="btn">Ping Background (+Badge)</button>
    </div>

    <footer class="foot">
      <span id="statusText">Sẵn sàng tương tác</span>
      <a id="openOptions" href="#">Options</a>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,
        'text/html'
      ),
      makeFile(
        'popup.css',
        `* { box-sizing: border-box; }
body { margin: 0; width: 320px; background: #101116; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
.wrap { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.top { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 10px; }
h1 { margin: 0; font-size: 14px; font-weight: 600; }
.sub { margin: 2px 0 0; font-size: 11px; color: #a1a1aa; font-family: monospace; }
.count { font-size: 12px; font-family: monospace; padding: 3px 8px; border-radius: 8px; background: #1e293b; color: #60a5fa; border: 1px solid #334155; }
.actions { display: grid; grid-template-columns: 1fr; gap: 8px; }
.btn { width: 100%; text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid #27272a; background: #18181f; color: #e4e4e7; font-size: 12px; font-weight: 500; cursor: pointer; transition: transform 120ms ease, background 150ms ease, border-color 150ms ease; }
.btn:hover { background: #20202a; border-color: #3f3f46; }
.btn:active { transform: scale(0.98); }
.btn.primary { background: #2563eb; border-color: #3b82f6; color: #fff; font-weight: 600; }
.btn.primary:hover { background: #1d4ed8; }
.foot { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #a1a1aa; border-top: 1px solid #27272a; padding-top: 8px; }
.foot a { color: #60a5fa; text-decoration: none; }
.foot a:hover { text-decoration: underline; }`,
        'text/css'
      ),
      makeFile(
        'popup.js',
        `const statusEl = document.getElementById('statusText');
const badgeEl = document.getElementById('badgeCount');
const hostEl = document.getElementById('tabHost');

function syncState() {
  chrome.storage.local.get({ fxCount: 0, focusMode: false, accentColor: '#3b82f6' }, (data) => {
    badgeEl.textContent = String(data.fxCount || 0);
    document.getElementById('focusBtn').textContent = data.focusMode ? 'Tắt Focus Dimmer' : 'Bật Focus Dimmer';
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const active = tabs && tabs[0];
  if (active && active.url) {
    try { hostEl.textContent = new URL(active.url).hostname; } catch { hostEl.textContent = active.url; }
  }
});

syncState();

chrome.storage.onChanged.addListener(() => syncState());

document.getElementById('scanBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'FX_SCAN_PAGE' }, (res) => {
      statusEl.textContent = (res && res.status) || 'Đã kích hoạt hiệu ứng quét DOM';
    });
  });
});

document.getElementById('burstBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.storage.local.get({ accentColor: '#3b82f6' }, (cfg) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        args: [cfg.accentColor || '#3b82f6'],
        func: (accent) => {
          const palette = [accent, '#34d399', '#fbbf24', '#f472b6'];
          for (let i = 0; i < 28; i++) {
            const dot = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 28;
            const dist = 50 + Math.random() * 110;
            dot.style.cssText =
              'position:fixed;left:50%;top:48%;width:8px;height:8px;border-radius:999px;pointer-events:none;z-index:999999;background:' +
              palette[i % palette.length] + ';transition:transform 650ms cubic-bezier(0.16,1,0.3,1),opacity 650ms ease;';
            document.body.appendChild(dot);
            requestAnimationFrame(() => {
              dot.style.transform = 'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px) scale(0.3)';
              dot.style.opacity = '0';
            });
            setTimeout(() => dot.remove(), 700);
          }
          return document.querySelectorAll('section, .card').length;
        },
      }, () => {
        statusEl.textContent = 'Injected particle burst vào tab!';
      });
    });
  });
});

document.getElementById('focusBtn').addEventListener('click', () => {
  chrome.storage.local.get({ focusMode: false }, (data) => {
    const next = !data.focusMode;
    chrome.storage.local.set({ focusMode: next }, () => {
      statusEl.textContent = next ? 'Focus Dimmer: ON' : 'Focus Dimmer: OFF';
    });
  });
});

document.getElementById('pingBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'INCREMENT_BADGE' }, (res) => {
    if (res && typeof res.count === 'number') {
      badgeEl.textContent = String(res.count);
      statusEl.textContent = 'Background badge = ' + res.count;
    }
  });
});

document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});`,
        'application/javascript'
      ),
      makeFile(
        'sidepanel.html',
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Side Panel</title>
  <style>
    body { margin: 0; padding: 14px; background: #101116; color: #f4f4f5; font-family: system-ui, sans-serif; font-size: 12px; }
    h2 { margin: 0 0 8px; font-size: 13px; }
    .box { background: #18181f; border: 1px solid #27272a; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
    button { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #3b82f6; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <h2>Extension Side Panel</h2>
  <div class="box">
    <div>Badge Count: <strong id="spCount">0</strong></div>
    <div style="margin-top:4px;color:#a1a1aa">Focus Dimmer: <strong id="spFocus">OFF</strong></div>
  </div>
  <button id="spTrigger">Trigger Page Ripple</button>
  <script>
    function refresh() {
      chrome.storage.local.get({ fxCount: 0, focusMode: false }, (d) => {
        document.getElementById('spCount').textContent = String(d.fxCount || 0);
        document.getElementById('spFocus').textContent = d.focusMode ? 'ON' : 'OFF';
      });
    }
    refresh();
    chrome.storage.onChanged.addListener(refresh);
    document.getElementById('spTrigger').onclick = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'FX_SCAN_PAGE' });
      });
    };
  </script>
</body>
</html>`,
        'text/html'
      ),
      makeFile(
        'options.html',
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>PageFX Options</title>
  <style>
    body { margin: 0; padding: 24px; background: #0b0c10; color: #f4f4f5; font-family: system-ui, sans-serif; }
    .card { max-width: 420px; background: #14151b; border: 1px solid #27272a; border-radius: 14px; padding: 18px; }
    h2 { margin: 0 0 12px; font-size: 15px; }
    label { display: block; font-size: 12px; color: #a1a1aa; margin-bottom: 6px; }
    select, button { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid #27272a; background: #1c1d24; color: #f4f4f5; font-size: 12px; }
    button { margin-top: 12px; background: #2563eb; border-color: #3b82f6; font-weight: 600; cursor: pointer; }
    #saved { margin-top: 10px; font-size: 11px; color: #34d399; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Extension Options</h2>
    <label for="accentSelect">Particle Accent Color</label>
    <select id="accentSelect">
      <option value="#3b82f6">Blue (#3b82f6)</option>
      <option value="#10b981">Emerald (#10b981)</option>
      <option value="#f59e0b">Amber (#f59e0b)</option>
    </select>
    <button id="saveBtn">Lưu cài đặt</button>
    <div id="saved"></div>
  </div>
  <script>
    const sel = document.getElementById('accentSelect');
    chrome.storage.local.get({ accentColor: '#3b82f6' }, (d) => { sel.value = d.accentColor; });
    document.getElementById('saveBtn').onclick = () => {
      chrome.storage.local.set({ accentColor: sel.value }, () => {
        document.getElementById('saved').textContent = 'Đã lưu vào chrome.storage.local!';
      });
    };
  </script>
</body>
</html>`,
        'text/html'
      ),
      makeFile(
        'content.css',
        `.ext-fx-ring {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 99999;
  border: 3px solid #3b82f6;
  animation: extRingPulse 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.ext-fx-card-glow {
  outline: 2px solid #3b82f6 !important;
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.32) !important;
  transition: box-shadow 260ms ease, outline-color 260ms ease !important;
}
body.ext-focus-dim {
  filter: contrast(1.06) saturate(0.82);
}
@keyframes extRingPulse {
  0% { opacity: 0.9; transform: scale(0.96); }
  100% { opacity: 0; transform: scale(1.02); }
}`,
        'text/css'
      ),
      makeFile(
        'content.js',
        `console.log('Content script mounted on', window.location.href);

chrome.storage.local.get({ focusMode: false }, (data) => {
  document.body.classList.toggle('ext-focus-dim', Boolean(data.focusMode));
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.focusMode) {
    document.body.classList.toggle('ext-focus-dim', Boolean(changes.focusMode.newValue));
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'FX_SCAN_PAGE') {
    const ring = document.createElement('div');
    ring.className = 'ext-fx-ring';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 680);

    const targets = document.querySelectorAll('.card, article, header');
    targets.forEach((el, idx) => {
      setTimeout(() => {
        el.classList.add('ext-fx-card-glow');
        setTimeout(() => el.classList.remove('ext-fx-card-glow'), 850);
      }, idx * 90);
    });
    sendResponse({ status: 'Đã quét ' + targets.length + ' vùng DOM' });
  }
});`,
        'application/javascript'
      ),
      makeFile(
        'background.js',
        `chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ fxCount: 0 }, (res) => {
    const n = res.fxCount || 0;
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    chrome.action.setBadgeText({ text: n > 0 ? String(n) : '' });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'INCREMENT_BADGE') {
    chrome.storage.local.get({ fxCount: 0 }, (res) => {
      const next = (res.fxCount || 0) + 1;
      chrome.storage.local.set({ fxCount: next }, () => {
        chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
        chrome.action.setBadgeText({ text: String(next) });
        chrome.notifications.create({
          type: 'basic',
          title: 'PageFX Controller',
          message: 'Đã cập nhật badge counter lên ' + next,
        });
        sendResponse({ count: next });
      });
    });
    return true;
  }
});`,
        'application/javascript'
      ),
    ],
  },
  {
    id: 'fabric-mod',
    name: 'Minecraft Fabric Mod (GUI + Gradle)',
    stack: 'Fabric 1.21.1 · Java · gradlew build · Screen GUI',
    folderName: 'fx-fabric-mod',
    files: [
      makeFile(
        'gradle.properties',
        `org.gradle.jvmargs=-Xmx2G
minecraft_version=1.21.1
yarn_mappings=1.21.1+build.3
loader_version=0.16.5
mod_version=1.0.0
maven_group=com.example.fxmod
archives_base_name=fx-fabric-mod
fabric_version=0.104.0+1.21.1`,
        'text/plain'
      ),
      makeFile(
        'build.gradle',
        `plugins {
    id 'fabric-loom' version '1.7-SNAPSHOT'
    id 'maven-publish'
}

version = project.mod_version
group = project.maven_group

base {
    archivesName = project.archives_base_name
}

dependencies {
    minecraft "com.mojang:minecraft:\${project.minecraft_version}"
    mappings "net.fabricmc:yarn:\${project.yarn_mappings}:v2"
    modImplementation "net.fabricmc:fabric-loader:\${project.loader_version}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:\${project.fabric_version}"
}`,
        'text/plain'
      ),
      makeFile(
        'src/main/resources/fabric.mod.json',
        JSON.stringify(
          {
            schemaVersion: 1,
            id: 'fxmod',
            version: '${version}',
            name: 'FX Fabric Mod',
            description: 'Interactive Fabric client mod with custom Screen GUI and gradlew build.',
            authors: ['TM'],
            license: 'MIT',
            environment: '*',
            entrypoints: {
              main: ['com.example.fxmod.FxMod'],
              client: ['com.example.fxmod.FxClientMod'],
            },
            depends: {
              fabricloader: '>=0.16.5',
              minecraft: '~1.21.1',
              java: '>=21',
              'fabric-api': '*',
            },
          },
          null,
          2
        ),
        'application/json'
      ),
      makeFile(
        'src/main/resources/assets/fxmod/lang/en_us.json',
        JSON.stringify(
          {
            'screen.fxmod.title': 'FX Fabric Mod Control',
            'button.fxmod.boost': 'Speed Boost: ON',
            'button.fxmod.hud': 'Toggle HUD Overlay',
            'button.fxmod.particles': 'Spawn Particle Ring',
            'button.fxmod.done': 'Done',
          },
          null,
          2
        ),
        'application/json'
      ),
      makeFile(
        'src/main/java/com/example/fxmod/FxMod.java',
        `package com.example.fxmod;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FxMod implements ModInitializer {
    public static final String MOD_ID = "fxmod";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("FX Fabric Mod initialized!");
    }
}`,
        'text/plain'
      ),
      makeFile(
        'src/main/java/com/example/fxmod/FxClientMod.java',
        `package com.example.fxmod;

import com.example.fxmod.screen.FxControlScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.MinecraftClient;

public class FxClientMod implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            // Opens FxControlScreen when bound key is pressed
        });
    }
}`,
        'text/plain'
      ),
      makeFile(
        'src/main/java/com/example/fxmod/screen/FxControlScreen.java',
        `package com.example.fxmod.screen;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.CheckboxWidget;
import net.minecraft.client.gui.widget.SliderWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;

public class FxControlScreen extends Screen {
    private boolean hudEnabled = true;

    public FxControlScreen() {
        super(Text.translatable("screen.fxmod.title"));
    }

    @Override
    protected void init() {
        int cx = this.width / 2;

        this.addDrawableChild(new TextFieldWidget(this.textRenderer, cx - 100, 56, 200, 20, Text.literal("fxmod-preset-1")));

        this.addDrawableChild(ButtonWidget.builder(Text.translatable("button.fxmod.boost"), btn -> {
            hudEnabled = !hudEnabled;
        }).dimensions(cx - 100, 86, 200, 20).build());

        this.addDrawableChild(ButtonWidget.builder(Text.translatable("button.fxmod.hud"), btn -> {
            // Toggle Fabric HUD overlay
        }).dimensions(cx - 100, 112, 200, 20).build());

        this.addDrawableChild(ButtonWidget.builder(Text.translatable("button.fxmod.particles"), btn -> {
            // Trigger client particle burst
        }).dimensions(cx - 100, 138, 200, 20).build());

        this.addDrawableChild(CheckboxWidget.builder(Text.literal("Show Coordinates HUD"), this.textRenderer)
            .pos(cx - 100, 166)
            .checked(true)
            .build());

        this.addDrawableChild(new SliderWidget(cx - 100, 194, 200, 20, Text.literal("FOV Scale: 1.0x"), 0.5) {
            @Override protected void updateMessage() {}
            @Override protected void applyValue() {}
        });

        this.addDrawableChild(ButtonWidget.builder(Text.translatable("button.fxmod.done"), btn -> this.close())
            .dimensions(cx - 100, 224, 200, 20)
            .build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        this.renderBackground(context, mouseX, mouseY, delta);
        context.fill(this.width / 2 - 120, 24, this.width / 2 + 120, 256, 0xCC111319);
        context.drawCenteredTextWithShadow(this.textRenderer, this.title, this.width / 2, 34, 0xFFFFFF);
        super.render(context, mouseX, mouseY, delta);
    }
}`,
        'text/plain'
      ),
    ],
  },
  {
    id: 'shader-glsl',
    name: 'GLSL Shader Studio (Exotic)',
    stack: 'WebGL2 · Fragment Shader (.frag)',
    folderName: 'glsl-shader-lab',
    files: [
      makeFile(
        'shader.frag',
        `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 m = (u_mouse / max(u_resolution, vec2(1.0))) - 0.5;
  float d = length(uv - m * 0.5);
  float wave = sin(d * 18.0 - u_time * 3.2) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.06, 0.12, 0.28), vec3(0.22, 0.65, 1.0), smoothstep(0.15, 0.85, wave));
  col += 0.04 / (d + 0.05) * vec3(0.3, 0.7, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`,
        'text/plain'
      ),
    ],
  },
  {
    id: 'java-oop',
    name: 'Java Multi-File Project',
    stack: 'Java · OOP Classes · ArrayList · Scanner',
    folderName: 'java-oop-app',
    files: [
      makeFile(
        'src/Student.java',
        `public class Student {
    private String name;
    private double score;

    public Student(String name, double score) {
        this.name = name;
        this.score = score;
    }

    public String summary() {
        return name + " -> " + score;
    }

    public double getScore() {
        return score;
    }
}`,
        'text/plain'
      ),
      makeFile(
        'src/Main.java',
        `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Student> list = new ArrayList<>();
        list.add(new Student("An", 9.2));
        list.add(new Student("Binh", 8.5));
        list.add(new Student("Chi", 9.6));

        double total = 0;
        for (Student s : list) {
            System.out.println(s.summary());
            total += s.getScore();
        }
        System.out.printf("Average score: %.2f%n", total / list.size());
    }
}`,
        'text/plain'
      ),
    ],
  },
  {
    id: 'cpp-algo',
    name: 'C++17 Multi-File Project',
    stack: 'C++17 · Headers · STL / JSCPP',
    folderName: 'cpp-algo-app',
    files: [
      makeFile(
        'include/math_utils.h',
        `#pragma once
int fastPowMod(int base, int exp, int mod);
`,
        'text/plain'
      ),
      makeFile(
        'src/math_utils.cpp',
        `#include "math_utils.h"

int fastPowMod(int base, int exp, int mod) {
    int res = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) res = (res * base) % mod;
        base = (base * base) % mod;
        exp >>= 1;
    }
    return res;
}
`,
        'text/plain'
      ),
      makeFile(
        'src/main.cpp',
        `#include <iostream>
#include "math_utils.h"
using namespace std;

int main() {
    int n = 5;
    cout << "2^10 mod 1000 = " << fastPowMod(2, 10, 1000) << endl;
    int sum = 0;
    for (int i = 1; i <= n; i++) {
        sum += i * i;
    }
    cout << "Sum of squares (1.." << n << ") = " << sum << endl;
    return 0;
}
`,
        'text/plain'
      ),
    ],
  },
];

export const isAssetPath = (path: string) => {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('assets/') ||
    lower.startsWith('asset/') ||
    lower.startsWith('public/assets/') ||
    lower.includes('/assets/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i.test(lower)
  );
};

export const isMediaPath = (path: string, mime?: string) => {
  const lower = path.toLowerCase();
  return (
    mime?.startsWith('image/') ||
    mime?.startsWith('video/') ||
    mime?.startsWith('audio/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|jfif|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac)$/i.test(lower)
  );
};

const replaceAssetReferences = (source: string, assetMap: Record<string, string>): string => {
  if (!source || Object.keys(assetMap).length === 0) return source;
  let result = source;
  const entries = Object.entries(assetMap).sort((a, b) => b[0].length - a[0].length);
  for (const [key, dataUrl] of entries) {
    if (!key || !dataUrl) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(['"\`(])(?:attach:\\/\\/|\\.\\/|\\/)?${escaped}(['"\`)])`, 'g');
    result = result.replace(regex, `$1${dataUrl}$2`);
  }
  return result;
};

const safeJsonForHtml = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');
const safeInlineScript = (code: string): string => code.replace(/<\/script/gi, '<\\/script');
const safeInlineStyle = (css: string): string => css.replace(/<\/style/gi, '<\\/style');

const extractBodyMarkup = (htmlContent?: string): string => {
  if (!htmlContent) return '<div id="root"></div><div id="app"></div>';
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const rawBody = bodyMatch ? bodyMatch[1] : htmlContent;
  return rawBody
    .replace(/<script\b[^>]*src=["'](?!https?:\/\/)[^"']+["'][^>]*>\s*<\/script>/gi, '')
    .trim() || '<div id="root"></div><div id="app"></div>';
};

export function detectWorkspaceLanguages(files: WorkspaceFile[]): string[] {
  const langs = new Set<string>();
  for (const f of files) {
    const ext = (f.path.split('.').pop() || '').toLowerCase();
    if (ext === 'tsx' || ext === 'ts') langs.add('TypeScript');
    else if (ext === 'jsx' || ext === 'js' || ext === 'mjs') langs.add('JavaScript');
    else if (ext === 'vue') langs.add('Vue');
    else if (ext === 'svelte') langs.add('Svelte');
    else if (ext === 'html' || ext === 'htm') langs.add('HTML');
    else if (ext === 'css' || ext === 'scss') langs.add('CSS');
    else if (ext === 'py') langs.add('Python');
    else if (ext === 'json') langs.add('JSON');
    else if (ext === 'sql') langs.add('SQL');
    else if (ext === 'go') langs.add('Go');
    else if (ext === 'rs') langs.add('Rust');
    else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'c' || ext === 'h' || ext === 'hpp') langs.add('C/C++');
    else if (ext === 'java') langs.add('Java');
    else if (ext === 'kt' || ext === 'kts') langs.add('Kotlin');
    else if (ext === 'gradle') langs.add('Gradle');
    else if (ext === 'frag' || ext === 'vert' || ext === 'glsl') langs.add('GLSL');
    else if (ext === 'bf' || ext === 'b') langs.add('Brainfuck');
    else if (ext === 'md') langs.add('Markdown');
    else if (ext === 'php') langs.add('PHP');
  }
  return Array.from(langs);
}

const RUNTIME_SHIMS_SCRIPT = `
  function createLucideProxy() {
    const paths = {
      Play: [['polygon', { points: '6 3 20 12 6 21 6 3' }]],
      Sparkles: [['path', { d: 'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z' }]],
      Zap: [['polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }]],
      Layers: [['polygon', { points: '12 2 2 7 12 12 22 7 12 2' }], ['polyline', { points: '2 17 12 22 22 17' }], ['polyline', { points: '2 12 12 17 22 12' }]],
      RefreshCw: [['polyline', { points: '23 4 23 10 17 10' }], ['path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }]],
      Check: [['polyline', { points: '20 6 9 17 4 12' }]],
      X: [['line', { x1: 18, y1: 6, x2: 6, y2: 18 }], ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }]],
      Plus: [['line', { x1: 12, y1: 5, x2: 12, y2: 19 }], ['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]],
      Minus: [['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]],
      Heart: [['path', { d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z' }]],
      Star: [['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]],
      ArrowRight: [['line', { x1: 5, y1: 12, x2: 19, y2: 12 }], ['polyline', { points: '12 5 19 12 12 19' }]],
      Rocket: [['path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }], ['path', { d: 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }]],
      Send: [['line', { x1: 22, y1: 2, x2: 11, y2: 13 }], ['polygon', { points: '22 2 15 22 11 13 2 9 22 2' }]],
      Code: [['polyline', { points: '16 18 22 12 16 6' }], ['polyline', { points: '8 6 2 12 8 18' }]],
      Folder: [['path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' }]],
      Download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '7 10 12 15 17 10' }], ['line', { x1: 12, y1: 15, x2: 12, y2: 3 }]],
      Sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' }]],
      Moon: [['path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }]]
    };
    return new Proxy({}, {
      get: function(_, prop) {
        if (prop === '__esModule') return true;
        return function Icon(props) {
          const p = props || {};
          const sz = p.size || 16;
          const shapeList = paths[String(prop)] || [['circle', { cx: 12, cy: 12, r: 5 }]];
          return window.React.createElement(
            'svg',
            {
              width: sz,
              height: sz,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: p.strokeWidth || 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              className: p.className || '',
              style: p.style
            },
            shapeList.map(function(item, idx) {
              return window.React.createElement(item[0], Object.assign({ key: idx }, item[1]));
            })
          );
        };
      }
    });
  }

  function createFramerMotionShim() {
    const toTransformStyle = (obj) => {
      if (!obj || typeof obj !== 'object') return {};
      const st = {};
      const transforms = [];
      if (obj.x !== undefined) transforms.push('translateX(' + (typeof obj.x === 'number' ? obj.x + 'px' : obj.x) + ')');
      if (obj.y !== undefined) transforms.push('translateY(' + (typeof obj.y === 'number' ? obj.y + 'px' : obj.y) + ')');
      if (obj.scale !== undefined) transforms.push('scale(' + obj.scale + ')');
      if (obj.rotate !== undefined) transforms.push('rotate(' + obj.rotate + 'deg)');
      if (transforms.length) st.transform = transforms.join(' ');
      if (obj.opacity !== undefined) st.opacity = obj.opacity;
      return st;
    };
    const motionProxy = new Proxy({}, {
      get: function(_, tag) {
        return window.React.forwardRef(function MotionComp(props, ref) {
          const { initial, animate, exit, transition, whileHover, whileTap, style, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...rest } = props || {};
          const [mounted, setMounted] = window.React.useState(false);
          const [hovered, setHovered] = window.React.useState(false);
          const [tapped, setTapped] = window.React.useState(false);
          window.React.useEffect(() => {
            const raf = requestAnimationFrame(() => setMounted(true));
            return () => cancelAnimationFrame(raf);
          }, []);
          const dur = Math.round(((transition && transition.duration) || 0.24) * 1000);
          const activeStyle = Object.assign(
            {},
            style || {},
            { transition: 'transform ' + dur + 'ms cubic-bezier(0.16,1,0.3,1), opacity ' + dur + 'ms ease' },
            !mounted && initial ? toTransformStyle(initial) : toTransformStyle(animate || {}),
            hovered && whileHover ? toTransformStyle(whileHover) : {},
            tapped && whileTap ? toTransformStyle(whileTap) : {}
          );
          return window.React.createElement(String(tag), Object.assign({}, rest, {
            ref,
            style: activeStyle,
            onMouseEnter: function(e) { setHovered(true); if (onMouseEnter) onMouseEnter(e); },
            onMouseLeave: function(e) { setHovered(false); setTapped(false); if (onMouseLeave) onMouseLeave(e); },
            onMouseDown: function(e) { setTapped(true); if (onMouseDown) onMouseDown(e); },
            onMouseUp: function(e) { setTapped(false); if (onMouseUp) onMouseUp(e); }
          }));
        });
      }
    });
    return {
      __esModule: true,
      motion: motionProxy,
      AnimatePresence: function AnimatePresence(props) { return props.children || null; },
    };
  }

  function createConfettiShim() {
    function fireConfetti(opts) {
      opts = opts || {};
      var count = opts.particleCount || 55;
      var spread = (opts.spread || 60) * Math.PI / 180;
      var origin = opts.origin || { x: 0.5, y: 0.6 };
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];
      var sx = (origin.x !== undefined ? origin.x : 0.5) * canvas.width;
      var sy = (origin.y !== undefined ? origin.y : 0.6) * canvas.height;
      var parts = [];
      for (var i = 0; i < count; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * spread * 1.4;
        var spd = 4 + Math.random() * 7;
        parts.push({ x: sx, y: sy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, w: 6 + Math.random() * 4, h: 4 + Math.random() * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, alpha: 1, c: colors[i % colors.length] });
      }
      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = false;
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j];
          p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.rot += p.vr; p.alpha -= 0.015;
          if (p.alpha > 0) {
            alive = true;
            ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
          }
        }
        if (alive) requestAnimationFrame(tick); else canvas.remove();
      }
      requestAnimationFrame(tick);
    }
    fireConfetti.default = fireConfetti;
    return fireConfetti;
  }
`;

export function buildWorkspaceProject(
  files: WorkspaceFile[],
  workspaceName = 'project'
): BuiltWorkspaceResult {
  if (files.length === 0) {
    return { html: '', mode: 'none', framework: 'Empty', languages: [] };
  }

  const languages = detectWorkspaceLanguages(files);

  const assetMap: Record<string, string> = {};
  for (const f of files) {
    if (f.dataUrl) {
      assetMap[f.path] = f.dataUrl;
      assetMap[f.name] = f.dataUrl;
      const strippedPublic = f.path.replace(/^public\//, '');
      assetMap[strippedPublic] = f.dataUrl;
      if (!f.path.startsWith('asset/') && !f.path.startsWith('assets/') && f.mimeType?.startsWith('image/')) {
        assetMap[`asset/${f.name}`] = f.dataUrl;
        assetMap[`assets/${f.name}`] = f.dataUrl;
      }
    }
  }

  const consoleBridgeScript = `
<script>
(function(){
  const post = (level, args) => {
    try {
      const text = Array.from(args).map(a => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      window.parent.postMessage({ type: '__TM_RUNNER_LOG__', level, text }, '*');
    } catch {}
  };
  const origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = (...a) => { post('log', a); origLog.apply(console, a); };
  console.warn = (...a) => { post('warn', a); origWarn.apply(console, a); };
  console.error = (...a) => { post('error', a); origErr.apply(console, a); };
  window.addEventListener('error', (e) => post('error', [e.message || 'Runtime error']));
  window.addEventListener('unhandledrejection', (e) => post('error', [e.reason?.message || String(e.reason || 'Unhandled rejection')]));
})();
</script>`;

  const htmlFile =
    files.find(f => f.path.toLowerCase() === 'index.html') ||
    files.find(f => f.path.toLowerCase() === 'public/index.html') ||
    files.find(f => f.path.toLowerCase().endsWith('.html'));

  const vueFiles = files.filter(f => !f.isBinary && /\.vue$/i.test(f.path));
  const codeModules = files.filter(
    f => !f.isBinary && /\.(jsx|tsx|js|ts|mjs)$/i.test(f.path) && !f.path.toLowerCase().includes('vite.config')
  );
  const cssFiles = files.filter(f => !f.isBinary && /\.(css|scss)$/i.test(f.path));
  const jsonFiles = files.filter(f => !f.isBinary && /\.json$/i.test(f.path) && f.path.toLowerCase() !== 'package.json');

  const pkgFile = files.find(f => f.path.toLowerCase() === 'package.json');
  const pkgContent = pkgFile?.content || '';

  // Case 0: Browser Extension Folder (MV2 / MV3 manifest.json)
  const manifestCandidates = files
    .filter(f => !f.isBinary && /(^|\/)manifest\.json$/i.test(f.path))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  for (const mf of manifestCandidates) {
    try {
      const parsed = JSON.parse(mf.content || '{}');
      const looksLikeExtension =
        parsed &&
        typeof parsed === 'object' &&
        (typeof parsed.manifest_version === 'number' ||
          Boolean(parsed.action) ||
          Boolean(parsed.browser_action) ||
          Boolean(parsed.page_action) ||
          Boolean(parsed.content_scripts) ||
          Boolean(parsed.background));
      if (looksLikeExtension) {
        return buildExtensionWorkspaceProject(files, mf, parsed, workspaceName, assetMap, languages);
      }
    } catch {
      // Fall through if invalid JSON
    }
  }

  // Case 0b: Minecraft Mod (Fabric / Gradlew Build + Fabric GUI Preview)
  const isMinecraftMod = files.some(
    f =>
      !f.isBinary &&
      /(^|\/)(fabric\.mod\.json|quilt\.mod\.json|mods\.toml|neoforge\.mods\.toml|build\.gradle(\.kts)?)$/i.test(f.path)
  );
  if (isMinecraftMod) {
    return buildMinecraftModWorkspace(files, workspaceName, assetMap, languages);
  }

  const isVueProject =
    vueFiles.length > 0 ||
    pkgContent.includes('"vue"') ||
    codeModules.some(m => (m.content || '').includes("from 'vue'") || (m.content || '').includes('from "vue"'));

  const hasReactOrTsx =
    codeModules.some(
      f =>
        /\.(tsx|jsx|ts)$/i.test(f.path) ||
        (f.content || '').includes('from "react"') ||
        (f.content || '').includes("from 'react'") ||
        (f.content || '').includes('ReactDOM')
    );

  // Case 1: Vue 3 SFC / App Project
  if (isVueProject) {
    const virtualVue: Record<string, string> = {};
    for (const v of vueFiles) {
      virtualVue[v.path] = replaceAssetReferences(v.content || '', assetMap);
    }
    const virtualScripts: Record<string, string> = {};
    for (const m of codeModules) {
      virtualScripts[m.path] = replaceAssetReferences(m.content || '', assetMap);
    }
    const combinedCss = cssFiles
      .map(c => replaceAssetReferences(c.content || '', assetMap))
      .join('\n');

    const vueEntry =
      vueFiles.find(f => /^(src\/)?App\.vue$/i.test(f.path))?.path ||
      vueFiles[0]?.path ||
      '';

    const vueRunnerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${workspaceName} — Vue 3 Build</title>
  ${consoleBridgeScript}
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0a0a0c; color: #f4f4f5; }
    ${combinedCss}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    (function() {
      try {
        const VUE_FILES = ${safeJsonForHtml(virtualVue)};
        const SCRIPT_FILES = ${safeJsonForHtml(virtualScripts)};
        const ENTRY = ${safeJsonForHtml(vueEntry)};
        const sfcSrc = VUE_FILES[ENTRY] || '';
        if (!sfcSrc) throw new Error('Không tìm thấy file .vue để chạy.');

        const tplMatch = sfcSrc.match(/<template>([\\s\\S]*)<\\/template>/i);
        const template = tplMatch ? tplMatch[1].trim() : '<div>Empty Vue template</div>';
        const styleMatches = [...sfcSrc.matchAll(/<style[^>]*>([\\s\\S]*?)<\\/style>/gi)];
        styleMatches.forEach(m => {
          const st = document.createElement('style');
          st.textContent = m[1];
          document.head.appendChild(st);
        });

        const scriptRe = new RegExp('<script([^>]*)>([\\\\s\\\\S]*?)<' + '/script>', 'i');
        const scriptMatch = sfcSrc.match(scriptRe);
        let componentDef = { template };
        if (scriptMatch) {
          const attrs = scriptMatch[1] || '';
          const code = scriptMatch[2] || '';
          const isSetup = /setup/i.test(attrs);
          if (isSetup) {
            const declared = [];
            for (const m of code.matchAll(/(?:const|let|var|function)\\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
              if (!declared.includes(m[1])) declared.push(m[1]);
            }
            const cleanBody = code
              .replace(/^\\s*import\\s+[\\s\\S]*?from\\s+['"][^'"]+['"];?\\s*$/gm, '')
              .replace(/^\\s*import\\s+['"][^'"]+['"];?\\s*$/gm, '');
            const transformed = Babel.transform(cleanBody, { presets: ['typescript', ['env', { modules: false }]] }).code;
            const fn = new Function(
              'Vue',
              'const { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } = Vue;\\n' +
                transformed +
                '\\nreturn { ' + declared.join(', ') + ' };'
            );
            componentDef.setup = function() { return fn(window.Vue); };
          } else {
            const mod = { exports: {} };
            const transformed = Babel.transform(code, { presets: ['typescript', ['env', { modules: 'commonjs' }]] }).code;
            const fn = new Function('require', 'module', 'exports', 'Vue', transformed);
            fn(function(s) { return s === 'vue' ? window.Vue : {}; }, mod, mod.exports, window.Vue);
            const exportedObj = mod.exports.default || mod.exports || {};
            componentDef = Object.assign({}, exportedObj, { template: exportedObj.template || template });
          }
        }

        const app = window.Vue.createApp(componentDef);
        app.mount('#app');
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'ok', message: 'Vue 3 build succeeded' }, '*');
      } catch (err) {
        console.error(err.message || err);
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'error', message: err.message || String(err) }, '*');
        document.getElementById('app').innerHTML =
          '<div style="padding:20px;font-family:monospace;color:#f87171;background:#18181b;min-height:100vh;">' +
          '<strong>Vue Build Error:</strong><pre style="white-space:pre-wrap;margin-top:8px;">' +
          String(err && err.stack ? err.stack : err) + '</pre></div>';
      }
    })();
  </script>
</body>
</html>`;
    return {
      html: vueRunnerHtml,
      standaloneHtml: vueRunnerHtml,
      mode: 'web',
      framework: 'Vue 3',
      languages,
    };
  }

  // Case 2: Plain HTML + CSS + JS project (no JSX/TSX/TS)
  if (htmlFile && !hasReactOrTsx) {
    let html = htmlFile.content || '';
    const combinedCss = cssFiles.map(c => replaceAssetReferences(c.content || '', assetMap)).join('\n');
    const combinedJs = codeModules.map(j => replaceAssetReferences(j.content || '', assetMap)).join('\n');

    html = replaceAssetReferences(html, assetMap);
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/)[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<script[^>]+src=["'](?!https?:\/\/)[^"']+["'][^>]*>\s*<\/script>/gi, '');

    const styleInject = combinedCss ? `<style>${combinedCss}</style>` : '';
    const scriptInject = combinedJs
      ? `<script>${combinedJs}; window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'ok', message: 'Static web build succeeded' }, '*');</script>`
      : `<script>window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'ok', message: 'HTML preview loaded' }, '*');</script>`;

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${consoleBridgeScript}${styleInject}</head>`);
    } else {
      html = `<!DOCTYPE html><html><head>${consoleBridgeScript}${styleInject}</head><body>${html}</body></html>`;
    }

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptInject}</body>`);
    } else {
      html += scriptInject;
    }

    return { html, standaloneHtml: html, mode: 'web', framework: 'HTML5 / CSS3 / JS', languages };
  }

  // Case 3: React / TypeScript / JSX / Modular Web Build
  if (hasReactOrTsx || codeModules.length > 0 || htmlFile) {
    const virtualFilesObj: Record<string, string> = {};
    for (const m of codeModules) {
      virtualFilesObj[m.path] = replaceAssetReferences(m.content || '', assetMap);
    }
    const virtualCssObj: Record<string, string> = {};
    for (const c of cssFiles) {
      virtualCssObj[c.path] = replaceAssetReferences((c.content || '').replace(/@import\s+["']tailwindcss["'];?/g, ''), assetMap);
    }
    const virtualJsonObj: Record<string, string> = {};
    for (const j of jsonFiles) {
      virtualJsonObj[j.path] = j.content || '{}';
    }

    const entryPath =
      codeModules.find(f => /^(src\/)?main\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules.find(f => /^(src\/)?index\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules.find(f => /^(src\/)?App\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules[0]?.path ||
      '';

    const combinedCss = Object.values(virtualCssObj).join('\n');
    const bodyMarkup = extractBodyMarkup(htmlFile?.content);
    const titleMatch = htmlFile?.content?.match(/<title>([^<]+)<\/title>/i);
    const docTitle = titleMatch?.[1] || `${workspaceName} — Live Build`;

    const allSourceText = codeModules.map(m => m.content || '').join('\n') + '\n' + pkgContent;
    const usesThree = /\bfrom\s+['"]three['"]|require\(['"]three['"]\)/.test(allSourceText);
    const usesGsap = /\bfrom\s+['"]gsap['"]|require\(['"]gsap['"]\)/.test(allSourceText);

    const runnerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  ${consoleBridgeScript}
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${usesThree ? '<script src="https://unpkg.com/three@0.170.0/build/three.min.js"></script>' : ''}
  ${usesGsap ? '<script src="https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"></script>' : ''}
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${combinedCss}
  </style>
</head>
<body class="bg-slate-950 text-white">
  ${bodyMarkup}
  <script>
    (function() {
      const FILES = ${safeJsonForHtml(virtualFilesObj)};
      const CSS_FILES = ${safeJsonForHtml(virtualCssObj)};
      const JSON_FILES = ${safeJsonForHtml(virtualJsonObj)};
      const ENTRY = ${safeJsonForHtml(entryPath)};
      const MODULE_CACHE = {};

      ${RUNTIME_SHIMS_SCRIPT}

      function normalizeRel(base, rel, pool) {
        if (rel.startsWith('@/')) {
          rel = 'src/' + rel.slice(2);
        } else if (rel.startsWith('./') || rel.startsWith('../')) {
          const stack = base.split('/').slice(0, -1);
          for (const part of rel.split('/')) {
            if (part === '.' || !part) continue;
            if (part === '..') stack.pop();
            else stack.push(part);
          }
          rel = stack.join('/');
        } else {
          rel = rel.replace(/^\\/+/, '');
        }
        const candidates = [
          rel,
          rel + '.tsx', rel + '.ts', rel + '.jsx', rel + '.js',
          rel + '/index.tsx', rel + '/index.ts', rel + '/index.jsx', rel + '/index.js'
        ];
        for (const c of candidates) {
          if (Object.prototype.hasOwnProperty.call(pool, c)) return c;
        }
        return null;
      }

      const reactShim = Object.assign({}, window.React, { default: window.React });
      const reactDomShim = Object.assign({}, window.ReactDOM, { default: window.ReactDOM });
      const lucideShim = createLucideProxy();
      const motionShim = createFramerMotionShim();
      const confettiShim = createConfettiShim();
      const clsxShim = function() {
        const out = [];
        for (let i = 0; i < arguments.length; i++) {
          const arg = arguments[i];
          if (!arg) continue;
          if (typeof arg === 'string') out.push(arg);
          else if (Array.isArray(arg)) out.push(clsxShim.apply(null, arg));
          else if (typeof arg === 'object') {
            for (const k in arg) if (arg[k]) out.push(k);
          }
        }
        return out.join(' ');
      };

      function requireModule(currentPath, specifier) {
        if (specifier === 'react') return reactShim;
        if (specifier === 'react-dom' || specifier === 'react-dom/client') return reactDomShim;
        if (specifier === 'lucide-react') return lucideShim;
        if (specifier === 'framer-motion' || specifier === 'motion/react') return motionShim;
        if (specifier === 'canvas-confetti') return confettiShim;
        if (specifier === 'clsx' || specifier === 'tailwind-merge') return Object.assign(clsxShim, { clsx: clsxShim, twMerge: clsxShim, default: clsxShim });
        if (specifier === 'three' && window.THREE) return Object.assign({}, window.THREE, { default: window.THREE });
        if (specifier === 'gsap' && window.gsap) return Object.assign({}, window.gsap, { gsap: window.gsap, default: window.gsap });

        if (specifier.endsWith('.css') || specifier.endsWith('.scss')) {
          const cssKey = normalizeRel(currentPath, specifier, CSS_FILES);
          if (cssKey && !MODULE_CACHE['css:' + cssKey]) {
            MODULE_CACHE['css:' + cssKey] = true;
            const st = document.createElement('style');
            st.textContent = CSS_FILES[cssKey];
            document.head.appendChild(st);
          }
          return {};
        }

        if (specifier.endsWith('.json')) {
          const jsonKey = normalizeRel(currentPath, specifier, JSON_FILES);
          if (jsonKey) return JSON.parse(JSON_FILES[jsonKey]);
        }

        const resolved = normalizeRel(currentPath, specifier, FILES);
        if (!resolved) {
          throw new Error('Cannot resolve module "' + specifier + '" from ' + currentPath);
        }
        return loadModule(resolved);
      }

      function loadModule(path) {
        if (MODULE_CACHE[path]) return MODULE_CACHE[path].exports;
        const source = FILES[path];
        const mod = { exports: {} };
        MODULE_CACHE[path] = mod;
        const transformed = Babel.transform(source, {
          filename: path,
          presets: ['react', 'typescript', ['env', { modules: 'commonjs' }]]
        }).code;
        const fn = new Function('require', 'module', 'exports', 'React', 'ReactDOM', transformed);
        fn((spec) => requireModule(path, spec), mod, mod.exports, window.React, window.ReactDOM);
        return mod.exports;
      }

      try {
        if (!ENTRY) throw new Error('No runnable entry file found');
        const exported = loadModule(ENTRY);
        const rootEl = document.getElementById('root') || document.getElementById('app');
        if (rootEl && !rootEl.hasChildNodes() && exported && (exported.default || typeof exported === 'function')) {
          const Comp = exported.default || exported;
          if (typeof Comp === 'function') {
            const root = window.ReactDOM.createRoot ? window.ReactDOM.createRoot(rootEl) : null;
            if (root) root.render(window.React.createElement(Comp));
            else window.ReactDOM.render(window.React.createElement(Comp), rootEl);
          }
        }
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'ok', message: 'Build succeeded (' + Object.keys(FILES).length + ' modules)' }, '*');
      } catch (err) {
        console.error(err.message || err);
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'error', message: err.message || String(err) }, '*');
        const target = document.getElementById('root') || document.body;
        target.innerHTML =
          '<div style="padding:20px;font-family:monospace;color:#f87171;background:#18181b;min-height:100vh;">' +
          '<strong>Build / Runtime Error:</strong><pre style="white-space:pre-wrap;margin-top:8px;">' +
          String(err && err.stack ? err.stack : err) + '</pre></div>';
      }
    })();
  </script>
</body>
</html>`;

    const isReact =
      codeModules.some(m => /\.(tsx|jsx)$/i.test(m.path) || (m.content || '').includes('react')) ||
      pkgContent.includes('"react"');
    const framework = isReact
      ? 'React + TypeScript'
      : languages.includes('TypeScript')
      ? 'TypeScript Web'
      : 'JavaScript Web';

    return { html: runnerHtml, standaloneHtml: runnerHtml, mode: 'web', framework, languages };
  }

  // Case 4: Python project (multi-file VFS)
  const pyEntry =
    files.find(f => !f.isBinary && /^(src\/)?(main|app|index)\.py$/i.test(f.path)) ||
    files.find(f => !f.isBinary && /\.py$/i.test(f.path));
  if (pyEntry) {
    return {
      html: '',
      mode: 'python',
      framework: 'Python 3 (Pyodide)',
      languages,
      pythonEntry: pyEntry,
    };
  }

  // Case 4a2: Standalone Java Project (.java without Minecraft Gradle files)
  const javaEntry =
    files.find(f => !f.isBinary && /\.java$/i.test(f.path) && /public\s+static\s+void\s+main\s*\(/.test(f.content || '')) ||
    files.find(f => !f.isBinary && /^(src\/)?Main\.java$/i.test(f.path)) ||
    files.find(f => !f.isBinary && /\.java$/i.test(f.path));
  if (javaEntry) {
    return {
      html: '',
      mode: 'java',
      framework: 'Java (JVM Bridge)',
      languages,
      javaEntry,
    };
  }

  // Case 4a3: Standalone C / C++ Project (.cpp, .cc, .cxx, .c)
  const cppEntry =
    files.find(f => !f.isBinary && /\.(cpp|cc|cxx|c)$/i.test(f.path) && /\bmain\s*\(/.test(f.content || '')) ||
    files.find(f => !f.isBinary && /^(src\/)?main\.(cpp|cc|cxx|c)$/i.test(f.path)) ||
    files.find(f => !f.isBinary && /\.(cpp|cc|cxx|c)$/i.test(f.path));
  if (cppEntry) {
    return {
      html: '',
      mode: 'cpp',
      framework: 'C/C++ (JSCPP / C++17 VM)',
      languages,
      cppEntry,
    };
  }

  // Case 4b: GLSL Fragment Shader Studio (.frag / .glsl)
  const shaderFile = files.find(f => !f.isBinary && /\.(frag|glsl)$/i.test(f.path));
  if (shaderFile) {
    return buildGlslShaderWorkspace(shaderFile, workspaceName, languages);
  }

  // Case 4c: Brainfuck Esoteric VM (.bf / .b)
  const bfFile = files.find(f => !f.isBinary && /\.(bf|b)$/i.test(f.path));
  if (bfFile) {
    return buildBrainfuckWorkspace(bfFile, workspaceName, languages);
  }

  // Case 4d: Markdown Documentation Folder (.md without code entries)
  const mdFiles = files.filter(f => !f.isBinary && /\.md$/i.test(f.path));
  if (mdFiles.length > 0 && codeModules.length === 0 && !htmlFile) {
    return buildMarkdownDocsWorkspace(mdFiles, workspaceName, assetMap, languages);
  }

  // Case 5: Media gallery
  const mediaItems = files.filter(f => f.dataUrl && isMediaPath(f.path, f.mimeType));
  if (mediaItems.length > 0) {
    const serializedMedia = JSON.stringify(
      mediaItems.map(m => ({
        path: m.path,
        name: m.name,
        mime: m.mimeType || 'image/png',
        size: m.size,
        src: m.dataUrl,
        kind: m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(m.name)
          ? 'video'
          : m.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(m.name)
          ? 'audio'
          : 'image',
        folder: m.path.includes('/') ? m.path.split('/').slice(0, -1).join('/') : 'root',
      }))
    );

    const galleryHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${workspaceName}</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b0d12;color:#f4f4f5}header{position:sticky;top:0;z-index:20;background:rgba(11,13,18,.92);border-bottom:1px solid #27272a;padding:12px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}.grid{padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.card{background:#14161d;border:1px solid #27272a;border-radius:12px;overflow:hidden;cursor:pointer}.thumb{height:140px;background:#090a0f;display:flex;align-items:center;justify-content:center}.thumb img,.thumb video{width:100%;height:100%;object-fit:cover}.meta{padding:8px 10px;font-size:11px}.name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style></head>
<body><header><strong style="font-size:13px">${workspaceName}/ (${mediaItems.length})</strong></header><div class="grid" id="grid"></div>
<script>const ITEMS=${serializedMedia};const g=document.getElementById('grid');ITEMS.forEach(it=>{const c=document.createElement('div');c.className='card';const t=document.createElement('div');t.className='thumb';if(it.kind==='video'){const v=document.createElement('video');v.src=it.src;v.controls=true;t.appendChild(v);}else if(it.kind==='audio'){const a=document.createElement('audio');a.src=it.src;a.controls=true;t.appendChild(a);}else{const i=document.createElement('img');i.src=it.src;i.alt=it.name;t.appendChild(i);}const m=document.createElement('div');m.className='meta';m.innerHTML='<div class="name"></div>';m.querySelector('.name').textContent=it.path;c.appendChild(t);c.appendChild(m);g.appendChild(c);});</script></body></html>`;
    return { html: galleryHtml, mode: 'gallery', framework: 'Media Gallery', languages };
  }

  // Case 6: Multi-language File Explorer
  const explorerEntries = files.slice(0, 120).map(f => ({
    path: f.path,
    name: f.name,
    mime: f.mimeType || 'text/plain',
    size: f.size,
    content: (f.content || '').slice(0, 60000),
    dataUrl: f.dataUrl || '',
  }));

  const explorerHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>${workspaceName}</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b0d12;color:#f4f4f5;display:flex;height:100vh}aside{width:240px;border-right:1px solid #27272a;background:#11131a;overflow-y:auto;padding:10px}.item{width:100%;text-align:left;background:transparent;color:#d4d4d8;border:0;padding:7px 10px;border-radius:8px;font-family:monospace;font-size:11px;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.item.active{background:#2563eb;color:#fff}main{flex:1;display:flex;flex-direction:column}.top{padding:10px 16px;border-bottom:1px solid #27272a;font-family:monospace;font-size:12px;color:#a1a1aa}.view{flex:1;overflow:auto;padding:16px}pre{margin:0;font-family:monospace;font-size:12px;line-height:1.6;white-space:pre-wrap}</style></head>
<body><aside id="list"></aside><main><div class="top" id="pathBar"></div><div class="view" id="viewer"></div></main>
<script>const FILES=${safeJsonForHtml(explorerEntries)};const list=document.getElementById('list');const viewer=document.getElementById('viewer');const pathBar=document.getElementById('pathBar');function sel(idx){const f=FILES[idx];if(!f)return;Array.from(list.children).forEach((e,i)=>e.classList.toggle('active',i===idx));pathBar.textContent=f.path;viewer.innerHTML='';if(f.dataUrl&&f.mime==='application/pdf'){const emb=document.createElement('iframe');emb.src=f.dataUrl;emb.style.cssText='width:100%;height:100%;border:0';viewer.appendChild(emb);}else{const pre=document.createElement('pre');pre.textContent=f.content||'(Binary)';viewer.appendChild(pre);}}FILES.forEach((f,i)=>{const b=document.createElement('button');b.className='item';b.textContent=f.path;b.onclick=()=>sel(i);list.appendChild(b);});if(FILES.length>0)sel(0);</script></body></html>`;

  return { html: explorerHtml, mode: 'explorer', framework: 'Code Explorer', languages };
}

function buildExtensionWorkspaceProject(
  files: WorkspaceFile[],
  manifestFile: WorkspaceFile,
  manifest: Record<string, any>,
  workspaceName: string,
  assetMap: Record<string, string>,
  languages: string[]
): BuiltWorkspaceResult {
  const mfDir = manifestFile.path.includes('/')
    ? manifestFile.path.slice(0, manifestFile.path.lastIndexOf('/') + 1)
    : '';

  const extFiles = new Map<string, WorkspaceFile>();
  const extAssets: Record<string, string> = { ...assetMap };

  for (const f of files) {
    let rel = f.path;
    if (mfDir && rel.startsWith(mfDir)) {
      rel = rel.slice(mfDir.length);
    }
    rel = rel.replace(/^\.?\//, '');
    extFiles.set(rel, f);
    extFiles.set(rel.toLowerCase(), f);
    if (f.dataUrl) {
      extAssets[rel] = f.dataUrl;
      extAssets['/' + rel] = f.dataUrl;
      extAssets['./' + rel] = f.dataUrl;
    }
  }

  const resolveRelPath = (targetPath: string, fromFile?: string): string => {
    const clean = targetPath.split('?')[0].split('#')[0].trim();
    if (!clean) return '';
    if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
    if (fromFile && fromFile.includes('/')) {
      const stack = fromFile.split('/').slice(0, -1);
      for (const seg of clean.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') stack.pop();
        else stack.push(seg);
      }
      const joined = stack.join('/');
      if (extFiles.has(joined) || extFiles.has(joined.toLowerCase())) return joined;
    }
    return clean.replace(/^\.\//, '');
  };

  const findExtFile = (targetPath?: string, fromFile?: string): WorkspaceFile | undefined => {
    if (!targetPath) return undefined;
    const normalized = resolveRelPath(targetPath, fromFile);
    const candidates = [
      normalized,
      normalized.toLowerCase(),
      normalized.replace(/\.js$/i, '.ts'),
      normalized.replace(/\.js$/i, '.tsx'),
      normalized.replace(/\.js$/i, '.jsx'),
      'src/' + normalized,
      'src/' + normalized.replace(/\.js$/i, '.ts'),
      'src/' + normalized.replace(/\.js$/i, '.tsx'),
    ];
    for (const c of candidates) {
      const hit = extFiles.get(c);
      if (hit) return hit;
    }
    return undefined;
  };

  // Load i18n messages if present
  const i18nMessages: Record<string, string> = {};
  const localeFiles = files.filter(f => /(^|\/)_locales\/[^/]+\/messages\.json$/i.test(f.path));
  const preferredLocale =
    localeFiles.find(f => /_locales\/vi\//i.test(f.path)) ||
    localeFiles.find(f => /_locales\/en/i.test(f.path)) ||
    localeFiles[0];
  if (preferredLocale?.content) {
    try {
      const parsedLoc = JSON.parse(preferredLocale.content);
      for (const [k, v] of Object.entries(parsedLoc)) {
        if (v && typeof v === 'object' && 'message' in (v as any)) {
          i18nMessages[k] = String((v as any).message || '');
        }
      }
    } catch {}
  }

  const resolveMsgTokens = (text: string) =>
    text.replace(/__MSG_([A-Za-z0-9_@]+)__/g, (_, key) => i18nMessages[key] || key);

  const extName = resolveMsgTokens(String(manifest.name || workspaceName || 'Extension'));
  const extDesc = resolveMsgTokens(String(manifest.description || ''));
  const extVersion = String(manifest.version || '1.0.0');
  const mv = Number(manifest.manifest_version || 3);

  const pickIconUrl = (): string => {
    const iconSources = [
      manifest.action?.default_icon,
      manifest.browser_action?.default_icon,
      manifest.page_action?.default_icon,
      manifest.icons,
    ];
    for (const src of iconSources) {
      if (!src) continue;
      if (typeof src === 'string') {
        const hit = findExtFile(src);
        if (hit?.dataUrl) return hit.dataUrl;
      } else if (typeof src === 'object') {
        for (const sz of ['48', '64', '32', '128', '16', ...Object.keys(src)]) {
          const val = src[sz];
          if (typeof val === 'string') {
            const hit = findExtFile(val);
            if (hit?.dataUrl) return hit.dataUrl;
          }
        }
      }
    }
    return '';
  };

  const extIconUrl = pickIconUrl();

  // Client chrome.* & browser.* RPC bridge injected into Popup / SidePanel / Options / NewTab / Content-script frames
  const createExtClientRpcScript = (surface: string, isContentScript = false) => `
(function() {
  var SURFACE = ${safeJsonForHtml(surface)};
  var IS_CONTENT = ${isContentScript ? 'true' : 'false'};
  var EXT_MANIFEST = ${safeJsonForHtml(manifest)};
  var I18N_MAP = ${safeJsonForHtml(i18nMessages)};
  var ASSET_URLS = ${safeJsonForHtml(extAssets)};

  function forwardLog(level, args) {
    try {
      var msg = Array.prototype.slice.call(args).map(function(a) {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(' ');
      window.parent.postMessage({ type: '__EXT_RELAY_LOG__', source: SURFACE, level: level, text: '[' + SURFACE + '] ' + msg }, '*');
    } catch (e) {}
  }
  var oLog = console.log, oWarn = console.warn, oErr = console.error;
  console.log = function() { forwardLog('log', arguments); oLog.apply(console, arguments); };
  console.warn = function() { forwardLog('warn', arguments); oWarn.apply(console, arguments); };
  console.error = function() { forwardLog('error', arguments); oErr.apply(console, arguments); };
  window.addEventListener('error', function(e) { forwardLog('error', [e.message || 'Runtime error']); });

  var reqSeq = 1;
  var pendingRpc = {};
  var onMsgListeners = [];
  var storageListeners = [];
  var installedListeners = [];

  function callRpc(method, params, cb) {
    return new Promise(function(resolve) {
      var id = 'rpc_' + (++reqSeq) + '_' + Math.random().toString(36).slice(2, 7);
      pendingRpc[id] = function(res) {
        if (typeof cb === 'function') {
          try { cb(res); } catch (err) { console.error(err); }
        }
        resolve(res);
      };
      window.parent.postMessage({
        type: '__EXT_RPC__',
        id: id,
        source: SURFACE,
        method: method,
        params: params || []
      }, '*');
      setTimeout(function() {
        if (pendingRpc[id]) {
          var fn = pendingRpc[id];
          delete pendingRpc[id];
          fn(undefined);
        }
      }, 4500);
    });
  }

  window.addEventListener('message', function(ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__EXT_RPC_RES__' && d.id && pendingRpc[d.id]) {
      var fn = pendingRpc[d.id];
      delete pendingRpc[d.id];
      fn(d.result);
    } else if (d.type === '__EXT_DELIVER_MSG__') {
      var responded = false;
      var keepAsync = false;
      var reply = function(payload) {
        if (responded) return;
        responded = true;
        if (d.replyId) {
          window.parent.postMessage({ type: '__EXT_DELIVER_REPLY__', replyId: d.replyId, result: payload }, '*');
        }
      };
      for (var i = 0; i < onMsgListeners.length; i++) {
        try {
          var ret = onMsgListeners[i](d.message, d.sender || { id: 'themaster-ext' }, reply);
          if (ret === true) keepAsync = true;
          else if (ret && typeof ret.then === 'function') {
            keepAsync = true;
            ret.then(reply);
          }
        } catch (err) { console.error(err); }
      }
      if (!keepAsync && !responded && d.replyId) {
        reply(undefined);
      }
    } else if (d.type === '__EXT_STORAGE_CHANGED__') {
      storageListeners.forEach(function(fn) {
        try { fn(d.changes || {}, d.areaName || 'local'); } catch (err) { console.error(err); }
      });
    } else if (d.type === '__EXT_EXEC_FUNC__' && IS_CONTENT) {
      try {
        var compiled = new Function('return (' + d.funcStr + ')')();
        var out = compiled.apply(null, Array.isArray(d.args) ? d.args : []);
        if (out && typeof out.then === 'function') {
          out.then(function(v) {
            window.parent.postMessage({ type: '__EXT_EXEC_DONE__', execId: d.execId, result: [{ result: v }] }, '*');
          });
        } else {
          window.parent.postMessage({ type: '__EXT_EXEC_DONE__', execId: d.execId, result: [{ result: out }] }, '*');
        }
      } catch (err) {
        console.error('scripting.executeScript error:', err && err.message ? err.message : err);
        window.parent.postMessage({ type: '__EXT_EXEC_DONE__', execId: d.execId, result: [] }, '*');
      }
    } else if (d.type === '__EXT_EXEC_CODE__' && IS_CONTENT) {
      try {
        (0, eval)(d.code || '');
      } catch (err) {
        console.error('scripting file error:', err && err.message ? err.message : err);
      }
      window.parent.postMessage({ type: '__EXT_EXEC_DONE__', execId: d.execId, result: [{ result: true }] }, '*');
    } else if (d.type === '__EXT_INSERT_CSS__' && IS_CONTENT) {
      var st = document.createElement('style');
      st.textContent = d.css || '';
      document.head.appendChild(st);
      window.parent.postMessage({ type: '__EXT_EXEC_DONE__', execId: d.execId, result: [] }, '*');
    }
  });

  function makeStorageArea(area) {
    return {
      get: function(keys, cb) { return callRpc('storage.get', [area, keys === undefined ? null : keys], cb); },
      set: function(items, cb) { return callRpc('storage.set', [area, items || {}], cb); },
      remove: function(keys, cb) { return callRpc('storage.remove', [area, keys], cb); },
      clear: function(cb) { return callRpc('storage.clear', [area], cb); }
    };
  }

  var actionApi = {
    setBadgeText: function(details, cb) { return callRpc('action.setBadgeText', [details], cb); },
    setBadgeBackgroundColor: function(details, cb) { return callRpc('action.setBadgeBackgroundColor', [details], cb); },
    setTitle: function(details, cb) { return callRpc('action.setTitle', [details], cb); },
    setIcon: function(details, cb) { return callRpc('action.setIcon', [details], cb); },
    setPopup: function(details, cb) { return Promise.resolve().then(function() { if (cb) cb(); }); }
  };

  var chromeApi = {
    runtime: {
      id: 'themaster-ext-sandbox',
      lastError: null,
      getManifest: function() { return EXT_MANIFEST; },
      getURL: function(p) {
        var clean = String(p || '').replace(/^\\.?\\//, '');
        return ASSET_URLS[clean] || clean;
      },
      sendMessage: function(extIdOrMsg, msgOrCb, maybeCb) {
        var msg = extIdOrMsg;
        var cb = msgOrCb;
        if (typeof extIdOrMsg === 'string' && msgOrCb !== undefined && typeof msgOrCb !== 'function') {
          msg = msgOrCb;
          cb = maybeCb;
        }
        return callRpc('runtime.sendMessage', [msg], cb);
      },
      openOptionsPage: function(cb) { return callRpc('runtime.openOptionsPage', [], cb); },
      onMessage: {
        addListener: function(fn) { if (typeof fn === 'function') onMsgListeners.push(fn); },
        removeListener: function(fn) { onMsgListeners = onMsgListeners.filter(function(f) { return f !== fn; }); },
        hasListener: function(fn) { return onMsgListeners.indexOf(fn) !== -1; }
      },
      onInstalled: {
        addListener: function(fn) { if (typeof fn === 'function') installedListeners.push(fn); }
      }
    },
    storage: {
      local: makeStorageArea('local'),
      sync: makeStorageArea('sync'),
      session: makeStorageArea('local'),
      onChanged: {
        addListener: function(fn) { if (typeof fn === 'function') storageListeners.push(fn); },
        removeListener: function(fn) { storageListeners = storageListeners.filter(function(f) { return f !== fn; }); }
      }
    },
    tabs: {
      query: function(queryInfo, cb) { return callRpc('tabs.query', [queryInfo || {}], cb); },
      getCurrent: function(cb) { return callRpc('tabs.query', [{ active: true }], function(tabs) { if (cb) cb(tabs && tabs[0]); }); },
      create: function(props, cb) { return callRpc('tabs.create', [props || {}], cb); },
      update: function(tabId, props, cb) { return callRpc('tabs.update', [tabId, props || {}], cb); },
      reload: function(tabId, props, cb) { return callRpc('tabs.reload', [tabId], typeof props === 'function' ? props : cb); },
      sendMessage: function(tabId, msg, optsOrCb, maybeCb) {
        var cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
        return callRpc('tabs.sendMessage', [tabId, msg], cb);
      }
    },
    scripting: {
      executeScript: function(injection, cb) {
        var payload = {
          target: injection && injection.target,
          args: injection && injection.args ? injection.args : [],
          files: injection && injection.files ? injection.files : [],
          funcStr: injection && typeof injection.func === 'function' ? injection.func.toString() : null
        };
        return callRpc('scripting.executeScript', [payload], cb);
      },
      insertCSS: function(injection, cb) {
        return callRpc('scripting.insertCSS', [injection || {}], cb);
      },
      removeCSS: function(injection, cb) { return Promise.resolve().then(function() { if (cb) cb(); }); }
    },
    action: actionApi,
    browserAction: actionApi,
    notifications: {
      create: function(idOrOpts, optsOrCb, maybeCb) {
        var opts = typeof idOrOpts === 'string' ? optsOrCb : idOrOpts;
        var cb = typeof idOrOpts === 'string' ? maybeCb : (typeof optsOrCb === 'function' ? optsOrCb : maybeCb);
        return callRpc('notifications.create', [opts || {}], cb);
      },
      clear: function(id, cb) { if (cb) cb(true); return Promise.resolve(true); }
    },
    i18n: {
      getMessage: function(key) { return I18N_MAP[key] || key || ''; },
      getUILanguage: function() { return 'vi'; }
    },
    sidePanel: {
      open: function(opts, cb) { return callRpc('sidePanel.open', [opts || {}], cb); },
      setOptions: function(opts, cb) { if (cb) cb(); return Promise.resolve(); }
    }
  };
  window.chrome = chromeApi;
  window.browser = chromeApi;
})();
`;

  const compileExtHtmlSurface = (htmlPath: string | undefined, surfaceName: string): string => {
    if (!htmlPath) return '';
    const htmlFile = findExtFile(htmlPath);
    if (!htmlFile || typeof htmlFile.content !== 'string') return '';

    let rawHtml = replaceAssetReferences(resolveMsgTokens(htmlFile.content), extAssets);
    const localStyles: string[] = [];
    const localScripts: { path: string; code: string; isModule: boolean }[] = [];

    // Inline local CSS <link>
    rawHtml = rawHtml.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](?!https?:\/\/)([^"']+)["'][^>]*>/gi,
      (_, href) => {
        const cssFile = findExtFile(href, htmlFile.path);
        if (cssFile?.content) {
          localStyles.push(replaceAssetReferences(cssFile.content, extAssets));
        }
        return '';
      }
    );

    // Collect local <script src="...">
    const scriptTagRe = /<script\b([^>]*)src=["'](?!https?:\/\/)([^"']+)["']([^>]*)>\s*<\/script>/gi;
    rawHtml = rawHtml.replace(scriptTagRe, (_, pre, src, post) => {
      const jsFile = findExtFile(src, htmlFile.path);
      if (jsFile?.content) {
        const isMod =
          /\btype=["']module["']/i.test(pre + post) ||
          /\.(tsx|jsx|ts)$/i.test(jsFile.path) ||
          /\b(import|export)\s+/.test(jsFile.content);
        localScripts.push({
          path: jsFile.path,
          code: replaceAssetReferences(jsFile.content, extAssets),
          isModule: isMod,
        });
      }
      return '';
    });

    const usesReactOrTs = localScripts.some(
      s =>
        /\.(tsx|jsx|ts)$/i.test(s.path) ||
        s.isModule ||
        s.code.includes('from "react"') ||
        s.code.includes("from 'react'")
    );

    const rpcHeadScript = `<script>${safeInlineScript(createExtClientRpcScript(surfaceName, false))}<` + `/script>`;
    const stylesTag = localStyles.length > 0 ? `<style>${safeInlineStyle(localStyles.join('\n'))}</style>` : '';

    let scriptsBlock = '';
    if (usesReactOrTs) {
      const virtualModules: Record<string, string> = {};
      for (const f of files) {
        if (!f.isBinary && /\.(tsx?|jsx?|mjs|css|json)$/i.test(f.path) && typeof f.content === 'string') {
          let p = f.path;
          if (mfDir && p.startsWith(mfDir)) p = p.slice(mfDir.length);
          virtualModules[p.replace(/^\.?\//, '')] = replaceAssetReferences(f.content, extAssets);
        }
      }
      const entryScript = localScripts[0]?.path || '';
      scriptsBlock =
        `<script src="https://unpkg.com/react@18/umd/react.development.js"><` + `/script>` +
        `<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><` + `/script>` +
        `<script src="https://unpkg.com/@babel/standalone/babel.min.js"><` + `/script>` +
        `<script>(function(){` +
        `var FILES=${safeJsonForHtml(virtualModules)};` +
        `var ENTRY=${safeJsonForHtml(entryScript.replace(/^\.?\//, ''))};` +
        `${RUNTIME_SHIMS_SCRIPT}` +
        `var CACHE={};` +
        `function resPath(b,r){if(r.startsWith('./')||r.startsWith('../')){var s=b.split('/').slice(0,-1);r.split('/').forEach(function(p){if(p==='.'||!p)return;if(p==='..')s.pop();else s.push(p);});r=s.join('/');}else{r=r.replace(/^\\/+/, '');}var c=[r,r+'.tsx',r+'.ts',r+'.jsx',r+'.js',r+'/index.tsx',r+'/index.ts'];for(var i=0;i<c.length;i++)if(Object.prototype.hasOwnProperty.call(FILES,c[i]))return c[i];return null;}` +
        `var rShim=Object.assign({},window.React,{default:window.React});` +
        `var rdShim=Object.assign({},window.ReactDOM,{default:window.ReactDOM});` +
        `var lucide=createLucideProxy(),motion=createFramerMotionShim(),confetti=createConfettiShim();` +
        `function req(cur,sp){if(sp==='react')return rShim;if(sp==='react-dom'||sp==='react-dom/client')return rdShim;if(sp==='lucide-react')return lucide;if(sp==='framer-motion'||sp==='motion/react')return motion;if(sp==='canvas-confetti')return confetti;var k=resPath(cur,sp);if(!k)throw new Error('Missing '+sp);if(k.endsWith('.css')){if(!CACHE['c:'+k]){CACHE['c:'+k]=1;var st=document.createElement('style');st.textContent=FILES[k];document.head.appendChild(st);}return {};}if(k.endsWith('.json'))return JSON.parse(FILES[k]);return load(k);}` +
        `function load(p){if(CACHE[p])return CACHE[p].exports;var m={exports:{}};CACHE[p]=m;var out=Babel.transform(FILES[p],{filename:p,presets:['react','typescript',['env',{modules:'commonjs'}]]}).code;new Function('require','module','exports','React','ReactDOM',out)(function(s){return req(p,s);},m,m.exports,window.React,window.ReactDOM);return m.exports;}` +
        `try{if(ENTRY){var exp=load(ENTRY);var root=document.getElementById('root')||document.getElementById('app');if(root&&!root.hasChildNodes()&&exp&&(exp.default||typeof exp==='function')){var C=exp.default||exp;if(typeof C==='function'){if(window.ReactDOM.createRoot)window.ReactDOM.createRoot(root).render(window.React.createElement(C));else window.ReactDOM.render(window.React.createElement(C),root);}}}}catch(err){console.error(err);}` +
        `})();<` + `/script>`;
    } else if (localScripts.length > 0) {
      scriptsBlock = localScripts
        .map(s => `<script>${safeInlineScript(s.code)}<` + `/script>`)
        .join('\n');
    }

    if (rawHtml.includes('</head>')) {
      rawHtml = rawHtml.replace('</head>', `${rpcHeadScript}${stylesTag}</head>`);
    } else {
      rawHtml = `<!DOCTYPE html><html><head>${rpcHeadScript}${stylesTag}</head><body>${rawHtml}</body></html>`;
    }

    if (scriptsBlock) {
      if (rawHtml.includes('</body>')) {
        rawHtml = rawHtml.replace('</body>', `${scriptsBlock}</body>`);
      } else {
        rawHtml += scriptsBlock;
      }
    }
    return rawHtml;
  };

  // Resolve Extension Surfaces
  const popupPath =
    manifest.action?.default_popup ||
    manifest.browser_action?.default_popup ||
    manifest.page_action?.default_popup;
  const sidePanelPath = manifest.side_panel?.default_path;
  const optionsPath = manifest.options_ui?.page || manifest.options_page;
  const newTabPath = manifest.chrome_url_overrides?.newtab;

  const popupHtml = compileExtHtmlSurface(popupPath, 'Popup');
  const sidePanelHtml = compileExtHtmlSurface(sidePanelPath, 'SidePanel');
  const optionsHtml = compileExtHtmlSurface(optionsPath, 'Options');
  const newTabHtml = compileExtHtmlSurface(newTabPath, 'NewTab');

  // Collect Content Scripts (CSS & JS)
  const contentCssList: string[] = [];
  const contentJsList: string[] = [];
  if (Array.isArray(manifest.content_scripts)) {
    for (const cs of manifest.content_scripts) {
      if (Array.isArray(cs?.css)) {
        for (const p of cs.css) {
          const f = findExtFile(p);
          if (f?.content) contentCssList.push(replaceAssetReferences(f.content, extAssets));
        }
      }
      if (Array.isArray(cs?.js)) {
        for (const p of cs.js) {
          const f = findExtFile(p);
          if (f?.content) contentJsList.push(replaceAssetReferences(f.content, extAssets));
        }
      }
    }
  }

  // Collect Background scripts
  const bgScripts: string[] = [];
  const bgWorkerPath: string | undefined = manifest.background?.service_worker;
  if (bgWorkerPath) {
    const f = findExtFile(bgWorkerPath);
    if (f?.content) bgScripts.push(replaceAssetReferences(f.content, extAssets));
  } else if (Array.isArray(manifest.background?.scripts)) {
    for (const p of manifest.background.scripts) {
      const f = findExtFile(p);
      if (f?.content) bgScripts.push(replaceAssetReferences(f.content, extAssets));
    }
  } else if (typeof manifest.background?.page === 'string') {
    const bgHtml = findExtFile(manifest.background.page);
    if (bgHtml?.content) {
      const m = [...bgHtml.content.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
      for (const hit of m) {
        const js = findExtFile(hit[1], bgHtml.path);
        if (js?.content) bgScripts.push(replaceAssetReferences(js.content, extAssets));
      }
    }
  }

  // Map workspace JS/CSS files for dynamic chrome.scripting.executeScript({ files }) / insertCSS({ files })
  const workspaceTextMap: Record<string, string> = {};
  for (const [k, f] of extFiles.entries()) {
    if (!f.isBinary && typeof f.content === 'string') {
      workspaceTextMap[k] = replaceAssetReferences(f.content, extAssets);
    }
  }

  // Build Simulated Webpage Target HTML with content_scripts injected
  const simTabHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simulated Target Webpage</title>
  <script>${safeInlineScript(createExtClientRpcScript('Content', true))}<` + `/script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #e4e4e7; padding: 24px; line-height: 1.5; transition: filter 200ms ease, background 200ms ease; }
    .page-wrap { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
    header { padding: 16px 18px; background: #161922; border: 1px solid #27272a; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    header h1 { margin: 0; font-size: 16px; color: #fafafa; }
    header small { color: #a1a1aa; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
    .card { background: #161922; border: 1px solid #27272a; border-radius: 12px; padding: 14px; }
    .card h3 { margin: 0 0 6px; font-size: 13px; color: #f4f4f5; }
    .card p { margin: 0; font-size: 12px; color: #a1a1aa; }
    article { background: #161922; border: 1px solid #27272a; border-radius: 12px; padding: 16px; font-size: 13px; color: #d4d4d8; }
    .demo-form { display: flex; gap: 8px; margin-top: 10px; }
    .demo-form input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid #27272a; background: #0b0c10; color: #f4f4f5; font-size: 12px; }
    .demo-form button { padding: 8px 14px; border-radius: 8px; border: 1px solid #3f3f46; background: #27272a; color: #f4f4f5; font-size: 12px; cursor: pointer; }
  </style>
  ${contentCssList.length ? `<style>${safeInlineStyle(contentCssList.join('\n'))}</style>` : ''}
</head>
<body>
  <main class="page-wrap">
    <header>
      <div>
        <h1>Sample Target Webpage</h1>
        <small>Content scripts &amp; scripting API đang chạy trực tiếp trên trang này</small>
      </div>
      <a href="https://example.com" onclick="return false" style="color:#60a5fa;font-size:12px;">example.com</a>
    </header>
    <div class="grid">
      <div class="card">
        <h3>DOM Card #1</h3>
        <p>Thẻ mẫu hỗ trợ thao tác DOM, quét link, đổi theme hoặc inject hiệu ứng từ extension.</p>
      </div>
      <div class="card">
        <h3>DOM Card #2</h3>
        <p>Mọi thay đổi từ content script hoặc scripting.executeScript hiển thị tức thì tại đây.</p>
      </div>
    </div>
    <article>
      <strong>Interactive Form &amp; Article</strong>
      <p style="margin:6px 0 0;color:#a1a1aa">Extension của bạn có thể đọc text, tô sáng nút bấm hoặc chèn widget nổi vào trang web này.</p>
      <form class="demo-form" onsubmit="event.preventDefault();">
        <input type="text" value="Dữ liệu mẫu trên trang web" />
        <button type="submit">Submit</button>
      </form>
    </article>
  </main>
  ${contentJsList.map(c => `<script>${safeInlineScript(c)}<` + `/script>`).join('\n')}
</body>
</html>`;

  const defaultSurface = popupHtml
    ? 'popup'
    : sidePanelHtml
    ? 'sidepanel'
    : optionsHtml
    ? 'options'
    : newTabHtml
    ? 'newtab'
    : 'tab';

  const simulatorHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${extName} — Extension Simulator</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #09090d; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    .browser { display: flex; flex-direction: column; height: 100vh; }
    .toolbar { height: 46px; padding: 0 12px; background: #121318; border-bottom: 1px solid #27272a; display: flex; align-items: center; gap: 8px; shrink: 0; }
    .url-form { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
    .url-input { flex: 1; min-width: 0; height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid #27272a; background: #09090d; color: #d4d4d8; font-family: monospace; font-size: 12px; outline: none; }
    .url-input:focus { border-color: #3b82f6; }
    .tb-btn { height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid #27272a; background: #181920; color: #d4d4d8; font-size: 11px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; transition: background 140ms ease, border-color 140ms ease; }
    .tb-btn:hover { background: #22232c; color: #fff; }
    .tb-btn.active { background: #2563eb; border-color: #3b82f6; color: #fff; }
    .ext-action-btn { position: relative; height: 30px; min-width: 34px; padding: 0 9px; border-radius: 8px; border: 1px solid #3f3f46; background: #1c1d26; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .ext-action-btn.open { border-color: #3b82f6; background: #1e293b; }
    .ext-icon-img { width: 16px; height: 16px; border-radius: 4px; object-fit: cover; }
    .ext-badge { position: absolute; -top: 4px; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: #2563eb; color: #fff; font-size: 10px; font-weight: 700; display: none; align-items: center; justify-content: center; border: 1px solid #09090d; }
    .viewport { position: relative; flex: 1; min-height: 0; display: flex; background: #0b0c10; }
    .main-frame { flex: 1; width: 100%; height: 100%; border: 0; background: #0f1117; }
    .side-frame { width: 320px; max-width: 45vw; height: 100%; border: 0; border-left: 1px solid #27272a; background: #101116; display: none; }
    .side-frame.open { display: block; }
    .popup-popover { position: absolute; top: 10px; right: 12px; width: 348px; max-width: calc(100% - 24px); height: 440px; max-height: calc(100% - 20px); background: #101116; border: 1px solid #3f3f46; border-radius: 12px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6); overflow: hidden; display: none; flex-direction: column; z-index: 30; animation: popIn 160ms cubic-bezier(0.16, 1, 0.3, 1); }
    .popup-popover.open { display: flex; }
    .popup-head { height: 28px; padding: 0 10px; background: #17181f; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #a1a1aa; }
    .popup-close { background: none; border: 0; color: #a1a1aa; cursor: pointer; font-size: 13px; padding: 2px 6px; }
    .popup-frame { flex: 1; width: 100%; border: 0; background: #fff; }
    .toast { position: absolute; bottom: 14px; right: 14px; max-width: 320px; background: #181922; border: 1px solid #3f3f46; border-radius: 10px; padding: 10px 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.5); z-index: 40; display: none; font-size: 12px; }
    .toast-title { font-weight: 600; color: #fafafa; margin-bottom: 2px; }
    .toast-msg { color: #a1a1aa; font-size: 11px; }
    @keyframes popIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  </style>
</head>
<body>
  <div class="browser">
    <div class="toolbar">
      <button id="reloadTabBtn" class="tb-btn" type="button" title="Reload simulated tab">Reload</button>
      <form id="urlForm" class="url-form">
        <input id="urlInput" class="url-input" type="text" value="https://example.com/workspace" spellcheck="false" />
      </form>

      <div style="display:flex;align-items:center;gap:6px;">
        <button id="surfaceTabBtn" class="tb-btn" type="button" style="display:none">Tab</button>
        <button id="surfaceSideBtn" class="tb-btn" type="button" style="display:none">Side Panel</button>
        <button id="surfaceOptBtn" class="tb-btn" type="button" style="display:none">Options</button>
        <button id="surfaceNewTabBtn" class="tb-btn" type="button" style="display:none">New Tab</button>
        <button id="extActionBtn" class="ext-action-btn" type="button" title="${extName.replace(/"/g, '&quot;')} v${extVersion}">
          ${
            extIconUrl
              ? `<img class="ext-icon-img" src="${extIconUrl}" alt="" />`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>`
          }
          <span>${extName}</span>
          <span id="extBadge" class="ext-badge"></span>
        </button>
      </div>
    </div>

    <div class="viewport">
      <iframe id="mainFrame" class="main-frame" sandbox="allow-scripts allow-forms allow-modals"></iframe>
      <iframe id="sideFrame" class="side-frame" sandbox="allow-scripts allow-forms allow-modals"></iframe>

      <div id="popupPopover" class="popup-popover">
        <div class="popup-head">
          <span>${extName} · Popup</span>
          <button id="popupCloseBtn" class="popup-close" type="button">×</button>
        </div>
        <iframe id="popupFrame" class="popup-frame" sandbox="allow-scripts allow-forms allow-modals"></iframe>
      </div>

      <div id="extToast" class="toast">
        <div id="extToastTitle" class="toast-title"></div>
        <div id="extToastMsg" class="toast-msg"></div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      var MANIFEST = ${safeJsonForHtml(manifest)};
      var POPUP_HTML = ${safeJsonForHtml(popupHtml)};
      var SIDEPANEL_HTML = ${safeJsonForHtml(sidePanelHtml)};
      var OPTIONS_HTML = ${safeJsonForHtml(optionsHtml)};
      var NEWTAB_HTML = ${safeJsonForHtml(newTabHtml)};
      var SIM_TAB_HTML = ${safeJsonForHtml(simTabHtml)};
      var BG_SCRIPTS = ${safeJsonForHtml(bgScripts)};
      var WORKSPACE_TEXT = ${safeJsonForHtml(workspaceTextMap)};
      var ASSET_MAP = ${safeJsonForHtml(extAssets)};
      var I18N_MAP = ${safeJsonForHtml(i18nMessages)};
      var MV = ${mv};

      function logHost(level, args) {
        try {
          var txt = Array.prototype.slice.call(args).map(function(a) {
            if (typeof a === 'string') return a;
            try { return JSON.stringify(a); } catch (e) { return String(a); }
          }).join(' ');
          window.parent.postMessage({ type: '__TM_RUNNER_LOG__', level: level, text: txt }, '*');
        } catch (e) {}
      }

      var storageKey = 'tm_ext_store_' + (${safeJsonForHtml(extName)}).replace(/[^a-z0-9]/gi, '_');
      var memoryStore = { local: {}, sync: {} };
      try {
        var rawSaved = window.localStorage.getItem(storageKey);
        if (rawSaved) memoryStore = Object.assign({ local: {}, sync: {} }, JSON.parse(rawSaved));
      } catch (e) {}

      function persistStore() {
        try { window.localStorage.setItem(storageKey, JSON.stringify(memoryStore)); } catch (e) {}
      }

      var activeTab = {
        id: 1,
        index: 0,
        windowId: 1,
        active: true,
        highlighted: true,
        status: 'complete',
        title: 'Sample Target Webpage',
        url: 'https://example.com/workspace'
      };

      var mainFrame = document.getElementById('mainFrame');
      var sideFrame = document.getElementById('sideFrame');
      var popupPopover = document.getElementById('popupPopover');
      var popupFrame = document.getElementById('popupFrame');
      var extActionBtn = document.getElementById('extActionBtn');
      var extBadge = document.getElementById('extBadge');
      var urlInput = document.getElementById('urlInput');

      var btnTab = document.getElementById('surfaceTabBtn');
      var btnSide = document.getElementById('surfaceSideBtn');
      var btnOpt = document.getElementById('surfaceOptBtn');
      var btnNewTab = document.getElementById('surfaceNewTabBtn');

      if (OPTIONS_HTML || NEWTAB_HTML) btnTab.style.display = 'inline-flex';
      if (SIDEPANEL_HTML) btnSide.style.display = 'inline-flex';
      if (OPTIONS_HTML) btnOpt.style.display = 'inline-flex';
      if (NEWTAB_HTML) btnNewTab.style.display = 'inline-flex';

      var mainMode = 'tab';
      function loadMainSurface(mode) {
        mainMode = mode;
        btnTab.classList.toggle('active', mode === 'tab');
        btnOpt.classList.toggle('active', mode === 'options');
        btnNewTab.classList.toggle('active', mode === 'newtab');
        if (mode === 'options' && OPTIONS_HTML) {
          mainFrame.srcdoc = OPTIONS_HTML;
        } else if (mode === 'newtab' && NEWTAB_HTML) {
          mainFrame.srcdoc = NEWTAB_HTML;
        } else {
          mainFrame.srcdoc = SIM_TAB_HTML;
        }
      }

      var popupOpen = false;
      function togglePopup(force) {
        if (!POPUP_HTML) return;
        popupOpen = typeof force === 'boolean' ? force : !popupOpen;
        popupPopover.classList.toggle('open', popupOpen);
        extActionBtn.classList.toggle('open', popupOpen);
        if (popupOpen) {
          popupFrame.srcdoc = POPUP_HTML;
        }
      }

      var sideOpen = false;
      function toggleSidePanel(force) {
        if (!SIDEPANEL_HTML) return;
        sideOpen = typeof force === 'boolean' ? force : !sideOpen;
        sideFrame.classList.toggle('open', sideOpen);
        btnSide.classList.toggle('active', sideOpen);
        if (sideOpen && !sideFrame.srcdoc) {
          sideFrame.srcdoc = SIDEPANEL_HTML;
        }
      }

      extActionBtn.addEventListener('click', function() {
        if (POPUP_HTML) togglePopup();
        else if (SIDEPANEL_HTML) toggleSidePanel();
        else if (OPTIONS_HTML) loadMainSurface('options');
      });
      document.getElementById('popupCloseBtn').addEventListener('click', function() { togglePopup(false); });
      btnTab.addEventListener('click', function() { loadMainSurface('tab'); });
      btnOpt.addEventListener('click', function() { loadMainSurface('options'); });
      btnNewTab.addEventListener('click', function() { loadMainSurface('newtab'); });
      btnSide.addEventListener('click', function() { toggleSidePanel(); });

      document.getElementById('reloadTabBtn').addEventListener('click', function() {
        loadMainSurface(mainMode);
      });
      document.getElementById('urlForm').addEventListener('submit', function(e) {
        e.preventDefault();
        activeTab.url = urlInput.value.trim() || 'https://example.com';
        loadMainSurface('tab');
      });

      function showToast(title, message) {
        var box = document.getElementById('extToast');
        document.getElementById('extToastTitle').textContent = title || MANIFEST.name || 'Notification';
        document.getElementById('extToastMsg').textContent = message || '';
        box.style.display = 'block';
        clearTimeout(window.__tmToastTimer);
        window.__tmToastTimer = setTimeout(function() { box.style.display = 'none'; }, 3200);
      }

      var pendingReplies = {};
      var pendingExecs = {};
      var replySeq = 1;
      var bgRuntimeListeners = [];
      var bgStorageListeners = [];
      var bgInstalledListeners = [];

      function getActiveTargets() {
        return [mainFrame, popupFrame, sideFrame]
          .filter(function(f) { return f && f.contentWindow; })
          .map(function(f) { return f.contentWindow; });
      }

      function broadcastStorageChange(changes, areaName) {
        bgStorageListeners.forEach(function(fn) {
          try { fn(changes, areaName); } catch (err) { logHost('error', ['[Background]', err.message || err]); }
        });
        getActiveTargets().forEach(function(win) {
          win.postMessage({ type: '__EXT_STORAGE_CHANGED__', changes: changes, areaName: areaName }, '*');
        });
      }

      function deliverMessageToFrame(win, msg, sender) {
        return new Promise(function(resolve) {
          if (!win) return resolve(undefined);
          var id = 'rep_' + (++replySeq);
          pendingReplies[id] = resolve;
          win.postMessage({ type: '__EXT_DELIVER_MSG__', replyId: id, message: msg, sender: sender || { id: 'themaster-ext' } }, '*');
          setTimeout(function() {
            if (pendingReplies[id]) {
              delete pendingReplies[id];
              resolve(undefined);
            }
          }, 2500);
        });
      }

      function handleStorageOp(op, area, arg) {
        var bucket = memoryStore[area === 'sync' ? 'sync' : 'local'] || (memoryStore.local = {});
        if (op === 'get') {
          if (arg === null || arg === undefined) return Object.assign({}, bucket);
          if (typeof arg === 'string') {
            var o1 = {};
            if (arg in bucket) o1[arg] = bucket[arg];
            return o1;
          }
          if (Array.isArray(arg)) {
            var o2 = {};
            arg.forEach(function(k) { if (k in bucket) o2[k] = bucket[k]; });
            return o2;
          }
          if (typeof arg === 'object') {
            var o3 = {};
            Object.keys(arg).forEach(function(k) { o3[k] = k in bucket ? bucket[k] : arg[k]; });
            return o3;
          }
          return {};
        }
        if (op === 'set') {
          var changes = {};
          Object.keys(arg || {}).forEach(function(k) {
            changes[k] = { oldValue: bucket[k], newValue: arg[k] };
            bucket[k] = arg[k];
          });
          persistStore();
          broadcastStorageChange(changes, area || 'local');
          return undefined;
        }
        if (op === 'remove') {
          var list = Array.isArray(arg) ? arg : [arg];
          var remChanges = {};
          list.forEach(function(k) {
            if (k in bucket) {
              remChanges[k] = { oldValue: bucket[k] };
              delete bucket[k];
            }
          });
          persistStore();
          if (Object.keys(remChanges).length) broadcastStorageChange(remChanges, area || 'local');
          return undefined;
        }
        if (op === 'clear') {
          memoryStore[area === 'sync' ? 'sync' : 'local'] = {};
          persistStore();
          return undefined;
        }
      }

      function executeRpcMethod(method, params) {
        params = params || [];
        if (method === 'storage.get') return Promise.resolve(handleStorageOp('get', params[0], params[1]));
        if (method === 'storage.set') return Promise.resolve(handleStorageOp('set', params[0], params[1]));
        if (method === 'storage.remove') return Promise.resolve(handleStorageOp('remove', params[0], params[1]));
        if (method === 'storage.clear') return Promise.resolve(handleStorageOp('clear', params[0]));

        if (method === 'action.setBadgeText') {
          var txt = (params[0] && params[0].text) || '';
          extBadge.textContent = txt;
          extBadge.style.display = txt ? 'flex' : 'none';
          return Promise.resolve();
        }
        if (method === 'action.setBadgeBackgroundColor') {
          var col = (params[0] && params[0].color) || '#2563eb';
          extBadge.style.background = Array.isArray(col) ? 'rgb(' + col.slice(0, 3).join(',') + ')' : col;
          return Promise.resolve();
        }
        if (method === 'action.setTitle') {
          if (params[0] && params[0].title) extActionBtn.title = params[0].title;
          return Promise.resolve();
        }
        if (method === 'action.setIcon') return Promise.resolve();

        if (method === 'notifications.create') {
          var opts = params[0] || {};
          showToast(opts.title || MANIFEST.name, opts.message || '');
          return Promise.resolve('notif_' + Date.now());
        }
        if (method === 'runtime.openOptionsPage') {
          if (OPTIONS_HTML) {
            togglePopup(false);
            loadMainSurface('options');
          }
          return Promise.resolve();
        }
        if (method === 'sidePanel.open') {
          toggleSidePanel(true);
          return Promise.resolve();
        }
        if (method === 'tabs.query') {
          return Promise.resolve([Object.assign({}, activeTab)]);
        }
        if (method === 'tabs.create') {
          var newUrl = (params[0] && params[0].url) || 'https://example.com';
          activeTab.url = newUrl;
          urlInput.value = newUrl;
          loadMainSurface('tab');
          return Promise.resolve(Object.assign({}, activeTab));
        }
        if (method === 'tabs.update') {
          if (params[1] && params[1].url) {
            activeTab.url = params[1].url;
            urlInput.value = params[1].url;
            loadMainSurface('tab');
          }
          return Promise.resolve(Object.assign({}, activeTab));
        }
        if (method === 'tabs.reload') {
          loadMainSurface('tab');
          return Promise.resolve();
        }
        if (method === 'tabs.sendMessage') {
          return deliverMessageToFrame(mainFrame.contentWindow, params[1], { id: 'themaster-ext', tab: activeTab });
        }
        if (method === 'runtime.sendMessage') {
          var msgPayload = params[0];
          return new Promise(function(resolve) {
            var resolved = false;
            var done = function(val) { if (!resolved) { resolved = true; resolve(val); } };
            var keepAsync = false;
            for (var i = 0; i < bgRuntimeListeners.length; i++) {
              try {
                var ret = bgRuntimeListeners[i](msgPayload, { id: 'themaster-ext' }, done);
                if (ret === true) keepAsync = true;
                else if (ret && typeof ret.then === 'function') { keepAsync = true; ret.then(done); }
              } catch (err) { logHost('error', ['[Background]', err.message || err]); }
            }
            if (!keepAsync && !resolved) {
              Promise.all(getActiveTargets().map(function(w) { return deliverMessageToFrame(w, msgPayload); })).then(function(results) {
                done(results.find(function(r) { return r !== undefined; }));
              });
            }
          });
        }
        if (method === 'scripting.executeScript') {
          var inj = params[0] || {};
          return new Promise(function(resolve) {
            if (!mainFrame || !mainFrame.contentWindow) return resolve([]);
            var execId = 'ex_' + (++replySeq);
            pendingExecs[execId] = resolve;
            if (inj.funcStr) {
              mainFrame.contentWindow.postMessage({ type: '__EXT_EXEC_FUNC__', execId: execId, funcStr: inj.funcStr, args: inj.args || [] }, '*');
            } else if (Array.isArray(inj.files) && inj.files.length > 0) {
              var combined = inj.files.map(function(f) { return WORKSPACE_TEXT[f.replace(/^\\.?\\//, '')] || ''; }).join('\\n');
              mainFrame.contentWindow.postMessage({ type: '__EXT_EXEC_CODE__', execId: execId, code: combined }, '*');
            } else {
              resolve([]);
            }
            setTimeout(function() { if (pendingExecs[execId]) { delete pendingExecs[execId]; resolve([]); } }, 2500);
          });
        }
        if (method === 'scripting.insertCSS') {
          var cssInj = params[0] || {};
          return new Promise(function(resolve) {
            if (!mainFrame || !mainFrame.contentWindow) return resolve();
            var cssText = cssInj.css || '';
            if (!cssText && Array.isArray(cssInj.files)) {
              cssText = cssInj.files.map(function(f) { return WORKSPACE_TEXT[f.replace(/^\\.?\\//, '')] || ''; }).join('\\n');
            }
            var execId = 'css_' + (++replySeq);
            pendingExecs[execId] = function() { resolve(); };
            mainFrame.contentWindow.postMessage({ type: '__EXT_INSERT_CSS__', execId: execId, css: cssText }, '*');
          });
        }
        return Promise.resolve(undefined);
      }

      window.addEventListener('message', function(ev) {
        var d = ev.data;
        if (!d || typeof d !== 'object') return;
        if (d.type === '__EXT_RELAY_LOG__') {
          logHost(d.level || 'log', [d.text || '']);
        } else if (d.type === '__EXT_DELIVER_REPLY__' && d.replyId && pendingReplies[d.replyId]) {
          var rfn = pendingReplies[d.replyId];
          delete pendingReplies[d.replyId];
          rfn(d.result);
        } else if (d.type === '__EXT_EXEC_DONE__' && d.execId && pendingExecs[d.execId]) {
          var efn = pendingExecs[d.execId];
          delete pendingExecs[d.execId];
          efn(d.result);
        } else if (d.type === '__EXT_RPC__') {
          executeRpcMethod(d.method, d.params).then(function(result) {
            if (ev.source && ev.source.postMessage) {
              ev.source.postMessage({ type: '__EXT_RPC_RES__', id: d.id, result: result }, '*');
            }
          });
        }
      });

      // Install direct chrome.* & browser.* bindings for host Background scripts
      function wrapMethod(method) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          var cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          return executeRpcMethod(method, args).then(function(res) {
            if (cb) cb(res);
            return res;
          });
        };
      }

      var hostAction = {
        setBadgeText: wrapMethod('action.setBadgeText'),
        setBadgeBackgroundColor: wrapMethod('action.setBadgeBackgroundColor'),
        setTitle: wrapMethod('action.setTitle'),
        setIcon: wrapMethod('action.setIcon')
      };

      var hostChrome = {
        runtime: {
          id: 'themaster-ext-sandbox',
          getManifest: function() { return MANIFEST; },
          getURL: function(p) { var c = String(p || '').replace(/^\\.?\\//, ''); return ASSET_MAP[c] || c; },
          sendMessage: wrapMethod('runtime.sendMessage'),
          openOptionsPage: wrapMethod('runtime.openOptionsPage'),
          onMessage: {
            addListener: function(fn) { if (typeof fn === 'function') bgRuntimeListeners.push(fn); }
          },
          onInstalled: {
            addListener: function(fn) { if (typeof fn === 'function') bgInstalledListeners.push(fn); }
          }
        },
        storage: {
          local: {
            get: function(k, cb) { return executeRpcMethod('storage.get', ['local', k === undefined ? null : k]).then(function(r) { if (cb) cb(r); return r; }); },
            set: function(v, cb) { return executeRpcMethod('storage.set', ['local', v]).then(function(r) { if (cb) cb(r); return r; }); },
            remove: function(k, cb) { return executeRpcMethod('storage.remove', ['local', k]).then(function(r) { if (cb) cb(r); return r; }); },
            clear: function(cb) { return executeRpcMethod('storage.clear', ['local']).then(function(r) { if (cb) cb(r); return r; }); }
          },
          sync: {
            get: function(k, cb) { return executeRpcMethod('storage.get', ['sync', k === undefined ? null : k]).then(function(r) { if (cb) cb(r); return r; }); },
            set: function(v, cb) { return executeRpcMethod('storage.set', ['sync', v]).then(function(r) { if (cb) cb(r); return r; }); }
          },
          onChanged: {
            addListener: function(fn) { if (typeof fn === 'function') bgStorageListeners.push(fn); }
          }
        },
        tabs: {
          query: wrapMethod('tabs.query'),
          create: wrapMethod('tabs.create'),
          update: wrapMethod('tabs.update'),
          reload: wrapMethod('tabs.reload'),
          sendMessage: wrapMethod('tabs.sendMessage')
        },
        scripting: {
          executeScript: function(inj, cb) {
            var payload = { target: inj && inj.target, args: inj && inj.args ? inj.args : [], files: inj && inj.files ? inj.files : [], funcStr: inj && typeof inj.func === 'function' ? inj.func.toString() : null };
            return executeRpcMethod('scripting.executeScript', [payload]).then(function(r) { if (cb) cb(r); return r; });
          },
          insertCSS: wrapMethod('scripting.insertCSS')
        },
        action: hostAction,
        browserAction: hostAction,
        notifications: { create: wrapMethod('notifications.create') },
        i18n: { getMessage: function(k) { return I18N_MAP[k] || k || ''; }, getUILanguage: function() { return 'vi'; } },
        sidePanel: { open: wrapMethod('sidePanel.open') }
      };

      window.chrome = hostChrome;
      window.browser = hostChrome;
      window.importScripts = function() {
        for (var i = 0; i < arguments.length; i++) {
          var p = String(arguments[i]).replace(/^\\.?\\//, '');
          var src = WORKSPACE_TEXT[p];
          if (src) {
            try { new Function('chrome', 'browser', src)(hostChrome, hostChrome); }
            catch (err) { logHost('error', ['[Background importScripts]', err.message || err]); }
          }
        }
      };

      // Boot Background scripts & trigger onInstalled
      try {
        BG_SCRIPTS.forEach(function(code) {
          var bgConsole = {
            log: function() { logHost('log', ['[Background]'].concat(Array.prototype.slice.call(arguments))); },
            warn: function() { logHost('warn', ['[Background]'].concat(Array.prototype.slice.call(arguments))); },
            error: function() { logHost('error', ['[Background]'].concat(Array.prototype.slice.call(arguments))); }
          };
          new Function('chrome', 'browser', 'console', 'importScripts', code)(hostChrome, hostChrome, bgConsole, window.importScripts);
        });
        bgInstalledListeners.forEach(function(fn) {
          try { fn({ reason: 'install' }); } catch (err) { logHost('error', ['[Background]', err.message || err]); }
        });
      } catch (err) {
        logHost('error', ['[Background boot error]', err.message || err]);
      }

      // Mount initial view
      if (${safeJsonForHtml(defaultSurface)} === 'newtab' && NEWTAB_HTML) {
        loadMainSurface('newtab');
      } else if (${safeJsonForHtml(defaultSurface)} === 'options' && OPTIONS_HTML) {
        loadMainSurface('options');
      } else {
        loadMainSurface('tab');
        if (POPUP_HTML) togglePopup(true);
        else if (SIDEPANEL_HTML) toggleSidePanel(true);
      }

      window.parent.postMessage({
        type: '__TM_RUNNER_BUILD__',
        status: 'ok',
        message: 'Extension MV' + MV + ' ready (' + Object.keys(WORKSPACE_TEXT).length + ' files)'
      }, '*');
    })();
  <` + `/script>
</body>
</html>`;

  return {
    html: simulatorHtml,
    standaloneHtml: simulatorHtml,
    mode: 'web',
    framework: `Extension (MV${mv})`,
    languages: languages.includes(`Manifest V${mv}`) ? languages : [...languages, `Manifest V${mv}`],
  };
}

export function runWorkspaceBuildCheck(
  files: WorkspaceFile[],
  workspaceName = 'project'
): WorkspaceBuildCheckResult {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    const built = buildWorkspaceProject(files, workspaceName);
    return {
      ok: false,
      framework: 'Empty',
      errors: ['Thư mục dự án đang trống (0 tệp).'],
      warnings: [],
      stats: { totalFiles: 0, codeFiles: 0, assets: 0, durationMs: 0 },
      built,
    };
  }

  const normalizedPaths = new Set<string>();
  for (const f of files) {
    const clean = f.path.replace(/^\.?\//, '');
    normalizedPaths.add(clean);
    normalizedPaths.add(clean.toLowerCase());
  }

  // 1. Validate JSON syntax across workspace
  for (const f of files) {
    if (!f.isBinary && /\.json$/i.test(f.path)) {
      try {
        JSON.parse(f.content || '');
      } catch (err: any) {
        errors.push(`${f.path}: Lỗi cú pháp JSON (${err?.message || 'Invalid JSON'})`);
      }
    }
  }

  // 2. Validate Extension manifest.json references if present
  const manifestFile = files.find(f => !f.isBinary && /(^|\/)manifest\.json$/i.test(f.path));
  if (manifestFile && manifestFile.content) {
    try {
      const mf = JSON.parse(manifestFile.content);
      const mfDir = manifestFile.path.includes('/')
        ? manifestFile.path.slice(0, manifestFile.path.lastIndexOf('/') + 1)
        : '';
      const hasExtPath = (raw?: string) => {
        if (!raw || typeof raw !== 'string') return true;
        const rel = raw.replace(/^\.?\//, '').split('?')[0];
        const withDir = (mfDir + rel).replace(/^\.?\//, '');
        return (
          normalizedPaths.has(rel) ||
          normalizedPaths.has(rel.toLowerCase()) ||
          normalizedPaths.has(withDir) ||
          normalizedPaths.has(withDir.toLowerCase()) ||
          normalizedPaths.has(withDir.replace(/\.js$/i, '.ts')) ||
          normalizedPaths.has(withDir.replace(/\.js$/i, '.tsx'))
        );
      };

      const checkRef = (refPath: string | undefined, label: string, required = true) => {
        if (!refPath) return;
        if (!hasExtPath(refPath)) {
          const msg = `${manifestFile.path}: Không tìm thấy "${refPath}" (${label})`;
          if (required) errors.push(msg);
          else warnings.push(msg);
        }
      };

      checkRef(mf.action?.default_popup || mf.browser_action?.default_popup, 'default_popup', true);
      checkRef(mf.side_panel?.default_path, 'side_panel.default_path', true);
      checkRef(mf.options_ui?.page || mf.options_page, 'options_ui', true);
      checkRef(mf.chrome_url_overrides?.newtab, 'newtab', true);
      checkRef(mf.background?.service_worker, 'background.service_worker', true);
      if (Array.isArray(mf.background?.scripts)) {
        for (const s of mf.background.scripts) checkRef(s, 'background.scripts', true);
      }
      if (Array.isArray(mf.content_scripts)) {
        for (const cs of mf.content_scripts) {
          if (Array.isArray(cs?.js)) for (const s of cs.js) checkRef(s, 'content_scripts.js', true);
          if (Array.isArray(cs?.css)) for (const c of cs.css) checkRef(c, 'content_scripts.css', false);
        }
      }
    } catch {
      // Already caught in JSON pass
    }
  }

  // 3. Validate Vue SFCs
  for (const f of files) {
    if (!f.isBinary && /\.vue$/i.test(f.path)) {
      const c = f.content || '';
      if (!/<template[\s>]/i.test(c)) {
        warnings.push(`${f.path}: Thiếu khối <template> trong Vue SFC`);
      }
    }
  }

  // 4. Validate React / TS imports for relative paths that obviously don't exist
  const codeFileList = files.filter(f => !f.isBinary && typeof f.content === 'string');
  for (const f of codeFileList) {
    if (!/\.(tsx?|jsx?|mjs)$/i.test(f.path)) continue;
    const importMatches = (f.content || '').matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g);
    for (const m of importMatches) {
      const spec = m[1];
      const baseDir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
      const stack = baseDir ? baseDir.split('/') : [];
      for (const seg of spec.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') stack.pop();
        else stack.push(seg);
      }
      const resolved = stack.join('/');
      const candidates = [
        resolved,
        resolved + '.ts',
        resolved + '.tsx',
        resolved + '.js',
        resolved + '.jsx',
        resolved + '/index.ts',
        resolved + '/index.tsx',
        resolved + '/index.js',
      ];
      if (!candidates.some(c => normalizedPaths.has(c) || normalizedPaths.has(c.toLowerCase()))) {
        warnings.push(`${f.path}: Import "${spec}" chưa tìm thấy trong thư mục`);
      }
    }
  }

  // 5. Validate Minecraft Gradle / Fabric Mod structure & Java/Kotlin brace balance
  const buildLogs: string[] = [];
  const fabricModFile = files.find(f => !f.isBinary && /(^|\/)fabric\.mod\.json$/i.test(f.path));
  const gradleFile = files.find(f => !f.isBinary && /(^|\/)build\.gradle(\.kts)?$/i.test(f.path));
  const gradlePropsFile = files.find(f => !f.isBinary && /(^|\/)gradle\.properties$/i.test(f.path));
  const jvmFiles = codeFileList.filter(f => /\.(java|kt)$/i.test(f.path));

  if (fabricModFile || gradleFile) {
    const propsText = gradlePropsFile?.content || '';
    const modVer = (propsText.match(/mod_version\s*=\s*([^\r\n]+)/i)?.[1] || '1.0.0').trim();
    const mcVer = (propsText.match(/minecraft_version\s*=\s*([^\r\n]+)/i)?.[1] || '1.21.1').trim();
    const baseName = (propsText.match(/archives_base_name\s*=\s*([^\r\n]+)/i)?.[1] || workspaceName || 'mod').trim();
    const isFabric = Boolean(fabricModFile) || /fabric-loom|net\.fabricmc/i.test(gradleFile?.content || '');

    for (const jf of jvmFiles) {
      const stripped = (jf.content || '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"(?:\\.|[^"\\])*"/g, '""');
      let depth = 0;
      for (let i = 0; i < stripped.length; i++) {
        if (stripped[i] === '{') depth++;
        else if (stripped[i] === '}') depth--;
        if (depth < 0) {
          errors.push(`${jf.path}: Thừa dấu đóng ngoặc '}'`);
          break;
        }
      }
      if (depth > 0) {
        errors.push(`${jf.path}: Thiếu ${depth} dấu đóng ngoặc '}'`);
      }
    }

    if (fabricModFile?.content) {
      try {
        const fmj = JSON.parse(fabricModFile.content);
        const epGroups = fmj.entrypoints || {};
        for (const [group, list] of Object.entries(epGroups)) {
          if (Array.isArray(list)) {
            for (const entry of list) {
              const cls = typeof entry === 'string' ? entry : (entry as any)?.value;
              if (cls && typeof cls === 'string') {
                const relJava = cls.replace(/\./g, '/') + '.java';
                const relKt = cls.replace(/\./g, '/') + '.kt';
                const found = jvmFiles.some(
                  f =>
                    f.path.replace(/\\/g, '/').endsWith(relJava) ||
                    f.path.replace(/\\/g, '/').endsWith(relKt)
                );
                if (!found) {
                  warnings.push(`${fabricModFile.path}: Entrypoint "${cls}" (${group}) chưa thấy trong src/main`);
                }
              }
            }
          }
        }
      } catch {
        // Caught in JSON pass
      }
    }

    buildLogs.push(`> Configure project : (${isFabric ? 'Fabric Loom' : 'Gradle'} · MC ${mcVer})`);
    buildLogs.push(`> Task :compileJava (${jvmFiles.length} source files)`);
    buildLogs.push(`> Task :processResources`);
    buildLogs.push(`> Task :classes`);
    buildLogs.push(`> Task :jar`);
    if (isFabric) {
      buildLogs.push(`> Task :remapJar -> build/libs/${baseName}-${modVer}.jar`);
    }
  }

  const built = buildWorkspaceProject(files, workspaceName);
  if (built.mode === 'java' || built.mode === 'cpp') {
    const targetExts = built.mode === 'java' ? /\.java$/i : /\.(cpp|cc|cxx|c|h|hpp)$/i;
    const targetFiles = codeFileList.filter(f => targetExts.test(f.path));
    for (const tf of targetFiles) {
      const stripped = (tf.content || '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"(?:\\.|[^"\\])*"/g, '""');
      let braces = 0;
      for (let i = 0; i < stripped.length; i++) {
        if (stripped[i] === '{') braces++;
        else if (stripped[i] === '}') braces--;
        if (braces < 0) {
          errors.push(`${tf.path}: Thừa dấu đóng ngoặc '}'`);
          break;
        }
      }
      if (braces > 0) errors.push(`${tf.path}: Thiếu ${braces} dấu đóng ngoặc '}'`);
    }
    buildLogs.push(
      built.mode === 'java'
        ? `$ javac ${targetFiles.map(f => f.path).join(' ')}`
        : `$ g++ -std=c++17 ${targetFiles.filter(f => !/\.(h|hpp)$/i.test(f.path)).map(f => f.path).join(' ')} -o main`
    );
  }
  if (built.mode === 'none') {
    errors.push('Không tìm thấy entry point để chạy (index.html, App.tsx, App.vue, main.py, Main.java, main.cpp, fabric.mod.json hoặc manifest.json).');
  }

  const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.max(1, Math.round(finishedAt - startedAt));
  const assets = files.filter(f => isMediaPath(f.path, f.mimeType) || isAssetPath(f.path)).length;

  if (buildLogs.length > 0) {
    buildLogs.push(
      errors.length === 0
        ? `BUILD SUCCESSFUL in ${durationMs}ms`
        : `BUILD FAILED (${errors.length} error) in ${durationMs}ms`
    );
  }

  return {
    ok: errors.length === 0 && built.mode !== 'none',
    framework: built.framework,
    errors,
    warnings,
    buildLogs: buildLogs.length > 0 ? buildLogs : undefined,
    stats: {
      totalFiles: files.length,
      codeFiles: codeFileList.length,
      assets,
      durationMs,
    },
    built,
  };
}

function buildMinecraftModWorkspace(
  files: WorkspaceFile[],
  workspaceName: string,
  assetMap: Record<string, string>,
  languages: string[]
): BuiltWorkspaceResult {
  const fabricModFile = files.find(f => !f.isBinary && /(^|\/)fabric\.mod\.json$/i.test(f.path));
  const gradleFile = files.find(f => !f.isBinary && /(^|\/)build\.gradle(\.kts)?$/i.test(f.path));
  const gradleProps = files.find(f => !f.isBinary && /(^|\/)gradle\.properties$/i.test(f.path))?.content || '';
  const jvmFiles = files.filter(f => !f.isBinary && /\.(java|kt)$/i.test(f.path));

  let fmj: Record<string, any> = {};
  if (fabricModFile?.content) {
    try {
      fmj = JSON.parse(fabricModFile.content);
    } catch {}
  }

  const isFabric =
    Boolean(fabricModFile) || /fabric-loom|net\.fabricmc/i.test(gradleFile?.content || '');
  const modId = String(fmj.id || workspaceName || 'mod').toLowerCase();
  const modName = String(fmj.name || workspaceName || 'Minecraft Mod');
  const mcVer = (gradleProps.match(/minecraft_version\s*=\s*([^\r\n]+)/i)?.[1] || fmj.depends?.minecraft || '1.21.1').trim();
  const loaderVer = (gradleProps.match(/loader_version\s*=\s*([^\r\n]+)/i)?.[1] || '0.16.5').trim();
  const rawModVer = (gradleProps.match(/mod_version\s*=\s*([^\r\n]+)/i)?.[1] || fmj.version || '1.0.0').trim();
  const modVer = rawModVer === '${version}' ? (gradleProps.match(/mod_version\s*=\s*([^\r\n]+)/i)?.[1] || '1.0.0').trim() : rawModVer;
  const archiveName = (gradleProps.match(/archives_base_name\s*=\s*([^\r\n]+)/i)?.[1] || modId).trim();

  // Resolve Fabric icon if present
  let modIconUrl = '';
  if (typeof fmj.icon === 'string') {
    const iconClean = fmj.icon.replace(/^\.?\//, '');
    const iconHit = files.find(
      f => f.dataUrl && (f.path === iconClean || f.path.endsWith('/' + iconClean) || f.name === iconClean.split('/').pop())
    );
    if (iconHit?.dataUrl) modIconUrl = iconHit.dataUrl;
    else modIconUrl = assetMap[iconClean] || '';
  }

  // Load Fabric lang files for Text.translatable(...) resolution
  const langMap: Record<string, string> = {};
  const langFiles = files.filter(f => !f.isBinary && /lang\/(vi_vn|en_us)\.json$/i.test(f.path));
  const sortedLang = [
    ...langFiles.filter(f => /en_us\.json$/i.test(f.path)),
    ...langFiles.filter(f => /vi_vn\.json$/i.test(f.path)),
  ];
  for (const lf of sortedLang) {
    try {
      const parsed = JSON.parse(lf.content || '{}');
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') langMap[k] = v;
      }
    } catch {}
  }

  const resolveTextExpr = (expr: string): string => {
    const clean = expr.trim();
    const trans = clean.match(/Text\.translatable\(\s*"([^"]+)"/);
    if (trans) return langMap[trans[1]] || trans[1];
    const lit = clean.match(/Text\.(?:literal|of)\(\s*"([^"]*)"/);
    if (lit) return lit[1];
    const quoted = clean.match(/"([^"]*)"/);
    if (quoted) return quoted[1];
    return clean.replace(/^this\./, '');
  };

  interface FabricWidgetDef {
    kind: 'button' | 'checkbox' | 'slider' | 'textfield' | 'label' | 'slotgrid';
    label: string;
    checked?: boolean;
    value?: number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }

  interface FabricScreenDef {
    className: string;
    filePath: string;
    title: string;
    isHandled: boolean;
    panelBg: string;
    widgets: FabricWidgetDef[];
  }

  const fabricScreens: FabricScreenDef[] = [];
  const braceErrors: string[] = [];

  for (const jf of jvmFiles) {
    const src = jf.content || '';
    const stripped = src
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '""');
    let depth = 0;
    for (let i = 0; i < stripped.length; i++) {
      if (stripped[i] === '{') depth++;
      else if (stripped[i] === '}') depth--;
      if (depth < 0) {
        braceErrors.push(`${jf.path}: Thừa '}'`);
        break;
      }
    }
    if (depth > 0) braceErrors.push(`${jf.path}: Thiếu ${depth} '}'`);

    if (!isFabric) continue;

    const classMatch = src.match(/class\s+([A-Za-z0-9_]+)[^{]*\b(?:extends|:)\s+([A-Za-z0-9_<>.]+)?(?:Screen|HandledScreen|CottonClientScreen)/);
    if (!classMatch && !/addDrawableChild|ButtonWidget|HandledScreen/.test(src)) continue;

    const className = classMatch?.[1] || jf.name.replace(/\.(java|kt)$/i, '');
    const isHandled = /HandledScreen/.test(src);

    let title = className;
    const superTitle = src.match(/super\(\s*(Text\.[A-Za-z]+\([^)]*\)|[A-Za-z0-9_.]+)\s*[,)]/);
    if (superTitle) title = resolveTextExpr(superTitle[1]);

    const widgets: FabricWidgetDef[] = [];

    // Parse ButtonWidget.builder(...)
    const btnBuilderRe = /ButtonWidget\.builder\(\s*(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")/g;
    for (const m of src.matchAll(btnBuilderRe)) {
      widgets.push({ kind: 'button', label: resolveTextExpr(m[1]) });
    }
    // Classic new ButtonWidget(..., Text..., ...)
    const btnNewRe = /new\s+ButtonWidget\s*\([^;]*?(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")/g;
    for (const m of src.matchAll(btnNewRe)) {
      const lbl = resolveTextExpr(m[1]);
      if (!widgets.some(w => w.kind === 'button' && w.label === lbl)) {
        widgets.push({ kind: 'button', label: lbl });
      }
    }

    // CheckboxWidget
    for (const m of src.matchAll(/CheckboxWidget\.builder\(\s*(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")([\s\S]*?)\.build\(\)/g)) {
      const checked = /\.checked\(\s*true\s*\)/.test(m[2] || '');
      widgets.push({ kind: 'checkbox', label: resolveTextExpr(m[1]), checked });
    }

    // TextFieldWidget
    for (const m of src.matchAll(/new\s+TextFieldWidget\s*\([^;]*?(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")/g)) {
      widgets.push({ kind: 'textfield', label: resolveTextExpr(m[1]) });
    }

    // SliderWidget / CyclingButtonWidget
    for (const m of src.matchAll(/new\s+SliderWidget\s*\([^;]*?(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")/g)) {
      widgets.push({ kind: 'slider', label: resolveTextExpr(m[1]), value: 50 });
    }
    for (const m of src.matchAll(/CyclingButtonWidget\.[A-Za-z]+\([^)]*(Text\.[A-Za-z]+\([^)]*\)|"[^"]*")/g)) {
      widgets.push({ kind: 'button', label: resolveTextExpr(m[1]) });
    }

    // Draw texts (not already title)
    for (const m of src.matchAll(/draw(?:Centered)?TextWithShadow\([^,]+,\s*[^,]+,\s*([^,]+),/g)) {
      const lbl = resolveTextExpr(m[1]);
      if (lbl && lbl !== 'title' && lbl !== title) {
        widgets.push({ kind: 'label', label: lbl });
      }
    }

    if (isHandled) {
      widgets.unshift({ kind: 'slotgrid', label: 'Container & Inventory Slots' });
    }

    let panelBg = 'rgba(17, 19, 25, 0.88)';
    const fillHex = src.match(/context\.fill\([^;]*,\s*0x([0-9A-Fa-f]{6,8})\s*\)/);
    if (fillHex) {
      const hex = fillHex[1];
      if (hex.length === 8) {
        const a = (parseInt(hex.slice(0, 2), 16) / 255).toFixed(2);
        const r = parseInt(hex.slice(2, 4), 16);
        const g = parseInt(hex.slice(4, 6), 16);
        const b = parseInt(hex.slice(6, 8), 16);
        panelBg = `rgba(${r}, ${g}, ${b}, ${a})`;
      } else if (hex.length === 6) {
        panelBg = `#${hex}`;
      }
    }

    fabricScreens.push({ className, filePath: jf.path, title, isHandled, panelBg, widgets });
  }

  const gradlewLines = [
    `$ ./gradlew build`,
    `> Configure project : (${isFabric ? 'fabric-loom' : 'gradle'} · MC ${mcVer}${isFabric ? ` · Fabric Loader ${loaderVer}` : ''})`,
    `> Task :compileJava (${jvmFiles.length} Java/Kotlin source files)`,
    `> Task :processResources`,
    `> Task :classes`,
    `> Task :jar`,
    ...(isFabric ? [`> Task :remapJar -> build/libs/${archiveName}-${modVer}.jar`] : [`> Task :assemble -> build/libs/${archiveName}-${modVer}.jar`]),
    ...braceErrors.map(e => `[ERROR] ${e}`),
    braceErrors.length === 0
      ? `BUILD SUCCESSFUL (${jvmFiles.length} sources verified)`
      : `BUILD FAILED (${braceErrors.length} syntax errors)`,
  ];

  const defaultTab = isFabric && fabricScreens.length > 0 ? 'gui' : 'gradle';

  const modRunnerHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${modName} — ${isFabric ? 'Fabric Mod' : 'Minecraft Mod'}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0a0b0f; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    .shell { display: flex; flex-direction: column; height: 100vh; }
    .bar { height: 46px; padding: 0 14px; background: #12131a; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .brand img { width: 20px; height: 20px; border-radius: 4px; image-rendering: pixelated; }
    .brand h1 { margin: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: 11px; color: #a1a1aa; font-family: monospace; white-space: nowrap; }
    .tabs { display: flex; align-items: center; gap: 6px; }
    .tab-btn { height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid #27272a; background: #181922; color: #d4d4d8; font-size: 11px; font-weight: 500; cursor: pointer; }
    .tab-btn.active { background: #2563eb; border-color: #3b82f6; color: #fff; font-weight: 600; }
    .main { flex: 1; min-height: 0; position: relative; overflow: auto; }
    .mc-stage { min-height: 100%; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(180deg, #101622 0%, #090b10 100%); }
    .mc-panel { width: 100%; max-width: 440px; border: 2px solid #52525b; border-radius: 4px; padding: 18px; box-shadow: 0 24px 50px rgba(0,0,0,0.65); display: flex; flex-direction: column; gap: 10px; }
    .mc-title { text-align: center; font-size: 15px; font-weight: 700; color: #ffffff; text-shadow: 1px 1px 0 #18181b; margin-bottom: 4px; }
    .mc-btn { width: 100%; min-height: 34px; padding: 6px 12px; background: #6b7280; color: #ffffff; border: 2px solid #000000; box-shadow: inset 2px 2px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.45); font-size: 12px; font-weight: 600; text-shadow: 1px 1px 0 #27272a; cursor: pointer; transition: filter 100ms ease, transform 80ms ease; }
    .mc-btn:hover { background: #4f639b; border-color: #ffffff; }
    .mc-btn:active { transform: scale(0.98); }
    .mc-input { width: 100%; height: 34px; padding: 0 10px; background: #000000; color: #e4e4e7; border: 2px solid #71717a; font-family: monospace; font-size: 12px; outline: none; }
    .mc-input:focus { border-color: #ffffff; }
    .mc-check { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e4e4e7; cursor: pointer; padding: 4px 2px; }
    .mc-check-box { width: 18px; height: 18px; background: #18181b; border: 2px solid #71717a; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; color: #4ade80; }
    .mc-slider-wrap { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #e4e4e7; }
    .mc-slider { width: 100%; accent-color: #60a5fa; cursor: pointer; }
    .mc-label { font-size: 12px; color: #d4d4d8; text-align: center; padding: 2px 0; }
    .mc-slots { background: #c6c6c6; border: 2px solid #18181b; padding: 10px; border-radius: 3px; }
    .mc-slot-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 3px; }
    .mc-slot { aspect-ratio: 1; background: #8b8b8b; border-top: 2px solid #373737; border-left: 2px solid #373737; border-right: 2px solid #ffffff; border-bottom: 2px solid #ffffff; }
    .mc-slot:hover { background: #a8a8b8; }
    .hud-toast { margin-top: 12px; font-family: monospace; font-size: 11px; color: #34d399; min-height: 16px; }
    .gradle-box { padding: 18px; font-family: monospace; font-size: 12px; line-height: 1.65; color: #e4e4e7; }
    .g-ok { color: #34d399; font-weight: 700; }
    .g-err { color: #f87171; font-weight: 700; }
    .g-cmd { color: #60a5fa; font-weight: 600; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="bar">
      <div class="brand">
        ${modIconUrl ? `<img src="${modIconUrl}" alt="" />` : ''}
        <h1>${modName}</h1>
        <span class="meta">v${modVer} · MC ${mcVer}${isFabric ? ' · Fabric' : ''}</span>
      </div>
      <div class="tabs">
        ${isFabric ? `<button id="tabGuiBtn" class="tab-btn" type="button">Fabric Screen GUI (${fabricScreens.length})</button>` : ''}
        <button id="tabGradleBtn" class="tab-btn" type="button">./gradlew build</button>
      </div>
    </div>
    <div id="stage" class="main"></div>
  </div>
  <script>
    (function() {
      var IS_FABRIC = ${isFabric ? 'true' : 'false'};
      var SCREENS = ${safeJsonForHtml(fabricScreens)};
      var GRADLE_LINES = ${safeJsonForHtml(gradlewLines)};
      var BRACE_ERRORS = ${safeJsonForHtml(braceErrors)};
      var stage = document.getElementById('stage');
      var tabGuiBtn = document.getElementById('tabGuiBtn');
      var tabGradleBtn = document.getElementById('tabGradleBtn');
      var activeScreenIdx = 0;

      function log(level, txt) {
        try { window.parent.postMessage({ type: '__TM_RUNNER_LOG__', level: level, text: txt }, '*'); } catch (e) {}
      }

      function renderGradle() {
        if (tabGuiBtn) tabGuiBtn.classList.remove('active');
        tabGradleBtn.classList.add('active');
        var box = document.createElement('div');
        box.className = 'gradle-box';
        if (!IS_FABRIC) {
          var note = document.createElement('div');
          note.style.cssText = 'margin-bottom:10px;color:#a1a1aa;font-size:11px;';
          note.textContent = 'Non-Fabric mod detected — hiển thị ./gradlew build (GUI preview chỉ bật cho Fabric mods).';
          box.appendChild(note);
        }
        GRADLE_LINES.forEach(function(line) {
          var row = document.createElement('div');
          if (line.indexOf('BUILD SUCCESSFUL') !== -1) row.className = 'g-ok';
          else if (line.indexOf('BUILD FAILED') !== -1 || line.indexOf('[ERROR]') !== -1) row.className = 'g-err';
          else if (line.indexOf('$ ') === 0) row.className = 'g-cmd';
          row.textContent = line;
          box.appendChild(row);
        });
        stage.innerHTML = '';
        stage.appendChild(box);
      }

      function renderFabricGui() {
        if (!IS_FABRIC) return renderGradle();
        if (tabGuiBtn) tabGuiBtn.classList.add('active');
        tabGradleBtn.classList.remove('active');
        stage.innerHTML = '';

        var wrap = document.createElement('div');
        wrap.className = 'mc-stage';

        if (SCREENS.length === 0) {
          var emptyPanel = document.createElement('div');
          emptyPanel.className = 'mc-panel';
          emptyPanel.style.background = 'rgba(17, 19, 25, 0.9)';
          emptyPanel.innerHTML = '<div class="mc-title">${modName}</div><div class="mc-label">Chưa thấy class extends Screen / HandledScreen trong src/main/java. Bạn có thể yêu cầu AI thêm Fabric Screen GUI vào folder.</div>';
          wrap.appendChild(emptyPanel);
          stage.appendChild(wrap);
          return;
        }

        if (SCREENS.length > 1) {
          var picker = document.createElement('div');
          picker.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;';
          SCREENS.forEach(function(sc, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'tab-btn' + (i === activeScreenIdx ? ' active' : '');
            b.textContent = sc.className;
            b.onclick = function() { activeScreenIdx = i; renderFabricGui(); };
            picker.appendChild(b);
          });
          wrap.appendChild(picker);
        }

        var scr = SCREENS[activeScreenIdx];
        var panel = document.createElement('div');
        panel.className = 'mc-panel';
        panel.style.background = scr.panelBg || 'rgba(17, 19, 25, 0.9)';

        var title = document.createElement('div');
        title.className = 'mc-title';
        title.textContent = scr.title || scr.className;
        panel.appendChild(title);

        var toast = document.createElement('div');
        toast.className = 'hud-toast';
        toast.textContent = 'Screen: ' + scr.className;

        scr.widgets.forEach(function(w) {
          if (w.kind === 'button') {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mc-btn';
            btn.textContent = w.label;
            btn.onclick = function() {
              toast.textContent = '[FabricClient] Pressed "' + w.label + '"';
              log('log', '[FabricGUI:' + scr.className + '] Button clicked -> ' + w.label);
            };
            panel.appendChild(btn);
          } else if (w.kind === 'textfield') {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'mc-input';
            inp.value = w.label || '';
            inp.oninput = function() {
              toast.textContent = '[FabricClient] TextField = "' + inp.value + '"';
            };
            panel.appendChild(inp);
          } else if (w.kind === 'checkbox') {
            var chkState = Boolean(w.checked);
            var row = document.createElement('div');
            row.className = 'mc-check';
            var box = document.createElement('span');
            box.className = 'mc-check-box';
            box.textContent = chkState ? '✓' : '';
            var lbl = document.createElement('span');
            lbl.textContent = w.label;
            row.onclick = function() {
              chkState = !chkState;
              box.textContent = chkState ? '✓' : '';
              toast.textContent = '[FabricClient] ' + w.label + ' = ' + chkState;
              log('log', '[FabricGUI:' + scr.className + '] Checkbox ' + w.label + ' -> ' + chkState);
            };
            row.appendChild(box);
            row.appendChild(lbl);
            panel.appendChild(row);
          } else if (w.kind === 'slider') {
            var sw = document.createElement('div');
            sw.className = 'mc-slider-wrap';
            var slbl = document.createElement('span');
            slbl.textContent = w.label;
            var sinput = document.createElement('input');
            sinput.type = 'range';
            sinput.min = '0';
            sinput.max = '100';
            sinput.value = String(w.value || 50);
            sinput.className = 'mc-slider';
            sinput.oninput = function() {
              toast.textContent = '[FabricClient] Slider "' + w.label + '" = ' + sinput.value + '%';
            };
            sw.appendChild(slbl);
            sw.appendChild(sinput);
            panel.appendChild(sw);
          } else if (w.kind === 'slotgrid') {
            var slots = document.createElement('div');
            slots.className = 'mc-slots';
            var grid = document.createElement('div');
            grid.className = 'mc-slot-grid';
            for (var s = 0; s < 27; s++) {
              (function(idx) {
                var cell = document.createElement('div');
                cell.className = 'mc-slot';
                cell.title = 'Slot #' + idx;
                cell.onclick = function() {
                  toast.textContent = '[HandledScreen] Clicked slot #' + idx;
                  log('log', '[FabricGUI:' + scr.className + '] Slot #' + idx);
                };
                grid.appendChild(cell);
              })(s);
            }
            slots.appendChild(grid);
            panel.appendChild(slots);
          } else if (w.kind === 'label') {
            var lb = document.createElement('div');
            lb.className = 'mc-label';
            lb.textContent = w.label;
            panel.appendChild(lb);
          }
        });

        wrap.appendChild(panel);
        wrap.appendChild(toast);
        stage.appendChild(wrap);
      }

      if (tabGuiBtn) tabGuiBtn.onclick = renderFabricGui;
      tabGradleBtn.onclick = renderGradle;

      if (${safeJsonForHtml(defaultTab)} === 'gui') renderFabricGui();
      else renderGradle();

      window.parent.postMessage({
        type: '__TM_RUNNER_BUILD__',
        status: BRACE_ERRORS.length > 0 ? 'error' : 'ok',
        message: BRACE_ERRORS.length > 0
          ? BRACE_ERRORS[0]
          : (IS_FABRIC ? 'gradlew build OK · ' + SCREENS.length + ' Fabric Screen(s)' : 'gradlew build OK')
      }, '*');
    })();
  <` + `/script>
</body>
</html>`;

  return {
    html: modRunnerHtml,
    standaloneHtml: modRunnerHtml,
    mode: 'web',
    framework: isFabric ? `Fabric Mod (${mcVer})` : `Minecraft Mod (${mcVer})`,
    languages,
  };
}

function buildGlslShaderWorkspace(
  shaderFile: WorkspaceFile,
  workspaceName: string,
  languages: string[]
): BuiltWorkspaceResult {
  const fragSource = shaderFile.content || '';
  const shaderHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${workspaceName} — GLSL Shader</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #09090b; color: #f4f4f5; font-family: system-ui, sans-serif; overflow: hidden; }
    canvas { width: 100%; height: 100%; display: block; }
    .hud { position: fixed; top: 10px; left: 10px; background: rgba(12,12,16,0.8); border: 1px solid #27272a; border-radius: 8px; padding: 6px 10px; font-family: monospace; font-size: 11px; display: flex; align-items: center; gap: 10px; }
    .hud button { background: #18181f; border: 1px solid #3f3f46; color: #e4e4e7; border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer; }
  </style>
</head>
<body>
  <canvas id="gl"></canvas>
  <div class="hud">
    <span>${shaderFile.path}</span>
    <button id="toggleBtn" type="button">Pause</button>
  </div>
  <script>
    (function() {
      var canvas = document.getElementById('gl');
      var gl = canvas.getContext('webgl');
      var fragSrc = ${safeJsonForHtml(fragSource)};
      var vertSrc = 'attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }';
      var paused = false;
      var mx = 0, my = 0;

      function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Shader compile failed');
        return s;
      }

      try {
        if (!gl) throw new Error('WebGL unavailable');
        var prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        var uRes = gl.getUniformLocation(prog, 'u_resolution');
        var uTime = gl.getUniformLocation(prog, 'u_time');
        var uMouse = gl.getUniformLocation(prog, 'u_mouse');

        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0, 0, canvas.width, canvas.height); }
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', function(e) { mx = e.clientX; my = canvas.height - e.clientY; });
        document.getElementById('toggleBtn').onclick = function() { paused = !paused; this.textContent = paused ? 'Resume' : 'Pause'; };
        resize();

        var start = performance.now();
        function frame(now) {
          if (!paused) {
            if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
            if (uTime) gl.uniform1f(uTime, (now - start) * 0.001);
            if (uMouse) gl.uniform2f(uMouse, mx || canvas.width * 0.5, my || canvas.height * 0.5);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'ok', message: 'GLSL Shader compiled' }, '*');
      } catch (err) {
        window.parent.postMessage({ type: '__TM_RUNNER_LOG__', level: 'error', text: err.message || String(err) }, '*');
        window.parent.postMessage({ type: '__TM_RUNNER_BUILD__', status: 'error', message: err.message || String(err) }, '*');
      }
    })();
  <` + `/script>
</body>
</html>`;

  return { html: shaderHtml, standaloneHtml: shaderHtml, mode: 'web', framework: 'GLSL WebGL', languages };
}

function buildBrainfuckWorkspace(
  bfFile: WorkspaceFile,
  workspaceName: string,
  languages: string[]
): BuiltWorkspaceResult {
  const code = bfFile.content || '';
  const bfHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${workspaceName} — Brainfuck VM</title>
<style>*{box-sizing:border-box}body{margin:0;background:#09090b;color:#f4f4f5;font-family:monospace;padding:20px}button{padding:7px 12px;border-radius:8px;border:1px solid #3b82f6;background:#2563eb;color:#fff;font-size:12px;cursor:pointer}pre{background:#121318;border:1px solid #27272a;border-radius:10px;padding:14px;white-space:pre-wrap;margin-top:12px}</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center"><strong>${bfFile.path}</strong><button id="runBtn" type="button">Run VM</button></div>
  <pre id="out"></pre>
  <script>
    (function(){
      var CODE=${safeJsonForHtml(code)};
      function exec(){
        var tape=new Uint8Array(30000), ptr=0, pc=0, steps=0, out='', stack=[], jumps={};
        for(var i=0;i<CODE.length;i++){if(CODE[i]==='[')stack.push(i);else if(CODE[i]===']'&&stack.length){var s=stack.pop();jumps[s]=i;jumps[i]=s;}}
        while(pc<CODE.length&&steps<2000000){
          var ch=CODE[pc];
          if(ch==='>')ptr=(ptr+1)%30000;
          else if(ch==='<')ptr=(ptr+29999)%30000;
          else if(ch==='+')tape[ptr]++;
          else if(ch==='-')tape[ptr]--;
          else if(ch==='.')out+=String.fromCharCode(tape[ptr]);
          else if(ch==='['&&tape[ptr]===0)pc=jumps[pc]||pc;
          else if(ch===']'&&tape[ptr]!==0)pc=jumps[pc]||pc;
          pc++; steps++;
        }
        document.getElementById('out').textContent='Output:\\n'+out+'\\n\\nTape[0..15]: ['+Array.from(tape.slice(0,16)).join(', ')+']';
        window.parent.postMessage({type:'__TM_RUNNER_BUILD__',status:'ok',message:'Brainfuck VM ('+steps+' steps)'},'*');
      }
      document.getElementById('runBtn').onclick=exec;
      exec();
    })();
  <` + `/script>
</body></html>`;

  return { html: bfHtml, standaloneHtml: bfHtml, mode: 'web', framework: 'Brainfuck VM', languages };
}

function buildMarkdownDocsWorkspace(
  mdFiles: WorkspaceFile[],
  workspaceName: string,
  assetMap: Record<string, string>,
  languages: string[]
): BuiltWorkspaceResult {
  const entries = mdFiles.map(f => ({
    path: f.path,
    content: replaceAssetReferences(f.content || '', assetMap),
  }));
  const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${workspaceName} — Docs</title>
<style>*{box-sizing:border-box}body{margin:0;display:flex;height:100vh;background:#0a0b0f;color:#e4e4e7;font-family:system-ui,sans-serif}aside{width:220px;border-right:1px solid #27272a;padding:10px;overflow-y:auto}button{width:100%;text-align:left;padding:7px 10px;border:0;background:transparent;color:#d4d4d8;border-radius:8px;font-size:12px;cursor:pointer}button.active{background:#2563eb;color:#fff}main{flex:1;padding:24px;overflow-y:auto;line-height:1.6}img{max-width:100%;border-radius:8px}pre{background:#121318;padding:12px;border-radius:8px;overflow:auto}</style></head>
<body><aside id="nav"></aside><main id="view"></main>
<script>
  var DOCS=${safeJsonForHtml(entries)};
  var nav=document.getElementById('nav'), view=document.getElementById('view');
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
  function renderMd(txt){return txt.split(/\\r?\\n/).map(function(l){if(/^### /.test(l))return '<h3>'+esc(l.slice(4))+'</h3>';if(/^## /.test(l))return '<h2>'+esc(l.slice(3))+'</h2>';if(/^# /.test(l))return '<h1>'+esc(l.slice(2))+'</h1>';return '<p>'+esc(l)+'</p>';}).join('');}
  function sel(i){Array.from(nav.children).forEach(function(b,idx){b.classList.toggle('active',idx===i);});view.innerHTML=renderMd(DOCS[i].content);}
  DOCS.forEach(function(d,i){var b=document.createElement('button');b.textContent=d.path;b.onclick=function(){sel(i);};nav.appendChild(b);});
  if(DOCS.length)sel(0);
  window.parent.postMessage({type:'__TM_RUNNER_BUILD__',status:'ok',message:'Markdown docs ('+DOCS.length+' files)'},'*');
<` + `/script></body></html>`;

  return { html: docsHtml, standaloneHtml: docsHtml, mode: 'web', framework: 'Markdown Docs', languages };
}



