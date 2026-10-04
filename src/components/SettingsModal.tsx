import React from 'react';
import { CameraView, GameSettings } from '../types/game';
import { soundManager } from '../utils/audio';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Camera, 
  Keyboard, 
  Smartphone,
  Check
} from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <h2 className="font-racing font-bold text-xl text-white tracking-wider">
            GAME SETTINGS & CONTROLS
          </h2>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5 text-sm">
          {/* Audio Controls */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Audio & Acoustics
            </span>
            <div className="flex items-center justify-between p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                <span className="text-neutral-200 font-medium">Engine & Sound FX</span>
              </div>
              <button
                onClick={() => {
                  const nextState = !settings.soundEnabled;
                  onUpdateSettings({ soundEnabled: nextState });
                  soundManager.setMuted(!nextState);
                  soundManager.playClick();
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.soundEnabled ? 'bg-cyan-500 justify-end' : 'bg-neutral-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>

          {/* Speed Unit */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Speedometer Units
            </span>
            <div className="grid grid-cols-2 gap-2 bg-neutral-950/60 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onUpdateSettings({ speedUnit: 'KMH' });
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  settings.speedUnit === 'KMH'
                    ? 'bg-neutral-800 text-cyan-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Metric (KM/H)
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  onUpdateSettings({ speedUnit: 'MPH' });
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  settings.speedUnit === 'MPH'
                    ? 'bg-neutral-800 text-cyan-400 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Imperial (MPH)
              </button>
            </div>
          </div>

          {/* Camera View */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Default Camera View
            </span>
            <div className="grid grid-cols-3 gap-2 bg-neutral-950/60 p-1 rounded-xl border border-neutral-800">
              {(['CHASE', 'CLOSE', 'HOOD'] as CameraView[]).map(cam => (
                <button
                  key={cam}
                  onClick={() => {
                    soundManager.playClick();
                    onUpdateSettings({ cameraView: cam });
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    settings.cameraView === cam
                      ? 'bg-neutral-800 text-cyan-400 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {cam}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard & Controls Reference */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" /> Keyboard Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Accelerate:</span>
                <span className="font-racing font-bold text-white">W / Up Arrow</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Brake / Rev:</span>
                <span className="font-racing font-bold text-white">S / Down Arrow</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Steer:</span>
                <span className="font-racing font-bold text-white">A / D or Left / Right</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Handbrake Drift:</span>
                <span className="font-racing font-bold text-amber-400">Spacebar</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Nitro Boost:</span>
                <span className="font-racing font-bold text-cyan-400">Shift</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">Toggle Camera:</span>
                <span className="font-racing font-bold text-white">C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="w-full mt-2 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
