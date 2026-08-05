import { useState } from 'react'
import { auth } from '../firebase'
import { 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth'
import { LOGO_BASE64 } from '../logoBase64'
import { LogIn, UserPlus, Ghost } from 'lucide-react'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

      <button onClick={handleGuestLogin} className="btn btn-secondary" style={{ width: '100%' }} disabled={isLoading}>
        <Ghost size={18} /> Play as Guest
      </button>
    </div>
  )
}
