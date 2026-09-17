import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Flashlight, 
  DoorClosed, 
  DoorOpen, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ArrowLeft,
  Flame,
  AlertTriangle,
  Compass,
  Trophy,
  MousePointer,
  Music,
  RotateCw,
  Sparkles,
  Radio,
  Activity,
  Radar
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { GhostType } from '../types';
import { GhostFace } from './GhostFace';

interface MazeGame3DProps {
  onBackToMenu: () => void;
}

interface Closet {
  mesh: THREE.Group;
  x: number;
  z: number;
}

interface Ghost {
  id: string;
  type: GhostType;
  mesh: THREE.Group;
  x: number;
  z: number;
  initialX: number;
  initialZ: number;
  speed: number;
  state: 'PATROL' | 'CHASE' | 'LOST' | 'DORMANT';
  patrolTarget: { x: number; z: number };
  soundTimer: number;
  animTimer: number;
}

export interface RadarBlip {
  id: number;
  type: GhostType;
  dist: number;
  fwdDot: number;
  rightDot: number;
  angle: number;
  dirLabel: 'DEPAN' | 'BELAKANG' | 'KIRI' | 'KANAN';
  isChasing: boolean;
}

// Procedural Maze Generator for Levels 1 to 20
// Creates deep labyrinths where the exit is hidden at the farthest remote dead-end
function generateLevelMaze(level: number): { grid: number[][]; size: number; exitPos: { r: number; c: number } } {
  // Start at 17x17 for Level 1, expanding up to 27x27 for true labyrinthine difficulty
  const baseSize = Math.min(27, 17 + Math.floor((level - 1) / 2) * 2);
  const size = baseSize % 2 === 0 ? baseSize + 1 : baseSize;
  const grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(1));

  function carve(r: number, c: number) {
    grid[r][c] = 0;
    const dirs = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1 && grid[nr][nc] === 1) {
        grid[r + dr / 2][c + dc / 2] = 0;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);

  // Add subtle cross passages to create deceptive multiple paths
  for (let r = 2; r < size - 2; r += 2) {
    for (let c = 2; c < size - 2; c += 2) {
      if (Math.random() < 0.14) {
        grid[r][c] = 0;
      }
    }
  }

  // BFS search to locate the farthest, deepest dead-end from player spawn (1, 1)
  const distMap: number[][] = Array(size).fill(0).map(() => Array(size).fill(-1));
  const queue: [number, number][] = [[1, 1]];
  distMap[1][1] = 0;

  let maxDist = 0;
  let farthestDeadEnd = { r: size - 2, c: size - 2 };

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const curDist = distMap[cr][cc];

    const neighbors = [
      [cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]
    ];
    let openPassages = 0;

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== 1) {
        openPassages++;
        if (distMap[nr][nc] === -1) {
          distMap[nr][nc] = curDist + 1;
          queue.push([nr, nc]);
        }
      }
    }

    // Prioritize true dead-ends (openPassages === 1) that are deeply buried in the maze
    if ((openPassages === 1 && curDist > maxDist) || curDist > maxDist + 4) {
      maxDist = curDist;
      farthestDeadEnd = { r: cr, c: cc };
    }
  }

  // Closets placed strategically along corridors
  let closetsCount = 0;
  const desiredClosets = Math.min(8, 3 + Math.floor(level / 3));
  for (let r = 2; r < size - 1; r++) {
    for (let c = 2; c < size - 1; c++) {
      if (grid[r][c] === 0 && !(r === 1 && c === 1) && !(r === farthestDeadEnd.r && c === farthestDeadEnd.c)) {
        if (closetsCount < desiredClosets && Math.random() < 0.12) {
          grid[r][c] = 2;
          closetsCount++;
        }
      }
    }
  }

  // Set exit at the farthest remote dead-end
  grid[farthestDeadEnd.r][farthestDeadEnd.c] = 3;

  return { grid, size, exitPos: farthestDeadEnd };
}

const CELL_SIZE = 4;

