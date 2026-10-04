export type GameMode = 'GRAND_PRIX' | 'TIME_ATTACK' | 'HIGHWAY_RUSH' | 'ALPHABET_CHASE';
export type Difficulty = 'AMATEUR' | 'PRO' | 'MASTER';
export type CameraView = 'CHASE' | 'CLOSE' | 'HOOD';
export type ScreenState = 'TITLE' | 'GARAGE' | 'TRACK_SELECT' | 'RACING' | 'RESULTS';

export interface AlphabetTarget {
  letter: string;      // 'A' to 'Z'
  index: number;       // 0 to 25
  z: number;           // world position along track
  x: number;           // lateral offset (-0.6 to 0.6)
  collected: boolean;
  color: string;
}

export interface CarStats {
  topSpeed: number;     // max km/h base e.g. 240
  acceleration: number; // 0-100 score e.g. 75
  handling: number;     // 0-100 score e.g. 80
  nitroBoost: number;   // 0-100 score e.g. 70
}

export interface CarUpgrades {
  engine: number;       // 0 to 3
  handling: number;     // 0 to 3
  nitro: number;        // 0 to 3
}

export interface CarModel {
  id: string;
  name: string;
  category: string;
  tagline: string;
  baseStats: CarStats;
  color: string;
  price: number;
  unlocked: boolean;
  modelType: 'supercar' | 'tuner' | 'muscle' | 'hypercar';
}

export interface TrackSceneryDef {
  type: 'palm' | 'billboard' | 'light_pole' | 'building' | 'cactus' | 'rock' | 'arch';
  offset: number; // negative = left side, positive = right side
  scale?: number;
  text?: string;
  color?: string;
}

export interface TrackDef {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  laps: number;
  lengthMeters: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  skybox: string;
  ambientLight: string;
  fogColor: string;
  roadColors: {
    roadLight: string;
    roadDark: string;
    rumbleLight: string;
    rumbleDark: string;
    grassLight: string;
    grassDark: string;
    lineColor: string;
  };
  totalSegments: number;
  curvePattern: Array<{
    enter: number;
    hold: number;
    leave: number;
    curve: number;
    elevation?: number;
  }>;
  sceneryDensities: {
    type: 'coastal' | 'city' | 'desert';
  };
}

export interface RivalCar {
  id: string;
  name: string;
  modelType: 'supercar' | 'tuner' | 'muscle' | 'hypercar';
  color: string;
  z: number;              // position along track (in world units)
  x: number;              // lateral position (-1 to 1)
  speed: number;          // current speed in world units
  maxSpeed: number;
  accel: number;
  rank: number;
  steerTargetX: number;
}

export interface RaceTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  nitroFuel: number;      // 0 to 100
  isBoosting: boolean;
  isDrifting: boolean;
  isDrafting: boolean;
  driftAngle: number;
  driftPoints: number;
  lap: number;
  totalLaps: number;
  lapTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  totalTime: number;
  position: number;
  totalRacers: number;
  distanceProgress: number; // 0 to 1 along circuit
  countdown: number | null; // 3, 2, 1, 0 (GO), null
  raceFinished: boolean;
  wrongWay: boolean;
  offRoad: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  speedUnit: 'KMH' | 'MPH';
  cameraView: CameraView;
  touchControls: boolean;
}

export interface PlayerProfile {
  credits: number;
  cars: Record<string, {
    unlocked: boolean;
    color: string;
    upgrades: CarUpgrades;
  }>;
  selectedCarId: string;
  trackRecords: Record<string, {
    bestLapTime: number;
    wins: number;
  }>;
}
