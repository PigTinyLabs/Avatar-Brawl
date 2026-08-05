import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { PlayerData } from '../types'
import { database } from '../firebase'
import { ref, set, get, onValue, remove, onDisconnect } from 'firebase/database'

interface MatchmakingScreenProps {
  playerData: PlayerData;
  userId: string;
  onMatchFound: (roomInfo: any) => void;
}

export let myPlayerId = '';

export default function MatchmakingScreen({ playerData, userId, onMatchFound }: MatchmakingScreenProps) {
  const [status, setStatus] = useState('Connecting to server...')

  useEffect(() => {
    myPlayerId = userId;
    
    const initMatchmaking = async () => {
      setStatus('Finding opponent...')
      
      const matchmakingRef = ref(database, 'matchmaking');
      const snapshot = await get(matchmakingRef);
      
      let matched = false;
      
      if (snapshot.exists()) {
        const waitingPlayers = snapshot.val();
        const opponentIds = Object.keys(waitingPlayers).filter(id => !waitingPlayers[id].roomId);
        
        if (opponentIds.length > 0) {
          // Found an opponent
          const opponentId = opponentIds[0];
          const opponentData = waitingPlayers[opponentId];
          
          const roomId = 'room_' + Date.now();
          
          // 1. Create Room
          const roomRef = ref(database, `rooms/${roomId}`);
          
          // Delete room on disconnect to save DB space
          onDisconnect(roomRef).remove();
          
          await set(roomRef, {
            status: 'playing',
            players: {
              [myPlayerId]: { ...playerData, id: myPlayerId, x: 600, y: 400, hp: 100, isLeft: false },
              [opponentId]: { ...opponentData, id: opponentId, x: 200, y: 400, hp: 100, isLeft: true }
            }
          });
          
          // 2. Notify Opponent
          await set(ref(database, `matchmaking/${opponentId}/roomId`), roomId);
          
          // 3. Clean up and transition
          setStatus('Match Found! Get ready...')
          matched = true;
          
          setTimeout(() => {
            onMatchFound({ roomId, myId: myPlayerId });
          }, 1500);
        }
      }
      
      if (!matched) {
        // Wait for someone to match with me
        setStatus('Waiting for opponent...')
        const myRef = ref(database, `matchmaking/${myPlayerId}`);
        onDisconnect(myRef).remove(); // Auto clean queue if disconnect
        
        await set(myRef, playerData);
        
        // Listen to my node for a roomId
        const unsubscribe = onValue(myRef, (snap) => {
          const data = snap.val();
          if (data && data.roomId) {
            setStatus('Match Found! Get ready...')
            unsubscribe();
            // Delete my node from matchmaking
            remove(myRef);
            
            // Delete room if I disconnect while playing
            const roomRef = ref(database, `rooms/${data.roomId}`);
            onDisconnect(roomRef).remove();
            
            setTimeout(() => {
              onMatchFound({ roomId: data.roomId, myId: myPlayerId });
            }, 1500);
          }
        });
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
          remove(myRef);
        };
      }
    };
    
    initMatchmaking();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="glass-panel text-center" style={{ width: '400px', maxWidth: '90vw' }}>
      <Loader2 size={64} className="animate-pulse" style={{ color: 'var(--primary)', margin: '0 auto 2rem auto', animation: 'spin 2s linear infinite' }} />
      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <h2 style={{ marginBottom: '1rem' }}>{status}</h2>
      
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            overflow: 'hidden', border: '3px solid var(--secondary)',
            margin: '0 auto 10px auto'
          }}>
            {playerData.faceImage && <img src={playerData.faceImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <p>You</p>
        </div>
        
        <div style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--primary)' }}>VS</div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            border: '3px dashed rgba(255,255,255,0.2)',
            margin: '0 auto 10px auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)'
          }}>
            ?
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Opponent</p>
        </div>
      </div>
    </div>
  )
}
