import { useState, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import MatchmakingScreen from './components/MatchmakingScreen'
import GameScreen from './components/GameScreen'
import LoginScreen from './components/LoginScreen'
import HistoryScreen from './components/HistoryScreen'
import TutorialModal from './components/TutorialModal'
import { Swords, LogOut, History, User, BookOpen } from 'lucide-react'
import type { GameState, PlayerData } from './types'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import './App.css'

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [gameState, setGameState] = useState<GameState | 'history'>('home')
  const [showTutorial, setShowTutorial] = useState(false)
  const [playerData, setPlayerData] = useState<PlayerData>({ faceImage: null, martialArt: 'boxing' })
  const [roomData, setRoomData] = useState<any>(null)

  useEffect(() => {
    if (!auth) {
        // Fallback local user if firebase is missing
        setUser({ uid: 'local_user_' + Date.now(), isAnonymous: true } as any);
        setIsAuthChecking(false);
        return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setIsAuthChecking(false)
      if (!u) {
        setGameState('home') // Reset on logout
      }
    })
    return () => unsub()
  }, [])

  const handleStartSetup = async () => {
    setGameState('setup');
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        if (document.documentElement.requestFullscreen) {
           await document.documentElement.requestFullscreen();
        }
        if (window.screen.orientation && window.screen.orientation.lock) {
           await window.screen.orientation.lock('landscape');
        }
      } catch (e) {
        console.warn("Fullscreen/Orientation lock failed", e);
      }
    }
  }
  
  const handleSetupComplete = (data: PlayerData, isTraining?: boolean) => {
    setPlayerData(data)
    if (isTraining) {
        setRoomData({ roomId: 'training', myId: 'player1', isTraining: true })
        setGameState('playing')
    } else {
        setGameState('matchmaking')
    }
  }

  const handleMatchFound = (roomInfo: any) => {
    setRoomData(roomInfo)
    setGameState('playing')
  }

  const handleGameOver = () => {
    setGameState('home')
    setRoomData(null)
  }
  
  const handleSignOut = () => {
    if (auth) {
        signOut(auth);
    } else {
        setUser(null);
    }
  }

  if (isAuthChecking) {
    return <div className="app-container"><div className="glass-panel text-center">Loading...</div></div>
  }

  if (!user) {
    return (
      <div className="app-container">
        <LoginScreen />
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="landscape-warning">
         <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🔄📱</span>
            Vui lòng xoay ngang màn hình điện thoại để chơi!
         </div>
      </div>
      
      {/* Top Navbar */}
      {gameState !== 'playing' && (
        <div style={{ position: 'absolute', top: '10px', right: '20px', display: 'flex', gap: '10px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '20px' }}>
             <User size={16} /> 
             <span style={{ fontSize: '0.9rem' }}>{user.isAnonymous ? 'Guest' : user.email}</span>
          </div>
          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.9rem', color: 'var(--secondary)' }} onClick={() => setShowTutorial(true)}>
            <BookOpen size={16} /> Tutorial
          </button>
          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.9rem' }} onClick={() => setGameState('history')}>
            <History size={16} /> History
          </button>
          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.9rem', color: '#ff5555' }} onClick={handleSignOut}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}

      {gameState === 'home' && (
        <div className="glass-panel text-center animate-pulse-slow" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 10px var(--primary)' }}>FACE FIGHTERS</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>The ultimate web fighting game where YOU are the character.</p>
          <button className="btn btn-primary" onClick={handleStartSetup} style={{ margin: '0 auto' }}>
            <Swords size={24} /> Enter the Arena
          </button>
        </div>
      )}
      
      {gameState === 'history' && (
        <HistoryScreen userId={user.uid} onBack={() => setGameState('home')} />
      )}

      {gameState === 'setup' && (
        <SetupScreen userId={user.uid} onComplete={handleSetupComplete} />
      )}

      {gameState === 'matchmaking' && (
        <MatchmakingScreen 
          playerData={playerData} 
          userId={user.uid} 
          onMatchFound={handleMatchFound} 
          onBack={() => setGameState('setup')} 
        />
      )}

      {gameState === 'playing' && (
        <GameScreen playerData={playerData} roomData={roomData} onGameOver={handleGameOver} />
      )}

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  )
}

export default App
