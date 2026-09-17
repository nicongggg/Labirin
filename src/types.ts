export type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'HIDDEN' | 'CAUGHT' | 'ESCAPED';

export type GhostType = 'KUNTILANAK' | 'GENDERUWO' | 'POCONG';

export interface ClosetData {
  id: string;
  x: number;
  z: number;
}

export interface GhostData {
  id: string;
  type: GhostType;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  state: 'PATROL' | 'CHASE' | 'LOST';
  speed: number;
}

export interface GameSettings {
  volume: number;
  mouseSensitivity: number;
  flashlightBattery: number;
}

