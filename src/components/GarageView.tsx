import React, { useRef, useEffect } from 'react';
import { CarModel, CarUpgrades } from '../types/game';
import { AVAILABLE_PAINTS } from '../utils/trackData';
import { drawCar } from '../utils/carDraw';
import { soundManager } from '../utils/audio';
import garageBg from '../assets/images/bg_automotive_garage_1791130810357.jpg';
import { 
  Gauge, 
  Zap, 
  Disc, 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Wrench, 
  Check, 
  Lock,
  ArrowRight
} from 'lucide-react';

interface GarageViewProps {
  cars: CarModel[];
  selectedCarId: string;
  userCredits: number;
  carUpgrades: Record<string, CarUpgrades>;
  onSelectCar: (carId: string) => void;
  onUnlockCar: (carId: string) => void;
  onUpgradeCar: (carId: string, part: keyof CarUpgrades) => void;
  onChangeColor: (carId: string, hexColor: string) => void;
  onStartRace: () => void;
  onBackToMenu: () => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  cars,
  selectedCarId,
  userCredits,
  carUpgrades,
  onSelectCar,
  onUnlockCar,
  onUpgradeCar,
  onChangeColor,
  onStartRace,
  onBackToMenu,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedCar = cars.find(c => c.id === selectedCarId) || cars[0];
  const currentIndex = cars.findIndex(c => c.id === selectedCarId);
  const upgrades = carUpgrades[selectedCar.id] || { engine: 0, handling: 0, nitro: 0 };

  // Calculate stats including upgrades
  const currentTopSpeed = selectedCar.baseStats.topSpeed + upgrades.engine * 6;
  const currentAccel = selectedCar.baseStats.acceleration + upgrades.engine * 4;
  const currentHandling = selectedCar.baseStats.handling + upgrades.handling * 5;
  const currentNitro = selectedCar.baseStats.nitroBoost + upgrades.nitro * 6;

  // Render car vector preview on showroom floor
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Showroom floor reflection & lighting circle
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.72;

