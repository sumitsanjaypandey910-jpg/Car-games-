import React, { useState, useEffect } from 'react';
import { 
  CameraView, 
  CarModel, 
  CarUpgrades, 
  GameMode, 
  GameSettings, 
  PlayerProfile, 
  ScreenState, 
  TrackDef 
} from './types/game';
import { INITIAL_CARS, TRACK_LIST } from './utils/trackData';
import { soundManager } from './utils/audio';
import { RacingCanvas } from './components/RacingCanvas';
import { GarageView } from './components/GarageView';
import { TrackSelectView } from './components/TrackSelectView';
import { ResultsModal } from './components/ResultsModal';
import { SettingsModal } from './components/SettingsModal';

import titleBg from './assets/images/skybox_night_city_racing_1791130772486.jpg';

import { 
  Trophy, 
  Gauge, 
  Zap, 
  Flame, 
  Settings as SettingsIcon, 
  Coins, 
  Play, 
  Wrench, 
  Flag,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Disc,
  Maximize,
  Minimize
} from 'lucide-react';

const STORAGE_KEY = 'apex_velocity_profile_v1';

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Cars & Tracks
  const [cars, setCars] = useState<CarModel[]>(INITIAL_CARS);
  const [selectedCarId, setSelectedCarId] = useState<string>(INITIAL_CARS[0].id);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(TRACK_LIST[0].id);
  const [gameMode, setGameMode] = useState<GameMode>('ALPHABET_CHASE');

  // Player Profile State (Persisted)
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
      credits: 18000,
      cars: {
        viper_gt: { unlocked: true, color: '#ef4444', upgrades: { engine: 0, handling: 0, nitro: 0 } },
        kurogane_r34: { unlocked: false, color: '#06b6d4', upgrades: { engine: 0, handling: 0, nitro: 0 } },
        thunder_v8: { unlocked: false, color: '#f59e0b', upgrades: { engine: 0, handling: 0, nitro: 0 } },
        apex_hyperion: { unlocked: false, color: '#8b5cf6', upgrades: { engine: 0, handling: 0, nitro: 0 } },
      },
      selectedCarId: 'viper_gt',
      trackRecords: {},
    };
  });

  // Settings State
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    soundVolume: 0.8,
    speedUnit: 'KMH',
    cameraView: 'CHASE',
    touchControls: true,
  });

  // Race Results Modal
  const [raceResults, setRaceResults] = useState<{
    placement: number;
    totalTime: number;
    bestLapTime: number;
    driftScore: number;
    creditsWon: number;
  } | null>(null);

  // Sync profile to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  // Sync cars with profile
  useEffect(() => {
    setCars(prevCars =>
      prevCars.map(c => {
        const pCar = profile.cars[c.id];
        if (pCar) {
          return {
            ...c,
            unlocked: pCar.unlocked,
            color: pCar.color,
          };
        }
        return c;
      })
    );
  }, [profile]);

  const activeCar = cars.find(c => c.id === selectedCarId) || cars[0];
  const activeTrack = TRACK_LIST.find(t => t.id === selectedTrackId) || TRACK_LIST[0];

  // Upgrades for cars
  const carUpgradesMap: Record<string, CarUpgrades> = {};
  Object.keys(profile.cars).forEach(cid => {
    carUpgradesMap[cid] = profile.cars[cid].upgrades;
  });

  // Handlers
  const handleSelectCar = (carId: string) => {
    setSelectedCarId(carId);
    setProfile(prev => ({ ...prev, selectedCarId: carId }));
  };

  const handleUnlockCar = (carId: string) => {
    const target = cars.find(c => c.id === carId);
    if (!target || profile.credits < target.price) return;

    setProfile(prev => ({
      ...prev,
      credits: prev.credits - target.price,
      cars: {
        ...prev.cars,
        [carId]: {
          ...(prev.cars[carId] || { color: target.color, upgrades: { engine: 0, handling: 0, nitro: 0 } }),
          unlocked: true,
        },
      },
    }));
  };

  const handleUpgradeCar = (carId: string, part: keyof CarUpgrades) => {
    const cost = 4500;
    if (profile.credits < cost) return;

    setProfile(prev => {
      const existing = prev.cars[carId] || { unlocked: true, color: '#ef4444', upgrades: { engine: 0, handling: 0, nitro: 0 } };
      const currentLevel = existing.upgrades[part] || 0;
      if (currentLevel >= 3) return prev;

      return {
        ...prev,
        credits: prev.credits - cost,
        cars: {
          ...prev.cars,
          [carId]: {
            ...existing,
            upgrades: {
              ...existing.upgrades,
              [part]: currentLevel + 1,
            },
          },
        },
      };
    });
  };

  const handleChangeCarColor = (carId: string, hexColor: string) => {
    setProfile(prev => ({
      ...prev,
      cars: {
        ...prev.cars,
        [carId]: {
          ...(prev.cars[carId] || { unlocked: true, upgrades: { engine: 0, handling: 0, nitro: 0 } }),
          color: hexColor,
        },
      },
    }));
  };

  const handleFinishRace = (results: {
    placement: number;
    totalTime: number;
    bestLapTime: number;
    driftScore: number;
    creditsWon: number;
  }) => {
    setRaceResults(results);

    // Update track records & credits
    setProfile(prev => {
      const prevTrackRec = prev.trackRecords[activeTrack.id] || { bestLapTime: Infinity, wins: 0 };
      const newBestLap = Math.min(prevTrackRec.bestLapTime, results.bestLapTime);
      const isWin = results.placement === 1;

      return {
        ...prev,
        credits: prev.credits + results.creditsWon,
        trackRecords: {
          ...prev.trackRecords,
          [activeTrack.id]: {
            bestLapTime: newBestLap,
            wins: prevTrackRec.wins + (isWin ? 1 : 0),
          },
        },
      };
    });
  };

  const handleRematch = () => {
    setRaceResults(null);
    setScreen('RACING');
  };

  const handleNextTrack = () => {
    setRaceResults(null);
    const currIdx = TRACK_LIST.findIndex(t => t.id === selectedTrackId);
    const nextIdx = (currIdx + 1) % TRACK_LIST.length;
    setSelectedTrackId(TRACK_LIST[nextIdx].id);
    setScreen('RACING');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* ---------------- TOP BAR CONTRACT ---------------- */}
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md z-40">
        {/* Zone 1: Single text element Brand mark */}
        <button 
          onClick={() => {
            soundManager.playClick();
            setScreen('TITLE');
          }}
          className="font-racing font-bold text-xl tracking-wider text-white hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-2"
        >
          <Gauge className="w-5 h-5 text-cyan-400" />
          <span>APEX VELOCITY</span>
        </button>

        {/* Zone 2: Clean nav text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <button
            onClick={() => {
              soundManager.playClick();
              setScreen('GARAGE');
            }}
            className={`hover:text-white transition-colors cursor-pointer ${screen === 'GARAGE' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Showroom
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setGameMode('ALPHABET_CHASE');
              setScreen('TRACK_SELECT');
            }}
            className={`hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 ${screen === 'TRACK_SELECT' && gameMode === 'ALPHABET_CHASE' ? 'text-amber-400 font-bold' : 'text-amber-400/90'}`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Alphabet Smash
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setGameMode('GRAND_PRIX');
              setScreen('TRACK_SELECT');
            }}
            className={`hover:text-white transition-colors cursor-pointer ${screen === 'TRACK_SELECT' && gameMode === 'GRAND_PRIX' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Grand Prix
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setGameMode('TIME_ATTACK');
              setScreen('TRACK_SELECT');
            }}
            className={`hover:text-white transition-colors cursor-pointer ${screen === 'TRACK_SELECT' && gameMode === 'TIME_ATTACK' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Time Attack
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setGameMode('HIGHWAY_RUSH');
              setScreen('TRACK_SELECT');
            }}
            className={`hover:text-white transition-colors cursor-pointer ${screen === 'TRACK_SELECT' && gameMode === 'HIGHWAY_RUSH' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Highway Rush
          </button>
        </nav>

        {/* Zone 3: Credits, Fullscreen and Settings Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-racing font-bold text-amber-400 text-sm tabular-nums">
              ${profile.credits.toLocaleString()}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-400" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setShowSettings(true);
            }}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Settings & Controls"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ---------------- MAIN SCREEN VIEWPORT ---------------- */}
      <main className="flex-1 relative overflow-hidden">
        {screen === 'TITLE' && (
          <div 
            className="relative w-full h-full flex flex-col justify-between p-6 md:p-12 bg-cover bg-center overflow-y-auto"
            style={{ 
              backgroundImage: `linear-gradient(to top, rgba(10, 10, 10, 0.95), rgba(10, 10, 10, 0.5)), url(${titleBg})` 
            }}
          >
            {/* Hero Brand Centerpiece */}
            <div className="max-w-3xl my-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                HIGH-OCTANE 3D ARCADE MOTORSPORT
              </div>

              <h1 className="font-racing font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight text-white leading-none">
                FEEL THE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  REDLINE SPEED.
                </span>
              </h1>

              <p className="text-neutral-300 text-base md:text-lg max-w-xl mt-4 leading-relaxed">
                Take the wheel of customized sports cars. Crash into floating letters from <strong className="text-amber-300">A to Z in alphabetical order</strong> to unlock the track, or conquer the Grand Prix championship circuits.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                {/* NEW ALPHABET SMASH MODE CTA */}
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setGameMode('ALPHABET_CHASE');
                    setScreen('TRACK_SELECT');
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-neutral-950 font-racing font-bold text-lg rounded-2xl transition-all shadow-xl shadow-amber-500/25 flex items-center gap-3 cursor-pointer active:scale-95 ring-2 ring-amber-400/40 animate-pulse"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  PLAY A-Z ALPHABET SMASH
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setGameMode('GRAND_PRIX');
                    setScreen('TRACK_SELECT');
                  }}
                  className="px-7 py-4 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-neutral-950 font-racing font-bold text-lg rounded-2xl transition-all shadow-xl shadow-cyan-500/20 flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  GRAND PRIX
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setScreen('GARAGE');
                  }}
                  className="px-7 py-4 bg-neutral-900/90 hover:bg-neutral-800 text-white font-racing font-semibold text-lg border border-neutral-700 rounded-2xl transition-all flex items-center gap-2.5 backdrop-blur-md cursor-pointer active:scale-95"
                >
                  <Wrench className="w-5 h-5 text-amber-400" />
                  GARAGE & TUNING
                </button>
              </div>

              {/* Active Vehicle Snippet */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-neutral-800/80 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Selected Car:</span>
                  <span className="text-white font-semibold">{activeCar.name}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Top Speed:</span>
                  <span className="font-racing font-bold text-cyan-400">{activeCar.baseStats.topSpeed} KM/H</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Handling:</span>
                  <span className="font-racing font-bold text-emerald-400">{activeCar.baseStats.handling}/100</span>
                </div>
              </div>
            </div>

            {/* Quick Controls Cheatsheet Footer */}
            <div className="max-w-4xl w-full bg-neutral-950/70 border border-neutral-800/80 p-4 rounded-2xl backdrop-blur-md flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-3">
              <span className="font-semibold text-neutral-300">Quick Controls:</span>
              <div className="flex items-center gap-4">
                <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 font-mono">W / ↑</kbd> Gas</span>
                <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 font-mono">S / ↓</kbd> Brake</span>
                <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-200 font-mono">A / D</kbd> Steer</span>
                <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-amber-400 font-mono">Space</kbd> Drift</span>
                <span><kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-cyan-400 font-mono">Shift</kbd> Nitro</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'GARAGE' && (
          <GarageView
            cars={cars}
            selectedCarId={selectedCarId}
            userCredits={profile.credits}
            carUpgrades={carUpgradesMap}
            onSelectCar={handleSelectCar}
            onUnlockCar={handleUnlockCar}
            onUpgradeCar={handleUpgradeCar}
            onChangeColor={handleChangeCarColor}
            onStartRace={() => setScreen('TRACK_SELECT')}
            onBackToMenu={() => setScreen('TITLE')}
          />
        )}

        {screen === 'TRACK_SELECT' && (
          <TrackSelectView
            tracks={TRACK_LIST}
            selectedTrackId={selectedTrackId}
            gameMode={gameMode}
            userCredits={profile.credits}
            trackRecords={profile.trackRecords}
            onSelectTrack={setSelectedTrackId}
            onChangeMode={setGameMode}
            onLaunchRace={() => setScreen('RACING')}
            onBackToMenu={() => setScreen('GARAGE')}
          />
        )}

        {screen === 'RACING' && (
          <RacingCanvas
            car={activeCar}
            track={activeTrack}
            gameMode={gameMode}
            settings={settings}
            onFinishRace={handleFinishRace}
            onExitRace={() => setScreen('TRACK_SELECT')}
          />
        )}
      </main>

      {/* ---------------- POST-RACE RESULTS MODAL ---------------- */}
      {raceResults && (
        <ResultsModal
          placement={raceResults.placement}
          totalTime={raceResults.totalTime}
          bestLapTime={raceResults.bestLapTime}
          driftScore={raceResults.driftScore}
          creditsWon={raceResults.creditsWon}
          trackName={activeTrack.name}
          isAlphabetMode={gameMode === 'ALPHABET_CHASE'}
          onRematch={handleRematch}
          onNextTrack={handleNextTrack}
          onReturnGarage={() => {
            setRaceResults(null);
            setScreen('GARAGE');
          }}
        />
      )}

      {/* ---------------- SETTINGS MODAL ---------------- */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
