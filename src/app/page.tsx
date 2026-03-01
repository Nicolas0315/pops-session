'use client';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import type { Tab } from '@/types';
import { Layers, Waves, Piano } from 'lucide-react';

// Dynamic imports to avoid SSR issues with Web Audio API
const DAW = dynamic(() => import('@/components/daw/DAW'), { ssr: false, loading: () => <LoadingScreen /> });
const SampleBrowser = dynamic(() => import('@/components/sampler/SampleBrowser'), { ssr: false, loading: () => <LoadingScreen /> });
const Synthesizer = dynamic(() => import('@/components/synth/Synthesizer'), { ssr: false, loading: () => <LoadingScreen /> });

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-2xl">🎵</span>
        </div>
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; sublabel: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'daw',
    label: 'DAW',
    sublabel: 'マルチトラック',
    icon: <Layers size={16} />,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'sampler',
    label: 'サンプラー',
    sublabel: 'ブラウザ',
    icon: <Waves size={16} />,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'synth',
    label: 'シンセ',
    sublabel: 'オシレーター',
    icon: <Piano size={16} />,
    color: 'from-pink-500 to-rose-600',
  },
];

export default function Home() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex bg-gray-900 border-b border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-violet-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-violet-400' : 'text-gray-500'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span className="text-xs text-gray-500 hidden sm:inline">({tab.sublabel})</span>
          </button>
        ))}

        {/* Branding */}
        <div className="ml-auto flex items-center gap-2 px-4">
          <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-pink-500 rounded-md flex items-center justify-center">
            <span className="text-xs">🎵</span>
          </div>
          <span className="text-gray-400 text-xs font-semibold tracking-wide hidden md:inline">
            Pops Session
          </span>
        </div>
      </div>

      {/* Main content - split view for DAW + Sampler */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'daw' && (
          <div className="flex h-full">
            {/* Sample browser sidebar */}
            <div className="w-56 flex-shrink-0 border-r border-gray-700">
              <Suspense fallback={<LoadingScreen />}>
                <SampleBrowser />
              </Suspense>
            </div>
            {/* DAW main area */}
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<LoadingScreen />}>
                <DAW />
              </Suspense>
            </div>
          </div>
        )}
        {activeTab === 'sampler' && (
          <div className="h-full max-w-2xl mx-auto">
            <Suspense fallback={<LoadingScreen />}>
              <SampleBrowser />
            </Suspense>
          </div>
        )}
        {activeTab === 'synth' && (
          <div className="h-full overflow-auto">
            <Suspense fallback={<LoadingScreen />}>
              <Synthesizer />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
