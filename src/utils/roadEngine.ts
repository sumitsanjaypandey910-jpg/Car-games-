import { AlphabetTarget, CameraView, RivalCar, TrackDef, TrackSceneryDef } from '../types/game';
import { drawCar } from './carDraw';

export interface Point3D {
  world: { x: number; y: number; z: number };
  camera: { x: number; y: number; z: number };
  screen: { x: number; y: number; w: number; scale: number };
}

export interface Segment {
  index: number;
  p1: Point3D;
  p2: Point3D;
  curve: number;
  color: {
    road: string;
    grass: string;
    rumble: string;
    line?: string;
  };
  sprites: TrackSceneryDef[];
  cars: RivalCar[];
  alphabets: AlphabetTarget[];
  clip: number;
}

export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000;
export const DRAW_DISTANCE = 300;

export function project(
  p: Point3D,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number
) {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;

  p.screen.scale = cameraDepth / (p.camera.z || 1);
  p.screen.x = Math.round(width / 2 + (p.screen.scale * p.camera.x * width / 2));
  p.screen.y = Math.round(height / 2 - (p.screen.scale * p.camera.y * height / 2));
  p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
}

export function buildTrackSegments(track: TrackDef): Segment[] {
  const segments: Segment[] = [];
  const totalSegments = track.totalSegments;

  let currentY = 0;
  let currentCurve = 0;

  // Track generator pattern
  const pattern = track.curvePattern;
  let patternIdx = 0;
  let patternProgress = 0;

  for (let i = 0; i < totalSegments; i++) {
    const p = pattern[patternIdx % pattern.length];
    const totalStep = p.enter + p.hold + p.leave;

    if (patternProgress < p.enter) {
      currentCurve = (p.curve * (patternProgress / p.enter));
      if (p.elevation) currentY += (p.elevation / p.enter);
    } else if (patternProgress < p.enter + p.hold) {
      currentCurve = p.curve;
    } else {
      const leaveProg = (patternProgress - p.enter - p.hold) / p.leave;
      currentCurve = p.curve * (1 - leaveProg);
      if (p.elevation) currentY -= (p.elevation / p.leave);
    }

    patternProgress++;
    if (patternProgress >= totalStep) {
      patternProgress = 0;
      patternIdx = (patternIdx + 1) % pattern.length;
    }

    const isAlternate = Math.floor(i / RUMBLE_LENGTH) % 2 === 0;
    const roadColor = isAlternate ? track.roadColors.roadDark : track.roadColors.roadLight;
    const grassColor = isAlternate ? track.roadColors.grassDark : track.roadColors.grassLight;
    const rumbleColor = isAlternate ? track.roadColors.rumbleDark : track.roadColors.rumbleLight;
    const lineColor = isAlternate ? track.roadColors.lineColor : undefined;

    const segment: Segment = {
      index: i,
      p1: {
        world: { x: 0, y: currentY, z: i * SEGMENT_LENGTH },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      p2: {
        world: { x: 0, y: currentY, z: (i + 1) * SEGMENT_LENGTH },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      curve: currentCurve,
      color: {
        road: roadColor,
        grass: grassColor,
        rumble: rumbleColor,
        line: lineColor,
      },
      sprites: [],
      cars: [],
      alphabets: [],
      clip: 0,
    };

    // Scenery placement
    if (i === 10 || i === totalSegments - 20) {
      // Start / Finish Line Arch
      segment.sprites.push({ type: 'arch', offset: 0, scale: 1.3 });
    } else if (i % 25 === 0) {
      const side = (i % 50 === 0) ? -1.6 : 1.6;
      if (track.sceneryDensities.type === 'coastal') {
        segment.sprites.push({ type: 'palm', offset: side, scale: 1.1 + Math.random() * 0.4 });
        if (i % 100 === 0) {
          segment.sprites.push({ type: 'billboard', offset: -side * 1.5, text: 'APEX GT', color: '#ef4444' });
        }
      } else if (track.sceneryDensities.type === 'city') {
        segment.sprites.push({ type: 'light_pole', offset: side * 1.2 });
        segment.sprites.push({ type: 'building', offset: side * (2.2 + Math.random() * 1.5), scale: 1.4 + Math.random() * 0.8 });
        if (i % 75 === 0) {
          segment.sprites.push({ type: 'billboard', offset: -side * 1.4, text: 'CYBER NITRO', color: '#06b6d4' });
        }
      } else {
        // Desert
        segment.sprites.push({ type: 'cactus', offset: side, scale: 0.9 + Math.random() * 0.5 });
        if (i % 40 === 0) {
          segment.sprites.push({ type: 'rock', offset: side * (1.8 + Math.random()), scale: 1.5 + Math.random() * 1.2 });
        }
      }
    }

    segments.push(segment);
  }

  return segments;
}

export function findSegment(segments: Segment[], z: number): Segment {
  const trackLength = segments.length * SEGMENT_LENGTH;
  const loopZ = (z % trackLength + trackLength) % trackLength;
  const index = Math.floor(loopZ / SEGMENT_LENGTH) % segments.length;
  return segments[index];
}

// On-Road Alphabet Target & Road Asphalt Stencil Renderer
function drawAlphabetTarget(
  ctx: CanvasRenderingContext2D,
  target: AlphabetTarget,
  screenX: number,
  screenY: number,
  scale: number,
  isCurrentTarget: boolean
) {
  // Allow rendering far down the track (down to 0.00004 scale)
  if (scale <= 0.00004) return;
  // Dynamic scale with distance floor so letters remain crisply visible in distance
  const s = Math.max(0.12, scale * 2.6);

  ctx.save();
  ctx.translate(screenX, screenY);

  // 1. GIANT ROAD SURFACE PAINTED MARKINGS (Directly on the asphalt surface)
  ctx.save();
  const roadMarkW = 200 * s;
  const roadMarkH = 85 * s;

  // Road asphalt painted box under the car's wheels
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, roadMarkW * 0.5, roadMarkH * 0.5, 0, 0, Math.PI * 2);
  if (target.collected) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
  } else if (isCurrentTarget) {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
  } else {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  }
  ctx.fill();

  ctx.strokeStyle = isCurrentTarget ? '#facc15' : (target.collected ? '#34d399' : '#64748b');
  ctx.lineWidth = (isCurrentTarget ? 6 : 3) * s;
  ctx.stroke();

  // Painted asphalt chevrons on road
  if (isCurrentTarget) {
    ctx.fillStyle = '#facc15';
    [-35 * s, 35 * s].forEach(cx => {
      ctx.beginPath();
      ctx.moveTo(cx, 16 * s);
      ctx.lineTo(cx - 12 * s, 28 * s);
      ctx.lineTo(cx, 24 * s);
      ctx.lineTo(cx + 12 * s, 28 * s);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Giant painted letter flat on the road surface (Perspective squashed)
  ctx.scale(1.3, 0.45);
  ctx.font = `900 ${Math.max(22, Math.floor(125 * s))}px var(--font-racing, sans-serif)`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Road paint outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 12 * s;
  ctx.strokeText(target.letter, 0, -8 * s);

  // Road paint fill
  ctx.fillStyle = isCurrentTarget ? '#ffffff' : (target.collected ? '#a7f3d0' : '#cbd5e1');
  ctx.fillText(target.letter, 0, -8 * s);

  ctx.restore(); // Undo road surface perspective scale

  // 2. ON-ROAD STANDING 3D CRASH HURDLE / BLOCK (Directly on the asphalt)
  const blockW = 160 * s;
  const blockH = 130 * s;

  // Sky beacon beam rising into the clouds for active target letter
  if (isCurrentTarget) {
    const beamW = 28 * s;
    const beamH = Math.max(300 * s, 140);
    const beamGrad = ctx.createLinearGradient(0, -blockH, 0, -blockH - beamH);
    beamGrad.addColorStop(0, 'rgba(6, 182, 212, 0.7)');
    beamGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.3)');
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-beamW * 0.5, -blockH - beamH, beamW, beamH);
  }

  // Road contact shadow under block
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, blockW * 0.58, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Heavy steel base stands anchoring to the road
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-blockW * 0.46, -blockH * 0.25, 14 * s, blockH * 0.25);
  ctx.fillRect(blockW * 0.46 - 14 * s, -blockH * 0.25, 14 * s, blockH * 0.25);

  // Sturdy on-road block body
  const blockGrad = ctx.createLinearGradient(0, -blockH, 0, 0);
  if (target.collected) {
    blockGrad.addColorStop(0, '#065f46');
    blockGrad.addColorStop(1, '#022c22');
  } else if (isCurrentTarget) {
    blockGrad.addColorStop(0, '#0284c7');
    blockGrad.addColorStop(0.5, '#0369a1');
    blockGrad.addColorStop(1, '#082f49');
  } else {
    blockGrad.addColorStop(0, '#334155');
    blockGrad.addColorStop(1, '#0f172a');
  }

  ctx.fillStyle = blockGrad;
  ctx.beginPath();
  ctx.roundRect(-blockW * 0.5, -blockH, blockW, blockH, 12 * s);
  ctx.fill();

  // Neon glowing outer border
  ctx.strokeStyle = isCurrentTarget ? '#facc15' : (target.collected ? '#34d399' : '#475569');
  ctx.lineWidth = (isCurrentTarget ? 7 : 3.5) * s;
  ctx.stroke();

  // Hazard warning diagonal stripes across bottom edge of the hurdle
  const stripeH = 18 * s;
  const stripeY = -stripeH;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-blockW * 0.5, stripeY, blockW, stripeH);
  ctx.clip();
  ctx.fillStyle = isCurrentTarget ? '#facc15' : '#475569';
  ctx.fillRect(-blockW * 0.5, stripeY, blockW, stripeH);
  ctx.fillStyle = '#000000';
  for (let sx = -blockW; sx < blockW; sx += 24 * s) {
    ctx.beginPath();
    ctx.moveTo(sx, stripeY);
    ctx.lineTo(sx + 14 * s, stripeY);
    ctx.lineTo(sx - 4 * s, stripeY + stripeH);
    ctx.lineTo(sx - 18 * s, stripeY + stripeH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Flashing target pointer above the block
  if (isCurrentTarget) {
    const arrowBounce = Math.sin(Date.now() * 0.012) * (7 * s);
    const arrowY = -blockH - 24 * s + arrowBounce;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, arrowY + 20 * s);
    ctx.lineTo(-18 * s, arrowY);
    ctx.lineTo(18 * s, arrowY);
    ctx.closePath();
    ctx.fill();

    // Top callout
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.max(9, Math.floor(14 * s))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('▼ CRASH HERE ▼', 0, -blockH + 18 * s);
  } else if (target.collected) {
    ctx.fillStyle = '#34d399';
    ctx.font = `bold ${Math.max(8, Math.floor(12 * s))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DONE ✓', 0, -blockH + 18 * s);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.max(8, Math.floor(11 * s))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`LOCKED #${target.index + 1}`, 0, -blockH + 18 * s);
  }

  // GIANT HIGH-CONTRAST LETTER ON ROAD HURDLE
  const letterY = -blockH * 0.46;
  ctx.font = `900 ${Math.max(22, Math.floor(82 * s))}px var(--font-racing, sans-serif)`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Letter black outline
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 8 * s;
  ctx.strokeText(target.letter, 0, letterY);

  // Letter bright fill
  ctx.fillStyle = isCurrentTarget ? '#ffffff' : (target.collected ? '#6ee7b7' : '#e2e8f0');
  ctx.fillText(target.letter, 0, letterY);

  ctx.restore();
}

