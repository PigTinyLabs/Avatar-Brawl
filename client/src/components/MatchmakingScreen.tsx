import { useEffect, useState } from 'react'
import { Loader2, Search, Users, Key, ChevronLeft, Copy, Check } from 'lucide-react'
import type { PlayerData } from '../types'
import { socket } from '../socket'

interface MatchmakingScreenProps {
  playerData: PlayerData;
  userId: string;
  onMatchFound: (roomInfo: any) => void;
  onBack: () => void;
}

export let myPlayerId = '';

export default function MatchmakingScreen({ playerData, userId, onMatchFound, onBack }: MatchmakingScreenProps) {
  const [mode, setMode] = useState<'menu' | 'quick' | 'create_private' | 'join_private'>('menu')
  const [status, setStatus] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    myPlayerId = userId;
    socket.connect();
    
    socket.on('connect', () => {
       console.log('Connected to server');
    });

    socket.on('waiting_for_opponent', () => {
       setStatus('Waiting for opponent...');
    });

    socket.on('match_found', (data: any) => {
       setStatus('Match Found! Get ready...');
       setTimeout(() => {
         onMatchFound({ roomId: data.roomId, myId: socket.id, initialPlayers: data.players });
       }, 1500);
    });

    socket.on('private_created', (data: any) => {
       setMyCode(data.code);
       setStatus('Waiting for friend to join...');
    });

    socket.on('join_error', (data: any) => {
       setStatus(data.message);
    });

    return () => {
      socket.off('connect');
      socket.off('waiting_for_opponent');
      socket.off('match_found');
      socket.off('private_created');
      socket.off('join_error');
      socket.disconnect();
    }
  }, [userId, onMatchFound])

  const startQuickMatch = () => {
    setMode('quick')
    setStatus('Finding opponent...')
    socket.emit('join_queue', playerData);
  }

  const createPrivateRoom = () => {
    setMode('create_private');
    setStatus('Creating room...');
    socket.emit('create_private', playerData);
  }

  const joinPrivateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setStatus('Joining room...');
    socket.emit('join_private', { code: joinCode, playerData });
  }

  const cancelMatchmaking = () => {
    socket.disconnect();
    setTimeout(() => socket.connect(), 100); // reconnect to clear state
    setMode('menu');
    setStatus('');
    setJoinCode('');
  }

  return (
    <div className="glass-panel text-center" style={{ width: '450px', maxWidth: '90vw' }}>
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>

      {mode === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Choose Game Mode</h2>
          
          <button className="btn btn-primary" onClick={startQuickMatch}>
            <Search size={20} /> Quick Match
          </button>
          
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
          
          <button className="btn btn-secondary" onClick={createPrivateRoom} style={{ color: '#fff' }}>
            <Users size={20} /> Create Private Room
          </button>
          
          <button className="btn" onClick={() => setMode('join_private')} style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <Key size={20} /> Join Private Room
          </button>
          
          <button className="btn" onClick={onBack} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid transparent', color: 'var(--text-muted)' }}>
            <ChevronLeft size={18} /> Back to Setup
          </button>
        </div>
      )}

      {mode === 'join_private' && (
        <form onSubmit={joinPrivateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2>Join Room</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter the 6-character room code</p>
          
          <input 
            type="text" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="e.g. ABX829"
            style={{ 
              padding: '15px', borderRadius: '8px', border: '2px solid var(--secondary)', 
              background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '5px' 
            }}
          />
          
          {status && <p style={{ color: '#ff3366', fontWeight: 'bold' }}>{status}</p>}
          
          <button type="submit" className="btn btn-secondary" disabled={!joinCode}>
            Join Room
          </button>
          <button type="button" className="btn" onClick={cancelMatchmaking} style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            Back
          </button>
        </form>
      )}

      {(mode === 'quick' || mode === 'create_private') && (
        <>
          <Loader2 size={64} style={{ color: 'var(--primary)', margin: '0 auto 2rem auto', animation: 'spin 2s linear infinite' }} />
          <h2 style={{ marginBottom: '1rem' }}>{status}</h2>
          
          {mode === 'create_private' && (
             <div style={{ padding: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.85rem' }}>Room Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <h1 style={{ letterSpacing: '8px', color: 'var(--secondary)', margin: 0, userSelect: 'none', WebkitUserSelect: 'none' }}>{myCode}</h1>
                  <button
                    onClick={handleCopyCode}
                    title="Copy room code"
                    style={{
                      background: copied ? 'rgba(0, 245, 100, 0.2)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${copied ? '#00f564' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                      color: copied ? '#00f564' : '#fff', display: 'flex', alignItems: 'center', gap: '5px',
                      fontSize: '13px', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
             </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--secondary)', margin: '0 auto 10px auto' }}>
                {playerData.faceImage && <img src={playerData.faceImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <p>You</p>
            </div>
            
            <div style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--primary)' }}>VS</div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px dashed rgba(255,255,255,0.2)', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                ?
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Opponent</p>
            </div>
          </div>
          
          <button className="btn" onClick={cancelMatchmaking} style={{ marginTop: '2rem', border: '1px solid rgba(255,255,255,0.2)', margin: '2rem auto 0 auto' }}>
            <ChevronLeft size={20} /> Cancel
          </button>
        </>
      )}
    </div>
  )
}
