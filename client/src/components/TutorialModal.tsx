import { BookOpen, X, HandMetal, ShieldAlert } from 'lucide-react'

interface TutorialModalProps {
  onClose: () => void;
}

export default function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div className="glass-panel" style={{ width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <BookOpen /> Hướng Dẫn Chơi
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section>
            <h3 style={{ color: 'var(--secondary)' }}>1. Điều Khiển Cơ Bản</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', lineHeight: '1.6' }}>
              <li><strong>W, A, S, D</strong>: Di chuyển, Nhảy (W), Cúi (S).</li>
              <li><strong>U</strong>: Nhấn giữ để Thủ (Block) - Giảm 80% sát thương.</li>
              <li><strong>J / K</strong>: Đấm / Kỹ năng phụ (Nếu đang Đè S để ngồi, sẽ tung đòn gạt chân/đấm thấp).</li>
              <li><strong>L</strong>: Tuyệt chiêu / Tấn công mạnh (Xuyên Thủ / Phá Khiên!).</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <HandMetal size={18} /> Môn phái: Boxing
            </h3>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', lineHeight: '1.6' }}>
              <li><strong>J</strong>: Đấm thường (Sát thương: 10)</li>
              <li><strong>K</strong>: Móc sườn (Sát thương: 15)</li>
              <li><strong>L</strong>: Uppercut - Móc cằm (Sát thương: 25, Gây choáng 0.5s)</li>
              <li><strong>Xuống (S) + Tiến (D) + J</strong>: Tuyệt kỹ Khí Chưởng (Sát thương: 30, Bắn xa)</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldAlert size={18} /> Môn phái: Karate
            </h3>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', lineHeight: '1.6' }}>
              <li><strong>J</strong>: Đấm thẳng (Sát thương: 10)</li>
              <li><strong>K</strong>: Đá vòng cầu (Sát thương: 15)</li>
              <li><strong>L</strong>: Đá bay (Sát thương: 25, Gây choáng 0.5s)</li>
              <li><strong>Xuống (S) + Tiến (D) + J</strong>: Tuyệt kỹ Khí Chưởng (Sát thương: 30, Bắn xa)</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
