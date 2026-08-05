export type GameState = 'home' | 'setup' | 'matchmaking' | 'playing'

export interface PlayerData {
  faceImage: string | null;
  martialArt: string;
}
