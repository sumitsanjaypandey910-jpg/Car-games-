import { CarModel, TrackDef } from '../types/game';

// Import local image assets generated for skyboxes and backgrounds
import skyboxCoast from '../assets/images/skybox_sunset_coast_1791130785691.jpg';
import skyboxCity from '../assets/images/skybox_night_city_racing_1791130772486.jpg';
import skyboxDesert from '../assets/images/skybox_desert_canyon_1791130799927.jpg';

export const TRACK_LIST: TrackDef[] = [
  {
    id: 'coastal_highway',
    name: 'Pacific Coast Highway',
    subtitle: 'Golden Hour Seaside Circuit',
    location: 'California Coast',
    laps: 3,
    lengthMeters: 3800,
    difficulty: 'EASY',
    skybox: skyboxCoast,
    ambientLight: 'rgba(251, 146, 60, 0.15)',
    fogColor: '#f97316',
    roadColors: {
      roadLight: '#475569',
      roadDark: '#334155',
      rumbleLight: '#ef4444',
      rumbleDark: '#ffffff',
      grassLight: '#15803d',
      grassDark: '#166534',
      lineColor: '#facc15',
    },
    totalSegments: 1600,
    curvePattern: [
      { enter: 80, hold: 120, leave: 80, curve: 0, elevation: 0 },
      { enter: 100, hold: 160, leave: 100, curve: 2.2, elevation: 40 },
      { enter: 80, hold: 120, leave: 80, curve: -2.5, elevation: -30 },
      { enter: 120, hold: 200, leave: 120, curve: 0, elevation: 60 },
      { enter: 80, hold: 140, leave: 80, curve: 3.5, elevation: -50 },
      { enter: 60, hold: 100, leave: 60, curve: -3.0, elevation: 20 },
      { enter: 100, hold: 140, leave: 100, curve: 0, elevation: 0 },
    ],
    sceneryDensities: {
      type: 'coastal',
    },
  },
  {
    id: 'tokyo_expressway',
    name: 'Neo Tokyo Expressway',
    subtitle: 'Midnight Cyber Street Circuit',
    location: 'Shinjuku Metropolitan Highway',
    laps: 3,
    lengthMeters: 4200,
    difficulty: 'MEDIUM',
    skybox: skyboxCity,
    ambientLight: 'rgba(56, 189, 248, 0.15)',
    fogColor: '#0284c7',
    roadColors: {
      roadLight: '#262626',
      roadDark: '#171717',
      rumbleLight: '#06b6d4',
      rumbleDark: '#3b82f6',
      grassLight: '#090d16',
      grassDark: '#04070d',
      lineColor: '#38bdf8',
    },
    totalSegments: 1800,
    curvePattern: [
      { enter: 80, hold: 150, leave: 80, curve: 0, elevation: 0 },
      { enter: 70, hold: 110, leave: 70, curve: -3.8, elevation: 20 },
      { enter: 90, hold: 140, leave: 90, curve: 2.8, elevation: -20 },
      { enter: 100, hold: 180, leave: 100, curve: 0, elevation: 70 },
      { enter: 60, hold: 90, leave: 60, curve: 4.2, elevation: -60 },
      { enter: 80, hold: 120, leave: 80, curve: -2.0, elevation: 30 },
      { enter: 120, hold: 160, leave: 120, curve: 0, elevation: 0 },
    ],
    sceneryDensities: {
      type: 'city',
    },
  },
  {
    id: 'mojave_canyon',
    name: 'Red Rock Canyon',
    subtitle: 'High-Elevation Sandstone Sprint',
    location: 'Nevada High Desert',
    laps: 3,
    lengthMeters: 4600,
    difficulty: 'HARD',
    skybox: skyboxDesert,
    ambientLight: 'rgba(234, 88, 12, 0.15)',
    fogColor: '#ea580c',
    roadColors: {
      roadLight: '#3f3f46',
      roadDark: '#27272a',
      rumbleLight: '#f59e0b',
      rumbleDark: '#ffffff',
      grassLight: '#78350f',
      grassDark: '#451a03',
      lineColor: '#ffffff',
    },
    totalSegments: 2000,
    curvePattern: [
      { enter: 80, hold: 120, leave: 80, curve: 0, elevation: 0 },
      { enter: 100, hold: 160, leave: 100, curve: 4.5, elevation: 80 },
      { enter: 80, hold: 120, leave: 80, curve: -4.2, elevation: -80 },
      { enter: 100, hold: 180, leave: 100, curve: 3.2, elevation: 50 },
      { enter: 90, hold: 150, leave: 90, curve: -4.8, elevation: -60 },
      { enter: 110, hold: 160, leave: 110, curve: 0, elevation: 10 },
    ],
    sceneryDensities: {
      type: 'desert',
    },
  },
];

export const INITIAL_CARS: CarModel[] = [
  {
    id: 'viper_gt',
    name: 'Viper GT-R',
    category: 'Supercar',
    tagline: 'Balanced track weapon with aggressive aerodynamics.',
    baseStats: {
      topSpeed: 250,
      acceleration: 82,
      handling: 85,
      nitroBoost: 80,
    },
    color: '#ef4444', // Crimson Red
    price: 0,
    unlocked: true,
    modelType: 'supercar',
  },
  {
    id: 'kurogane_r34',
    name: 'Kurogane GT-34',
    category: 'JDM Tuner',
    tagline: 'Twin-turbo legend built for high-speed drift precision.',
    baseStats: {
      topSpeed: 242,
      acceleration: 88,
      handling: 94,
      nitroBoost: 78,
    },
    color: '#06b6d4', // Cyan Metallic
    price: 15000,
    unlocked: false,
    modelType: 'tuner',
  },
  {
    id: 'thunder_v8',
    name: 'Thunderbolt V8',
    category: 'Muscle',
    tagline: 'Supercharged 6.4L American muscle with brutal acceleration.',
    baseStats: {
      topSpeed: 258,
      acceleration: 95,
      handling: 72,
      nitroBoost: 86,
    },
    color: '#f59e0b', // Amber Orange
    price: 25000,
    unlocked: false,
    modelType: 'muscle',
  },
  {
    id: 'apex_hyperion',
    name: 'Apex Hyperion LMP',
    category: 'Hypercar',
    tagline: 'Ultra-light carbon prototype with relentless downforce.',
    baseStats: {
      topSpeed: 278,
      acceleration: 96,
      handling: 95,
      nitroBoost: 95,
    },
    color: '#8b5cf6', // Violet Pearl
    price: 50000,
    unlocked: false,
    modelType: 'hypercar',
  },
];

export const AVAILABLE_PAINTS = [
  { name: 'Racing Crimson', hex: '#ef4444' },
  { name: 'Cyber Electric Cyan', hex: '#06b6d4' },
  { name: 'Amber Sunset', hex: '#f59e0b' },
  { name: 'Midnight Onyx', hex: '#1e293b' },
  { name: 'Hyper Violet', hex: '#8b5cf6' },
  { name: 'Acid Neon Lime', hex: '#84cc16' },
  { name: 'Liquid Titanium', hex: '#94a3b8' },
  { name: 'Pure Pearl White', hex: '#f8fafc' },
];

export const RIVAL_NAMES = [
  'Marcus "Apex" Drake',
  'Kenji Sato',
  'Elena Rostova',
  'Damian Vance',
  'Chloe Moreau',
  'Jack "Hammer" Sterling',
  'Yuki Takahashi',
];