function drawScenerySprite(
  ctx: CanvasRenderingContext2D,
  sprite: TrackSceneryDef,
  screenX: number,
  screenY: number,
  scale: number
) {
  if (scale <= 0.00008) return;
  const s = Math.max(0.08, scale * (sprite.scale || 1) * 1.2);

  ctx.save();
  ctx.translate(screenX, screenY);

  if (sprite.type === 'palm') {
    // Tropical Palm Tree
    const h = 260 * s;
    const w = 180 * s;

    // Trunk
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 14 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20 * s, -h * 0.5, 10 * s, -h);
    ctx.stroke();

    // Fronds
    ctx.fillStyle = '#15803d';
    const numFronds = 7;
    for (let f = 0; f < numFronds; f++) {
      const angle = (f / (numFronds - 1)) * Math.PI - Math.PI / 2 + 0.1;
      ctx.save();
      ctx.translate(10 * s, -h);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(w * 0.35, 0, w * 0.45, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (sprite.type === 'billboard') {
    // Highway racing billboard
    const w = 240 * s;
    const h = 120 * s;
    const poleH = 140 * s;

    // Metal pole
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8 * s, -poleH, 16 * s, poleH);

    // Board
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -poleH - h, w, h, 6 * s);
    ctx.fill();

    ctx.strokeStyle = sprite.color || '#ef4444';
    ctx.lineWidth = 4 * s;
    ctx.stroke();

    // Billboard Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, Math.floor(22 * s))}px var(--font-racing, sans-serif)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sprite.text || 'VELOCITY', 0, -poleH - h / 2);
  } else if (sprite.type === 'light_pole') {
    // City highway light pole
    const h = 220 * s;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -h + 20 * s);
    ctx.quadraticCurveTo(0, -h, 30 * s, -h);
    ctx.stroke();

    // Lamp fixture
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(30 * s, -h + 4 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (sprite.type === 'cactus') {
    // Saguaro Cactus
    const h = 180 * s;
    ctx.fillStyle = '#166534';
    // Main trunk
    ctx.beginPath();
    ctx.roundRect(-12 * s, -h, 24 * s, h, 10 * s);
    ctx.fill();

    // Left arm
    ctx.fillRect(-40 * s, -h * 0.65, 30 * s, 14 * s);
    ctx.beginPath();
    ctx.roundRect(-42 * s, -h * 0.85, 14 * s, 36 * s, 6 * s);
    ctx.fill();

    // Right arm
    ctx.fillRect(10 * s, -h * 0.5, 32 * s, 14 * s);
    ctx.beginPath();
    ctx.roundRect(30 * s, -h * 0.72, 14 * s, 36 * s, 6 * s);
    ctx.fill();
  } else if (sprite.type === 'rock') {
    // Sandstone Canyon Spire
    const w = 220 * s;
    const h = 320 * s;
    const grad = ctx.createLinearGradient(0, -h, 0, 0);
    grad.addColorStop(0, '#ea580c');
    grad.addColorStop(0.5, '#c2410c');
    grad.addColorStop(1, '#7c2d12');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w * 0.35, -h * 0.6);
    ctx.lineTo(-w * 0.15, -h);
    ctx.lineTo(w * 0.15, -h * 0.95);
    ctx.lineTo(w * 0.4, -h * 0.55);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
  } else if (sprite.type === 'building') {
    // Cyberpunk skyscraper
    const w = 200 * s;
    const h = 450 * s;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(-w / 2, -h, w, h);

    // Glowing window accents
    ctx.fillStyle = '#38bdf8';
    for (let wy = -h + 20 * s; wy < -20 * s; wy += 35 * s) {
      ctx.fillRect(-w * 0.35, wy, 15 * s, 8 * s);
      ctx.fillRect(w * 0.2, wy, 15 * s, 8 * s);
    }
  } else if (sprite.type === 'arch') {
    // Grand Start / Finish Line Overhead Gantry
    const spanW = 600 * s;
    const h = 260 * s;
    const legW = 32 * s;

    // Left & Right metal truss legs
    ctx.fillStyle = '#334155';
    ctx.fillRect(-spanW / 2, -h, legW, h);
    ctx.fillRect(spanW / 2 - legW, -h, legW, h);

    // Overhead truss beam
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-spanW / 2, -h, spanW, 55 * s);

    // Checkered Banner Strip
    const checkH = 26 * s;
    const checkW = 20 * s;
    const cols = Math.floor(spanW / checkW);
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (c % 2 === 0) ? '#ffffff' : '#000000';
      ctx.fillRect(-spanW / 2 + c * checkW, -h + 10 * s, checkW, checkH);
    }

    // Finish Text
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.max(10, Math.floor(22 * s))}px var(--font-racing, sans-serif)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH LINE', 0, -h + 23 * s);
  }

  ctx.restore();
}

