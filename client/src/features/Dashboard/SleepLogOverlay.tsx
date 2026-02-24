import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Check, ChevronUp, ChevronDown } from 'lucide-react';

interface SleepLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (data: { value: number, note: string }) => void;
  isLoading?: boolean;
  initialWakeTime?: number;
}

const SleepLogOverlay: React.FC<SleepLogOverlayProps> = ({ isOpen, onClose, onLog, isLoading, initialWakeTime }) => {
  const [bedTime, setBedTime] = useState(23.0); 
  const [wakeTime, setWakeTime] = useState(7.0);
  const [duration, setDuration] = useState(8.0);

  useEffect(() => {
    if (isOpen && initialWakeTime !== undefined) {
      setWakeTime(initialWakeTime);
    }
  }, [isOpen, initialWakeTime]);

  useEffect(() => {
    let diff = wakeTime - bedTime;
    if (diff < 0) diff += 24; 
    setDuration(parseFloat(diff.toFixed(1)));
  }, [bedTime, wakeTime]);

  const formatTime = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    const displayMins = mins === 60 ? 0 : (mins > 59 ? 59 : mins);
    const displayHours = mins === 60 ? (hours + 1) % 24 : hours;
    return `${displayHours.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}`;
  };

  const handleLog = () => {
    if (isLoading) return;
    onLog({
      value: duration,
      note: `${formatTime(bedTime)} - ${formatTime(wakeTime)}`
    });
    onClose();
  };

  const Roller = ({ value, label, onChange }: { value: number, label: string, onChange: (v: number) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.65rem', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</span>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '1rem',
        padding: '0.3rem',
        width: '100%',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button 
          onClick={() => onChange((value + 0.5) % 24)}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ChevronUp size={24} />
        </button>
        <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', fontFamily: 'monospace' }}>
          {formatTime(value)}
        </div>
        <button 
          onClick={() => onChange((value - 0.5 + 24) % 24)}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 2000,
              backdropFilter: 'blur(10px)'
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--card)',
              borderTopLeftRadius: '2rem',
              borderTopRightRadius: '2rem',
              padding: '1rem 1.2rem',
              zIndex: 2001,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -15px 35px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, color: 'white', fontWeight: '800', opacity: 0.6 }}>Night Summary</h2>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1.4rem', fontWeight: '900', lineHeight: 1.1 }}>How did you sleep, Champ?</p>
                <div style={{ fontSize: '3rem', fontWeight: '900', color: 'white', lineHeight: 1, letterSpacing: '-2px' }}>
                  {duration}<span style={{ fontSize: '1rem', color: 'var(--muted)', marginLeft: '2px' }}>h</span>
                </div>
                {duration >= 7 && (
                   <div style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.2rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.1rem 0.6rem', borderRadius: '2rem', display: 'inline-block' }}>
                     ✓ Goal Reached (5 pts)
                   </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 0.5rem', borderRadius: '1.2rem', border: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                <Roller value={bedTime} label="Bedtime" onChange={setBedTime} />
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 'bold', paddingTop: '1rem', opacity: 0.3 }}>to</div>
                <Roller value={wakeTime} label="Wake up" onChange={setWakeTime} />
              </div>
            </div>

            <button 
              onClick={handleLog}
              disabled={isLoading}
              className="btn" 
              style={{ 
                marginTop: '1rem',
                padding: '0.9rem',
                fontSize: '1rem',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)',
                borderRadius: '0.8rem'
              }}
            >
              {isLoading ? (
                <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent' }} />
              ) : (
                <>
                  <Check size={20} strokeWidth={3} /> 
                  BATTERY LOADED! 🔋
                </>
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SleepLogOverlay;
