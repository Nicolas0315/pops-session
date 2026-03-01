'use client';
import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import type { Tab } from '@/types';
import { Layers, Waves, Music2, Zap } from 'lucide-react';

const DAW          = dynamic(() => import('@/components/daw/DAW'),                 { ssr: false, loading: () => <LoadingScreen label="DAW を起動中..." /> });
const SampleBrowser = dynamic(() => import('@/components/sampler/SampleBrowser'),  { ssr: false, loading: () => <LoadingScreen label="サンプラー読込中..." /> });
const Synthesizer   = dynamic(() => import('@/components/synth/Synthesizer'),      { ssr: false, loading: () => <LoadingScreen label="シンセ初期化中..." /> });

function LoadingScreen({ label = '読み込み中...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <Music2 className="text-white" size={28} />
        </div>
        <p className="text-gray-400 text-sm tracking-wide">{label}</p>
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; sublabel: string; icon: React.ReactNode; activeColor: string }[] = [
  { id: 'daw',     label: 'DAW',       sublabel: 'マルチトラック', icon: <Layers size={15} />, activeColor: 'text-violet-400 border-violet-500' },
  { id: 'sampler', label: 'サンプラー', sublabel: 'ブラウザ',       icon: <Waves size={15} />,  activeColor: 'text-cyan-400 border-cyan-500' },
  { id: 'synth',   label: 'シンセ',     sublabel: 'オシレーター',   icon: <Zap size={15} />,    activeColor: 'text-pink-400 border-pink-500' },
];

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) return <SplashScreen onEnter={() => setSplashDone(true)} />;

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Tab bar — Studio One-style dark header */}
      <nav className="flex-shrink-0 flex items-stretch bg-[#12161f] border-b border-gray-800 h-11">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? `${tab.activeColor} bg-gray-800/40`
                : 'border-transparent text-gray-500 hover:text-gray-200 hover:bg-gray-800/20'
            }`}
          >
            <span className={activeTab === tab.id ? tab.activeColor.split(' ')[0] : 'text-gray-600'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span className="text-[11px] text-gray-600 hidden sm:inline">— {tab.sublabel}</span>
          </button>
        ))}

        {/* Branding — right side */}
        <div className="ml-auto flex items-center gap-2 px-4 border-l border-gray-800">
          <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-pink-500 rounded-md flex items-center justify-center">
            <Music2 size={11} className="text-white" />
          </div>
          <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase hidden md:inline">
            Pops Session
          </span>
        </div>
      </nav>

      {/* Main area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'daw' && (
          <div className="flex h-full">
            {/* Sidebar sample browser */}
            <aside className="w-52 flex-shrink-0 border-r border-gray-800 bg-[#12161f]">
              <Suspense fallback={<LoadingScreen label="サンプル読込中..." />}>
                <SampleBrowser />
              </Suspense>
            </aside>
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<LoadingScreen label="DAW 起動中..." />}>
                <DAW />
              </Suspense>
            </main>
          </div>
        )}

        {activeTab === 'sampler' && (
          <div className="h-full max-w-3xl mx-auto">
            <Suspense fallback={<LoadingScreen label="サンプラー読込中..." />}>
              <SampleBrowser fullView />
            </Suspense>
          </div>
        )}

        {activeTab === 'synth' && (
          <div className="h-full overflow-auto">
            <Suspense fallback={<LoadingScreen label="シンセ初期化中..." />}>
              <Synthesizer />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Splash Screen                                            */
/* ───────────────────────────────────────────────────────── */
function SplashScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f1117] relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10  rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6 max-w-xl">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <Music2 size={48} className="text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-br from-violet-600 to-pink-600 rounded-3xl opacity-15 blur-md" />
        </div>

        <div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">Pops Session</h1>
          <p className="text-lg text-gray-400 font-light">ブラウザで動く本格的な Web DAW</p>
          <p className="text-sm text-gray-600 mt-1">Studio One 7 · Mai Tai · Mojito 参照</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { icon: '🎛️', label: 'マルチトラック DAW' },
            { icon: '🎹', label: 'Mai Tai シンセ' },
            { icon: '🥁', label: '808 / Acoustic Drums' },
            { icon: '🎼', label: 'ピアノロール' },
            { icon: '📼', label: 'Lo-Fi / Pad プリセット' },
            { icon: '🔊', label: 'Filter ENV スイープ' },
          ].map(f => (
            <span key={f.label}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/80 border border-gray-800 rounded-full text-sm text-gray-300">
              <span>{f.icon}</span>{f.label}
            </span>
          ))}
        </div>

        <button
          onClick={onEnter}
          className="group relative px-10 py-4 bg-gradient-to-r from-violet-600 to-pink-600
            text-white font-bold text-lg rounded-2xl shadow-lg
            hover:shadow-violet-500/30 hover:shadow-xl
            transition-all duration-200 hover:scale-105 active:scale-100"
        >
          🎵 スタジオに入る
        </button>

        <p className="text-xs text-gray-700">
          Web Audio API powered · Runs entirely in your browser · No login required
        </p>
      </div>
    </div>
  );
}