export function renderRoad(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  segments: Segment[],
  cameraZ: number,
  cameraX: number,
  cameraView: CameraView,
  playerX: number,
  track: TrackDef,
  currentTargetIndex?: number
) {
  const trackLength = segments.length * SEGMENT_LENGTH;
  const baseSegment = findSegment(segments, cameraZ);
  const basePercent = ((cameraZ % SEGMENT_LENGTH) + SEGMENT_LENGTH) % SEGMENT_LENGTH / SEGMENT_LENGTH;

  // Camera height based on view mode
  let cameraHeight = 1000;
  if (cameraView === 'CLOSE') cameraHeight = 650;
  if (cameraView === 'HOOD') cameraHeight = 420;

  const cameraDepth = 0.84; // Field of view
  const playerSegment = findSegment(segments, cameraZ + (cameraView === 'HOOD' ? 0 : 350));
  const playerPercent = ((cameraZ + 350) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const playerY = playerSegment.p1.world.y + (playerSegment.p2.world.y - playerSegment.p1.world.y) * playerPercent;

  let maxY = height;
  let x = 0;
  let dx = -(baseSegment.curve * basePercent);

  // 1. Project all segments in draw distance
  for (let n = 0; n < DRAW_DISTANCE; n++) {
    const segment = segments[(baseSegment.index + n) % segments.length];
    segment.clip = maxY;

    const looped = segment.index < baseSegment.index;
    const zOffset = looped ? trackLength : 0;

    project(segment.p1, cameraX * ROAD_WIDTH - x, cameraHeight + playerY, cameraZ - zOffset, cameraDepth, width, height, ROAD_WIDTH);
    project(segment.p2, cameraX * ROAD_WIDTH - x - dx, cameraHeight + playerY, cameraZ - zOffset, cameraDepth, width, height, ROAD_WIDTH);

    x += dx;
    dx += segment.curve;

    // Hills & curves clipping
    if (
      segment.p1.camera.z <= cameraDepth || // behind camera
      segment.p2.screen.y >= maxY ||       // clipped by hill
      segment.p2.screen.y >= segment.p1.screen.y // going downward away
    ) {
      continue;
    }

    // 2. Render Road Polygon
    renderSegmentPolygon(ctx, width, segment, maxY, currentTargetIndex);
    maxY = segment.p1.screen.y;
  }

  // 3. Render Sprites, Alphabets & Rival Cars (Back to Front)
  for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
    const segment = segments[(baseSegment.index + n) % segments.length];

    // Roadside Sprites
    for (const sprite of segment.sprites) {
      const spriteScale = segment.p1.screen.scale;
      const spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * ROAD_WIDTH * width / 2);
      const spriteY = segment.p1.screen.y;

      if (spriteY < segment.clip) {
        drawScenerySprite(ctx, sprite, spriteX, spriteY, spriteScale);
      }
    }

    // Alphabet Targets (Standing on the road)
    for (const alphabet of segment.alphabets) {
      const primarySegIndex = Math.floor(alphabet.z / SEGMENT_LENGTH);
      if (segment.index === primarySegIndex) {
        const alphaScale = segment.p1.screen.scale;
        const alphaX = segment.p1.screen.x + (alphaScale * alphabet.x * ROAD_WIDTH * width / 2);
        const alphaY = segment.p1.screen.y;

        if (alphaY < segment.clip) {
          drawAlphabetTarget(
            ctx,
            alphabet,
            alphaX,
            alphaY,
            alphaScale,
            currentTargetIndex !== undefined && alphabet.index === currentTargetIndex
          );
        }
      }
    }

    // Rival Cars on this segment
    for (const car of segment.cars) {
      const carScale = segment.p1.screen.scale;
      const carX = segment.p1.screen.x + (carScale * car.x * ROAD_WIDTH * width / 2);
      const carY = segment.p1.screen.y;

      if (carY < segment.clip) {
        drawCar({
          ctx,
          x: carX,
          y: carY,
          scale: carScale * 1.8,
          color: car.color,
          modelType: car.modelType,
          steerAngle: car.steerTargetX - car.x,
          isBraking: false,
          isBoosting: false,
          isDrifting: false,
        });
      }
    }
  }
}