      ctx.save();
      const floorGrad = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, 240);
      floorGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      floorGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.4)');
      floorGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 220, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Subtle float vibration
      const bounce = Math.sin(time) * 1.5;

      drawCar({
        ctx,
        x: centerX,
        y: centerY,
        scale: 1.85,
        color: selectedCar.color,
        modelType: selectedCar.modelType,
        steerAngle: Math.sin(time * 0.5) * 0.25,
        isBraking: false,
        isBoosting: false,
        isDrifting: false,
        bounceY: bounce,
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedCar]);

  const handlePrevCar = () => {
    soundManager.playClick();
    const prevIdx = (currentIndex - 1 + cars.length) % cars.length;
    onSelectCar(cars[prevIdx].id);
  };

  const handleNextCar = () => {
    soundManager.playClick();
    const nextIdx = (currentIndex + 1) % cars.length;
    onSelectCar(cars[nextIdx].id);
  };

  const upgradeCost = 4500;

  return (
    <div 
      className="relative w-full h-full flex flex-col bg-neutral-950 text-white overflow-hidden bg-cover bg-center select-none"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.85), rgba(10, 10, 10, 0.95)), url(${garageBg})` }}
    >
      {/* Top Header: Navigation & Credits */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onBackToMenu();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Title
          </button>
          <h1 className="font-racing font-bold text-xl tracking-wider text-white">
            VEHICLE SHOWROOM & TUNING
          </h1>
        </div>

        {/* User Credits Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-neutral-400 font-medium">CREDITS:</span>
          <span className="font-racing font-bold text-amber-400 text-lg tabular-nums">
            ${userCredits.toLocaleString()}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between p-6 gap-6 overflow-y-auto">
        {/* Left Side: Vehicle Presentation Stage */}
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          {/* Car Switching Arrows */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
            <button
              onClick={handlePrevCar}
              className="p-3 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-2xl border border-neutral-700 pointer-events-auto backdrop-blur-md active:scale-95 transition-all shadow-xl"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextCar}
              className="p-3 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-2xl border border-neutral-700 pointer-events-auto backdrop-blur-md active:scale-95 transition-all shadow-xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Interactive Turntable Canvas */}
          <canvas
            ref={previewCanvasRef}
            width={640}
            height={400}
            className="w-full max-w-xl aspect-[16/10] object-contain"
          />

          {/* Car Name & Category */}
          <div className="flex flex-col items-center mt-2 text-center">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              {selectedCar.category}
            </span>
            <h2 className="font-racing font-bold text-3xl md:text-4xl text-white tracking-wide mt-0.5">
              {selectedCar.name}
            </h2>
            <p className="text-xs text-neutral-400 max-w-md mt-1">
              {selectedCar.tagline}
            </p>
          </div>

          {/* Color Customization Swatches */}
          <div className="flex items-center gap-2.5 mt-5 bg-neutral-900/70 border border-neutral-800 p-2 rounded-xl backdrop-blur-md">
            <span className="text-xs font-medium text-neutral-400 mr-1">Paint:</span>
            {AVAILABLE_PAINTS.map(p => (
              <button
                key={p.hex}
                onClick={() => {
                  soundManager.playClick();
                  onChangeColor(selectedCar.id, p.hex);
                }}
                className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                  selectedCar.color.toLowerCase() === p.hex.toLowerCase() 
                    ? 'border-white scale-110 shadow-lg' 
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: p.hex }}
                title={p.name}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Specifications & Performance Upgrades */}
        <div className="w-full lg:w-96 flex flex-col bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl backdrop-blur-md shadow-2xl">
          <h3 className="font-racing font-bold text-lg text-white mb-4 flex items-center justify-between">
            <span>PERFORMANCE SPECS</span>
            {!selectedCar.unlocked && (
              <span className="text-xs text-amber-400 font-sans font-medium flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Locked
              </span>
            )}
          </h3>

          {/* Stats Progress Bars */}
          <div className="space-y-3.5">
            {/* Top Speed */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Top Speed
                </span>
                <span className="font-racing font-bold text-white tabular-nums">
                  {currentTopSpeed} KM/H
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentTopSpeed / 300) * 100)}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Acceleration
                </span>
                <span className="font-racing font-bold text-white tabular-nums">
                  {currentAccel}/100
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${currentAccel}%` }}
                />
              </div>
            </div>

            {/* Handling */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-emerald-400" /> Handling & Drift
                </span>
                <span className="font-racing font-bold text-white tabular-nums">
                  {currentHandling}/100
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${currentHandling}%` }}
                />
              </div>
            </div>

            {/* Nitro Boost */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" /> Nitro Power
                </span>
                <span className="font-racing font-bold text-white tabular-nums">
                  {currentNitro}/100
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${currentNitro}%` }}
                />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-neutral-800 my-4" />

          {/* Tuning Workshop (Upgrades) */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-1">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" /> TUNING UPGRADES
            </h4>

            {/* Engine Tuning */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Stage {upgrades.engine}/3 ECU Tuning</span>
                <span className="text-[11px] text-neutral-400">+Top Speed & Accel</span>
              </div>
              {upgrades.engine >= 3 ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> MAX
                </span>
              ) : (
                <button
                  disabled={!selectedCar.unlocked || userCredits < upgradeCost}
                  onClick={() => {
                    soundManager.playClick();
                    onUpgradeCar(selectedCar.id, 'engine');
                  }}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                >
                  ${upgradeCost.toLocaleString()}
                </button>
              )}
            </div>

            {/* Tires & Suspension */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Stage {upgrades.handling}/3 Sport Suspension</span>
                <span className="text-[11px] text-neutral-400">+Cornering & Grip</span>
              </div>
              {upgrades.handling >= 3 ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> MAX
                </span>
              ) : (
                <button
                  disabled={!selectedCar.unlocked || userCredits < upgradeCost}
                  onClick={() => {
                    soundManager.playClick();
                    onUpgradeCar(selectedCar.id, 'handling');
                  }}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                >
                  ${upgradeCost.toLocaleString()}
                </button>
              )}
            </div>

            {/* Nitro Injection */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Stage {upgrades.nitro}/3 High-Flow Nitro</span>
                <span className="text-[11px] text-neutral-400">+Boost Duration & Power</span>
              </div>
              {upgrades.nitro >= 3 ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> MAX
                </span>
              ) : (
                <button
                  disabled={!selectedCar.unlocked || userCredits < upgradeCost}
                  onClick={() => {
                    soundManager.playClick();
                    onUpgradeCar(selectedCar.id, 'nitro');
                  }}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                >
                  ${upgradeCost.toLocaleString()}
                </button>
              )}
            </div>
          </div>

          {/* Primary Action Button (Select or Unlock) */}
          <div className="mt-5">
            {selectedCar.unlocked ? (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onStartRace();
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-neutral-950 font-racing font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
              >
                SELECT & PROCEED TO TRACK
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled={userCredits < selectedCar.price}
                onClick={() => {
                  soundManager.playClick();
                  onUnlockCar(selectedCar.id);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-racing font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Coins className="w-5 h-5" />
                UNLOCK FOR ${selectedCar.price.toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
