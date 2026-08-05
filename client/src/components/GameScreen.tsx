import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import FightScene from '../game/FightScene'
import type { PlayerData } from '../types'
import { database } from '../firebase'
import { ref, get, set, update, onValue, remove } from 'firebase/database'
import { RefreshCw, LogOut } from 'lucide-react'

interface GameScreenProps {
  playerData: PlayerData;
  roomData: any; // { roomId, myId }
  onGameOver: () => void;
}

const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const MobileBtn = ({ k, x, y, label, radius = 25 }: { k: string, x: number, y: number, label?: string, radius?: number }) => {
   const [active, setActive] = useState(false);
   
   const handleDown = (e: any) => {
       e.preventDefault();
       setActive(true);
       window.dispatchEvent(new CustomEvent('mobile_input', { detail: { key: k, state: 'down' } }));
   }
   
   const handleUp = (e: any) => {
       e.preventDefault();
       setActive(false);
       window.dispatchEvent(new CustomEvent('mobile_input', { detail: { key: k, state: 'up' } }));
   }
   
   return (
       <div 
         onTouchStart={handleDown} onTouchEnd={handleUp} onTouchCancel={handleUp}
         style={{
             position: 'absolute', left: x, top: y, width: radius * 2, height: radius * 2, 
             borderRadius: '50%', background: active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
             display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
             fontWeight: 'bold', fontSize: '18px', userSelect: 'none', border: '1px solid rgba(255,255,255,0.3)',
             zIndex: 100
         }}
       >
         {label || k}
       </div>
   )
}

export default function GameScreen({ playerData, roomData, onGameOver }: GameScreenProps) {
  const [gameOverState, setGameOverState] = useState<{ isWin: boolean } | null>(null)
  const [rematchStatus, setRematchStatus] = useState<string>('')
  
  const gameRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!gameRef.current || !roomData) return;

    const initGame = (initialRoomState: any) => {
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
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.NO_CENTER,
          parent: gameRef.current!,
          width: 800,
          height: 600,
        },
        scene: [FightScene],
        backgroundColor: '#1a1a2e',
        callbacks: {
          preBoot: (game) => {
            game.registry.set('roomId', roomData.roomId);
            game.registry.set('myId', roomData.myId);
            game.registry.set('initialRoomState', initialRoomState);
            game.registry.set('onGameOver', onGameOver);
            game.registry.set('isTraining', roomData.isTraining || false);
            game.registry.set('showGameOverUI', (isWin: boolean) => setGameOverState({ isWin }));
          }
        }
      }

      if (!gameInstance.current) {
        gameInstance.current = new Phaser.Game(config);
      }
    };

    if (roomData.isTraining) {
      initGame({
        players: {
          'player1': { ...playerData, x: 200, y: 500, hp: 100, isLeft: false, martialArt: playerData.martialArt, state: 'idle' },
          'dummy': { faceImage: null, martialArt: 'boxing', x: 600, y: 500, hp: 100, isLeft: true, state: 'idle' }
        }
      });
      return;
    }

    // Fetch initial room state
    const roomRef = ref(database, `rooms/${roomData.roomId}`);
    get(roomRef).then((snap) => {
      if (snap.exists()) {
        initGame(snap.val());
      }
    });

    return () => {
      gameInstance.current?.destroy(true)
      gameInstance.current = null;
    }
  }, [roomData, onGameOver])

  useEffect(() => {
    if (!roomData || gameOverState === null || roomData.isTraining) return;
    
    const rematchRef = ref(database, `rooms/${roomData.roomId}/rematch`);
    const unsub = onValue(rematchRef, async (snap) => {
       const rematch = snap.val();
       if (rematch && Object.keys(rematch).length === 2) {
           // Both accepted! Only one person needs to change status
           if (roomData.myId === Object.keys(rematch).sort()[0]) {
               await update(ref(database, `rooms/${roomData.roomId}`), {
                   status: 'playing',
                   rematch: null
               });
           }
           setGameOverState(null);
           setRematchStatus('');
       } else if (rematch && rematch[roomData.myId]) {
           setRematchStatus('Waiting for opponent...');
       }
    });
    return () => unsub();
  }, [roomData, gameOverState])

  const handleRematch = async () => {
    if (roomData.isTraining) {
        setGameOverState(null);
        gameInstance.current?.scene.getScene('FightScene').scene.restart();
        return;
    }
    await set(ref(database, `rooms/${roomData.roomId}/rematch/${roomData.myId}`), true);
  }

  const handleLeave = async () => {
    if (!roomData.isTraining) {
       await remove(ref(database, `rooms/${roomData.roomId}`));
    }
    onGameOver();
  }


  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        backgroundColor: '#1a1a2e', zIndex: 50,
        userSelect: 'none', WebkitUserSelect: 'none',
        // @ts-ignore
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Game canvas: full screen, flex centered */}
      <div id="game-container" ref={gameRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />

      {/* Quit button (always visible top-right) */}
      {!roomData.isTraining && (
        <button onClick={handleLeave} className="btn"
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
            padding: '8px 14px', fontSize: '13px', background: 'rgba(0,0,0,0.6)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', gap: '5px' }}>
          <LogOut size={15} /> Quit
        </button>
      )}
      {roomData.isTraining && (
        <button onClick={handleLeave} className="btn"
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
            padding: '8px 14px', fontSize: '13px', background: 'rgba(0,0,0,0.6)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', gap: '5px' }}>
          <LogOut size={15} /> Quit
        </button>
      )}

      {/* Mobile controls: overlaid at bottom corners */}
      {isMobile && (
        <>
          {/* D-Pad bottom-left */}
          <div style={{ position: 'absolute', bottom: 20, left: 16, width: 160, height: 145, zIndex: 20 }}>
            <MobileBtn k="W" x={55} y={0} />
            <MobileBtn k="A" x={0}  y={50} />
            <MobileBtn k="S" x={55} y={100} />
            <MobileBtn k="D" x={110} y={50} />
          </div>
          {/* Action buttons bottom-right */}
          <div style={{ position: 'absolute', bottom: 20, right: 16, width: 220, height: 145, zIndex: 20 }}>
            <MobileBtn k="U" x={85}  y={0}  label="🛡" radius={25} />
            <MobileBtn k="J" x={15}  y={75} radius={32} />
            <MobileBtn k="K" x={100} y={75} radius={32} />
            <MobileBtn k="L" x={170} y={18} radius={28} />
          </div>
        </>
      )}

      {/* Desktop hint bar */}
      {!isMobile && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
          color: 'rgba(255,255,255,0.35)', fontSize: '12px', zIndex: 10, pointerEvents: 'none' }}>
          W A S D · J Attack · K Special · L Skill · U Block
        </div>
      )}

      {/* Game Over overlay */}
      {gameOverState && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <h1 style={{ fontSize: '4rem', color: gameOverState.isWin ? '#00FF00' : '#FF3366',
            textShadow: '0 0 20px rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            {gameOverState.isWin ? 'YOU WIN!' : 'YOU LOSE!'}
          </h1>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button className="btn btn-primary" onClick={handleRematch}><RefreshCw size={20} /> Rematch</button>
            <button className="btn" style={{ border: '1px solid #fff' }} onClick={handleLeave}><LogOut size={20} /> Leave</button>
          </div>
          {rematchStatus && <p style={{ marginTop: '1rem', color: 'var(--secondary)' }}>{rematchStatus}</p>}
        </div>
      )}
    </div>
  )
}
