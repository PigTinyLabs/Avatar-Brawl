import { useState, useRef, useEffect } from 'react'
import AvatarEditor from 'react-avatar-editor'
import Dropzone from 'react-dropzone'
import { Camera, ChevronRight, HandMetal, ShieldAlert, Loader2, Smile } from 'lucide-react'
import type { PlayerData } from '../types'
import { database } from '../firebase'
import { ref, get, set } from 'firebase/database'

interface SetupScreenProps {
  userId: string;
  onComplete: (data: PlayerData, isTraining?: boolean) => void;
}

const MARTIAL_ARTS = [
  { id: 'boxing', name: 'Boxing', icon: <HandMetal />, desc: 'High attack speed, close range.' },
  { id: 'karate', name: 'Karate', icon: <ShieldAlert />, desc: 'Balanced attack and defense.' }
]

export default function SetupScreen({ userId, onComplete }: SetupScreenProps) {
  const [image, setImage] = useState<File | string | null>(null)
  const [scale, setScale] = useState(1.2)
  const [martialArt, setMartialArt] = useState('boxing')
  const [isLoading, setIsLoading] = useState(true)
  const editorRef = useRef<any>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const profileRef = ref(database, `users/${userId}/profile`);
      const snap = await get(profileRef);
      if (snap.exists()) {
        const data = snap.val();
        if (data.faceImage) setImage(data.faceImage);
        if (data.martialArt) setMartialArt(data.martialArt);
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [userId])

  const handleDrop = (dropped: File[]) => {
    if (dropped && dropped.length > 0) {
      setImage(dropped[0])
    }
  }

  const handleSave = async (isTraining: boolean = false) => {
    let finalFaceImage = image as string;
    
    if (editorRef.current && typeof image !== 'string') {
      const canvasScaled = editorRef.current.getImageScaledToCanvas()
      finalFaceImage = canvasScaled.toDataURL('image/jpeg', 0.8) // Use JPEG 80% to save space
    }

    const payload = {
      faceImage: finalFaceImage,
      martialArt
    };

    // Save to user profile so they don't have to upload next time
    await set(ref(database, `users/${userId}/profile`), payload);

    onComplete(payload, isTraining)
  }

  if (isLoading) {
    return <div className="glass-panel text-center"><Loader2 className="animate-pulse" /> Loading Profile...</div>
  }

  return (
    <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', display: 'flex', gap: '2rem' }}>
      {/* Left: Face Upload */}
      <div style={{ flex: 1 }}>
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Camera /> 1. Prepare Your Face
        </h2>
        
        {!image ? (
          <Dropzone onDrop={handleDrop} accept={{ 'image/*': [] }} multiple={false}>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} style={{ 
                border: '2px dashed var(--primary)', 
                borderRadius: '12px', 
                padding: '3rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }} className="dropzone">
                <input {...getInputProps()} />
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#ccc', border: '3px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                   <Smile size={48} color="#333" />
                </div>
                <p>Drag & drop photo or click to change</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>(Optional - Default face will be used)</p>
              </div>
            )}
          </Dropzone>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 20px var(--primary-glow)' }}>
              <AvatarEditor
                ref={editorRef}
                image={image}
                width={150}
                height={150}
                border={10}
                borderRadius={75}
                color={[0, 0, 0, 0.6]} // RGBA
                scale={scale}
                rotate={0}
              />
            </div>
            <div style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Zoom:</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.01" 
                value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
            </div>
            <button 
              className="btn" 
              style={{ marginTop: '1rem', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={() => setImage(null)}
            >
              Choose different photo
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

      {/* Right: Martial Art */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1rem' }}>2. Choose Martial Art</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {MARTIAL_ARTS.map(art => (
            <div 
              key={art.id}
              onClick={() => setMartialArt(art.id)}
              style={{
                padding: '1rem',
                border: `2px solid ${martialArt === art.id ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                background: martialArt === art.id ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}
            >
              <div style={{ color: martialArt === art.id ? 'var(--secondary)' : 'var(--text-muted)' }}>
                {art.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, color: martialArt === art.id ? '#fff' : 'var(--text-muted)' }}>{art.name}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{art.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => handleSave(false)}
            style={{ flex: 2 }}
          >
            Find Match <ChevronRight />
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleSave(true)}
            style={{ flex: 1, color: '#fff' }}
          >
            Training
          </button>
        </div>
      </div>
    </div>
  )
}
