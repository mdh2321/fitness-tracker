'use client';

import { useEffect, useState } from 'react';
import type { LevelUpInfo } from '@/hooks/use-quests';

interface LevelUpModalProps {
  levelUp: LevelUpInfo;
  onClose: () => void;
}

export function LevelUpModal({ levelUp, onClose }: LevelUpModalProps) {
  const [visible, setVisible] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; left: number; hue: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      hue: Math.random() * 360,
      delay: Math.random() * 0.8,
      size: 4 + Math.random() * 8,
    }));
    setConfettiPieces(pieces);

    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const titleChanged = levelUp.newTitle !== undefined;
  const hasColorUnlocks = levelUp.colorUnlocks.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      {/* Confetti */}
      {confettiPieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            position: 'fixed',
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.id % 3 === 0 ? '50%' : '0',
            background: `hsl(${p.hue}, 80%, 60%)`,
            animation: `confettiFall 2.5s ease-in ${p.delay}s forwards`,
            zIndex: 51,
          }}
        />
      ))}

      {/* Modal card */}
      <div
        className="relative z-[52] text-center px-8 py-10 rounded-2xl max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          transform: visible ? 'scale(1)' : 'scale(0.5)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease',
        }}
      >
        {/* Level circle */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #00d26a)',
            color: 'white',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(0, 210, 106, 0.2)',
            animation: 'levelPulse 2s ease-in-out infinite',
          }}
        >
          {levelUp.newLevel}
        </div>

        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--fg-muted)' }}>
          Level Up!
        </p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>
          {levelUp.newTitle}
        </h2>

        {/* Unlocks */}
        {(hasColorUnlocks || levelUp.shieldEarned) && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--fg-muted)' }}>
              Unlocked
            </p>
            {levelUp.colorUnlocks.map((c) => (
              <div key={c.hex} className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border" style={{ background: c.hex, borderColor: 'var(--border)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{c.name} accent</span>
              </div>
            ))}
            {levelUp.shieldEarned && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-base">🛡️</span>
                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Streak Shield</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
