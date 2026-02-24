import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Footprints, Check } from 'lucide-react';

interface StepsLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (steps: number) => void;
  initialSteps?: number;
  isLoading?: boolean;
}

const StepsLogOverlay = ({ isOpen, onClose, onLog, initialSteps = 0, isLoading }: StepsLogOverlayProps) => {
  const [steps, setSteps] = useState(initialSteps || 5000);
  const [isTyping, setIsTyping] = useState(false);

  // Initialize with current day's steps when opening
  useEffect(() => {
    if (isOpen) {
      setSteps(Math.max(initialSteps || 0, 5000));
    }
  }, [isOpen, initialSteps]);

  const resetAndClose = () => {
    setIsTyping(false);
    onClose();
  };

  const handleLog = () => {
    if (isLoading) return;
    onLog(steps);
    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 2000,
              backdropFilter: 'blur(4px)'
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
              padding: '2rem',
              zIndex: 2001,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'white' }}>Daily Steps</h2>
              <button onClick={resetAndClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Footprints size={48} color="var(--primary)" />
                
                {isTyping ? (
                  <input 
                    autoFocus
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(Math.max(initialSteps, parseInt(e.target.value) || 0))}
                    onBlur={() => setIsTyping(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderBottom: '2px solid var(--primary)',
                      color: 'var(--primary)',
                      fontSize: '4rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      width: '80%',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div 
                    onClick={() => setIsTyping(true)}
                    style={{ 
                      fontSize: '4.5rem', 
                      fontWeight: 'bold', 
                      color: 'var(--primary)',
                      lineHeight: 1,
                      cursor: 'text'
                    }}
                  >
                    {steps.toLocaleString()}
                  </div>
                )}
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Tap number to type exact amount</div>
              </div>
              
              <div style={{ padding: '0 1rem' }}>
                <input 
                  type="range" 
                  min={initialSteps} 
                  max="15000" 
                  step="100"
                  value={steps > 15000 ? 15000 : steps}
                  onChange={(e) => setSteps(Math.max(initialSteps, parseInt(e.target.value)))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary)',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  <span>{initialSteps.toLocaleString()} (Min)</span>
                  <span>7.5k</span>
                  <span>15k+</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {[5000, 8000, 12000, 15000].map(val => (
                  <button
                    key={val}
                    disabled={val < initialSteps}
                    onClick={() => setSteps(val)}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '0.75rem',
                      background: steps === val ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: steps === val ? 'var(--bg)' : 'white',
                      border: '1px solid ' + (steps === val ? 'var(--primary)' : 'rgba(255,255,255,0.1)'),
                      cursor: val < initialSteps ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      opacity: val < initialSteps ? 0.3 : 1
                    }}
                  >
                    {val >= 1000 ? (val / 1000) + 'k' : val}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleLog}
              disabled={isLoading || steps <= initialSteps && initialSteps > 0}
              className="btn" 
              style={{ 
                marginTop: '1.5rem',
                padding: '1rem',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: (isLoading || steps <= initialSteps && initialSteps > 0) ? 0.6 : 1
              }}
            >
              {isLoading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent' }} />
              ) : (
                <>
                  <Check size={20} /> 
                  Log {steps.toLocaleString()} Steps
                </>
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StepsLogOverlay;
