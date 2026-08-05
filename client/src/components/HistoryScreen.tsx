import { useEffect, useState } from 'react'
import { database } from '../firebase'
import { ref, get } from 'firebase/database'
import { ArrowLeft, Swords } from 'lucide-react'

interface HistoryScreenProps {
  userId: string;
  onBack: () => void;
}

export default function HistoryScreen({ userId, onBack }: HistoryScreenProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (userId && database) {
        try {
          const historyRef = ref(database, `users/${userId}/history`);
          const snap = await get(historyRef);
          if (snap.exists()) {
            const data = snap.val();
            // Convert to array and sort by time descending
            const arr = Object.values(data).sort((a: any, b: any) => b.ts - a.ts);
            setHistory(arr);
          }
        } catch (e) {
          console.error("Failed to load history", e);
        }
      }
      setLoading(false);
    }
    fetchHistory();
  }, [userId])

  return (
    <div className="glass-panel" style={{ width: '600px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '15px' }}>
        <button onClick={onBack} className="btn" style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0 }}>Match History</h2>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
        {loading ? (
           <p className="text-center">Loading...</p>
        ) : history.length === 0 ? (
           <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              <Swords size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
              <p>No matches yet. Go fight!</p>
           </div>
        ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {history.map((match, idx) => (
               <div key={idx} style={{ 
                 padding: '15px', 
                 background: 'rgba(0,0,0,0.3)', 
                 borderRadius: '12px',
                 borderLeft: `4px solid ${match.result === 'win' ? '#00FF00' : '#FF3366'}`,
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center'
               }}>
                 <div>
                   <h3 style={{ margin: '0 0 5px 0', color: match.result === 'win' ? '#00FF00' : '#FF3366' }}>
                     {match.result === 'win' ? 'VICTORY' : 'DEFEAT'}
                   </h3>
                   <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                     vs {match.opponentId}
                   </div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontWeight: 'bold' }}>{match.myMartialArt.toUpperCase()}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {new Date(match.ts).toLocaleString()}
                   </div>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  )
}
