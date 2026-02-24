import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { WORKOUT_TYPES } from './workoutConstants';

interface WorkoutLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (data: { type: string, value: number, isShared: boolean }) => void;
  initialType?: string;
}

const WorkoutLogOverlay: React.FC<WorkoutLogOverlayProps> = ({ isOpen, onClose, onLog, initialType }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(initialType || '');
  const [duration, setDuration] = useState(30);
  const [isShared, setIsShared] = useState(false);

  // Sync initial type when opening
  React.useEffect(() => {
    if (isOpen && initialType) {
      setSelectedType(initialType);
    }
  }, [isOpen, initialType]);

  const resetAndClose = () => {
    setStep(1);
    setSelectedType('');
    setDuration(30);
    setIsShared(false);
    onClose();
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onLog({ type: selectedType, value: duration, isShared });
      resetAndClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 1 ? 'var(--primary)' : 'var(--muted)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 2 ? 'var(--primary)' : 'var(--muted)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 3 ? 'var(--primary)' : 'var(--muted)' }} />
              </div>
              <button onClick={resetAndClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {step === 1 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ flex: 1 }}
              >
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>What did you do?</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '0.75rem',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  paddingRight: '0.5rem'
                }}>
                  {WORKOUT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '0.75rem',
                        background: selectedType === type ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: selectedType === type ? 'var(--bg)' : 'white',
                        border: '1px solid ' + (selectedType === type ? 'var(--primary)' : 'transparent'),
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ textAlign: 'center', flex: 1 }}
              >
                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: 'white' }}>For how long?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    fontWeight: 'bold', 
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.5rem'
                  }}>
                    {duration}
                    <span style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>min</span>
                  </div>
                  
                  <input 
                    type="range" 
                    min="0" 
                    max="120" 
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', width: '100%' }}>
                    {[15, 30, 45, 60, 90, 120].map(val => (
                      <button
                        key={val}
                        onClick={() => setDuration(val)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          background: duration === val ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: duration === val ? 'var(--bg)' : 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ textAlign: 'center', flex: 1 }}
              >
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>Final touch</h2>
                <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Working out together is better!</p>
                
                <div 
                  onClick={() => setIsShared(!isShared)}
                  style={{
                    padding: '2rem',
                    borderRadius: '1.5rem',
                    background: isShared ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                    border: '2px solid ' + (isShared ? 'var(--primary)' : 'transparent'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Users size={48} color={isShared ? 'var(--primary)' : 'var(--muted)'} />
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>I worked out with a friend</div>
                  <div style={{ 
                    width: '50px', 
                    height: '26px', 
                    borderRadius: '13px', 
                    background: isShared ? 'var(--primary)' : '#475569',
                    position: 'relative',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: isShared ? '27px' : '3px',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                  {isShared && <div style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>+1 Bonus Point!</div>}
                </div>
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {step > 1 && (
                <button 
                  onClick={handleBack}
                  className="btn" 
                  style={{ background: '#475569', flex: 1 }}
                >
                  Back
                </button>
              )}
              <button 
                onClick={handleNext}
                disabled={step === 1 && !selectedType}
                className="btn" 
                style={{ 
                  flex: 2,
                  opacity: (step === 1 && !selectedType) ? 0.5 : 1
                }}
              >
                {step === 3 ? 'Log Workout' : 'Next'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WorkoutLogOverlay;
