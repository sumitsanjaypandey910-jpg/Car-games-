import React, { useState } from 'react';
import { GameMode, TrackDef } from '../types/game';
import { soundManager } from '../utils/audio';
import { 
  ChevronLeft, 
  Flag, 
  MapPin, 
  Timer, 
  Gauge, 
  Trophy, 
  Zap, 
  Flame,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface TrackSelectViewProps {
  tracks: TrackDef[];
  selectedTrackId: string;
  gameMode: GameMode;
  userCredits: number;
  trackRecords: Record<string, { bestLapTime: number; wins: number }>;
  onSelectTrack: (trackId: string) => void;
  onChangeMode: (mode: GameMode) => void;
  onLaunchRace: () => void;
  onBackToMenu: () => void;
}

export const TrackSelectView: React.FC<TrackSelectViewProps> = ({
  tracks,
  selectedTrackId,
  gameMode,
  userCredits,
  trackRecords,
  onSelectTrack,
  onChangeMode,
  onLaunchRace,
  onBackToMenu,
}) => {
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  const formatLapTime = (sec: number) => {
    if (!sec || !isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const record = trackRecords[selectedTrack.id];

  return (
    <div className="relative w-full h-full flex flex-col bg-neutral-950 text-white overflow-hidden select-none">
      {/* Background with Track Skybox */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-40 blur-xs"
        style={{ backgroundImage: `url(${selectedTrack.skybox})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/90" />

      {/* Header Contract */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onBackToMenu();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Showroom
          </button>
          <h1 className="font-racing font-bold text-xl tracking-wider text-white">
            CIRCUIT SELECTION & EVENT MODE
          </h1>
        </div>

        {/* Game Mode Selector Segmented Tabs */}
        <div className="flex items-center bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => {
              soundManager.playClick();
              onChangeMode('GRAND_PRIX');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              gameMode === 'GRAND_PRIX'
                ? 'bg-cyan-500 text-neutral-950 shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Grand Prix
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onChangeMode('ALPHABET_CHASE');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              gameMode === 'ALPHABET_CHASE'
                ? 'bg-amber-400 text-neutral-950 shadow-md font-bold'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            A-Z Alphabet Smash
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onChangeMode('TIME_ATTACK');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              gameMode === 'TIME_ATTACK'
                ? 'bg-cyan-500 text-neutral-950 shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            Time Attack
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onChangeMode('HIGHWAY_RUSH');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              gameMode === 'HIGHWAY_RUSH'
                ? 'bg-cyan-500 text-neutral-950 shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Speed Rush
          </button>
        </div>
      </header>

      {/* Main Track Showcase Grid */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-6 overflow-y-auto">
        {/* Track Cards Carousel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl w-full mx-auto my-auto">
          {tracks.map((t, idx) => {
            const isSelected = t.id === selectedTrack.id;
            const rec = trackRecords[t.id];

            return (
              <div
                key={t.id}
                onClick={() => {
                  soundManager.playClick();
                  onSelectTrack(t.id);
                }}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-cyan-400 bg-neutral-900/90 shadow-2xl shadow-cyan-500/10 scale-102 ring-2 ring-cyan-400/20'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900/80'
                }`}
              >
                {/* Track Preview Image Header */}
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={t.skybox}
                    alt={t.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/30" />

                  {/* Difficulty Tag */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-racing font-bold px-2.5 py-1 rounded-md tracking-wider ${
                      t.difficulty === 'EASY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : t.difficulty === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {t.difficulty}
                    </span>
                  </div>

                  {/* Location kicker */}
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-xs text-neutral-300">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.location}</span>
                  </div>
                </div>

                {/* Track Details */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-racing font-bold text-xl text-white tracking-wide group-hover:text-cyan-400 transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {t.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{t.laps} Laps</span>
                      <span>·</span>
                      <span>{(t.lengthMeters / 1000).toFixed(1)} km</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 font-racing font-semibold">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{formatLapTime(rec?.bestLapTime || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action Bar */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between bg-neutral-900/90 border border-neutral-800 px-6 py-4 rounded-2xl backdrop-blur-md shadow-2xl mt-4">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-400 font-medium">READY TO RACE</span>
            <div className="flex items-center gap-2">
              <span className="font-racing font-bold text-lg text-white">
                {selectedTrack.name}
              </span>
              <span className="text-xs text-cyan-400 font-semibold">
                [{gameMode.replace('_', ' ')}]
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onLaunchRace();
            }}
            className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-neutral-950 font-racing font-bold text-lg rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 active:scale-98"
          >
            START RACE
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
