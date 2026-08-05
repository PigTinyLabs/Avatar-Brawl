import { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth'
import { LOGO_BASE64 } from '../logoBase64'
import { LogIn, UserPlus, Ghost, Download, X } from 'lucide-react'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  const handleRegister = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="glass-panel" style={{ width: '400px', maxWidth: '90vw' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
         <img src={LOGO_BASE64} alt="Avatar Brawl Logo" style={{ width: '200px', maxWidth: '100%', borderRadius: '15px', boxShadow: '0 0 20px rgba(0,255,255,0.3)' }} />
      </div>
      
      {error && (
        <div style={{ background: 'rgba(255,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
            <LogIn size={18} /> Login
          </button>
          <button type="button" onClick={handleRegister} className="btn" style={{ flex: 1, border: '1px solid var(--primary)' }} disabled={isLoading}>
            <UserPlus size={18} /> Sign Up
          </button>
        </div>
      </form>

      <div style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--text-muted)' }}>OR</div>

      <button onClick={handleGuestLogin} className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} disabled={isLoading}>
        <Ghost size={18} /> Play as Guest
      </button>

      <button 
        onClick={() => {
          if (deferredPrompt) {
             deferredPrompt.prompt();
             deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
          } else {
             setShowInstallGuide(true);
          }
        }} 
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
      >
        <Download size={18} /> Install App (iOS / Android)
      </button>

      {showInstallGuide && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
             <button onClick={() => setShowInstallGuide(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
               <X size={24} />
             </button>
             <h3 style={{ marginTop: 0, color: '#00F0FF' }}>How to Install App</h3>
             <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
               <p><strong>iOS (Safari):</strong></p>
               <ol style={{ paddingLeft: '20px' }}>
                 <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
                 <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
               </ol>
               <p><strong>Android (Chrome):</strong></p>
               <ol style={{ paddingLeft: '20px' }}>
                 <li>Tap the <strong>Menu (3 dots)</strong> at the top right.</li>
                 <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
               </ol>
             </div>
             <button onClick={() => setShowInstallGuide(false)} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  )
}