function renderSegmentPolygon(
  ctx: CanvasRenderingContext2D,
  width: number,
  segment: Segment,
  clipY: number,
  currentTargetIndex?: number
) {
  const p1 = segment.p1.screen;
  const p2 = segment.p2.screen;

  const r1 = p1.w / 6;
  const r2 = p2.w / 6;
  const l1 = p1.w / 32;
  const l2 = p2.w / 32;

  // 1. Grass / Off-road
  ctx.fillStyle = segment.color.grass;
  ctx.fillRect(0, p2.y, width, p1.y - p2.y);

  // 2. Rumble Strips (Kerbs)
  drawTrapezoid(ctx, p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, segment.color.rumble);
  drawTrapezoid(ctx, p1.x + p1.w, p1.y, p1.x + p1.w + r1, p1.y, p2.x + p2.w + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);

  // 3. Main Asphalt Road
  drawTrapezoid(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);

  // 4. Center Dashed Line
  if (segment.color.line) {
    drawTrapezoid(ctx, p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.line);
  }

  // 5. ROAD-SURFACE ASPHALT HIGHLIGHT & MARKINGS FOR ALPHABET
  if (segment.alphabets && segment.alphabets.length > 0) {
    for (const alpha of segment.alphabets) {
      const isCurrent = currentTargetIndex !== undefined && alpha.index === currentTargetIndex;
      const lx1 = p1.x + (alpha.x * p1.w);
      const lx2 = p2.x + (alpha.x * p2.w);
      const laneW1 = p1.w * 0.42;
      const laneW2 = p2.w * 0.42;

      // Asphalt highlighted lane zone
      const laneFill = isCurrent 
        ? 'rgba(6, 182, 212, 0.45)' 
        : (alpha.collected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(30, 41, 59, 0.55)');

      drawTrapezoid(ctx, lx1 - laneW1, p1.y, lx1 + laneW1, p1.y, lx2 + boxW(laneW2), p2.y, lx2 - boxW(laneW2), p2.y, laneFill);

      // Bright painted borders on the road lane
      const borderCol = isCurrent ? '#facc15' : (alpha.collected ? '#34d399' : '#64748b');
      const bW1 = p1.w * 0.035;
      const bW2 = p2.w * 0.035;
      drawTrapezoid(ctx, lx1 - laneW1, p1.y, lx1 - laneW1 + bW1, p1.y, lx2 - laneW2 + bW2, p2.y, lx2 - laneW2, p2.y, borderCol);
      drawTrapezoid(ctx, lx1 + laneW1 - bW1, p1.y, lx1 + laneW1, p1.y, lx2 + laneW2, p2.y, lx2 + laneW2 - bW2, p2.y, borderCol);
    }
  }
}

function boxW(w: number) {
  return w;
}

function drawTrapezoid(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}
