/**
 * Procedural Vector Car Renderer
 * Draws high-performance sports cars with rear-chase perspective, dynamic tire steering,
 * glowing taillights, metallic paint gradients, exhaust flames, and aerodynamic body roll.
 */

export interface DrawCarOptions {
  ctx: CanvasRenderingContext2D;
  x: number;               // Center X on canvas
  y: number;               // Bottom Y on canvas
  scale: number;           // Scale factor based on 3D distance
  color: string;           // Base paint hex (e.g. '#EF4444')
  modelType: 'supercar' | 'tuner' | 'muscle' | 'hypercar';
  steerAngle: number;      // -1 (full left) to 1 (full right)
  isBraking: boolean;
  isBoosting: boolean;
  isDrifting: boolean;
  bounceY?: number;        // subtle vertical road vibration
}

// Convert hex to darker/lighter shades for realistic car paint reflections
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1)}`;
}

export function drawCar(options: DrawCarOptions) {
  const {
    ctx,
    x,
    y: rawY,
    scale,
    color,
    modelType,
    steerAngle,
    isBraking,
    isBoosting,
    isDrifting,
    bounceY = 0
  } = options;

  if (scale <= 0.005) return;

  const y = rawY + bounceY;
  const baseW = 160;
  const baseH = 90;
  const w = baseW * scale;
  const h = baseH * scale;

  // Car body roll / lean on curves and drifts
  const rollAngle = steerAngle * (isDrifting ? 0.09 : 0.045);

  ctx.save();
  ctx.translate(x, y);

  // 1. Drop shadow onto asphalt
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4 * scale, w * 0.58, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fill();
  ctx.restore();

  // Apply tilt for car body
  ctx.rotate(rollAngle);

  // Color variants
  const highlightColor = adjustBrightness(color, 35);
  const shadeColor = adjustBrightness(color, -30);
  const deepShadowColor = adjustBrightness(color, -60);

  // 2. Wheels & Tires
  const tireW = 28 * scale;
  const tireH = 38 * scale;
  const tireY = -tireH * 0.8;
  const leftTireX = -w * 0.44;
  const rightTireX = w * 0.44 - tireW;

  // Draw wide performance tires
  ctx.fillStyle = '#171717';
  // Left Tire
  ctx.beginPath();
  ctx.roundRect(leftTireX, tireY, tireW, tireH, 4 * scale);
  ctx.fill();
  // Tire tread inner
  ctx.fillStyle = '#262626';
  ctx.fillRect(leftTireX + 2 * scale, tireY + 4 * scale, tireW - 4 * scale, tireH - 8 * scale);

  // Right Tire
  ctx.fillStyle = '#171717';
  ctx.beginPath();
  ctx.roundRect(rightTireX, tireY, tireW, tireH, 4 * scale);
  ctx.fill();
  // Tire tread inner
  ctx.fillStyle = '#262626';
  ctx.fillRect(rightTireX + 2 * scale, tireY + 4 * scale, tireW - 4 * scale, tireH - 8 * scale);

  // 3. Lower Rear Diffuser & Exhaust Pipes
  const diffuserY = -18 * scale;
  const diffuserH = 16 * scale;
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(-w * 0.4, diffuserY, w * 0.8, diffuserH, [0, 0, 6 * scale, 6 * scale]);
  ctx.fill();

  // Diffuser vertical fins
  ctx.fillStyle = '#262626';
  [-0.25, -0.1, 0.1, 0.25].forEach(finOffset => {
    ctx.fillRect(w * finOffset, diffuserY, 3 * scale, diffuserH);
  });

  // Exhaust tips
  const exhaustY = -10 * scale;
  const exhaustRadius = 4.5 * scale;
  const exhaustOffsets = modelType === 'supercar' 
    ? [-0.22, -0.15, 0.15, 0.22] 
    : (modelType === 'hypercar' ? [-0.08, 0.08] : [-0.28, 0.28]);

  exhaustOffsets.forEach(offset => {
    const exX = w * offset;
    // Outer metallic ring
    ctx.fillStyle = '#737373';
    ctx.beginPath();
    ctx.arc(exX, exhaustY, exhaustRadius, 0, Math.PI * 2);
    ctx.fill();
    // Inner exhaust hole
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(exX, exhaustY, exhaustRadius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Nitro / Boost flames
    if (isBoosting) {
      ctx.save();
      const flameLen = (28 + Math.random() * 22) * scale;
      const flameW = exhaustRadius * (1.2 + Math.random() * 0.4);

      // Outer cyan flame
      const grad = ctx.createLinearGradient(exX, exhaustY, exX, exhaustY + flameLen);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#38bdf8');
      grad.addColorStop(0.7, '#0284c7');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(exX - flameW, exhaustY);
      ctx.quadraticCurveTo(exX, exhaustY + flameLen * 0.6, exX, exhaustY + flameLen);
      ctx.quadraticCurveTo(exX, exhaustY + flameLen * 0.6, exX + flameW, exhaustY);
      ctx.closePath();
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(exX, exhaustY + 6 * scale, flameW * 0.4, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // 4. Main Body Silhouette (Based on Model Type)
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(0, -h * 0.8, 0, 0);
  bodyGrad.addColorStop(0, highlightColor);
  bodyGrad.addColorStop(0.5, color);
  bodyGrad.addColorStop(1, shadeColor);

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = deepShadowColor;
  ctx.lineWidth = 1.5 * scale;

  ctx.beginPath();
  if (modelType === 'muscle') {
    // Wide boxy aggressive stance
    ctx.moveTo(-w * 0.46, -14 * scale);
    ctx.lineTo(-w * 0.45, -h * 0.45);
    ctx.lineTo(-w * 0.35, -h * 0.52);
    ctx.lineTo(-w * 0.28, -h * 0.82);
    ctx.lineTo(w * 0.28, -h * 0.82);
    ctx.lineTo(w * 0.35, -h * 0.52);
    ctx.lineTo(w * 0.45, -h * 0.45);
    ctx.lineTo(w * 0.46, -14 * scale);
  } else if (modelType === 'hypercar') {
    // Ultra aerodynamic LMP wedge
    ctx.moveTo(-w * 0.49, -16 * scale);
    ctx.lineTo(-w * 0.42, -h * 0.42);
    ctx.lineTo(-w * 0.25, -h * 0.55);
    ctx.lineTo(-w * 0.18, -h * 0.78);
    ctx.lineTo(w * 0.18, -h * 0.78);
    ctx.lineTo(w * 0.25, -h * 0.55);
    ctx.lineTo(w * 0.42, -h * 0.42);
    ctx.lineTo(w * 0.49, -16 * scale);
  } else if (modelType === 'tuner') {
    // Classic JDM coupe silhouette
    ctx.moveTo(-w * 0.45, -14 * scale);
    ctx.lineTo(-w * 0.43, -h * 0.46);
    ctx.lineTo(-w * 0.32, -h * 0.54);
    ctx.lineTo(-w * 0.24, -h * 0.82);
    ctx.lineTo(w * 0.24, -h * 0.82);
    ctx.lineTo(w * 0.32, -h * 0.54);
    ctx.lineTo(w * 0.43, -h * 0.46);
    ctx.lineTo(w * 0.45, -14 * scale);
  } else {
    // Supercar (low exotic curves)
    ctx.moveTo(-w * 0.47, -15 * scale);
    ctx.lineTo(-w * 0.42, -h * 0.44);
    ctx.lineTo(-w * 0.29, -h * 0.56);
    ctx.lineTo(-w * 0.22, -h * 0.84);
    ctx.lineTo(w * 0.22, -h * 0.84);
    ctx.lineTo(w * 0.29, -h * 0.56);
    ctx.lineTo(w * 0.42, -h * 0.44);
    ctx.lineTo(w * 0.47, -15 * scale);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Roof / Cabin Glass (Windshield Rear Window)
  const glassGrad = ctx.createLinearGradient(0, -h * 0.82, 0, -h * 0.52);
  glassGrad.addColorStop(0, '#0f172a');
  glassGrad.addColorStop(0.5, '#1e293b');
  glassGrad.addColorStop(1, '#090d16');

  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  const cabinW = modelType === 'hypercar' ? 0.16 : 0.22;
  const cabinBaseW = modelType === 'hypercar' ? 0.24 : 0.3;
  ctx.moveTo(-w * cabinW, -h * 0.80);
  ctx.lineTo(w * cabinW, -h * 0.80);
  ctx.lineTo(w * cabinBaseW, -h * 0.54);
  ctx.lineTo(-w * cabinBaseW, -h * 0.54);
  ctx.closePath();
  ctx.fill();

  // Glass reflection sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(-w * (cabinW * 0.8), -h * 0.78);
  ctx.lineTo(-w * (cabinW * 0.1), -h * 0.78);
  ctx.lineTo(-w * (cabinBaseW * 0.2), -h * 0.56);
  ctx.lineTo(-w * (cabinBaseW * 0.65), -h * 0.56);
  ctx.closePath();
  ctx.fill();

  // 5. Taillights & Brake Lights
  const lightGlow = isBraking ? 'rgba(255, 20, 20, 0.95)' : 'rgba(239, 68, 68, 0.85)';
  const lightInner = isBraking ? '#ffffff' : '#f87171';

  if (modelType === 'tuner') {
    // Twin circular Skyline-style taillights on each side
    [-0.32, -0.23, 0.23, 0.32].forEach(offset => {
      const lightX = w * offset;
      const lightY = -h * 0.38;
      const r = 5.5 * scale;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(lightX, lightY, r + 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lightGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lightInner;
      ctx.beginPath();
      ctx.arc(lightX, lightY, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (modelType === 'hypercar') {
    // Continuous sleek horizontal LED lightbar
    const barY = -h * 0.42;
    const barW = w * 0.74;
    ctx.fillStyle = lightGlow;
    ctx.fillRect(-barW / 2, barY, barW, 4 * scale);
    ctx.fillStyle = lightInner;
    ctx.fillRect(-barW / 2, barY + 1 * scale, barW, 2 * scale);
  } else {
    // Angular sport lamps
    [-1, 1].forEach(side => {
      const lx = side * w * 0.31;
      const ly = -h * 0.39;
      const lampW = w * 0.11;
      const lampH = 8 * scale;

      ctx.fillStyle = lightGlow;
      ctx.beginPath();
      ctx.roundRect(lx - lampW / 2, ly, lampW, lampH, 2 * scale);
      ctx.fill();

      ctx.fillStyle = lightInner;
      ctx.beginPath();
      ctx.roundRect(lx - lampW * 0.35, ly + 2 * scale, lampW * 0.7, lampH * 0.4, 1 * scale);
      ctx.fill();
    });
  }

  // 6. Rear Spoiler / Wing
  const wingH = -h * 0.65;
  const wingW = w * 0.88;
  const wingThickness = 4.5 * scale;

  // Wing uprights / mounts
  ctx.fillStyle = '#171717';
  ctx.fillRect(-w * 0.22, wingH, 4 * scale, h * 0.18);
  ctx.fillRect(w * 0.22 - 4 * scale, wingH, 4 * scale, h * 0.18);

  // Carbon wing blade
  const wingGrad = ctx.createLinearGradient(0, wingH, 0, wingH + wingThickness);
  wingGrad.addColorStop(0, '#262626');
  wingGrad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.roundRect(-wingW / 2, wingH, wingW, wingThickness, 2 * scale);
  ctx.fill();

  // Endplates on spoiler
  [-wingW / 2, wingW / 2 - 2 * scale].forEach(epX => {
    ctx.fillStyle = '#171717';
    ctx.fillRect(epX, wingH - 4 * scale, 3 * scale, wingThickness + 8 * scale);
  });

  // Hypercar central stabilizer shark fin
  if (modelType === 'hypercar') {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-1.5 * scale, -h * 0.86);
    ctx.lineTo(1.5 * scale, -h * 0.86);
    ctx.lineTo(2 * scale, -h * 0.62);
    ctx.lineTo(-2 * scale, -h * 0.62);
    ctx.closePath();
    ctx.fill();
  }

  // 7. License Plate
  const plateW = 28 * scale;
  const plateH = 10 * scale;
  const plateY = -h * 0.26;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-plateW / 2, plateY, plateW, plateH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(-plateW / 2, plateY, plateW, plateH);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.max(6, Math.floor(6 * scale))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('APEX', 0, plateY + plateH / 2);

  ctx.restore(); // Undo tilt
  ctx.restore(); // Undo base translate
}
