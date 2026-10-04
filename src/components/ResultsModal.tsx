import React from 'react';
import { soundManager } from '../utils/audio';
import { 
  Trophy, 
  Timer, 
  Coins, 
  Disc, 
  RotateCcw, 
  ArrowRight, 
  Home, 
  Medal,
  Award
} from 'lucide-react';

interface ResultsModalProps {
  placement: number;
  totalTime: number;
  bestLapTime: number;
  driftScore: number;
  creditsWon: number;
  trackName: string;
  isAlphabetMode?: boolean;
  onRematch: () => void;
  onNextTrack: () => void;
  onReturnGarage: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  placement,
  totalTime,
  bestLapTime,
  driftScore,
  creditsWon,
  trackName,
  isAlphabetMode,
  onRematch,
  onNextTrack,
  onReturnGarage,
}) => {
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const isPodium = placement <= 3;
  const isWinner = placement === 1;

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow ambient background based on placement */}
        <div 
          className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isWinner ? 'bg-amber-400' : isPodium ? 'bg-cyan-400' : 'bg-neutral-600'
          }`}
        />

        {/* Podium Icon Badge */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shadow-xl ${
          isWinner 
            ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 shadow-amber-500/30' 
            : placement === 2 
            ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-neutral-950 shadow-slate-300/30'
            : placement === 3
            ? 'bg-gradient-to-tr from-amber-700 to-amber-500 text-white shadow-amber-700/30'
            : 'bg-neutral-800 text-neutral-400'
        }`}>
          {isWinner ? <Trophy className="w-10 h-10" /> : <Medal className="w-10 h-10" />}
        </div>

        {/* Title */}
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          {trackName} {isAlphabetMode ? '· A-Z CHALLENGE' : ''}
        </span>
        <h2 className="font-racing font-bold text-3xl md:text-4xl text-white tracking-wide mt-1">
          {isAlphabetMode ? 'ALPHABET MASTER!' : (isWinner ? 'VICTORY!' : isPodium ? 'PODIUM FINISH' : 'RACE COMPLETE')}
        </h2>
        <div className="mt-1 flex items-baseline gap-1">
          {isAlphabetMode ? (
            <span className="text-sm text-amber-300 font-semibold">
              All 26 Letters A through Z Smashed In Perfect Sequence!
            </span>
          ) : (
            <>
              <span className="text-sm text-neutral-400 font-medium">Finished in</span>
              <span className="font-racing font-bold text-2xl text-cyan-400 tabular-nums">
                {placement}{placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th'} Place
              </span>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full my-6">
          {/* Total Time */}
          <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-2xl flex flex-col items-center">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              <Timer className="w-3.5 h-3.5 text-neutral-500" /> TOTAL TIME
            </span>
            <span className="font-racing font-bold text-xl text-white tabular-nums">
              {formatTime(totalTime)}
            </span>
          </div>

          {/* Best Lap */}
          <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-2xl flex flex-col items-center">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" /> BEST LAP
            </span>
            <span className="font-racing font-bold text-xl text-emerald-400 tabular-nums">
              {formatTime(bestLapTime)}
            </span>
          </div>

          {/* Drift Points */}
          <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-2xl flex flex-col items-center">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              <Disc className="w-3.5 h-3.5 text-amber-400" /> DRIFT SCORE
            </span>
            <span className="font-racing font-bold text-xl text-amber-400 tabular-nums">
              {driftScore.toLocaleString()}
            </span>
          </div>

          {/* Credits Won */}
          <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-2xl flex flex-col items-center">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> PRIZE WON
            </span>
            <span className="font-racing font-bold text-xl text-yellow-400 tabular-nums">
              +${creditsWon.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => {
              soundManager.playClick();
              onNextTrack();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-neutral-950 font-racing font-bold text-base rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-98"
          >
            NEXT RACE
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              onClick={() => {
                soundManager.playClick();
                onRematch();
              }}
              className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Rematch
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                onReturnGarage();
              }}
              className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Home className="w-4 h-4" />
              Garage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
