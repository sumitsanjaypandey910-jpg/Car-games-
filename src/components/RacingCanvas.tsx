import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlphabetTarget, CameraView, CarModel, GameMode, GameSettings, RivalCar, TrackDef } from '../types/game';
import { drawCar } from '../utils/carDraw';
import { 
  buildTrackSegments, 
  findSegment, 
  renderRoad, 
  ROAD_WIDTH, 
  SEGMENT_LENGTH, 
  Segment 
} from '../utils/roadEngine';
import { soundManager } from '../utils/audio';
import { RIVAL_NAMES } from '../utils/trackData';
import { 
  Trophy, 
  Flag, 
  Timer, 
  Gauge, 
  Flame, 
  Zap, 
  Camera, 
  Pause, 
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  Disc,
  Maximize,
  Minimize,
  Sparkles,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface RacingCanvasProps {
  car: CarModel;
  track: TrackDef;
  gameMode: GameMode;
  settings: GameSettings;
  onFinishRace: (results: {
    placement: number;
    totalTime: number;
    bestLapTime: number;
    driftScore: number;
    creditsWon: number;
  }) => void;
  onExitRace: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

const ALPHABET_LIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const RacingCanvas: React.FC<RacingCanvasProps> = ({
  car,
  track,
  gameMode,
  settings,
  onFinishRace,
  onExitRace,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Road & AI track state
  const segmentsRef = useRef<Segment[]>([]);
  const rivalsRef = useRef<RivalCar[]>([]);
  const skyboxImgRef = useRef<HTMLImageElement | null>(null);
  const alphabetTargetsRef = useRef<AlphabetTarget[]>([]);

  // Alphabet state
  const [currentAlphabetIndex, setCurrentAlphabetIndex] = useState(0);
  const [alphabetBanner, setAlphabetBanner] = useState<{
    text: string;
    subtext: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Player physics state
  const playerState = useRef({
    x: 0,                   // Lateral offset (-1 to 1 is road)
    z: 0,                   // Distance along circuit
    speed: 0,               // Current speed in world units
    rpm: 0.1,               // 0 to 1
    gear: 1,
    steerAngle: 0,
    isBraking: false,
    isAccelerating: false,
    isSteeringLeft: false,
    isSteeringRight: false,
    isHandbraking: false,
    isBoosting: false,
    nitroFuel: 100,
    driftScore: 0,
    currentDriftPoints: 0,
    isDrifting: false,
    driftDirection: 0,
    draftPct: 0,
    isDrafting: false,
    lap: 1,
    lapStartTime: 0,
    lapTimes: [] as number[],
    bestLapTime: Infinity,
    raceStartTime: 0,
    countdown: 3,           // 3, 2, 1, 0 = GO
    countdownTimer: 0,
    raceFinished: false,
    finishTimer: 0,
    targetLetterIndex: 0,
  });

  // Camera settings
  const [currentCamera, setCurrentCamera] = useState<CameraView>(settings.cameraView);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(!settings.soundEnabled);

  // HUD display states (throttled for React UI updates)
  const [hudData, setHudData] = useState({
    speedKmh: 0,
    gear: 1,
    rpm: 0.1,
    nitro: 100,
    lap: 1,
    totalLaps: track.laps,
    currentLapTime: '00:00.00',
    bestLapTime: '--:--',
    position: 1,
    driftDisplay: 0,
    countdown: 3,
    isDrafting: false,
    offRoad: false,
    alphabetCollectedCount: 0,
    targetLetter: 'A',
    nextDistanceMeters: 0,
  });

  // Touch controls state
  const touchInputs = useRef({
    left: false,
    right: false,
    gas: false,
    brake: false,
    drift: false,
    nitro: false,
  });

  // Particles
  const particlesRef = useRef<Particle[]>([]);

  // Toggle Fullscreen Handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Initialize track segments, rivals, skybox, and alphabets
  useEffect(() => {
    // 1. Build track
    const segments = buildTrackSegments(track);

    // 2. Setup Alphabet Chase Mode Targets
    if (gameMode === 'ALPHABET_CHASE') {
      const targets: AlphabetTarget[] = [];
      const totalSegs = track.totalSegments;
      // Start near the beginning of track so letter A is immediately visible on the road
      const startSeg = 20;
      const endSeg = totalSegs - 60;
      const step = (endSeg - startSeg) / 26;

      ALPHABET_LIST.forEach((letter, idx) => {
        const segIdx = Math.floor(startSeg + idx * step);
        // Vary lanes so car steers to crash into each letter
        const lanes = [-0.5, 0.5, -0.25, 0.25, 0, -0.6, 0.6];
        const laneX = lanes[idx % lanes.length];
        const worldZ = segIdx * SEGMENT_LENGTH;

        const target: AlphabetTarget = {
          letter,
          index: idx,
          z: worldZ,
          x: laneX,
          collected: false,
          color: idx % 2 === 0 ? '#06b6d4' : '#f59e0b',
        };

        targets.push(target);
        // Attach to approach segments so the letter markings are boldly painted on the road
        [-2, -1, 0].forEach(offset => {
          const s = segIdx + offset;
          if (segments[s]) {
            segments[s].alphabets.push(target);
          }
        });
      });

      alphabetTargetsRef.current = targets;
      setCurrentAlphabetIndex(0);
      playerState.current.targetLetterIndex = 0;

      setAlphabetBanner({
        text: 'ALPHABET SMASH MODE ACTIVE',
        subtext: 'Crash into letters from A to Z in alphabetical order to advance!',
        type: 'info',
      });
      setTimeout(() => setAlphabetBanner(null), 4500);
    } else {
      alphabetTargetsRef.current = [];
    }

    segmentsRef.current = segments;

    // 3. Preload skybox image
    const img = new Image();
    img.src = track.skybox;
    skyboxImgRef.current = img;

    // 4. Setup rivals grid (Only in GP or Rush modes)
    const rivals: RivalCar[] = [];
    const rivalCount = gameMode === 'ALPHABET_CHASE' ? 4 : (gameMode === 'TIME_ATTACK' ? 0 : 7);
    const rivalTypes: ('supercar' | 'tuner' | 'muscle' | 'hypercar')[] = ['tuner', 'muscle', 'supercar', 'hypercar', 'tuner', 'muscle', 'supercar'];
    const rivalColors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#eab308', '#64748b'];

    for (let i = 0; i < rivalCount; i++) {
      const gridZ = (i + 1) * 350 + 200;
      const gridLane = (i % 2 === 0 ? -0.45 : 0.45) + (Math.random() * 0.2 - 0.1);
      rivals.push({
        id: `rival_${i}`,
        name: RIVAL_NAMES[i % RIVAL_NAMES.length],
        modelType: rivalTypes[i % rivalTypes.length],
        color: rivalColors[i % rivalColors.length],
        z: gridZ,
        x: gridLane,
        speed: 155 + Math.random() * 35,
        maxSpeed: 210 + Math.random() * 30,
        accel: 50 + Math.random() * 25,
        rank: i + 1,
        steerTargetX: gridLane,
      });
    }
    rivalsRef.current = rivals;

    // 5. Reset player state
    playerState.current.x = 0;
    playerState.current.z = 0;
    playerState.current.speed = 0;
    playerState.current.rpm = 0.1;
    playerState.current.gear = 1;
    playerState.current.lap = 1;
    playerState.current.lapStartTime = 0;
    playerState.current.lapTimes = [];
    playerState.current.bestLapTime = Infinity;
    playerState.current.driftScore = 0;
    playerState.current.nitroFuel = 100;
    playerState.current.countdown = 3;
    playerState.current.countdownTimer = 0;
    playerState.current.raceFinished = false;
    playerState.current.targetLetterIndex = 0;

    // Start engine audio
    soundManager.setMuted(isMuted);
    soundManager.startEngine();

    return () => {
      soundManager.stopEngine();
    };
  }, [track, isMuted, gameMode]);

  // Handle Keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') playerState.current.isAccelerating = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') playerState.current.isBraking = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') playerState.current.isSteeringLeft = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') playerState.current.isSteeringRight = true;
      if (e.code === 'Space') {
        playerState.current.isHandbraking = true;
        e.preventDefault();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') playerState.current.isBoosting = true;
      if (e.code === 'KeyC') {
        setCurrentCamera(prev => (prev === 'CHASE' ? 'CLOSE' : prev === 'CLOSE' ? 'HOOD' : 'CHASE'));
      }
      if (e.code === 'KeyF') {
        toggleFullscreen();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setIsPaused(p => !p);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') playerState.current.isAccelerating = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        playerState.current.isBraking = false;
        soundManager.playTurboBlowoff();
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') playerState.current.isSteeringLeft = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') playerState.current.isSteeringRight = false;
      if (e.code === 'Space') playerState.current.isHandbraking = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        playerState.current.isBoosting = false;
        soundManager.playTurboBlowoff();
      }
    };

    const handleGlobalRelease = () => {
      touchInputs.current.gas = false;
      touchInputs.current.brake = false;
      touchInputs.current.left = false;
      touchInputs.current.right = false;
      touchInputs.current.drift = false;
      touchInputs.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
    };
  }, [toggleFullscreen]);

  // Format time as mm:ss.ms
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let hudTimer = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle responsive dynamic canvas sizing
    const updateCanvasDimensions = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(960, Math.floor(rect.width || window.innerWidth));
      const targetH = Math.max(540, Math.floor(rect.height || window.innerHeight));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (!isPaused && segmentsRef.current.length > 0) {
        updatePhysics(dt, currentTime);
      }

      renderScene(ctx);

      // Throttle HUD state updates to ~15hz for smooth UI
      hudTimer += dt;
      if (hudTimer >= 0.065) {
        hudTimer = 0;
        const p = playerState.current;
        const now = currentTime / 1000;
        const currentLapSeconds = p.lapStartTime > 0 ? now - p.lapStartTime : 0;
        const speedKmh = Math.round(p.speed * 1.15);

        // Distance to next alphabet target
        let nextDistanceMeters = 0;
        if (gameMode === 'ALPHABET_CHASE' && p.targetLetterIndex < 26) {
          const nextTarget = alphabetTargetsRef.current[p.targetLetterIndex];
          if (nextTarget) {
            nextDistanceMeters = Math.max(0, Math.round((nextTarget.z - p.z) / 10));
          }
        }

        setHudData({
          speedKmh,
          gear: p.gear,
          rpm: p.rpm,
          nitro: Math.round(p.nitroFuel),
          lap: p.lap,
          totalLaps: track.laps,
          currentLapTime: formatTime(currentLapSeconds),
          bestLapTime: p.bestLapTime < Infinity ? formatTime(p.bestLapTime) : '--:--',
          position: calculatePlayerRank(),
          driftDisplay: p.driftScore,
          countdown: p.countdown,
          isDrafting: p.isDrafting,
          offRoad: Math.abs(p.x) > 1.05,
          alphabetCollectedCount: p.targetLetterIndex,
          targetLetter: p.targetLetterIndex < 26 ? ALPHABET_LIST[p.targetLetterIndex] : 'Z',
          nextDistanceMeters,
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [track, car, isPaused, currentCamera, gameMode]);

  // Rank calculation based on total progress
  const calculatePlayerRank = useCallback(() => {
    const p = playerState.current;
    const trackLength = segmentsRef.current.length * SEGMENT_LENGTH;
    const playerProgress = (p.lap - 1) * trackLength + (p.z % trackLength);

    let rank = 1;
    for (const rival of rivalsRef.current) {
      const rivalProgress = rival.z;
      if (rivalProgress > playerProgress) {
        rank++;
      }
    }
    return Math.min(8, rank);
  }, []);

  // Update physics, rivals, and collision checks
  const updatePhysics = (dt: number, currentTime: number) => {
    const p = playerState.current;
    const trackLength = segmentsRef.current.length * SEGMENT_LENGTH;
    const trackSegments = segmentsRef.current;

    // 1. Countdown handling
    if (p.countdown > 0) {
      p.countdownTimer += dt;
      if (p.countdownTimer >= 1.0) {
        p.countdownTimer = 0;
        p.countdown--;
        soundManager.playCountdownBeep(p.countdown === 0);
        if (p.countdown === 0) {
          p.raceStartTime = currentTime / 1000;
          p.lapStartTime = currentTime / 1000;
        }
      }
      const isThrottle = p.isAccelerating || touchInputs.current.gas;
      p.rpm = isThrottle ? Math.min(0.95, p.rpm + dt * 2.5) : Math.max(0.12, p.rpm - dt * 2.0);
      soundManager.updateEngine(p.rpm, 0, false);
      return;
    }

    // 2. Input consolidation
    const accelerating = p.isAccelerating || touchInputs.current.gas;
    const braking = p.isBraking || touchInputs.current.brake;
    const steerLeft = p.isSteeringLeft || touchInputs.current.left;
    const steerRight = p.isSteeringRight || touchInputs.current.right;
    const handbraking = p.isHandbraking || touchInputs.current.drift;
    const nitroActive = (p.isBoosting || touchInputs.current.nitro) && p.nitroFuel > 0 && accelerating;

    // 3. Top speed and Acceleration Tuning
    const baseTopSpeed = car.baseStats.topSpeed;
    const accelRate = 45 + (car.baseStats.acceleration / 100) * 45;
    const handlingRate = 1.8 + (car.baseStats.handling / 100) * 1.4;

    let targetMaxSpeed = baseTopSpeed;
    if (nitroActive) targetMaxSpeed += 55;
    if (p.isDrafting) targetMaxSpeed += 25;

    // Off-road penalty
    const isOffRoad = Math.abs(p.x) > 1.05;
    if (isOffRoad) {
      targetMaxSpeed = Math.min(targetMaxSpeed, 75);
    }

    // Nitro Fuel consumption and replenishment
    if (nitroActive) {
      p.nitroFuel = Math.max(0, p.nitroFuel - dt * 28);
      soundManager.updateNitroSound(true);
      spawnNitroParticles();
    } else {
      soundManager.updateNitroSound(false);
      if (p.speed > 120 && p.nitroFuel < 100) {
        p.nitroFuel = Math.min(100, p.nitroFuel + dt * 4);
      }
    }

    // Speed acceleration / deceleration
    if (accelerating) {
      if (p.speed < targetMaxSpeed) {
        p.speed += accelRate * dt * (nitroActive ? 1.6 : 1.0);
      } else {
        p.speed -= 25 * dt;
      }
    } else if (braking) {
      // Active footbrake
      p.speed = Math.max(0, p.speed - 160 * dt);
    } else {
      // Finger removed from accelerator -> Stop slowly and smoothly
      // Progressive engine braking and rolling resistance
      const naturalDecel = 35 + p.speed * 0.22;
      p.speed = Math.max(0, p.speed - naturalDecel * dt);

      // Smooth threshold to complete stop at 0 km/h
      if (p.speed < 4.0) {
        p.speed = 0;
      }
    }

    // Gear & RPM calculations
    const speedRatio = Math.max(0, p.speed / baseTopSpeed);
    const calculatedGear = Math.min(6, Math.max(1, Math.ceil(speedRatio * 6)));
    p.gear = calculatedGear;
    const gearBaseSpeed = (calculatedGear - 1) / 6;
    const gearTopSpeed = calculatedGear / 6;
    const rawRpm = (speedRatio - gearBaseSpeed) / (gearTopSpeed - gearBaseSpeed || 1);

    // When stopped or coasting without throttle, RPM idles smoothly
    if (!accelerating) {
      p.rpm = Math.max(0.12, Math.min(p.rpm, speedRatio * 0.6 + 0.12));
    } else {
      p.rpm = Math.min(0.98, Math.max(0.15, rawRpm));
    }

    soundManager.updateEngine(p.rpm, speedRatio, nitroActive);

    // 4. Steering & Lateral Movement
    let steerDir = 0;
    if (steerLeft) steerDir -= 1;
    if (steerRight) steerDir += 1;
    p.steerAngle = steerDir;

    if (p.speed > 0) {
      const speedSteerFactor = (p.speed / targetMaxSpeed);
      p.x += steerDir * handlingRate * dt * speedSteerFactor * (handbraking ? 1.4 : 1.0);
    }

    // Centrifugal curve force
    const currentSegment = findSegment(trackSegments, p.z);
    p.x -= (p.speed / targetMaxSpeed) * currentSegment.curve * dt * 0.9;

    // 5. Drifting Mechanics
    const isDriftIntent = (handbraking || (braking && Math.abs(steerDir) > 0)) && p.speed > 90;
    if (isDriftIntent) {
      p.isDrifting = true;
      p.driftDirection = steerDir !== 0 ? steerDir : p.driftDirection;
      p.currentDriftPoints += Math.round(p.speed * dt * 5);
      soundManager.updateDriftScreech(0.8);
      spawnDriftTireSmoke();
    } else {
      if (p.isDrifting) {
        p.driftScore += p.currentDriftPoints;
        p.currentDriftPoints = 0;
      }
      p.isDrifting = false;
      soundManager.updateDriftScreech(0);
    }

    // 6. Forward movement & Lap counter
    const prevZ = p.z;
    p.z += p.speed * 10 * dt;

    // ---------------- ALPHABET CHASE CRASH MECHANIC ----------------
    if (gameMode === 'ALPHABET_CHASE') {
      const targets = alphabetTargetsRef.current;
      const currentTargetIdx = p.targetLetterIndex;

      for (const target of targets) {
        if (target.collected) continue;

        // Check if car intersects with this letter obstacle
        const dz = Math.abs(p.z - target.z);
        const dx = Math.abs(p.x - target.x);

        if (dz < 130 && dx < 0.48) {
          if (target.index === currentTargetIdx) {
            // *** CRASHED INTO THE CORRECT ALPHABET IN ORDER! ***
            target.collected = true;
            p.targetLetterIndex++;
            setCurrentAlphabetIndex(p.targetLetterIndex);

            soundManager.playLetterSmash(target.index);
            spawnAlphabetSmashParticles(target.x, target.color);

            // Explosive speed boost & nitro refill
            p.speed = Math.min(car.baseStats.topSpeed + 40, p.speed + 35);
            p.nitroFuel = Math.min(100, p.nitroFuel + 35);
            p.driftScore += 2000;

            const nextIndex = p.targetLetterIndex;
            if (nextIndex < 26) {
              const nextLetter = ALPHABET_LIST[nextIndex];
              setAlphabetBanner({
                text: `CRASHED [ ${target.letter} ]! NEXT TARGET: [ ${nextLetter} ]`,
                subtext: `Alphabet Progress: ${nextIndex}/26 · Speed Surge Activated!`,
                type: 'success',
              });
            } else {
              // ALL 26 ALPHABETS SMASHED IN ORDER! VICTORY!
              soundManager.playLapFanfare();
              p.raceFinished = true;
              const totalRaceTime = (currentTime / 1000) - p.raceStartTime;
              onFinishRace({
                placement: 1,
                totalTime: totalRaceTime,
                bestLapTime: totalRaceTime,
                driftScore: p.driftScore + 10000,
                creditsWon: 35000,
              });
              return;
            }
          } else if (target.index > currentTargetIdx) {
            // *** CRASHED INTO OUT-OF-ORDER LETTER: BARRIER DEFLECTION! ***
            soundManager.playLetterReject();
            spawnCollisionSparks((p.x + target.x) / 2);

            // Bounced back - need to crash in alphabetical order
            p.speed = Math.max(40, p.speed * 0.72);
            p.x += (p.x < target.x ? -0.25 : 0.25);

            const neededLetter = ALPHABET_LIST[currentTargetIdx];
            setAlphabetBanner({
              text: `LOCKED BARRIER! CRASH [ ${neededLetter} ] FIRST!`,
              subtext: `Must hit letters in alphabetical order A-Z to proceed!`,
              type: 'warning',
            });
          }
        }
      }
    }

    // Check lap completion
    const prevLapIdx = Math.floor(prevZ / trackLength);
    const currLapIdx = Math.floor(p.z / trackLength);

    if (currLapIdx > prevLapIdx && p.lapStartTime > 0) {
      const lapTime = (currentTime / 1000) - p.lapStartTime;
      p.lapTimes.push(lapTime);
      if (lapTime < p.bestLapTime) {
        p.bestLapTime = lapTime;
      }
      soundManager.playLapFanfare();

      if (p.lap >= track.laps && gameMode !== 'ALPHABET_CHASE') {
        p.raceFinished = true;
        const totalRaceTime = (currentTime / 1000) - p.raceStartTime;
        const finalRank = calculatePlayerRank();
        const baseReward = 5000;
        const rankBonus = Math.max(0, (9 - finalRank) * 2500);
        const driftBonus = Math.round(p.driftScore * 0.1);
        const creditsWon = baseReward + rankBonus + driftBonus;

        onFinishRace({
          placement: finalRank,
          totalTime: totalRaceTime,
          bestLapTime: p.bestLapTime,
          driftScore: p.driftScore,
          creditsWon,
        });
        return;
      } else {
        p.lap++;
        p.lapStartTime = currentTime / 1000;
      }
    }

    // 7. Update Rivals AI & Segment placement
    trackSegments.forEach(seg => {
      seg.cars = [];
    });

    let draftTargetFound = false;

    rivalsRef.current.forEach(rival => {
      const rivalSegment = findSegment(trackSegments, rival.z);
      const curveSlowdown = Math.abs(rivalSegment.curve) * 8;
      const targetSpeed = rival.maxSpeed - curveSlowdown;

      if (rival.speed < targetSpeed) {
        rival.speed += rival.accel * dt;
      } else {
        rival.speed -= 20 * dt;
      }

      if (Math.abs(rival.z - p.z) < 600) {
        if (Math.abs(rival.x - p.x) < 0.25) {
          rival.steerTargetX = p.x > 0 ? -0.5 : 0.5;
        }
      }
      rival.x += (rival.steerTargetX - rival.x) * dt * 1.5;
      rival.z += rival.speed * 10 * dt;

      const seg = findSegment(trackSegments, rival.z);
      seg.cars.push(rival);

      // Check Slipstream
      const distToRival = rival.z - p.z;
      if (distToRival > 50 && distToRival < 700 && Math.abs(rival.x - p.x) < 0.28) {
        draftTargetFound = true;
      }

      // Check Collision with player
      if (Math.abs(p.z - rival.z) < 180 && Math.abs(p.x - rival.x) < 0.32) {
        soundManager.playCollision(0.7);
        spawnCollisionSparks((p.x + rival.x) / 2);
        const pushDir = p.x < rival.x ? -1 : 1;
        p.x += pushDir * 0.15;
        rival.x -= pushDir * 0.15;
        p.speed = Math.max(30, p.speed * 0.88);
      }
    });

    p.isDrafting = draftTargetFound;

    // 8. Update Particles
    updateParticles(dt);
  };

  const spawnAlphabetSmashParticles = (xOffset: number, color: string) => {
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28;
      const speed = 1.2 + Math.random() * 2.0;
      particlesRef.current.push({
        x: xOffset + (Math.random() * 0.1 - 0.05),
        y: -0.4 - Math.random() * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: 8 + Math.random() * 12,
        alpha: 1,
        color: i % 2 === 0 ? '#facc15' : color,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
      });
    }
  };

  const spawnDriftTireSmoke = () => {
    const p = playerState.current;
    for (let i = 0; i < 2; i++) {
      particlesRef.current.push({
        x: p.x + (Math.random() * 0.3 - 0.15),
        y: 0,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2,
        size: 15 + Math.random() * 20,
        alpha: 0.65,
        color: '#e2e8f0',
        life: 0,
        maxLife: 0.45 + Math.random() * 0.2,
      });
    }
  };

  const spawnNitroParticles = () => {
    const p = playerState.current;
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: p.x + (Math.random() * 0.2 - 0.1),
        y: 0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - Math.random() * 0.4,
        size: 12 + Math.random() * 15,
        alpha: 0.9,
        color: Math.random() > 0.4 ? '#38bdf8' : '#0284c7',
        life: 0,
        maxLife: 0.35,
      });
    }
  };

  const spawnCollisionSparks = (xOffset: number) => {
    for (let i = 0; i < 14; i++) {
      particlesRef.current.push({
        x: xOffset + (Math.random() * 0.1 - 0.05),
        y: -0.2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 4 + Math.random() * 6,
        alpha: 1,
        color: '#facc15',
        life: 0,
        maxLife: 0.35,
      });
    }
  };

  const updateParticles = (dt: number) => {
    const active: Particle[] = [];
    particlesRef.current.forEach(pt => {
      pt.life += dt;
      if (pt.life < pt.maxLife) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.size += dt * 25;
        pt.alpha = 1 - (pt.life / pt.maxLife);
        active.push(pt);
      }
    });
    particlesRef.current = active;
  };

  // Render Scene
  const renderScene = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const p = playerState.current;
    const trackSegments = segmentsRef.current;

    // 1. Draw Parallax Skybox
    ctx.clearRect(0, 0, width, height);

    if (skyboxImgRef.current && skyboxImgRef.current.complete) {
      const skyboxW = width;
      const skyboxH = height * 0.52;
      const parallaxOffset = (p.x * 60 + (p.z * 0.015)) % width;

      ctx.drawImage(skyboxImgRef.current, -parallaxOffset, 0, skyboxW, skyboxH);
      ctx.drawImage(skyboxImgRef.current, width - parallaxOffset, 0, skyboxW, skyboxH);
      if (parallaxOffset > 0) {
        ctx.drawImage(skyboxImgRef.current, -width - parallaxOffset, 0, skyboxW, skyboxH);
      }

      const fogGrad = ctx.createLinearGradient(0, skyboxH * 0.65, 0, skyboxH);
      fogGrad.addColorStop(0, 'transparent');
      fogGrad.addColorStop(1, track.fogColor);
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, skyboxH * 0.65, width, skyboxH * 0.35);
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height / 2);
    }

    // 2. Render 3D Road Segments, Scenery, Alphabets & Rivals
    renderRoad(
      ctx,
      width,
      height,
      trackSegments,
      p.z,
      p.x,
      currentCamera,
      p.x,
      track,
      gameMode === 'ALPHABET_CHASE' ? p.targetLetterIndex : undefined
    );

    // 3. Render In-World Particles
    particlesRef.current.forEach(pt => {
      const screenX = width / 2 + (pt.x * width * 0.4);
      const screenY = height * 0.88 + (pt.y * height * 0.2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(screenX, screenY, Math.max(1, pt.size), 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fill();
      ctx.restore();
    });

    // 4. Render Player Car
    if (currentCamera !== 'HOOD') {
      const carScale = currentCamera === 'CLOSE' ? 1.45 : 1.15;
      const carY = height * 0.94;
      const carX = width / 2;

      const bounce = Math.sin(p.z * 0.05) * (p.speed > 0 ? (Math.abs(p.x) > 1.0 ? 5 : 2) : 0);

      drawCar({
        ctx,
        x: carX,
        y: carY,
        scale: carScale,
        color: car.color,
        modelType: car.modelType,
        steerAngle: p.steerAngle,
        isBraking: p.isBraking || touchInputs.current.brake,
        isBoosting: (p.isBoosting || touchInputs.current.nitro) && p.nitroFuel > 0,
        isDrifting: p.isDrifting,
        bounceY: bounce,
      });
    }

    // 5. High-Speed Warp Lines
    if (p.speed > 220 || p.isBoosting) {
      const lineCount = p.isBoosting ? 24 : 10;
      ctx.save();
      ctx.strokeStyle = p.isBoosting ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      for (let l = 0; l < lineCount; l++) {
        const side = l % 2 === 0 ? -1 : 1;
        const startX = width / 2 + (side * (width * 0.25 + Math.random() * width * 0.24));
        const startY = height * 0.35 + Math.random() * height * 0.55;
        const len = 40 + Math.random() * 80;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + side * 35, startY + len);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  const handleCycleCamera = () => {
    setCurrentCamera(prev => (prev === 'CHASE' ? 'CLOSE' : prev === 'CLOSE' ? 'HOOD' : 'CHASE'));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-neutral-950 overflow-hidden flex flex-col items-center justify-center select-none"
    >
      {/* 3D WebGL / Canvas Container */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* ----------------- IN-GAME HUD OVERLAY ----------------- */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-6 z-10">
        {/* Top HUD Area */}
        <div className="flex flex-col gap-2.5 w-full">
          {/* Row 1: Metrics & Quick Action Buttons */}
          <div className="flex items-start justify-between w-full">
            {/* Mode & Target / Rank Badge */}
            <div className="flex items-center gap-3 bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 px-4 py-2.5 rounded-xl shadow-lg">
              {gameMode === 'ALPHABET_CHASE' ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 font-racing font-extrabold text-xl flex items-center justify-center shadow-md">
                    {hudData.targetLetter}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-amber-400 font-bold tracking-wider">CRASH TARGET</span>
                    <span className="font-racing font-bold text-lg text-white tracking-wide leading-none">
                      Letter {hudData.targetLetter}
                      <span className="text-xs text-neutral-400 font-normal ml-1.5">
                        ({hudData.alphabetCollectedCount}/26)
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-[11px] text-neutral-400 font-medium tracking-wide">POS</span>
                    <span className="font-racing font-bold text-2xl text-white tracking-wider tabular-nums leading-none">
                      {hudData.position}
                      <span className="text-xs text-neutral-400 font-normal ml-0.5">/ 8</span>
                    </span>
                  </div>
                </div>
              )}

              <div className="w-px h-7 bg-neutral-800" />

              {/* Lap indicator */}
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-neutral-400 font-medium tracking-wide">
                    {gameMode === 'ALPHABET_CHASE' ? 'A-Z ORDER' : 'LAP'}
                  </span>
                  <span className="font-racing font-bold text-xl text-cyan-400 tracking-wider tabular-nums leading-none">
                    {gameMode === 'ALPHABET_CHASE' 
                      ? `${Math.round((hudData.alphabetCollectedCount / 26) * 100)}%` 
                      : `${hudData.lap} / ${hudData.totalLaps}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Lap / Event Timer */}
            <div className="flex flex-col items-center bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 px-6 py-2 rounded-xl shadow-lg">
              <div className="flex items-center gap-2 text-white font-racing font-bold text-2xl tracking-wider tabular-nums">
                <Timer className="w-5 h-5 text-neutral-400" />
                <span>{hudData.currentLapTime}</span>
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-2">
                <span>BEST</span>
                <span className="text-emerald-400 font-racing font-semibold tabular-nums">{hudData.bestLapTime}</span>
              </div>
            </div>

            {/* Quick Actions (Fullscreen, Camera, Mute, Pause) */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg transition-colors cursor-pointer shadow-md"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-400" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button
                onClick={handleCycleCamera}
                className="p-2.5 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg transition-colors cursor-pointer shadow-md"
                title={`Camera: ${currentCamera}`}
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleMute}
                className="p-2.5 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg transition-colors cursor-pointer shadow-md"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
              <button
                onClick={() => setIsPaused(p => !p)}
                className="p-2.5 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg transition-colors cursor-pointer shadow-md"
                title="Pause Game (P)"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ---------------- ALPHABET RIBBON TRACKER (A to Z) ---------------- */}
          {gameMode === 'ALPHABET_CHASE' && (
            <div className="w-full bg-neutral-950/85 backdrop-blur-md border border-neutral-800/90 px-3 py-2 rounded-xl flex items-center justify-between overflow-x-auto shadow-xl">
              <div className="flex items-center gap-1.5 min-w-max mx-auto">
                {ALPHABET_LIST.map((letter, idx) => {
                  const isCollected = idx < hudData.alphabetCollectedCount;
                  const isCurrent = idx === hudData.alphabetCollectedCount;

                  return (
                    <div
                      key={letter}
                      className={`relative flex flex-col items-center justify-center w-7 h-8 md:w-8 md:h-9 rounded-md font-racing font-bold text-xs transition-all ${
                        isCollected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-xs'
                          : isCurrent
                          ? 'bg-amber-400 text-neutral-950 border-2 border-yellow-300 shadow-lg shadow-amber-500/40 scale-110 animate-pulse z-10'
                          : 'bg-neutral-900/60 text-neutral-500 border border-neutral-800'
                      }`}
                    >
                      <span>{letter}</span>
                      {isCollected && (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 absolute bottom-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center Alert Messages & Notifications */}
        <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
          {/* Countdown display */}
          {hudData.countdown > 0 && (
            <div className="flex flex-col items-center animate-bounce">
              <span className="font-racing font-bold text-7xl md:text-8xl text-amber-400 text-glow-amber tracking-widest">
                {hudData.countdown}
              </span>
              <span className="text-sm font-semibold text-neutral-400 tracking-widest mt-1">REV UP ENGINES</span>
            </div>
          )}

          {hudData.countdown === 0 && playerState.current.raceStartTime > 0 && (currentTimeSeconds() - playerState.current.raceStartTime < 1.2) && (
            <div className="font-racing font-bold text-7xl md:text-8xl text-emerald-400 text-glow-cyan tracking-widest animate-pulse">
              GO!
            </div>
          )}

          {/* Dynamic Alphabet Crash Banner */}
          {alphabetBanner && (
            <div className={`flex flex-col items-center px-6 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 mb-3 ${
              alphabetBanner.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-emerald-500/20'
                : alphabetBanner.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500 text-amber-100 shadow-amber-500/20'
                : 'bg-cyan-950/80 border-cyan-500 text-cyan-100 shadow-cyan-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {alphabetBanner.type === 'warning' ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : (
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                )}
                <span className="font-racing font-bold text-base md:text-lg tracking-wide">
                  {alphabetBanner.text}
                </span>
              </div>
              <span className="text-xs text-neutral-300 mt-0.5">
                {alphabetBanner.subtext}
              </span>
            </div>
          )}

          {/* Drift Points Banner */}
          {playerState.current.isDrifting && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-4 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
              <Disc className="w-5 h-5 text-amber-400 animate-spin" />
              <span className="font-racing font-bold text-amber-400 text-lg">
                DRIFT +{playerState.current.currentDriftPoints}
              </span>
            </div>
          )}

          {/* Slipstream Drafting Surge */}
          {hudData.isDrafting && (
            <div className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/40 px-4 py-1.5 rounded-full backdrop-blur-sm mt-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="font-racing font-semibold text-cyan-300 text-sm tracking-wider">
                SLIPSTREAM DRAFT BOOST (+25 KM/H)
              </span>
            </div>
          )}

          {/* Off-Road Warning */}
          {hudData.offRoad && (
            <div className="bg-red-500/30 border border-red-500 px-4 py-1 rounded-md text-red-200 text-xs font-bold tracking-wider uppercase mt-2">
              Off-Track Slowdown
            </div>
          )}
        </div>

        {/* Bottom Cockpit Instrument Gauge Cluster */}
        <div className="flex items-end justify-between w-full pointer-events-none">
          {/* Left: Car Details, Target Distance & Drift Score */}
          <div className="hidden sm:flex flex-col gap-1.5 bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 px-5 py-3 rounded-2xl shadow-xl">
            <span className="text-sm font-semibold text-neutral-200">{car.name}</span>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              {gameMode === 'ALPHABET_CHASE' ? (
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Next Target: <strong className="text-white font-racing text-sm">{hudData.targetLetter}</strong> (~{hudData.nextDistanceMeters}m)</span>
                </div>
              ) : (
                <span>Drift Score: <span className="font-racing font-bold text-amber-400">{hudData.driftDisplay}</span></span>
              )}
              <span>·</span>
              <span>Camera: <span className="text-neutral-200">{currentCamera}</span></span>
            </div>
          </div>

          {/* Right: Digital Speedometer & Tachometer */}
          <div className="flex items-center gap-4 bg-neutral-950/85 backdrop-blur-md border border-neutral-800/90 px-6 py-3 rounded-2xl ml-auto shadow-2xl">
            {/* Gear Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider">GEAR</span>
              <span className="font-racing font-bold text-3xl text-amber-400 tabular-nums">
                {hudData.gear}
              </span>
            </div>

            <div className="w-px h-10 bg-neutral-800" />

            {/* Speed Readout */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-racing font-bold text-4xl md:text-5xl text-white tracking-wider tabular-nums">
                  {hudData.speedKmh}
                </span>
                <span className="text-xs text-neutral-400 font-semibold">
                  {settings.speedUnit}
                </span>
              </div>

              {/* RPM Bar */}
              <div className="w-32 md:w-40 h-2 bg-neutral-800 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-75 ${
                    hudData.rpm > 0.85 ? 'bg-red-500' : hudData.rpm > 0.65 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.round(hudData.rpm * 100))}%` }}
                />
              </div>
            </div>

            <div className="w-px h-10 bg-neutral-800" />

            {/* Nitro Boost Gauge */}
            <div className="flex flex-col items-center">
              <Flame className={`w-5 h-5 ${hudData.nitro > 20 ? 'text-cyan-400' : 'text-neutral-600'}`} />
              <div className="w-3 h-12 bg-neutral-800 rounded-full overflow-hidden flex flex-col-reverse p-0.5 mt-1">
                <div 
                  className="w-full bg-gradient-to-t from-cyan-500 to-sky-300 rounded-full transition-all duration-100"
                  style={{ height: `${hudData.nitro}%` }}
                />
              </div>
              <span className="text-[9px] font-racing text-neutral-400 mt-0.5">{hudData.nitro}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- MOBILE / TOUCH ON-SCREEN CONTROLS ----------------- */}
      <div className="absolute inset-x-0 bottom-3 px-4 flex items-end justify-between pointer-events-auto md:hidden z-20">
        <div className="flex items-center gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.left = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.left = false; }}
            onPointerLeave={() => { touchInputs.current.left = false; }}
            onPointerCancel={() => { touchInputs.current.left = false; }}
            className="w-16 h-16 bg-neutral-900/80 active:bg-neutral-700 text-white rounded-2xl border border-neutral-700 flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform touch-none cursor-pointer"
          >
            <ArrowLeft className="w-8 h-8" />
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.right = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.right = false; }}
            onPointerLeave={() => { touchInputs.current.right = false; }}
            onPointerCancel={() => { touchInputs.current.right = false; }}
            className="w-16 h-16 bg-neutral-900/80 active:bg-neutral-700 text-white rounded-2xl border border-neutral-700 flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform touch-none cursor-pointer"
          >
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.drift = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.drift = false; }}
            onPointerLeave={() => { touchInputs.current.drift = false; }}
            onPointerCancel={() => { touchInputs.current.drift = false; }}
            className="w-13 h-13 bg-amber-950/80 active:bg-amber-700 text-amber-300 rounded-xl border border-amber-600/50 flex flex-col items-center justify-center text-[10px] font-bold touch-none cursor-pointer"
          >
            <Disc className="w-5 h-5 mb-0.5" />
            DRIFT
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.nitro = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.nitro = false; }}
            onPointerLeave={() => { touchInputs.current.nitro = false; }}
            onPointerCancel={() => { touchInputs.current.nitro = false; }}
            className="w-13 h-13 bg-cyan-950/80 active:bg-cyan-700 text-cyan-300 rounded-xl border border-cyan-600/50 flex flex-col items-center justify-center text-[10px] font-bold touch-none cursor-pointer"
          >
            <Flame className="w-5 h-5 mb-0.5" />
            NITRO
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.brake = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.brake = false; }}
            onPointerLeave={() => { touchInputs.current.brake = false; }}
            onPointerCancel={() => { touchInputs.current.brake = false; }}
            className="w-14 h-16 bg-red-950/80 active:bg-red-800 text-red-200 rounded-2xl border border-red-700/60 flex flex-col items-center justify-center font-bold text-xs touch-none cursor-pointer"
          >
            BRAKE
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); touchInputs.current.gas = true; }}
            onPointerUp={(e) => { e.preventDefault(); touchInputs.current.gas = false; }}
            onPointerLeave={() => { touchInputs.current.gas = false; }}
            onPointerCancel={() => { touchInputs.current.gas = false; }}
            className="w-16 h-20 bg-emerald-950/80 active:bg-emerald-700 text-emerald-300 rounded-2xl border border-emerald-600/60 flex flex-col items-center justify-center font-bold text-sm touch-none cursor-pointer"
          >
            GAS
          </button>
        </div>
      </div>

      {/* ----------------- PAUSE MODAL ----------------- */}
      {isPaused && (
        <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center z-30 pointer-events-auto">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center">
            <h2 className="font-racing font-bold text-3xl text-white tracking-wider mb-2">
              RACE PAUSED
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              Track: {track.name} {gameMode === 'ALPHABET_CHASE' ? `· Target: ${hudData.targetLetter} (${hudData.alphabetCollectedCount}/26)` : `· Lap ${hudData.lap} of ${track.laps}`}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5" />
                Resume Race
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-400" /> : <Maximize className="w-4 h-4" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              </button>
              <button
                onClick={handleToggleMute}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                {isMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button
                onClick={onExitRace}
                className="w-full py-2.5 bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition-colors text-sm cursor-pointer"
              >
                Quit to Track Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function currentTimeSeconds(): number {
  return performance.now() / 1000;
}