export default function MazeGame3D({ onBackToMenu }: MazeGame3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Current Level State (1 to 20)
  const [level, setLevel] = useState(1);
  const [levelCleared, setLevelCleared] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Game UI States
  const [flashlightOn, setFlashlightOn] = useState(true);
  const [isNearCloset, setIsNearCloset] = useState(false);
  const [isHiddenInCloset, setIsHiddenInCloset] = useState(false);
  const [activeClosetId, setActiveClosetId] = useState<number | null>(null);
  const [stamina, setStamina] = useState(100);
  const [isSprinting, setIsSprinting] = useState(false);
  const [ghostAlert, setGhostAlert] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [caughtBy, setCaughtBy] = useState<GhostType | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [distanceToExit, setDistanceToExit] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const [currentLyric, setCurrentLyric] = useState<string>("Detak jantungmu berpacu kencang...");
  const [corridorJumpscare, setCorridorJumpscare] = useState<GhostType | null>(null);
  const [radarBlips, setRadarBlips] = useState<RadarBlip[]>([]);
  const [closestThreat, setClosestThreat] = useState<RadarBlip | null>(null);
  const [showRadar, setShowRadar] = useState(true);
  const [awakeningSecondsLeft, setAwakeningSecondsLeft] = useState(12);
  const [justAwakenedBanner, setJustAwakenedBanner] = useState(false);
  const awakeningSecsRef = useRef(12);

  // Mutable Game References
  const stateRef = useRef({
    cameraYaw: 0,
    cameraPitch: 0,
    playerPos: new THREE.Vector3(CELL_SIZE * 1.5, 1.6, CELL_SIZE * 1.5),
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    turnLeft: false,
    turnRight: false,
    cursorNormalizedX: 0,
    cursorNormalizedY: 0,
    isSprinting: false,
    stamina: 100,
    flashlightOn: true,
    isHiddenInCloset: false,
    activeClosetIndex: -1,
    gameOver: false,
    hasEscaped: false,
    stepTimer: 0,
    heartbeatTimer: 0,
    corridorJumpscareTimer: 0,
    radarUpdateTimer: 0,
    awakeningTimer: 12.0,
  });

  const lastClientPos = useRef<{ x: number; y: number } | null>(null);
  const closetsRef = useRef<Closet[]>([]);
  const ghostsRef = useRef<Ghost[]>([]);
  const flashlightRef = useRef<THREE.SpotLight | null>(null);
  const exitPortalRef = useRef<THREE.Group | null>(null);
  const jumpscareGhostMeshRef = useRef<THREE.Group | null>(null);
  const mazeDataRef = useRef(generateLevelMaze(1));
  const isNearClosetRef = useRef(false);
  const openWalkableCellsRef = useRef<{ r: number; c: number; x: number; z: number; distToPlayer: number }[]>([]);

  // Subscribe to real-time lyric cues from soundManager
  useEffect(() => {
    soundManager.onLyric((lyric) => {
      setCurrentLyric(lyric);
    });
  }, []);

  // Procedural Wall Texture
  const createWallTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2d2d34';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#18181f';
    ctx.lineWidth = 4;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();

      const offset = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = offset; x < 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }

    // Moss, mould and dried blood stains on stone walls
    ctx.fillStyle = 'rgba(25, 45, 25, 0.4)';
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 8 + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bloody handprint smears
    ctx.fillStyle = 'rgba(110, 10, 10, 0.35)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(Math.random() * 200, Math.random() * 200, 16, 28);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  const createWoodTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3c2415';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#1f1107';
    for (let y = 0; y < 128; y += 8) {
      ctx.fillRect(0, y, 128, 2);
    }
    return new THREE.CanvasTexture(canvas);
  };

  // --- HORROR PROCEDURAL TEXTURES FOR GHOSTS ---

  // 1. POCONG PROCEDURAL TEXTURES (Kain Kafan Kotor & Wajah Mayat Busuk Menyeramkan)
  const createPocongShroudTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dirty yellow-grey shroud base
    ctx.fillStyle = '#b5ad9e';
    ctx.fillRect(0, 0, 512, 512);

    // Rough burlap/cotton fabric weave
    ctx.strokeStyle = '#999283';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }

    // Grave dirt, burial mud stains
    for (let i = 0; i < 45; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rad = Math.random() * 40 + 10;
      const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      grad.addColorStop(0, 'rgba(25, 18, 12, 0.65)');
      grad.addColorStop(1, 'rgba(25, 18, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Creases & tight rope bind shadow bands
    for (let y = 50; y < 512; y += 70) {
      ctx.fillStyle = 'rgba(20, 14, 8, 0.45)';
      ctx.fillRect(0, y, 512, 10);
      ctx.fillStyle = 'rgba(225, 218, 202, 0.25)';
      ctx.fillRect(0, y + 10, 512, 4);
    }

    // Dark crimson dried blood stains and dripping fresh blood
    for (let i = 0; i < 22; i++) {
      const bx = Math.random() * 512;
      const by = Math.random() * 380 + 60;
      const bRad = Math.random() * 20 + 8;
      ctx.fillStyle = 'rgba(125, 8, 8, 0.9)';
      ctx.beginPath();
      ctx.arc(bx, by, bRad, 0, Math.PI * 2);
      ctx.fill();

      // Drip trail
      ctx.strokeStyle = 'rgba(145, 10, 10, 0.95)';
      ctx.lineWidth = Math.random() * 5 + 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (Math.random() - 0.5) * 6, by + Math.random() * 55 + 20);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };

  const createPocongFaceTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rotting sickly greenish-grey dead flesh
    ctx.fillStyle = '#343e33';
    ctx.fillRect(0, 0, 512, 512);

    // Decomposing necrotic dark patches
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const rad = Math.random() * 45 + 10;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
      grad.addColorStop(0, 'rgba(10, 15, 10, 0.75)');
      grad.addColorStop(1, 'rgba(10, 15, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hollow pitch-black eye sockets
    ctx.fillStyle = '#030303';
    ctx.beginPath();
    ctx.ellipse(170, 210, 48, 56, 0, 0, Math.PI * 2);
    ctx.ellipse(342, 210, 48, 56, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bleeding dark necrotic tears streaming down
    for (const eyeX of [165, 175, 335, 345]) {
      ctx.strokeStyle = 'rgba(120, 5, 5, 0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(eyeX, 235);
      ctx.lineTo(eyeX + (Math.random() - 0.5) * 8, 420);
      ctx.stroke();
    }

    // Glowing demonic crimson pinprick pupils
    ctx.fillStyle = '#ff1100';
    ctx.beginPath();
    ctx.arc(170, 210, 12, 0, Math.PI * 2);
    ctx.arc(342, 210, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(170, 210, 4, 0, Math.PI * 2);
    ctx.arc(342, 210, 4, 0, Math.PI * 2);
    ctx.fill();

    // Gaping screaming open black mouth
    ctx.fillStyle = '#040404';
    ctx.beginPath();
    ctx.ellipse(256, 380, 80, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bloody gums and jagged rotted teeth
    ctx.fillStyle = '#8b0e0e';
    ctx.fillRect(180, 325, 152, 12);
    ctx.fillRect(185, 420, 142, 12);

    ctx.fillStyle = '#d5cca0';
    // Upper jagged teeth
    for (let x = 190; x <= 320; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x - 5, 332);
      ctx.lineTo(x, 355 + (x % 28 === 0 ? 6 : 0));
      ctx.lineTo(x + 5, 332);
      ctx.fill();
    }
    // Lower jagged teeth
    for (let x = 195; x <= 315; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x - 5, 424);
      ctx.lineTo(x, 402);
      ctx.lineTo(x + 5, 424);
      ctx.fill();
    }

    // Corpse wrinkles & stitches
    ctx.strokeStyle = 'rgba(15, 20, 15, 0.8)';
    ctx.lineWidth = 2.5;
    for (let y = 100; y <= 160; y += 14) {
      ctx.beginPath();
      ctx.moveTo(170, y);
      ctx.quadraticCurveTo(256, y - 10, 342, y);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  };

  // 2. KUNTILANAK PROCEDURAL TEXTURES (Gaun Terkoyak Berdarah & Wajah Pucat Mayat)
  const createKuntilanakDressTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Pale tattered dress with cemetery grime
    ctx.fillStyle = '#d8d8de';
    ctx.fillRect(0, 0, 512, 512);

    // Mud and dirt on lower dress hem
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(215, 215, 220, 0)');
    grad.addColorStop(0.65, 'rgba(35, 35, 40, 0.35)');
    grad.addColorStop(1, 'rgba(12, 12, 16, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Streaks of fresh and dried blood pouring down chest and robe
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const startY = Math.random() * 180 + 30;
      const len = Math.random() * 280 + 50;
      ctx.strokeStyle = 'rgba(165, 12, 12, 0.92)';
      ctx.lineWidth = Math.random() * 6 + 2;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x + (Math.random() - 0.5) * 14, startY + len);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  };

  const createKuntilanakFaceTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ghastly deathly chalk-white skin
    ctx.fillStyle = '#e8e8ee';
    ctx.fillRect(0, 0, 512, 512);

    // Black & purple necrotic spider veins
    ctx.strokeStyle = 'rgba(35, 20, 40, 0.65)';
    ctx.lineWidth = 1.6;
    const drawVein = (sx: number, sy: number) => {
      let cx = sx;
      let cy = sy;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 6; j++) {
        cx += (Math.random() - 0.5) * 28;
        cy += Math.random() * 24;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    };
    for (let i = 0; i < 15; i++) {
      drawVein(Math.random() * 320 + 90, Math.random() * 160 + 70);
    }

    // Sunken weeping bleeding eyes
    ctx.fillStyle = '#040404';
    ctx.beginPath();
    ctx.ellipse(175, 200, 44, 52, 0, 0, Math.PI * 2);
    ctx.ellipse(337, 200, 44, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blood streams running down cheeks
    for (const eyeX of [170, 180, 332, 342]) {
      ctx.strokeStyle = 'rgba(175, 8, 8, 0.96)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(eyeX, 230);
      ctx.lineTo(eyeX + (Math.random() - 0.5) * 8, 440);
      ctx.stroke();
    }

    // Glowing pupil dots
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(175, 200, 9, 0, Math.PI * 2);
    ctx.arc(337, 200, 9, 0, Math.PI * 2);
    ctx.fill();

    // Wide distended screaming mouth
    ctx.fillStyle = '#060202';
    ctx.beginPath();
    ctx.ellipse(256, 375, 75, 88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Razor-sharp needle teeth
    ctx.fillStyle = '#e2e2d8';
    for (let x = 190; x <= 320; x += 11) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 305);
      ctx.lineTo(x, 330);
      ctx.lineTo(x + 3, 305);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - 3, 445);
      ctx.lineTo(x, 420);
      ctx.lineTo(x + 3, 445);
      ctx.fill();
    }

    // Black wet strands of hair partially covering her face
    ctx.strokeStyle = 'rgba(8, 8, 8, 0.9)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 24; i++) {
      const hx = Math.random() * 420 + 45;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.bezierCurveTo(hx + 25, 170, hx - 25, 340, hx + 15, 512);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  };

  // 3. GENDERUWO PROCEDURAL TEXTURES (Bulu Siluman Hitam Pekat & Muka Iblis Bertaring)
  const createGenderuwoFurTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#110b07';
    ctx.fillRect(0, 0, 512, 512);

    // Thick shaggy beast fur
    ctx.strokeStyle = '#22150e';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 600; i++) {
      const fx = Math.random() * 512;
      const fy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + (Math.random() - 0.5) * 10, fy + Math.random() * 24 + 8);
      ctx.stroke();
    }

    // Fresh vicious blood claw gashes
    ctx.strokeStyle = 'rgba(160, 15, 15, 0.85)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * 400 + 40;
      const cy = Math.random() * 400 + 40;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 14, cy);
        ctx.lineTo(cx + k * 14 + 40, cy + 70);
        ctx.stroke();
      }
    }

    return new THREE.CanvasTexture(canvas);
  };

  const createGenderuwoFaceTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Demonic beast skin
    ctx.fillStyle = '#170c07';
    ctx.fillRect(0, 0, 512, 512);

    // Fiery blood-red burning eyes with slit pupils
    ctx.fillStyle = '#ff1100';
    ctx.beginPath();
    ctx.ellipse(170, 185, 38, 26, 0, 0, Math.PI * 2);
    ctx.ellipse(342, 185, 38, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffee00';
    ctx.fillRect(166, 172, 8, 26);
    ctx.fillRect(338, 172, 8, 26);

    // Gaping snarling demonic maw
    ctx.fillStyle = '#080302';
    ctx.beginPath();
    ctx.ellipse(256, 360, 105, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Giant protruding upward curved tusks
    ctx.fillStyle = '#f0e0a5';
    // Left giant tusk
    ctx.beginPath();
    ctx.moveTo(170, 420);
    ctx.lineTo(185, 290);
    ctx.lineTo(210, 420);
    ctx.fill();
    // Right giant tusk
    ctx.beginPath();
    ctx.moveTo(342, 420);
    ctx.lineTo(327, 290);
    ctx.lineTo(302, 420);
    ctx.fill();

    // Sharp fangs dripping blood
    for (let x = 205; x <= 305; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x - 7, 305);
      ctx.lineTo(x, 345);
      ctx.lineTo(x + 7, 305);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  };

  // --- DETAILED 3D MODELS (Pocong, Kuntilanak, Genderuwo) ---

  const createPocongModel = (isJumpscare = false) => {
    const group = new THREE.Group();
    const shroudTex = createPocongShroudTexture();
    const faceTex = createPocongFaceTexture();

    const shroudMat = new THREE.MeshStandardMaterial({ 
      map: shroudTex, 
      roughness: 0.9,
      bumpScale: 0.05
    });
    const faceMat = new THREE.MeshStandardMaterial({ 
      map: faceTex, 
      roughness: 0.85 
    });
    const ropeMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a3c2c, 
      roughness: 1.0 
    });

    // Wrapped Shroud Torso (bulging with realistic dead body curves)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.35, 1.4, 16), shroudMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    group.add(torso);

    // Bound feet wrapping (tapered tightly at bottom)
    const feet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.18, 0.6, 16), shroudMat);
    feet.position.y = 0.3;
    group.add(feet);

    // TALI POCONG 1: Ikatan Kaki (Feet Rope Bind)
    const footRope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 16), ropeMat);
    footRope.rotation.x = Math.PI / 2;
    footRope.position.y = 0.25;
    group.add(footRope);

    // Head Shroud Wrapping
    const headWrap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), shroudMat);
    headWrap.position.set(0, 1.85, 0);
    group.add(headWrap);

    // TALI POCONG 2: Ikatan Leher (Neck Rope Bind - mencekik leher)
    const neckRope = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 16), ropeMat);
    neckRope.rotation.x = Math.PI / 2;
    neckRope.position.y = 1.7;
    group.add(neckRope);

    // TALI POCONG 3: Ikatan Pocong Atas Kepala (Knotted Top Cloth Bun & Twine)
    const knotTop = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 8), shroudMat);
    knotTop.position.y = 2.4;
    group.add(knotTop);

    const knotRope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16), ropeMat);
    knotRope.rotation.x = Math.PI / 2;
    knotRope.position.y = 2.15;
    group.add(knotRope);

    // Decayed Corpse Face
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), faceMat);
    faceMesh.position.set(0, 1.85, 0.12);
    faceMesh.rotation.y = 0;
    group.add(faceMesh);

    // Glowing Red Demonic Eye Embers
    const eyeLight = new THREE.PointLight(0xff0000, isJumpscare ? 5.5 : 3.2, 7);
    eyeLight.position.set(0, 1.88, 0.45);
    group.add(eyeLight);

    return group;
  };

  const createKuntilanakModel = (isJumpscare = false) => {
    const group = new THREE.Group();
    const dressTex = createKuntilanakDressTexture();
    const faceTex = createKuntilanakFaceTexture();

    const dressMat = new THREE.MeshStandardMaterial({ 
      map: dressTex, 
      transparent: true, 
      opacity: 0.93,
      roughness: 0.6 
    });
    const faceMat = new THREE.MeshStandardMaterial({ 
      map: faceTex, 
      roughness: 0.7 
    });
    const hairMat = new THREE.MeshBasicMaterial({ color: 0x030303 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 0.3 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8d8de, roughness: 0.8 });

    // Flowing ragged gown
    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 16, 1, true), dressMat);
    dress.position.y = 1.0;
    group.add(dress);

    // Floating torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.35, 0.9, 12), dressMat);
    torso.position.y = 1.55;
    group.add(torso);

    // Terrifying Ghastly Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), faceMat);
    head.position.set(0, 1.95, 0.04);
    group.add(head);

    // RAMBUT PANJANG MENJELUR (Long Wild Cascading Black Hair)
    // Back hair flowing down past the waist
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 1.9, 12), hairMat);
    backHair.position.set(0, 1.35, -0.15);
    group.add(backHair);

    // Side hair drapes over shoulders
    const leftHair = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.4, 8), hairMat);
    leftHair.position.set(-0.25, 1.45, 0.05);
    const rightHair = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.4, 8), hairMat);
    rightHair.position.set(0.25, 1.45, 0.05);
    group.add(leftHair, rightHair);

    // Thin Strands of hair hanging loose over the front of her face
    const frontHairStrands = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.65), hairMat);
    frontHairStrands.position.set(0, 1.85, 0.28);
    frontHairStrands.rotation.x = -0.1;
    group.add(frontHairStrands);

    // OUTSTRETCHED BONY ARMS WITH BLOODY BLACK CLAWS (Menerkam Maju)
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.75, 8);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.45, 1.6, 0.35);
    armL.rotation.x = Math.PI / 2.3;
    armL.rotation.z = -0.2;

    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.45, 1.6, 0.35);
    armR.rotation.x = Math.PI / 2.3;
    armR.rotation.z = 0.2;
    group.add(armL, armR);

    // Bloody Claws
    const clawGeo = new THREE.ConeGeometry(0.03, 0.2, 6);
    const clawL = new THREE.Mesh(clawGeo, clawMat);
    clawL.position.set(-0.48, 1.6, 0.72);
    clawL.rotation.x = Math.PI / 2;
    const clawR = new THREE.Mesh(clawGeo, clawMat);
    clawR.position.set(0.48, 1.6, 0.72);
    clawR.rotation.x = Math.PI / 2;
    group.add(clawL, clawR);

    // Ghostly floating cyan & red aura
    const aura = new THREE.PointLight(0x5eead4, isJumpscare ? 4.5 : 2.2, 7);
    aura.position.set(0, 1.7, 0.2);
    group.add(aura);

    const redUnderglow = new THREE.PointLight(0xff0022, 2.0, 5);
    redUnderglow.position.set(0, 1.1, 0);
    group.add(redUnderglow);

    return group;
  };

  const createGenderuwoModel = (isJumpscare = false) => {
    const group = new THREE.Group();
    const furTex = createGenderuwoFurTexture();
    const faceTex = createGenderuwoFaceTexture();

    const furMat = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.95 });
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1f140d, roughness: 0.8 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xdfd29d, roughness: 0.6 });

    // Towering Hulking Torso (over 3m tall monster!)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 1.1), furMat);
    torso.position.y = 1.9;
    torso.castShadow = true;
    group.add(torso);

    // Glowing red cracked demonic chest core
    const chestCore = new THREE.PointLight(0xff1100, 4.0, 8);
    chestCore.position.set(0, 2.0, 0.7);
    group.add(chestCore);

    // Thick Hulking Beast Legs
    const legGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.3, 8);
    const leftLeg = new THREE.Mesh(legGeo, furMat);
    leftLeg.position.set(-0.48, 0.65, 0);
    const rightLeg = new THREE.Mesh(legGeo, furMat);
    rightLeg.position.set(0.48, 0.65, 0);
    group.add(leftLeg, rightLeg);

    // Massive Menacing Arms with Claws (hanging low)
    const armGeo = new THREE.CylinderGeometry(0.25, 0.22, 1.7, 8);
    const armL = new THREE.Mesh(armGeo, furMat);
    armL.position.set(-0.95, 1.7, 0.15);
    armL.rotation.z = 0.2;
    armL.rotation.x = 0.3;

    const armR = new THREE.Mesh(armGeo, furMat);
    armR.position.set(0.95, 1.7, 0.15);
    armR.rotation.z = -0.2;
    armR.rotation.x = 0.3;
    group.add(armL, armR);

    // Demonic Beast Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 0.75), faceMat);
    head.position.set(0, 3.0, 0.25);
    group.add(head);

    // Curved Demonic Horns
    const hornGeo = new THREE.ConeGeometry(0.12, 0.7, 8);
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.35, 3.5, 0.1);
    hornL.rotation.z = -0.4;
    hornL.rotation.x = -0.3;

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.35, 3.5, 0.1);
    hornR.rotation.z = 0.4;
    hornR.rotation.x = -0.3;
    group.add(hornL, hornR);

    // Giant Curved Protruding Tusks on Lower Jaw
    const tuskGeo = new THREE.ConeGeometry(0.08, 0.5, 8);
    const tuskL = new THREE.Mesh(tuskGeo, tuskMat);
    tuskL.position.set(-0.25, 2.85, 0.65);
    tuskL.rotation.x = -Math.PI / 4;
    const tuskR = new THREE.Mesh(tuskGeo, tuskMat);
    tuskR.position.set(0.25, 2.85, 0.65);
    tuskR.rotation.x = -Math.PI / 4;
    group.add(tuskL, tuskR);

    // Blazing Demonic Headlight Eyes
    const redLight = new THREE.PointLight(0xff0000, isJumpscare ? 6.0 : 4.2, 9);
    redLight.position.set(0, 3.05, 0.75);
    group.add(redLight);

    return group;
  };

  const createClosetModel = () => {
    const group = new THREE.Group();
    const woodTexture = createWoodTexture();
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.8 });

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 1.0), woodMat);
    cabinet.position.y = 1.25;
    group.add(cabinet);

    const slatMat = new THREE.MeshStandardMaterial({ color: 0x1f120a });
    for (let y = 0.4; y < 2.2; y += 0.22) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.04), slatMat);
      slat.position.set(0, y, 0.51);
      group.add(slat);
    }

    const bulb = new THREE.PointLight(0xf59e0b, 1.4, 4.5);
    bulb.position.set(0, 2.6, 0);
    group.add(bulb);

    return group;
  };

  const toggleClosetHide = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || s.hasEscaped) return;

    if (!s.isHiddenInCloset) {
      const closets = closetsRef.current;
      let nearestIdx = -1;
      let minDist = 3.0;

      closets.forEach((c, idx) => {
        const dist = Math.hypot(s.playerPos.x - c.x, s.playerPos.z - c.z);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      if (nearestIdx !== -1) {
        s.isHiddenInCloset = true;
        s.activeClosetIndex = nearestIdx;
        setIsHiddenInCloset(true);
        setActiveClosetId(nearestIdx);
        soundManager.playClosetCreak(true);

        ghostsRef.current.forEach((g) => {
          if (g.state === 'CHASE') {
            g.state = 'LOST';
          }
        });
        setGhostAlert('Hantu kehilangan jejakmu! Tetap diam di dalam lemari...');
      }
    } else {
      s.isHiddenInCloset = false;
      s.activeClosetIndex = -1;
      setIsHiddenInCloset(false);
      setActiveClosetId(null);
      soundManager.playClosetCreak(false);
      setGhostAlert(null);
    }
  }, []);

  // Initialize Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let animationFrameId: number;

    const currentMaze = generateLevelMaze(level);
    mazeDataRef.current = currentMaze;
    const { grid, size, exitPos } = currentMaze;

    stateRef.current.playerPos.set(CELL_SIZE * 1.5, 1.6, CELL_SIZE * 1.5);
    stateRef.current.gameOver = false;
    stateRef.current.hasEscaped = false;
    stateRef.current.isHiddenInCloset = false;
    stateRef.current.cursorNormalizedX = 0;
    stateRef.current.cursorNormalizedY = 0;
    setGameOver(false);
    setLevelCleared(false);
    setIsHiddenInCloset(false);
    setCaughtBy(null);
    setStamina(100);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x12121e, 0.04);
    scene.background = new THREE.Color(0x12121e);

    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      65
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Bright, clear ambient lighting
    const ambientLight = new THREE.AmbientLight(0x35354a, 0.95);
    scene.add(ambientLight);

    // Flashlight (Senter)
    const flashlight = new THREE.SpotLight(0xffeed6, 4.5, 30, Math.PI / 4.5, 0.45, 1.0);
    flashlight.castShadow = true;
    scene.add(flashlight);
    scene.add(flashlight.target);
    flashlightRef.current = flashlight;

    // Walls & Floor
    const wallTexture = createWallTexture();
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.8,
    });

    const floorGeo = new THREE.PlaneGeometry(size * CELL_SIZE, size * CELL_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x30303a,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((size * CELL_SIZE) / 2, 0, (size * CELL_SIZE) / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.95 });
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((size * CELL_SIZE) / 2, 3.4, (size * CELL_SIZE) / 2);
    scene.add(ceiling);

    const closets: Closet[] = [];
    const exitWorldPos = { x: exitPos.c * CELL_SIZE + CELL_SIZE / 2, z: exitPos.r * CELL_SIZE + CELL_SIZE / 2 };

    const openWalkableCells: { r: number; c: number; x: number; z: number; distToPlayer: number }[] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid[r][c];
        const wx = c * CELL_SIZE + CELL_SIZE / 2;
        const wz = r * CELL_SIZE + CELL_SIZE / 2;

        if (val === 1) {
          const wallGeo = new THREE.BoxGeometry(CELL_SIZE, 3.4, CELL_SIZE);
          const wall = new THREE.Mesh(wallGeo, wallMaterial);
          wall.position.set(wx, 1.7, wz);
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);
        } else if (val === 2) {
          const closet = createClosetModel();
          closet.position.set(wx, 0, wz);
          scene.add(closet);
          closets.push({ mesh: closet, x: wx, z: wz });
        } else if (val === 3) {
          const portalGroup = new THREE.Group();
          
          // Ancient mossy stone portal pillars
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
          const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), pillarMat);
          leftPillar.position.set(-1.4, 1.7, 0);
          const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), pillarMat);
          rightPillar.position.set(1.4, 1.7, 0);
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.5, 0.55), pillarMat);
          lintel.position.set(0, 3.2, 0);
          portalGroup.add(leftPillar, rightPillar, lintel);

          // Glowing ancient inscription runes on pillars (Emerald)
          const runeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
          const runeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.46), runeMat);
          runeLeft.position.set(-1.4, 1.7, 0);
          const runeRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.46), runeMat);
          runeRight.position.set(1.4, 1.7, 0);
          portalGroup.add(runeLeft, runeRight);

          // Outer swirling emerald vortex ring
          const outerRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.3, 0.09, 16, 36),
            new THREE.MeshBasicMaterial({ color: 0x10b981 })
          );
          outerRing.position.set(0, 1.6, 0);
          portalGroup.add(outerRing);

          // Inner rotating cyan-emerald energy ring
          const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.85, 0.06, 16, 32),
            new THREE.MeshBasicMaterial({ color: 0x34d399 })
          );
          innerRing.position.set(0, 1.6, 0);
          portalGroup.add(innerRing);

          // Ethereal emerald glowing portal core disc
          const discMat = new THREE.MeshBasicMaterial({
            color: 0x059669,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), discMat);
          portalDisc.position.set(0, 1.6, 0);
          portalGroup.add(portalDisc);

          // Upward spiritual beacon beam (Cahaya Hijau Menjulang Tinggi)
          const beamMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
          });
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3.4, 16, 1, true), beamMat);
          beam.position.set(0, 1.7, 0);
          portalGroup.add(beam);

          // High intensity Ethereal Emerald exit light that floods the corridor
          const exitLight = new THREE.PointLight(0x10b981, 8.5, 18);
          exitLight.position.set(0, 1.6, 0);
          portalGroup.add(exitLight);

          portalGroup.position.set(wx, 0, wz);
          scene.add(portalGroup);
          exitPortalRef.current = portalGroup;
        }

        if (val === 0) {
          const dPlayer = Math.hypot(wx - CELL_SIZE * 1.5, wz - CELL_SIZE * 1.5);
          openWalkableCells.push({ r, c, x: wx, z: wz, distToPlayer: dPlayer });

          if ((r + c) % 4 === 0 && Math.random() < 0.45) {
            const candleLight = new THREE.PointLight(0xf59e0b, 0.9, 7);
            candleLight.position.set(wx, 1.4, wz);
            scene.add(candleLight);
          }
        }
      }
    }
    closetsRef.current = closets;
    openWalkableCellsRef.current = openWalkableCells;

    // Sort open walkable cells by distance to player starting position
    const sortedByDist = [...openWalkableCells].sort((a, b) => a.distToPlayer - b.distToPlayer);

    // Reset Awakening Grace Period on level start
    stateRef.current.awakeningTimer = 12.0;
    awakeningSecsRef.current = 12;
    setAwakeningSecondsLeft(12);
    setJustAwakenedBanner(false);

    // Ghosts Configuration & Fair Progression (Hantu tidak langsung muncul di depan muka)
    const ghostConfigs: Ghost[] = [];
    const baseSpeed = 1.65 + (level - 1) * 0.055;

    // Pocong: Spawns in distant corridor (~16m to 26m) so player has plenty of space to explore first!
    const midFarCells = sortedByDist.filter((c) => c.distToPlayer >= 16.0 && c.distToPlayer <= 26.0);
    const pocongSpawn = midFarCells.length > 0 
      ? midFarCells[Math.floor(midFarCells.length / 2)] 
      : (sortedByDist[Math.min(10, sortedByDist.length - 1)] || { x: CELL_SIZE * 4.5, z: CELL_SIZE * 4.5 });

    // Level 1: Only 1 Pocong wandering in far corridor
    ghostConfigs.push({
      id: `pocong-lvl-${level}`,
      type: 'POCONG',
      mesh: createPocongModel(),
      x: pocongSpawn.x,
      z: pocongSpawn.z,
      initialX: pocongSpawn.x,
      initialZ: pocongSpawn.z,
      speed: baseSpeed,
      state: 'DORMANT',
      patrolTarget: { x: exitWorldPos.x, z: exitWorldPos.z },
      soundTimer: 0,
      animTimer: 0,
    });

    // Level 2+: Kuntilanak begins to roam deep corridors (~22m to 32m)
    if (level >= 2) {
      const farCells = sortedByDist.filter((c) => c.distToPlayer >= 22.0 && c.distToPlayer <= 32.0);
      const kuntiSpawn = farCells.length > 0 
        ? farCells[Math.floor(farCells.length / 2)] 
        : (sortedByDist[Math.min(15, sortedByDist.length - 1)] || { x: CELL_SIZE * 5.5, z: CELL_SIZE * 5.5 });

      ghostConfigs.push({
        id: `kuntilanak-lvl-${level}`,
        type: 'KUNTILANAK',
        mesh: createKuntilanakModel(),
        x: kuntiSpawn.x,
        z: kuntiSpawn.z,
        initialX: kuntiSpawn.x,
        initialZ: kuntiSpawn.z,
        speed: baseSpeed * 1.1,
        state: 'DORMANT',
        patrolTarget: { x: pocongSpawn.x, z: pocongSpawn.z },
        soundTimer: 0,
        animTimer: 0,
      });
    }

    // Level 4+: Genderuwo roams remote wings near portal area
    if (level >= 4) {
      const ultraFarCells = sortedByDist.filter((c) => c.distToPlayer >= 28.0);
      const genderuwoSpawn = ultraFarCells.length > 0 
        ? ultraFarCells[Math.floor(ultraFarCells.length / 2)] 
        : sortedByDist[sortedByDist.length - 1];

      if (genderuwoSpawn) {
        ghostConfigs.push({
          id: `genderuwo-lvl-${level}`,
          type: 'GENDERUWO',
          mesh: createGenderuwoModel(),
          x: genderuwoSpawn.x,
          z: genderuwoSpawn.z,
          initialX: genderuwoSpawn.x,
          initialZ: genderuwoSpawn.z,
          speed: baseSpeed * 0.95,
          state: 'DORMANT',
          patrolTarget: { x: exitWorldPos.x, z: exitWorldPos.z },
          soundTimer: 0,
          animTimer: 0,
        });
      }
    }

    // Level 8+: Second Pocong appears in mid corridor for higher difficulty
    if (level >= 8) {
      const extraCells = sortedByDist.filter((c) => c.distToPlayer >= 20.0);
      if (extraCells.length > 0) {
        const extraSpawn = extraCells[0];
        ghostConfigs.push({
          id: `pocong2-lvl-${level}`,
          type: 'POCONG',
          mesh: createPocongModel(),
          x: extraSpawn.x,
          z: extraSpawn.z,
          initialX: extraSpawn.x,
          initialZ: extraSpawn.z,
          speed: baseSpeed,
          state: 'DORMANT',
          patrolTarget: { x: pocongSpawn.x, z: pocongSpawn.z },
          soundTimer: 0,
          animTimer: 0,
        });
      }
    }

    ghostConfigs.forEach((g) => {
      g.mesh.position.set(g.x, 0, g.z);
      scene.add(g.mesh);
    });
    ghostsRef.current = ghostConfigs;

    // Start background song & sound
    soundManager.startAmbient();

    // RESPONSIVE CURSOR LOOK (TIDAK OTOMATIS BERPUTAR SENDIRI - MENGILIRIK MENGIKUTI GERAKAN KURSOR)
    const handleMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (s.gameOver || s.hasEscaped) return;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      s.cursorNormalizedX = (currentX / rect.width) * 2 - 1;
      s.cursorNormalizedY = (currentY / rect.height) * 2 - 1;

      // Delta movement
      let dx = 0;
      let dy = 0;

      if (document.pointerLockElement === container) {
        dx = e.movementX;
        dy = e.movementY;
      } else {
        if (lastClientPos.current) {
          dx = e.clientX - lastClientPos.current.x;
          dy = e.clientY - lastClientPos.current.y;
          // Batasi lonjakan jika kursor masuk kembali ke layar
          dx = Math.max(-100, Math.min(100, dx));
          dy = Math.max(-100, Math.min(100, dy));
        }
        lastClientPos.current = { x: e.clientX, y: e.clientY };
      }

      // Langsung memutar sudut pandang (ngelirik) sesuai gerakan kursor
      s.cameraYaw -= dx * 0.0035;
      s.cameraPitch -= dy * 0.0028;
      s.cameraPitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, s.cameraPitch));
    };

    const handleMouseLeave = () => {
      lastClientPos.current = null;
    };

    // Touch support untuk layar sentuh / touchpad
    const handleTouchStart = (e: TouchEvent) => {
      soundManager.resumeContext();
      if (e.touches.length > 0) {
        lastClientPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (s.gameOver || s.hasEscaped) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (lastClientPos.current) {
          const dx = Math.max(-100, Math.min(100, touch.clientX - lastClientPos.current.x));
          const dy = Math.max(-100, Math.min(100, touch.clientY - lastClientPos.current.y));
          s.cameraYaw -= dx * 0.004;
          s.cameraPitch -= dy * 0.003;
          s.cameraPitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, s.cameraPitch));
        }
        lastClientPos.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = () => {
      lastClientPos.current = null;
    };

    const handleContainerClick = () => {
      soundManager.resumeContext();
      if (document.pointerLockElement !== container) {
        container.requestPointerLock?.();
      }
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === container);
      lastClientPos.current = null;
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('blur', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('click', handleContainerClick);

    // Keyboard Listeners (WASD + Q/E / Arrow Keys for turning)
    const onKeyDown = (e: KeyboardEvent) => {
      soundManager.resumeContext();
      const s = stateRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          s.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          s.moveBackward = true;
          break;
        case 'KeyA':
          s.moveLeft = true;
          break;
        case 'KeyD':
          s.moveRight = true;
          break;
        case 'KeyQ':
        case 'ArrowLeft':
          s.turnLeft = true;
          break;
        case 'KeyE':
          if (isNearClosetRef.current) {
            toggleClosetHide();
          } else {
            s.turnRight = true;
          }
          break;
        case 'ArrowRight':
          s.turnRight = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          s.isSprinting = true;
          setIsSprinting(true);
          break;
        case 'KeyF':
          s.flashlightOn = !s.flashlightOn;
          setFlashlightOn(s.flashlightOn);
          soundManager.playFlashlightClick();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          s.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          s.moveBackward = false;
          break;
        case 'KeyA':
          s.moveLeft = false;
          break;
        case 'KeyD':
          s.moveRight = false;
          break;
        case 'KeyQ':
        case 'ArrowLeft':
          s.turnLeft = false;
          break;
        case 'KeyE':
        case 'ArrowRight':
          s.turnRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          s.isSprinting = false;
          setIsSprinting(false);
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Collision Check
    const canMoveTo = (x: number, z: number) => {
      const radius = 0.45;
      const points = [
        [x - radius, z - radius],
        [x + radius, z - radius],
        [x - radius, z + radius],
        [x + radius, z + radius],
      ];
      for (const [px, pz] of points) {
        const c = Math.floor(px / CELL_SIZE);
        const r = Math.floor(pz / CELL_SIZE);
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        if (grid[r][c] === 1) return false;
      }
      return true;
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Game Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const s = stateRef.current;

      // Keyboard Arrow / Q / E Turning (manual helper)
      if (s.turnLeft) {
        s.cameraYaw += 2.6 * delta;
      }
      if (s.turnRight) {
        s.cameraYaw -= 2.6 * delta;
      }

      // Distance to Exit
      const distExit = Math.hypot(s.playerPos.x - exitWorldPos.x, s.playerPos.z - exitWorldPos.z);
      setDistanceToExit(Math.round(distExit));

      // Check Exit Reached
      if (distExit < 2.2 && !s.hasEscaped && !s.gameOver) {
        s.hasEscaped = true;
        soundManager.playVictory();
        if (level >= 20) {
          setGameCompleted(true);
        } else {
          setLevelCleared(true);
        }
        renderer.render(scene, camera);
        return;
      }

      // Jumpscare Camera Action
      if (s.gameOver) {
        const shake = (Math.random() - 0.5) * 0.14;
        camera.position.x += shake;
        camera.position.y += shake;

        if (jumpscareGhostMeshRef.current) {
          const forward = new THREE.Vector3(0, 0, -0.65).applyQuaternion(camera.quaternion);
          jumpscareGhostMeshRef.current.position.copy(camera.position).add(forward);
          jumpscareGhostMeshRef.current.lookAt(camera.position);
        }

        renderer.render(scene, camera);
        return;
      }

      // Closet Proximity
      let nearCloset = false;
      closets.forEach((c) => {
        const d = Math.hypot(s.playerPos.x - c.x, s.playerPos.z - c.z);
        if (d < 2.5) {
          nearCloset = true;
        }
      });
      setIsNearCloset(nearCloset);
      isNearClosetRef.current = nearCloset;

      // Player Movement
      if (!s.isHiddenInCloset) {
        const isSprinting = s.isSprinting && s.stamina > 5;
        const currentSpeed = (isSprinting ? 5.2 : 2.8) * delta;

        if (isSprinting && (s.moveForward || s.moveBackward || s.moveLeft || s.moveRight)) {
          s.stamina = Math.max(0, s.stamina - 28 * delta);
        } else {
          s.stamina = Math.min(100, s.stamina + 18 * delta);
        }
        setStamina(Math.round(s.stamina));

        const forward = new THREE.Vector3(-Math.sin(s.cameraYaw), 0, -Math.cos(s.cameraYaw));
        const right = new THREE.Vector3(Math.cos(s.cameraYaw), 0, -Math.sin(s.cameraYaw));
        const moveDir = new THREE.Vector3();

        if (s.moveForward) moveDir.add(forward);
        if (s.moveBackward) moveDir.sub(forward);
        if (s.moveRight) moveDir.add(right);
        if (s.moveLeft) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          const targetX = s.playerPos.x + moveDir.x * currentSpeed;
          const targetZ = s.playerPos.z + moveDir.z * currentSpeed;

          if (canMoveTo(targetX, s.playerPos.z)) s.playerPos.x = targetX;
          if (canMoveTo(s.playerPos.x, targetZ)) s.playerPos.z = targetZ;

          s.stepTimer += delta * (isSprinting ? 1.6 : 1.0);
          if (s.stepTimer > 0.45) {
            s.stepTimer = 0;
            soundManager.playFootstep();
          }
        }

        const headBob = moveDir.lengthSq() > 0 ? Math.sin(clock.getElapsedTime() * (isSprinting ? 14 : 9)) * 0.05 : 0;
        camera.position.set(s.playerPos.x, 1.6 + headBob, s.playerPos.z);
      } else {
        const c = closets[s.activeClosetIndex];
        if (c) {
          camera.position.set(c.x, 1.5, c.z + 0.35);
        }
      }

      // Camera Euler
      const euler = new THREE.Euler(s.cameraPitch, s.cameraYaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      // Flashlight Follows
      if (flashlightRef.current) {
        flashlightRef.current.position.copy(camera.position);
        const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        flashlightRef.current.target.position.copy(camera.position).add(lookDir);

        let ghostNearby = false;
        ghostsRef.current.forEach((g) => {
          const d = Math.hypot(camera.position.x - g.x, camera.position.z - g.z);
          if (d < 8) ghostNearby = true;
        });

        if (s.flashlightOn) {
          const flicker = ghostNearby && Math.random() < 0.15 ? 0.35 : 1.0;
          flashlightRef.current.intensity = 4.5 * flicker;
        } else {
          flashlightRef.current.intensity = 0;
        }
      }

      if (exitPortalRef.current) {
        exitPortalRef.current.rotation.y += delta * 1.0;
      }

      // Ghost AI
      let closestGhostDist = 999;

      ghostsRef.current.forEach((ghost) => {
        ghost.animTimer += delta;
        ghost.soundTimer += delta;

        const distToPlayer = Math.hypot(ghost.x - s.playerPos.x, ghost.z - s.playerPos.z);
        if (distToPlayer < closestGhostDist) {
          closestGhostDist = distToPlayer;
        }

        if (s.isHiddenInCloset) {
          ghost.state = 'LOST';
        } else if (distToPlayer < 14.0) {
          ghost.state = 'CHASE';
        } else if (ghost.state === 'LOST' || ghost.state === 'CHASE') {
          ghost.state = 'PATROL';
        }

        let targetX = ghost.patrolTarget.x;
        let targetZ = ghost.patrolTarget.z;

        if (ghost.state === 'CHASE' && !s.isHiddenInCloset) {
          targetX = s.playerPos.x;
          targetZ = s.playerPos.z;
        }

        const dx = targetX - ghost.x;
        const dz = targetZ - ghost.z;
        const dist = Math.hypot(dx, dz);
        const prevX = ghost.x;
        const prevZ = ghost.z;

        if (dist > 0.3) {
          const speed = (ghost.state === 'CHASE' ? ghost.speed * 1.45 : ghost.speed) * delta;
          const nextX = ghost.x + (dx / dist) * speed;
          const nextZ = ghost.z + (dz / dist) * speed;

          if (canMoveTo(nextX, ghost.z)) ghost.x = nextX;
          if (canMoveTo(ghost.x, nextZ)) ghost.z = nextZ;

          // If blocked by corner or wall, slide or try alternate direction
          if (ghost.x === prevX && ghost.z === prevZ) {
            const step = speed;
            if (canMoveTo(ghost.x + step, ghost.z)) ghost.x += step;
            else if (canMoveTo(ghost.x - step, ghost.z)) ghost.x -= step;
            else if (canMoveTo(ghost.x, ghost.z + step)) ghost.z += step;
            else if (canMoveTo(ghost.x, ghost.z - step)) ghost.z -= step;

            // Retarget if stuck in patrol
            if (ghost.state === 'PATROL' && Math.random() < 0.08) {
              const cells = openWalkableCellsRef.current;
              if (cells.length > 0) {
                const pick = cells[Math.floor(Math.random() * cells.length)];
                ghost.patrolTarget = { x: pick.x, z: pick.z };
              }
            }
          }

          ghost.mesh.rotation.y = Math.atan2(dx, dz);
        } else if (ghost.state === 'PATROL') {
          // Re-target towards a walkable cell near player area
          const cells = openWalkableCellsRef.current;
          const nearCells = cells.filter((c) => {
            const d = Math.hypot(c.x - s.playerPos.x, c.z - s.playerPos.z);
            return d < 22;
          });
          const pool = nearCells.length > 0 ? nearCells : cells;
          if (pool.length > 0) {
            const pick = pool[Math.floor(Math.random() * pool.length)];
            ghost.patrolTarget = { x: pick.x, z: pick.z };
          }
        }

        if (ghost.type === 'POCONG') {
          const hop = Math.abs(Math.sin(ghost.animTimer * 5.8)) * 0.45;
          ghost.mesh.position.set(ghost.x, hop, ghost.z);
        } else if (ghost.type === 'KUNTILANAK') {
          const floatOffset = Math.sin(ghost.animTimer * 2.5) * 0.2 + 0.15;
          ghost.mesh.position.set(ghost.x, floatOffset, ghost.z);
        } else {
          const stomp = Math.abs(Math.sin(ghost.animTimer * 3.0)) * 0.15;
          ghost.mesh.position.set(ghost.x, stomp, ghost.z);
        }

        if (distToPlayer < 10.0 && ghost.soundTimer > 4.2) {
          ghost.soundTimer = 0;
          if (ghost.type === 'POCONG') soundManager.playPocongSound();
          else if (ghost.type === 'KUNTILANAK') soundManager.playKuntiLaugh();
          else soundManager.playGenderuwoGrowl();
        }

        // Jumpscare when caught
        if (distToPlayer < 1.4 && !s.isHiddenInCloset && !s.gameOver) {
          s.gameOver = true;
          setGameOver(true);
          setCaughtBy(ghost.type);
          setIsJumpscareActive(true);
          soundManager.setTensionLevel('PANIC');

          // Spawn special jumpscare face directly in front of camera
          const jsMesh = ghost.type === 'POCONG' 
            ? createPocongModel(true) 
            : ghost.type === 'KUNTILANAK' 
            ? createKuntilanakModel(true) 
            : createGenderuwoModel(true);

          scene.add(jsMesh);
          jumpscareGhostMeshRef.current = jsMesh;

          soundManager.playJumpscareCaught(ghost.type);

          // Full-screen horror jumpscare face stays active for 1.8 seconds before showing menu
          setTimeout(() => {
            setIsJumpscareActive(false);
          }, 1800);
        }
      });

      // Jumpscare Death Camera Shake & Face Locking
      if (s.gameOver && jumpscareGhostMeshRef.current) {
        const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        jumpscareGhostMeshRef.current.position.copy(camera.position).add(lookDir.multiplyScalar(0.72));
        jumpscareGhostMeshRef.current.lookAt(camera.position);

        // Violent camera tremble
        camera.position.x += (Math.random() - 0.5) * 0.07;
        camera.position.y += (Math.random() - 0.5) * 0.07;
        camera.position.z += (Math.random() - 0.5) * 0.07;
      }

      // Corridor Surprise Shock Jumpscare
      if (!s.gameOver && !s.isHiddenInCloset) {
        s.corridorJumpscareTimer += delta;
        if (s.corridorJumpscareTimer > 25) {
          const nearbyGhost = ghostsRef.current.find(
            (g) => Math.hypot(g.x - s.playerPos.x, g.z - s.playerPos.z) < 7.0
          );
          if (nearbyGhost && Math.random() < 0.018) {
            s.corridorJumpscareTimer = 0;
            setCorridorJumpscare(nearbyGhost.type);
            soundManager.playSuddenShockStinger();
            setTimeout(() => {
              setCorridorJumpscare(null);
            }, 550);
          }
        }
      }

      // Heartbeat
      if (closestGhostDist < 9.0 && !s.gameOver) {
        s.heartbeatTimer += delta;
        const interval = Math.max(0.35, (closestGhostDist / 9.0) * 1.0);
        if (s.heartbeatTimer > interval) {
          s.heartbeatTimer = 0;
          soundManager.playHeartbeat();
        }
        setGhostAlert(
          s.isHiddenInCloset
            ? 'Kamu aman di dalam lemari. Hantu tidak bisa melihatmu!'
            : `AWAS! HANTU MENDEKAT (${Math.round(closestGhostDist)}m) - CARI LEMARI SEKARANG!`
        );
      } else if (!s.isHiddenInCloset) {
        setGhostAlert(null);
      }

      // Radar Data Calculation (Throttled ~12 updates/sec for smooth 60fps Three.js rendering)
      s.radarUpdateTimer += delta;
      if (s.radarUpdateTimer > 0.08 && !s.gameOver) {
        s.radarUpdateTimer = 0;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, s.cameraYaw, 0, 'YXZ'));
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, s.cameraYaw, 0, 'YXZ'));

        const blips: RadarBlip[] = ghostsRef.current
          .map((g, idx) => {
            const toGhost = new THREE.Vector3(g.x - s.playerPos.x, 0, g.z - s.playerPos.z);
            const dist = toGhost.length();
            const fwdDot = toGhost.dot(forward);
            const rightDot = toGhost.dot(right);
            const angle = Math.atan2(rightDot, fwdDot);

            let dirLabel: 'DEPAN' | 'BELAKANG' | 'KIRI' | 'KANAN' = 'DEPAN';
            if (Math.abs(angle) > (3 * Math.PI) / 4) {
              dirLabel = 'BELAKANG';
            } else if (angle > Math.PI / 4) {
              dirLabel = 'KANAN';
            } else if (angle < -Math.PI / 4) {
              dirLabel = 'KIRI';
            }

            return {
              id: idx,
              type: g.type,
              dist: Math.round(dist * 10) / 10,
              fwdDot,
              rightDot,
              angle,
              dirLabel,
              isChasing: g.state === 'CHASE',
            };
          })
          .filter((b) => b.dist <= 16);

        setRadarBlips(blips);

        if (blips.length > 0) {
          const sorted = [...blips].sort((a, b) => a.dist - b.dist);
          const nearest = sorted[0];
          setClosestThreat(nearest);
          if (nearest.dist < 5.0) {
            soundManager.setTensionLevel('PANIC');
          } else if (nearest.dist < 9.0) {
            soundManager.setTensionLevel('HIGH');
          } else {
            soundManager.setTensionLevel('MEDIUM');
          }
        } else {
          setClosestThreat(null);
          soundManager.setTensionLevel('LOW');
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('click', handleContainerClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      soundManager.stopAmbient();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [level, toggleClosetHide]);

  const handleRestartLevel = () => {
    stateRef.current.playerPos.set(CELL_SIZE * 1.5, 1.6, CELL_SIZE * 1.5);
    stateRef.current.gameOver = false;
    stateRef.current.hasEscaped = false;
    stateRef.current.isHiddenInCloset = false;
    setGameOver(false);
    setIsJumpscareActive(false);
    setLevelCleared(false);
    setIsHiddenInCloset(false);
    setCaughtBy(null);
    setStamina(100);
    soundManager.setTensionLevel('LOW');
    soundManager.startAmbient();
  };

  const handleNextLevel = () => {
    if (level < 20) {
      setLevel((prev) => prev + 1);
    } else {
      setGameCompleted(true);
    }
  };

  // Dedicated Turn Left / Turn Right manual controls for easy spinning
  const turnCamera = (direction: 'left' | 'right') => {
    soundManager.resumeContext();
    const s = stateRef.current;
    s.cameraYaw += (direction === 'left' ? 1 : -1) * 0.45;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-crosshair"
      />

      {/* Subtle Horror Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.6)_85%,_#000000_100%)]" />

      {/* LIVE HORROR SUSPENSE BANNER (Detak Jantung & Hawa Mencekam) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div 
          onClick={() => {
            soundManager.resumeContext();
            soundManager.startAmbient();
          }}
          className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-red-950/85 border border-red-500/80 text-red-200 text-xs md:text-sm font-mono tracking-wide shadow-[0_0_30px_rgba(239,68,68,0.7)] backdrop-blur-md cursor-pointer hover:scale-105 transition animate-pulse"
          title="Klik untuk mengaktifkan musik horor tegang di browser"
        >
          <Activity className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="font-semibold italic font-serif">"{currentLyric}"</span>
          <Flame className="w-3.5 h-3.5 text-amber-500 ml-1" />
        </div>
      </div>

      {/* TOP HUD BAR */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-20">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            id="btn-hud-back"
            onClick={onBackToMenu}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-700 hover:border-neutral-500 text-xs font-mono text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          {/* Level Progress */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-700 text-xs font-mono text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">LEVEL {level} / 20</span>
          </div>

          {/* Portal Gaib Hijau Emerald Indicator */}
          <div 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-950/85 border border-emerald-500/80 text-xs font-mono text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            title="Portal keluar berbentuk pilar batu kuno dengan pusaran cahaya HIJAU EMERALD"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-bold text-emerald-200">
              PORTAL HIJAU: {distanceToExit}m
            </span>
            {distanceToExit <= 10 && (
              <span className="text-[11px] text-emerald-400 font-bold animate-pulse">⚡ DI DEPAN!</span>
            )}
          </div>
        </div>

        {/* Audio Song Control */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-hud-song"
            onClick={() => {
              soundManager.resumeContext();
              if (!soundMuted) {
                soundManager.stopAmbient();
                setSoundMuted(true);
              } else {
                soundManager.startAmbient();
                setSoundMuted(false);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 border border-red-800 text-xs font-mono text-neutral-200 hover:text-white cursor-pointer"
            title="Musik Horor Mencekam"
          >
            <Music className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden md:inline">{soundMuted ? 'Musik: Senyap' : 'Musik: Horor Tegang'}</span>
            {soundMuted ? <VolumeX className="w-4 h-4 text-red-400 ml-1" /> : <Volume2 className="w-4 h-4 text-emerald-400 ml-1" />}
          </button>
        </div>
      </div>

      {/* QUICK ON-SCREEN TURN CONTROLS (MUTER KANAN / KIRI BEBAS) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 flex justify-between pointer-events-none z-20">
        <button
          id="btn-turn-left"
          onClick={() => turnCamera('left')}
          className="pointer-events-auto flex items-center justify-center w-12 h-14 rounded-xl bg-black/75 hover:bg-neutral-800 border border-neutral-700 text-amber-400 hover:text-amber-300 shadow-xl transition cursor-pointer active:scale-90"
          title="Puter Kamera ke Kiri (atau arahkan kursor ke kiri)"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          id="btn-turn-right"
          onClick={() => turnCamera('right')}
          className="pointer-events-auto flex items-center justify-center w-12 h-14 rounded-xl bg-black/75 hover:bg-neutral-800 border border-neutral-700 text-amber-400 hover:text-amber-300 shadow-xl transition cursor-pointer active:scale-90"
          title="Puter Kamera ke Kanan (atau arahkan kursor ke kanan)"
        >
          <RotateCw className="w-6 h-6" />
        </button>
      </div>

      {/* GHOST RADAR & SPIRIT SENSOR (RADAR GAIB 360°) */}
      <div className="absolute top-16 right-4 z-20 pointer-events-auto">
        <div className="bg-black/85 backdrop-blur-md rounded-2xl border border-emerald-900/80 p-2.5 shadow-[0_0_25px_rgba(16,185,129,0.25)] w-40 md:w-44 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-950 text-[11px] font-mono text-emerald-400">
            <span className="flex items-center gap-1 font-bold tracking-wider">
              <Radar className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
              RADAR GAIB
            </span>
            <button
              onClick={() => setShowRadar(!showRadar)}
              className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 cursor-pointer"
            >
              {showRadar ? 'Tutup' : 'Buka'}
            </button>
          </div>

          {showRadar && (
            <div className="pt-2 space-y-2">
              {/* Circular Radar Screen */}
              <div className="relative w-28 h-28 mx-auto rounded-full bg-neutral-950 border-2 border-emerald-600/60 overflow-hidden shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]">
                {/* Concentric rings */}
                <div className="absolute inset-[15%] rounded-full border border-emerald-800/40 pointer-events-none" />
                <div className="absolute inset-[40%] rounded-full border border-emerald-800/40 pointer-events-none" />
                <div className="absolute inset-[65%] rounded-full border border-emerald-800/40 pointer-events-none" />

                {/* Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-emerald-900/50" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-emerald-900/50" />

                {/* Cardinal directions (Relative to player view) */}
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-emerald-400">DEPAN</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-emerald-600">BELAKANG</span>
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-emerald-600">KIRI</span>
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-emerald-600">KANAN</span>

                {/* Rotating Scanner Sweep */}
                <div 
                  className="absolute inset-0 origin-center animate-spin pointer-events-none"
                  style={{ 
                    animationDuration: '3s',
                    background: 'conic-gradient(from 0deg at 50% 50%, rgba(16, 185, 129, 0.35) 0deg, transparent 60deg, transparent 360deg)' 
                  }}
                />

                {/* Player in Center (facing UP / Depan) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-cyan-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(6,182,212,1)]" />
                </div>

                {/* Ghost Blips on Radar */}
                {radarBlips.map((b) => {
                  const leftPct = Math.max(8, Math.min(92, 50 + (b.rightDot / 16) * 42));
                  const topPct = Math.max(8, Math.min(92, 50 - (b.fwdDot / 16) * 42));
                  return (
                    <div
                      key={b.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100 flex items-center justify-center z-10"
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      title={`${b.type}: ${b.dist}m (${b.dirLabel})`}
                    >
                      <span className="absolute -inset-1 rounded-full bg-red-600/70 animate-ping" />
                      <span className="relative text-xs filter drop-shadow-[0_0_6px_rgba(255,0,0,1)] select-none">
                        {b.type === 'POCONG' ? '💀' : b.type === 'KUNTILANAK' ? '👻' : '👹'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status & EMF Spirit Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-red-400" />
                    Sinyal Gaib:
                  </span>
                  <span className={`font-bold ${
                    closestThreat ? (closestThreat.dist < 6 ? 'text-red-400 animate-pulse' : 'text-amber-400') : 'text-emerald-400'
                  }`}>
                    {closestThreat ? `${closestThreat.dirLabel}` : 'Aman'}
                  </span>
                </div>

                {/* EMF Signal Bars */}
                <div className="grid grid-cols-5 gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const activeLvl = !closestThreat ? 1 : closestThreat.dist < 4 ? 5 : closestThreat.dist < 7 ? 4 : closestThreat.dist < 10 ? 3 : 2;
                    const isActive = lvl <= activeLvl;
                    return (
                      <div
                        key={lvl}
                        className={`rounded-sm transition-colors ${
                          isActive
                            ? lvl >= 4
                              ? 'bg-red-500 animate-pulse'
                              : lvl >= 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-neutral-800'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Closest Ghost Info Detail */}
                <div className="text-[10px] font-mono text-center pt-0.5 truncate text-neutral-300">
                  {closestThreat ? (
                    <span className="text-amber-300 font-semibold">
                      {closestThreat.type === 'POCONG' ? '💀 Pocong' : closestThreat.type === 'KUNTILANAK' ? '👻 Kunti' : '👹 Genderuwo'} ~{closestThreat.dist}m
                    </span>
                  ) : (
                    <span className="text-neutral-500 italic">Tidak ada arwah dekat</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hiding in Closet View */}
      {isHiddenInCloset && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between">
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,_rgba(0,0,0,0.92)_0px,_rgba(0,0,0,0.92)_38px,_transparent_38px,_transparent_58px)] opacity-95" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
            <div className="px-6 py-3 rounded-xl bg-black/90 border border-amber-600/70 shadow-2xl space-y-2">
              <p className="text-amber-400 font-bold text-sm tracking-wider flex items-center justify-center gap-2">
                <DoorClosed className="w-5 h-5 text-amber-500" />
                BERSEMBUNYI DI DALAM LEMARI
              </p>
              <p className="text-xs text-neutral-400">
                Nafasmu tertahan... Hantu tidak melihatmu di celah lemari!
              </p>
              <button
                id="btn-exit-closet"
                onClick={toggleClosetHide}
                className="mt-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                [E] Keluar Dari Lemari
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proximity Interaction Prompt for Closet */}
      {isNearCloset && !isHiddenInCloset && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            id="btn-enter-closet"
            onClick={toggleClosetHide}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-amber-950/90 border-2 border-amber-500 text-amber-200 hover:text-white font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-bounce cursor-pointer"
          >
            <DoorClosed className="w-5 h-5 text-amber-400" />
            <span>TEKAN [E] ATAU KLIK UNTUK SEMBUNYI DI LEMARI!</span>
          </button>
        </div>
      )}

      {/* Ghost Alert Banner */}
      {ghostAlert && !isHiddenInCloset && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full px-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/90 border border-red-600 text-red-300 font-bold text-xs tracking-wider animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>{ghostAlert}</span>
          </div>

          {/* Directional indicator for immediate reflex */}
          {closestThreat && closestThreat.dist < 8.0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/90 border border-amber-500/80 text-amber-300 font-mono text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce">
              {closestThreat.dirLabel === 'BELAKANG' && (
                <>
                  <span className="text-base text-red-400">⬇️</span>
                  <span>ARWAH DI BELAKANGMU! SEGERA BALIK ARAH / LARI!</span>
                  <span className="text-base text-red-400">⬇️</span>
                </>
              )}
              {closestThreat.dirLabel === 'DEPAN' && (
                <>
                  <span className="text-base text-red-400">⬆️</span>
                  <span>ARWAH TEPAT DI DEPAN LORONG (~{closestThreat.dist}m)!</span>
                  <span className="text-base text-red-400">⬆️</span>
                </>
              )}
              {closestThreat.dirLabel === 'KIRI' && (
                <>
                  <span className="text-base text-red-400">⬅️</span>
                  <span>ARWAH MENDEKAT DARI KIRI (~{closestThreat.dist}m)!</span>
                  <span className="text-base text-red-400">⬅️</span>
                </>
              )}
              {closestThreat.dirLabel === 'KANAN' && (
                <>
                  <span className="text-base text-red-400">➡️</span>
                  <span>ARWAH MENDEKAT DARI KANAN (~{closestThreat.dist}m)!</span>
                  <span className="text-base text-red-400">➡️</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM BAR: Stamina, Crosshair & FPS Pointer Lock Button */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none z-20">
        <div className="space-y-1.5 w-44 md:w-56">
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1">
              <Flame className={`w-3.5 h-3.5 ${isSprinting ? 'text-amber-500 animate-bounce' : 'text-neutral-500'}`} />
              Stamina (Shift)
            </span>
            <span>{stamina}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div 
              className={`h-full transition-all duration-150 ${stamina > 30 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'}`}
              style={{ width: `${stamina}%` }}
            />
          </div>
        </div>

        {/* Center Hint */}
        <div className="hidden md:flex flex-col items-center pointer-events-auto">
          <button
            id="btn-toggle-fps"
            onClick={() => {
              soundManager.resumeContext();
              if (containerRef.current) {
                if (document.pointerLockElement === containerRef.current) {
                  document.exitPointerLock?.();
                } else {
                  containerRef.current.requestPointerLock?.();
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-700 hover:border-amber-500 text-neutral-300 text-[11px] font-mono transition cursor-pointer"
          >
            <MousePointer className="w-3 h-3 text-amber-400" />
            <span>{isPointerLocked ? 'Kursor Terkunci (ESC untuk lepas)' : 'Klik untuk Kunci Kursor 360°'}</span>
          </button>
        </div>

        {/* Flashlight Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-toggle-flashlight"
            onClick={() => {
              const s = stateRef.current;
              s.flashlightOn = !s.flashlightOn;
              setFlashlightOn(s.flashlightOn);
              soundManager.playFlashlightClick();
            }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              flashlightOn 
                ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                : 'bg-black/70 border-neutral-800 text-neutral-600'
            }`}
            title="Senter (Tekan F)"
          >
            <Flashlight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DIRECT IN-YOUR-FACE FULLSCREEN HORROR JUMPSCARE (PAS KETEMU MUKA HANTUNYA MUNCUL DEKAT) */}
      {isJumpscareActive && caughtBy && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-2 pointer-events-none overflow-hidden">
          {/* Blood Red Strobe Vignette */}
          <div className="absolute inset-0 bg-red-900/70 animate-ping opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_25%,_rgba(185,28,28,0.85)_75%,_#000000_100%)]" />

          {/* Violent Trembling Ghost Face Lunging Directly into the Screen */}
          <div className="relative z-10 w-full max-w-md h-[75vh] flex flex-col items-center justify-center animate-in zoom-in-150 duration-100">
            <GhostFace ghostType={caughtBy} className="w-80 h-80 md:w-96 md:h-96" isJumpscare={true} />
            <div className="mt-4 px-6 py-2 rounded-full bg-red-950/90 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,1)] animate-pulse">
              <span className="text-xl md:text-2xl font-black text-red-500 font-serif tracking-widest uppercase filter drop-shadow-[0_0_20px_rgba(255,0,0,1)]">
                {caughtBy === 'POCONG' && '💀 KAFAN POCONG MENERKAM WAJAHMU!'}
                {caughtBy === 'KUNTILANAK' && '👻 KUNTILANAK MENJERIT DI HADAPANMU!'}
                {caughtBy === 'GENDERUWO' && '👹 GENDERUWO MEMANGSAMU HIDUP-HIDUP!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUDDEN CORRIDOR JUMPSCARE FLASH OVERLAY */}
      {corridorJumpscare && (
        <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-4 pointer-events-none animate-in zoom-in-125 duration-75">
          <div className="absolute inset-0 bg-red-900/60 animate-ping opacity-75" />
          <div className="relative z-10 text-center space-y-4 max-w-lg">
            <GhostFace ghostType={corridorJumpscare} className="w-56 h-56 md:w-72 md:h-72 mx-auto" isJumpscare={true} />
            <p className="text-2xl md:text-4xl font-black text-red-500 tracking-widest font-serif drop-shadow-[0_0_30px_rgba(255,0,0,1)] uppercase animate-pulse">
              {corridorJumpscare === 'POCONG' && 'POCONG MUNCUL DI HADAPANMU!'}
              {corridorJumpscare === 'KUNTILANAK' && 'KUNTILANAK MENJERIT DI TELINGAMU!'}
              {corridorJumpscare === 'GENDERUWO' && 'GENDERUWO MENGAUM MENCARIMU!'}
            </p>
            <p className="text-sm md:text-base font-mono text-amber-300 font-bold tracking-wider">
              LARI DAN CARI LEMARI SEBELUM DITANGKAP!
            </p>
          </div>
        </div>
      )}

      {/* JUMPSCARE GAME OVER OVERLAY */}
      {!isJumpscareActive && gameOver && caughtBy && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-105 duration-100">
          <div className="absolute inset-0 bg-red-950/80 animate-ping opacity-60 pointer-events-none" />

          <div className="relative z-10 max-w-md w-full space-y-4 bg-black/90 p-6 md:p-8 rounded-3xl border-4 border-red-600 shadow-[0_0_100px_rgba(239,68,68,1)]">
            {/* Real Scary Ghost Face Portrait */}
            <div className="w-36 h-40 md:w-44 md:h-48 mx-auto rounded-2xl bg-neutral-950 border-2 border-red-600/90 p-2 shadow-[0_0_40px_rgba(239,68,68,0.8)] flex items-center justify-center overflow-hidden">
              <GhostFace ghostType={caughtBy} className="w-full h-full" isJumpscare={false} />
            </div>

            <h2 
              className="text-3xl md:text-5xl font-black text-red-600 tracking-wider animate-bounce drop-shadow-[0_0_40px_rgba(239,68,68,1)]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              TERTANGKAP!
            </h2>

            <div className="p-3.5 bg-red-950/50 rounded-2xl border border-red-700 text-neutral-200 space-y-1.5">
              <p className="text-sm md:text-base font-black text-red-400 tracking-wide">
                {caughtBy === 'POCONG' && '💀 Wajah Mayat Pocong Menatap Dingin Jiwamu!'}
                {caughtBy === 'KUNTILANAK' && '👻 Kuntilanak Tersenyum Menyeringai dengan Taring Runcing!'}
                {caughtBy === 'GENDERUWO' && '👹 Genderuwo Menancapkan Taring Raksasanya yang Berdarah!'}
              </p>
              <p className="text-xs text-neutral-300 italic font-mono">
                "Detak jantungmu terhenti... Labirin ini diselimuti kegelapan abadi..."
              </p>
            </div>

            <p className="text-xs text-amber-300">
              💡 Tips: Perhatikan Radar Gaib di kanan atas! Sembunyi di dalam lemari [E] saat ada arwah yang mengejar!
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="btn-retry-level"
                onClick={handleRestartLevel}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold tracking-wider text-sm transition cursor-pointer shadow-[0_0_25px_rgba(185,28,28,0.7)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ULANGI LEVEL {level}</span>
              </button>

              <button
                id="btn-gameover-menu"
                onClick={onBackToMenu}
                className="px-6 py-3.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-bold text-sm transition cursor-pointer"
              >
                Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL CLEARED SCREEN */}
      {levelCleared && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="relative z-10 max-w-md w-full space-y-6 bg-neutral-950/90 p-8 rounded-3xl border border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.4)]">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950 flex items-center justify-center border-2 border-emerald-500 text-emerald-400 animate-bounce">
              <DoorOpen className="w-8 h-8" />
            </div>

            <h2 
              className="text-3xl md:text-4xl font-black text-emerald-400 tracking-wider"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              LEVEL {level} SELESAI!
            </h2>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Keren banget, Princess! Kamu berhasil lolos dari teror di Level {level}. Tantangan di Level {level + 1} akan semakin seru dan menegangkan!
            </p>

            <div className="p-3 bg-black/60 rounded-xl border border-neutral-800 text-xs text-neutral-400">
              <p>Kemajuan Labirin: <strong className="text-emerald-400 font-mono">{level} / 20 Level</strong></p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="btn-next-level"
                onClick={handleNextLevel}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm tracking-wider transition cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              >
                LANJUT KE LEVEL {level + 1} ➔
              </button>
              <button
                id="btn-cleared-menu"
                onClick={onBackToMenu}
                className="px-6 py-3 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-white font-bold text-sm transition cursor-pointer"
              >
                Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME COMPLETED LEVEL 20 */}
      {gameCompleted && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
          <div className="relative z-10 max-w-lg w-full space-y-6 bg-neutral-950 p-8 rounded-3xl border-2 border-amber-500 shadow-[0_0_80px_rgba(245,158,11,0.5)]">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-950/80 flex items-center justify-center border-2 border-amber-400 text-amber-400">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <h2 
              className="text-4xl md:text-5xl font-black text-amber-400 tracking-wider"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              TAMAT! KAMU BEBAS!
            </h2>

            <p className="text-base text-neutral-200 leading-relaxed">
              Luar biasa, Princess! Kamu berhasil menuntaskan seluruh <strong className="text-amber-400">20 LEVEL</strong> Labirin Terkutuk! Pocong, Kuntilanak, dan Genderuwo tak mampu menghentikan langkahmu untuk pulang dengan selamat!
            </p>

            <button
              id="btn-finished-menu"
              onClick={onBackToMenu}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm uppercase tracking-wider transition cursor-pointer"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
