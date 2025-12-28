import React, { useEffect, useRef } from 'react';
import { Balloon, GameState, Particle, Point, GameSettings } from '../types';
import { COLORS, MAX_PARTICLES, BALLOON_BASE_SPEED, SPAWN_RATE } from '../constants';
import { generateId, lerp, randomRange, distance } from '../utils/math';
import { soundService } from '../services/soundService';

interface GameCanvasProps {
  pointer: Point;
  isPinching: boolean;
  gameState: GameState;
  settings: GameSettings;
  onScoreUpdate: (score: number, combo: number) => void;
  onPop?: (x: number, y: number) => void;
  onCountsUpdate?: (popped: number, spawned: number, active: number) => void;
  onCleared?: () => void;
  totalBalloons?: number; // total to spawn for this level
  resetKey?: string; // change to force internal reset (e.g., level change)
  theme?: string; // themed target rendering
  width: number;
  height: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  pointer,
  isPinching,
  gameState,
  settings,
  onScoreUpdate,
  onPop,
  onCountsUpdate,
  onCleared,
  totalBalloons,
  resetKey,
  theme,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state refs (mutable for loop performance)
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);
  const cloudsRef = useRef<{x: number, y: number, scale: number, speed: number}[]>([]);
  const spawnedCountRef = useRef<number>(0);
  const poppedCountRef = useRef<number>(0);
  const clearedRef = useRef<boolean>(false);
  // Challenge state
  const lockUntilRef = useRef<number>(0); // trusted: unlock window
  const hoverStartRef = useRef<number>(0); // resilient: stabilize
  const hoverIdRef = useRef<string | null>(null);
  const stabilizedIdRef = useRef<string | null>(null);
  // Slingshot challenge
  const projectileRef = useRef<{x:number,y:number,vx:number,vy:number,active:boolean,power:number}|null>(null);
  const chargeStartRef = useRef<number>(0);
  const prevPinchRef = useRef<boolean>(false);
  // Capture capsule (UX/Vision): hover to capture bonus
  const capsuleRef = useRef<{x:number,y:number,active:boolean,spawn:number,captured:boolean}|null>(null);
  // Portals (Ecosystem): warp projectiles/targets between rings
  const portalsRef = useRef<{x:number,y:number,r:number,color:string}[]>([]);
  const portalCooldownRef = useRef<Record<string, number>>({});
  const projectilePortalCooldownRef = useRef<number>(0);
  // Process sequence: enforce order 1→2→3
  const seqIndexRef = useRef<number>(1);
  const seqMapRef = useRef<Record<string, number>>({});
  
  // Initialize Clouds
  useEffect(() => {
    cloudsRef.current = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * (height / 2),
      scale: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.5
    }));
    // Pre-place portals (triangle) used in Ecosystem theme
    const margin = 120;
    portalsRef.current = [
      { x: margin, y: height * 0.35, r: 28, color: '#8b5cf6' },
      { x: width - margin, y: height * 0.45, r: 28, color: '#06b6d4' },
      { x: width * 0.5, y: height * 0.25, r: 28, color: '#22c55e' },
    ];
  }, [width, height]);

  // Reset internal state on level changes (or when resetKey changes)
  useEffect(() => {
    balloonsRef.current = [];
    particlesRef.current = [];
    lastSpawnTimeRef.current = 0;
    lastShotTimeRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    spawnedCountRef.current = 0;
    poppedCountRef.current = 0;
    clearedRef.current = false;
    // Reset challenges
    lockUntilRef.current = 0;
    hoverStartRef.current = 0;
    hoverIdRef.current = null;
    stabilizedIdRef.current = null;
    projectileRef.current = null;
    chargeStartRef.current = 0;
    prevPinchRef.current = false;
    capsuleRef.current = null;
    portalCooldownRef.current = {};
    projectilePortalCooldownRef.current = 0;
    seqIndexRef.current = 1;
    seqMapRef.current = {};
  }, [resetKey]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const spawnBalloon = () => {
      if (typeof totalBalloons === 'number') {
        const active = balloonsRef.current.length;
        if ((poppedCountRef.current + active) >= totalBalloons) return; // maintain target population until popped
      }
      const radius = randomRange(22, 46);
      // Smaller balloons are faster and worth more
      const speedMultiplier = 1 + (50 - radius) / 60; // gentler scaling for small balloons
      
      // Determine speed based on difficulty
      const baseSpeed = BALLOON_BASE_SPEED[settings.difficulty];

      // HP based on theme (mini mechanics)
      const t = (theme || '').toLowerCase();
      let hp = 1;
      if (/trusted|security|governance/.test(t)) hp = 2; // shielded objects need 2 hits
      if (/foundation|data|knowledge/.test(t)) hp = 2; // sturdy data cylinders
      if (/platform/.test(t)) hp = 3; // racks are tougher
      const newId = generateId();
      const newBalloon: Balloon = {
        id: newId,
        x: randomRange(radius, width - radius),
        y: height + radius,
        radius,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: baseSpeed * speedMultiplier,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: randomRange(0.02, 0.05),
        isPopped: false,
        scoreValue: Math.floor(10 * speedMultiplier),
        hp
      };
      // Assign process sequence numbers 1-3 in a loop
      if (/process/.test(t)) {
        const count = Object.keys(seqMapRef.current).length;
        seqMapRef.current[newId] = (count % 3) + 1;
      }
      balloonsRef.current.push(newBalloon);
      spawnedCountRef.current += 1;
    };

    const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          id: generateId(),
          x,
          y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color,
          life: 1.0,
          maxLife: 1.0,
          size: randomRange(2, 5)
        });
      }
      // Limit particles
      if (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current = particlesRef.current.slice(particlesRef.current.length - MAX_PARTICLES);
      }
    };

    const drawThemed = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, idForSeq?: string) => {
      const t = (theme || '').toLowerCase();
      ctx.save();
      ctx.translate(x, y);
      // Default: balloon
      if (!t || t === 'balloon') {
        ctx.restore();
        return 'balloon';
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      switch (true) {
        case /executive|summary/.test(t): {
          // Star (executive highlight)
          const spikes = 5;
          const outer = r;
          const inner = r * 0.45;
          let rot = Math.PI / 2 * 3;
          let x = 0;
          let y = 0;
          const step = Math.PI / spikes;
          ctx.beginPath();
          ctx.moveTo(0, -outer);
          for (let i = 0; i < spikes; i++) {
            x = Math.cos(rot) * outer;
            y = Math.sin(rot) * outer;
            ctx.lineTo(x, y);
            rot += step;
            x = Math.cos(rot) * inner;
            y = Math.sin(rot) * inner;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.lineTo(0, -outer);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case /vision/.test(t): {
          // Compass (outer circle + needle)
          ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0,0,r*0.1,0,Math.PI*2); ctx.fill();
          ctx.save();
          ctx.rotate(-Math.PI/6);
          ctx.beginPath();
          ctx.moveTo(0, -r*0.8);
          ctx.lineTo(r*0.2, 0);
          ctx.lineTo(0, r*0.2);
          ctx.lineTo(-r*0.2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case /ux|user experience/.test(t): {
          // App window: rounded rect with header dots
          const w = r * 2.0, h = r * 1.5;
          const rx = 10;
          ctx.beginPath();
          ctx.moveTo(-w/2+rx, -h/2);
          ctx.arcTo(w/2, -h/2, w/2, h/2, rx);
          ctx.arcTo(w/2, h/2, -w/2, h/2, rx);
          ctx.arcTo(-w/2, h/2, -w/2, -h/2, rx);
          ctx.arcTo(-w/2, -h/2, w/2, -h/2, rx);
          ctx.fill();
          // header bar
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(-w/2+6, -h/2+6, w-12, 12);
          // dots
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-w/2+18, -h/2+12, 3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-w/2+32, -h/2+12, 3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(-w/2+46, -h/2+12, 3, 0, Math.PI*2); ctx.fill();
          break;
        }
        case /process/.test(t): {
          // Gear (simple)
          const teeth = 8;
          for (let i=0;i<teeth;i++){
            const a = (i/teeth)*Math.PI*2;
            ctx.save();
            ctx.rotate(a);
            ctx.fillRect(r*0.6, -4, r*0.25, 8);
            ctx.restore();
          }
          ctx.beginPath(); ctx.arc(0,0,r*0.6,0,Math.PI*2); ctx.fill();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath(); ctx.arc(0,0,r*0.25,0,Math.PI*2); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          // Overlay sequence number if assigned
          if (idForSeq && seqMapRef.current[idForSeq]) {
            ctx.fillStyle = 'white';
            ctx.font = `${Math.floor(r*0.8)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(seqMapRef.current[idForSeq]), 0, 2);
          }
          break;
        }
        case /foundation|data|knowledge/.test(t): {
          // Database cylinder
          const w = r*1.8, h = r*1.2;
          ctx.beginPath();
          ctx.ellipse(0,-h/2, w/2, 10, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillRect(-w/2, -h/2, w, h);
          ctx.beginPath(); ctx.ellipse(0, h/2, w/2, 10, 0, 0, Math.PI*2); ctx.fill();
          break;
        }
        case /platform/.test(t): {
          // Server rack
          const w=r*1.6,h=r*1.8;
          ctx.fillRect(-w/2,-h/2,w,h);
          ctx.fillStyle='#0ea5e9'; for(let i=0;i<4;i++){ctx.fillRect(-w/2+8,-h/2+8+i*18, w-16, 10);} 
          break;
        }
        case /trusted|security|governance/.test(t): {
          // Shield
          ctx.beginPath(); ctx.moveTo(0,-r);
          ctx.lineTo(r*0.7,-r*0.2); ctx.quadraticCurveTo(r,r*0.4,0,r);
          ctx.quadraticCurveTo(-r,r*0.4,-r*0.7,-r*0.2); ctx.closePath(); ctx.fill();
          break;
        }
        case /ecosystem/.test(t): {
          // Puzzle-like blocks
          ctx.fillRect(-r,-r, r, r);
          ctx.beginPath(); ctx.arc(0,-r/2, r/4, 0, Math.PI*2); ctx.fill();
          ctx.fillRect(0,0,r,r);
          break;
        }
        case /resilient/.test(t): {
          // Cloud
          ctx.beginPath(); ctx.arc(-r*0.4,0,r*0.6,0,Math.PI*2);
          ctx.arc(0,-r*0.3,r*0.7,0,Math.PI*2);
          ctx.arc(r*0.4,0,r*0.6,0,Math.PI*2); ctx.fill();
          break;
        }
        case /future|quantum/.test(t): {
          // Atom
          ctx.beginPath(); ctx.ellipse(0,0,r, r*0.3, 0, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0,0,r, r*0.3, Math.PI/3, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0,0,r, r*0.3, -Math.PI/3, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(r*0.6,0,3,0,Math.PI*2); ctx.fill();
          break;
        }
        default:
          // Unknown theme -> fallback to balloon
          ctx.restore();
          return 'balloon';
      }
      ctx.restore();
      return 'themed';
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Sky (Gradient) — tint by theme
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      if (theme && theme !== 'balloon') {
        gradient.addColorStop(0, '#0ea5e9'); // sky-500
        gradient.addColorStop(1, '#dbeafe'); // blue-100
      } else {
        gradient.addColorStop(0, '#38bdf8'); // sky-400
        gradient.addColorStop(1, '#bae6fd'); // sky-200
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      cloudsRef.current.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > width + 100) cloud.x = -100;
        
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 30 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 25 * cloud.scale, cloud.y - 10 * cloud.scale, 35 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 50 * cloud.scale, cloud.y, 30 * cloud.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Determine challenge type from theme
      const themeStr = (theme || '').toLowerCase();
      const isTrusted = /trusted|security|governance/.test(themeStr);
      const isResilient = /resilient/.test(themeStr);
      const isCapture = /user experience|ux|vision/.test(themeStr);
      const isProcess = /process/.test(themeStr);
      const isPortal = /ecosystem|integration/.test(themeStr);
      const slingshotMode = (settings as any).challenge === 'slingshot';

      // Game Logic only if PLAYING
      if (gameState === GameState.PLAYING) {
        // Spawning
        const spawnInterval = SPAWN_RATE[settings.difficulty]; // ms based on difficulty
        const target = typeof totalBalloons === 'number' ? totalBalloons : Infinity;
        const activeCount = balloonsRef.current.length;
        const needMore = (poppedCountRef.current + activeCount) < target;
        if (needMore && (time - lastSpawnTimeRef.current > spawnInterval)) {
          spawnBalloon();
          lastSpawnTimeRef.current = time;
        }

        // Shooting Logic
        const canShoot = time - lastShotTimeRef.current > 220; // cooldown
        const wasPinching = prevPinchRef.current;
        const nowPinching = isPinching;
        // Slingshot charge on pinch start
        if (slingshotMode && nowPinching && !wasPinching) {
          chargeStartRef.current = time;
        }
        // Slingshot fire on release
        if (slingshotMode && !nowPinching && wasPinching && chargeStartRef.current) {
          const charged = Math.min(1.2, (time - chargeStartRef.current) / 900);
          const speed = 8 + 12 * charged;
          projectileRef.current = { x: pointer.x, y: pointer.y, vx: 0, vy: -speed, active: true, power: charged };
          chargeStartRef.current = 0;
          soundService.playWhooshThemed(themeStr);
        }
        // Standard tap-to-pop
        if (!slingshotMode && nowPinching && canShoot) {
          lastShotTimeRef.current = time;
          soundService.playWhooshThemed(themeStr);

          // Trusted lock: unlock by hitting the lock icon (top-left)
          if (isTrusted) {
            const lx = 56, ly = 64, lr = 18;
            const dLock = Math.hypot(pointer.x - lx, pointer.y - ly);
            if (dLock < lr) {
              lockUntilRef.current = time + 8000; // 8s unlock window
            }
          }
          
          // Check collision (with slight aim-assist based on difficulty)
          let hit = false;
          // Iterate backwards to pop top-most balloon first
          for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
            const b = balloonsRef.current[i];
            const dist = distance({x: b.x, y: b.y}, pointer);
            const hitboxMultiplier = settings.difficulty === 'easy' ? 1.4 : settings.difficulty === 'medium' ? 1.2 : 1.0;
            // Allow "hold to pop" when pointer stays inside for a brief moment
            if (dist < b.radius * hitboxMultiplier) {
              // Resilient: require stabilization
              if (isResilient && stabilizedIdRef.current !== b.id) {
                // feedback pulse only
                createParticles(b.x, b.y, 'rgba(255,255,255,0.6)');
                hit = true;
                break;
              }
              // Trusted: require unlock window
              if (isTrusted && !(time < lockUntilRef.current)) {
                createParticles(b.x, b.y, 'rgba(255,255,255,0.6)');
                hit = true;
                break;
              }
              // Process sequence enforcement
              if (isProcess) {
                const need = seqIndexRef.current;
                const has = seqMapRef.current[b.id] || 1;
                if (has !== need) {
                  // Allow long-hover override to pop anyway (reduced score), but do NOT advance sequence
                  const canOverride = (hoverIdRef.current === b.id) && (time - (hoverStartRef.current || 0) > 800);
                  if (!canOverride) {
                    createParticles(b.x, b.y, 'rgba(255,255,255,0.6)');
                    hit = true;
                    break;
                  }
                }
              }
              // Damage or Pop
              if (b.hp && b.hp > 1) {
                b.hp -= 1;
                // feedback: small spark
                createParticles(b.x, b.y, 'rgba(255,255,255,0.8)');
              } else {
                b.isPopped = true;
                createParticles(b.x, b.y, b.color);
                soundService.playPopThemed(themeStr);
                if (onPop) onPop(b.x, b.y);
                // Spawn capture capsule for UX/Vision
                if (isCapture && !capsuleRef.current) {
                  capsuleRef.current = { x: b.x, y: b.y, active: true, spawn: time, captured: false };
                }
                if (isProcess) {
                  seqIndexRef.current = seqIndexRef.current >= 3 ? 1 : (seqIndexRef.current + 1);
                }
              }
              
              // Score Logic
              comboRef.current += 1;
              comboTimerRef.current = time + 2000; // 2s combo window
              const points = b.scoreValue * (1 + Math.floor(comboRef.current / 5) * 0.5);
              scoreRef.current += Math.floor(points);
              onScoreUpdate(scoreRef.current, comboRef.current);
              if (b.isPopped) {
                poppedCountRef.current += 1;
              }
              hit = true;
              break; // Only one target per shot
            }
          }

          if (!hit) {
             // No penalty for misses now
          }
        }
        prevPinchRef.current = nowPinching;

        // Combo decay
        if (time > comboTimerRef.current && comboRef.current > 0) {
          comboRef.current = 0;
          onScoreUpdate(scoreRef.current, 0);
        }
      }

      // 3. Update & Draw Balloons
      balloonsRef.current = balloonsRef.current.filter(b => b.y > -b.radius * 2 && !b.isPopped);
      // Resilient: stabilization tracking (hover pointer over a target to arm it)
      if (isResilient) {
        let nearestIdx = -1;
        let nearestDist = Infinity;
        for (let i = balloonsRef.current.length - 1; i >= 0; i--) {
          const b = balloonsRef.current[i];
          const d = distance({ x: b.x, y: b.y }, pointer);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
        const currentId = nearestIdx >= 0 ? balloonsRef.current[nearestIdx].id : null;
        const within = nearestDist < (nearestIdx >= 0 ? balloonsRef.current[nearestIdx].radius * 1.1 : 0);
        if (currentId && within) {
          if (hoverIdRef.current === currentId) {
            if (!hoverStartRef.current) hoverStartRef.current = time;
            const held = time - hoverStartRef.current;
            if (held > 600) {
              stabilizedIdRef.current = currentId;
            }
          } else {
            hoverIdRef.current = currentId;
            hoverStartRef.current = time;
            stabilizedIdRef.current = null;
          }
        } else {
          hoverIdRef.current = null;
          hoverStartRef.current = 0;
          stabilizedIdRef.current = null;
        }
      } else {
        stabilizedIdRef.current = null;
      }
      if (onCountsUpdate) {
        onCountsUpdate(poppedCountRef.current, (typeof totalBalloons === 'number' ? totalBalloons : Infinity) as number, balloonsRef.current.length);
      }
      if (!clearedRef.current && typeof totalBalloons === 'number' && poppedCountRef.current >= totalBalloons) {
        clearedRef.current = true;
        if (onCleared) onCleared();
      }
      balloonsRef.current.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(time * 0.003 + b.wobbleOffset) * 0.5; // Drift

        // Portals: warp balloons
        if (isPortal && portalsRef.current.length) {
          const cool = portalCooldownRef.current[b.id] || 0;
          if (time > cool) {
            for (let pi = 0; pi < portalsRef.current.length; pi++) {
              const p = portalsRef.current[pi];
              const d = Math.hypot(b.x - p.x, b.y - p.y);
              if (d < p.r) {
                const next = portalsRef.current[(pi + 1) % portalsRef.current.length];
                b.x = next.x + (Math.random()-0.5)*10;
                b.y = next.y + (Math.random()-0.5)*10;
                portalCooldownRef.current[b.id] = time + 600;
                break;
              }
            }
          }
        }

        // Draw themed target or default balloon
        const kind = drawThemed(ctx, b.x, b.y, b.radius, b.color, b.id);
        if (kind === 'balloon') {
          // Draw Balloon string
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + b.radius);
          ctx.quadraticCurveTo(b.x + Math.sin(time * 0.01) * 10, b.y + b.radius + 20, b.x, b.y + b.radius + 40);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.stroke();

          // Draw Balloon Body
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          
          // Shine
          ctx.beginPath();
          ctx.ellipse(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, b.radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fill();
        }
        // Draw stabilization ring on Resilient target
        if (isResilient && stabilizedIdRef.current !== b.id && hoverIdRef.current === b.id && hoverStartRef.current) {
          const pct = Math.min(1, (time - hoverStartRef.current) / 600);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });

      // Slingshot: update projectile and collisions
      if (slingshotMode) {
        const proj = projectileRef.current;
        if (proj && proj.active) {
          proj.x += proj.vx;
          proj.y += proj.vy;
          proj.vy += 0.18; // gravity
          // trail (lighter fade)
          createParticles(proj.x, proj.y, 'rgba(255,255,255,0.25)');
          // Portals warp for projectile
          if (isPortal && portalsRef.current.length && time > projectilePortalCooldownRef.current) {
            for (let pi = 0; pi < portalsRef.current.length; pi++) {
              const p = portalsRef.current[pi];
              const d = Math.hypot(proj.x - p.x, proj.y - p.y);
              if (d < p.r) {
                const next = portalsRef.current[(pi + 1) % portalsRef.current.length];
                proj.x = next.x; proj.y = next.y; // keep velocity
                projectilePortalCooldownRef.current = time + 400;
                break;
              }
            }
          }
          // collisions (piercing)
          let pierce = 1 + Math.floor((proj.power || 0) * 2); // up to 3
          for (let i = balloonsRef.current.length - 1; i >= 0 && pierce > 0; i--) {
            const b = balloonsRef.current[i];
            const distP = distance({x: b.x, y: b.y}, {x: proj.x, y: proj.y});
            if (distP < b.radius) {
              if (isResilient && stabilizedIdRef.current !== b.id) continue;
              if (isTrusted && !(performance.now() < lockUntilRef.current)) continue;
              if (isProcess) {
                const need = seqIndexRef.current;
                const has = seqMapRef.current[b.id] || 1;
                if (has !== need) {
                  const canOverride = (hoverIdRef.current === b.id) && (performance.now() - (hoverStartRef.current || 0) > 800);
                  if (!canOverride) { createParticles(b.x, b.y, 'rgba(255,255,255,0.6)'); continue; }
                }
              }
              if (b.hp && b.hp > 1) {
                b.hp -= 1; createParticles(b.x, b.y, 'rgba(255,255,255,0.8)');
              } else {
                b.isPopped = true; createParticles(b.x, b.y, b.color); soundService.playPopThemed(themeStr); if (onPop) onPop(b.x, b.y); poppedCountRef.current += 1;
                if (isCapture && !capsuleRef.current) capsuleRef.current = { x: b.x, y: b.y, active: true, spawn: performance.now(), captured: false };
                if (isProcess) seqIndexRef.current = seqIndexRef.current >= 3 ? 1 : (seqIndexRef.current + 1);
              }
              scoreRef.current += 12; onScoreUpdate(scoreRef.current, comboRef.current);
              pierce -= 1;
            }
          }
          if (proj.y < -40 || proj.y > height + 40) proj.active = false;
        }
      }

      // 4. Update & Draw Particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.life -= 0.05;

        ctx.globalAlpha = p.life;
        // Slight theme tint
        let tint = p.color;
        if (/trusted|security/.test(themeStr)) tint = 'rgba(255,255,255,0.8)';
        if (/platform/.test(themeStr)) tint = 'rgba(14,165,233,0.9)';
        if (/resilient/.test(themeStr)) tint = 'rgba(255,255,255,0.7)';
        if (/ux|vision/.test(themeStr)) tint = 'rgba(244,114,182,0.9)';
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 4b. Draw Slingshot projectile (visible bullet) and charge UI
      if (slingshotMode) {
        const proj = projectileRef.current;
        if (proj && proj.active) {
          const radius = 4 + Math.min(6, (proj.power || 0) * 6);
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(250,204,21,0.95)'; // amber bullet
          ctx.fill();
          // glow
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(250,204,21,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // Charge indicator around pointer while pinching
        if (isPinching && chargeStartRef.current) {
          const ratio = Math.min(1, (time - chargeStartRef.current) / 900);
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
          ctx.strokeStyle = 'rgba(250,204,21,0.9)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // 5. Draw aim assist highlight for closest balloon
      if (balloonsRef.current.length) {
        let closestIdx = -1;
        let closestDist = Infinity;
        for (let i = 0; i < balloonsRef.current.length; i++) {
          const b = balloonsRef.current[i];
          const d = distance({ x: b.x, y: b.y }, pointer);
          if (d < closestDist) { closestDist = d; closestIdx = i; }
        }
        if (closestIdx >= 0) {
          const b = balloonsRef.current[closestIdx];
          const near = closestDist < b.radius * 1.6;
          if (near) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(234,179,8,0.8)'; // amber
            ctx.lineWidth = 3;
            ctx.stroke();
            // If process sequence, show a faint ring on the next-in-order target
            if (/process/.test(themeStr) && seqMapRef.current[b.id] === seqIndexRef.current) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.radius + 12, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(59,130,246,0.65)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }
      }

      // Draw portals (Ecosystem)
      if (isPortal && portalsRef.current.length) {
        portalsRef.current.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r - 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // Process: highlight next-in-order targets + top chip
      if (isProcess) {
        const need = seqIndexRef.current;
        // ring on all balloons that are the next number
        for (let i = 0; i < balloonsRef.current.length; i++) {
          const b = balloonsRef.current[i];
          if (seqMapRef.current[b.id] === need) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(59,130,246,0.9)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
        // Top-center chip: Next: N
        const label = `Next: ${need}`;
        ctx.font = '14px system-ui, sans-serif';
        const textW = ctx.measureText(label).width + 16;
        const x = (width - textW) / 2, y = 18;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y, textW, 24);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x + 8, y + 16);
      }

      // Capture capsule (UX/Vision): hover to capture
      if (isCapture && capsuleRef.current && capsuleRef.current.active) {
        const cap = capsuleRef.current;
        // draw capsule
        ctx.beginPath(); ctx.arc(cap.x, cap.y, 12, 0, Math.PI*2); ctx.fillStyle = 'rgba(59,130,246,0.9)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cap.x, cap.y, 6, 0, Math.PI*2); ctx.fillStyle = 'white'; ctx.fill();
        const dcap = distance({x:cap.x,y:cap.y}, pointer);
        if (dcap < 20) {
          // capture after hover ~800ms
          if (!cap.captured) {
            if (cap.spawn === 0) cap.spawn = performance.now();
            if (performance.now() - cap.spawn > 800) {
              cap.captured = true; cap.active = false; scoreRef.current += 30; onScoreUpdate(scoreRef.current, comboRef.current);
              createParticles(cap.x, cap.y, 'rgba(59,130,246,0.9)');
            }
          }
        } else {
          // reset timer if moved away
          cap.spawn = performance.now();
        }
      }

      // 6. Draw Pointer
      // Crosshair outer
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 15, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPinching ? '#ef4444' : 'rgba(255, 255, 255, 0.8)';
      ctx.stroke();

      // Crosshair inner dot
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isPinching ? '#ef4444' : '#fff';
      ctx.fill();

      // Pinch indicator ring (shrinks when pinching)
      if (!isPinching) {
         ctx.beginPath();
         ctx.arc(pointer.x, pointer.y, 25, 0, Math.PI * 2);
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
         ctx.stroke();
      }

      // 7. Draw Trusted lock icon (top-left) when active
      if (isTrusted) {
        const act = !(time < lockUntilRef.current);
        const lx = 56, ly = 64, lr = 18;
        ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI*2);
        ctx.fillStyle = act ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.8)';
        ctx.fill();
        // lock glyph
        ctx.fillStyle = '#fff';
        ctx.fillRect(lx-6, ly-2, 12, 10);
        ctx.beginPath(); ctx.arc(lx, ly-5, 6, Math.PI, 0); ctx.strokeStyle = '#fff'; ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [width, height, pointer, isPinching, gameState, settings]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-0 touch-none cursor-none"
    />
  );
};

export default GameCanvas;
