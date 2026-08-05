import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import FightScene from '../game/FightScene'
import type { PlayerData } from '../types'
import { database } from '../firebase'
import { ref, onValue, get } from 'firebase/database'

interface GameScreenProps {
  playerData: PlayerData;
  roomData: any; // { roomId, myId }
  onGameOver: () => void;
}

export default function GameScreen({ playerData, roomData, onGameOver }: GameScreenProps) {
  const gameRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!gameRef.current || !roomData) return;

    // Fetch initial room state
    const roomRef = ref(database, `rooms/${roomData.roomId}`);
    get(roomRef).then((snap) => {
      if (snap.exists()) {
        const initialRoomState = snap.val();

        // Pass data to scene via config
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: 800,
          height: 600,
          parent: gameRef.current!,
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 800, x: 0 },
              debug: false
            }
          },
          scene: [FightScene],
          backgroundColor: '#1a1a2e',
          callbacks: {
            preBoot: (game) => {
              game.registry.set('roomId', roomData.roomId);
              game.registry.set('myId', roomData.myId);
              game.registry.set('initialRoomState', initialRoomState);
              game.registry.set('onGameOver', onGameOver);
            }
          }
        }

        if (!gameInstance.current) {
          gameInstance.current = new Phaser.Game(config);
        }
      }
    });

    return () => {
      gameInstance.current?.destroy(true)
      gameInstance.current = null;
    }
  }, [roomData, onGameOver])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div id="game-container" ref={gameRef} style={{ width: 800, height: 600 }}></div>
      <div style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
        Controls: W A S D to move, J to Attack
      </div>
    </div>
  )
}
