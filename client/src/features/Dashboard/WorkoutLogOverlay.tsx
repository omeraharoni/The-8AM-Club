import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Camera, Zap, User as UserIcon, Trash2 } from 'lucide-react';
import { WORKOUT_TYPES } from './workoutConstants';
import { compressImage } from '../../utils/imageUtils';

interface WorkoutLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (data: { type: string, value: number, isShared: boolean, isSolo: boolean, proofImage?: string }) => void;
  initialType?: string;
}

const WorkoutLogOverlay = ({ isOpen, onClose, onLog, initialType }: WorkoutLogOverlayProps) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(initialType || '');
  const [duration, setDuration] = useState(30);
  const [isShared, setIsShared] = useState(false);
  const [isSolo, setIsSolo] = useState(true);
  const [proofImage, setProofImage] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialType) {
      setSelectedType(initialType);
    }
  }, [isOpen, initialType]);

  const resetAndClose = () => {
    setStep(1);
    setSelectedType('');
    setDuration(30);
    setIsShared(false);
    setIsSolo(true);
    setProofImage(undefined);
    onClose();
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else {
      onLog({ type: selectedType, value: duration, isShared, isSolo, proofImage });
      resetAndClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressed = await compressImage(file);
        setProofImage(compressed);
      } catch (err) {
        console.error("Compression failed", err);
      } finally {
        setIsCompressing(false);
      }
    }
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
              padding: '1.5rem',
              paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
              zIndex: 2001,
              maxHeight: '82vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ 
              position: 'sticky',
              top: '-1.5rem', 
              background: 'var(--card)',
              padding: '1rem 0',
              zIndex: 10,
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 1 ? 'var(--primary)' : 'var(--muted)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 2 ? 'var(--primary)' : 'var(--muted)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 3 ? 'var(--primary)' : 'var(--muted)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step >= 4 ? 'var(--primary)' : 'var(--muted)' }} />
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
                  maxHeight: '40vh',
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%' }}>
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>Solo Grind?</h2>
                <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Did you conquer this session alone?</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button 
                    onClick={() => setIsSolo(true)}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '1.25rem',
                      background: isSolo ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: '2px solid ' + (isSolo ? 'var(--primary)' : 'transparent'),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      transition: 'all 0.2s',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <UserIcon size={32} color={isSolo ? 'var(--primary)' : 'var(--muted)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isSolo ? 'white' : 'var(--muted)' }}>Solo Session</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>I crushed it by myself</div>
                    </div>
                    {isSolo && <Zap size={20} color="var(--primary)" />}
                  </button>

                  <button 
                    onClick={() => { setIsSolo(false); setIsShared(true); }}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '1.25rem',
                      background: !isSolo ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: '2px solid ' + (!isSolo ? 'var(--primary)' : 'transparent'),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      transition: 'all 0.2s',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <Users size={32} color={!isSolo ? 'var(--primary)' : 'var(--muted)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: !isSolo ? 'white' : 'var(--muted)' }}>Group / Partner</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Working out together is better</div>
                    </div>
                    {!isSolo && <Zap size={20} color="var(--primary)" />}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ textAlign: 'center', flex: 1 }}
              >
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '1.5rem', border: '1px dashed var(--primary)' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>CLAIM YOUR BONUS</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    "Your sweat is your currency. 💸 Snap a proof photo now to claim your +5 Bonus Points!"
                  </p>
                </div>

                {proofImage ? (
                  <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto', borderRadius: '1rem', overflow: 'hidden' }}>
                    <img src={proofImage} alt="Proof Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => setProofImage(undefined)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', padding: '5px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label 
                    style={{
                      width: '100%',
                      padding: '3rem 1rem',
                      borderRadius: '1.5rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '2px dashed rgba(255,255,255,0.1)',
                      color: 'var(--muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: isCompressing ? 'wait' : 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/jpg" 
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                      disabled={isCompressing}
                    />
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={32} />
                    </div>
                    {isCompressing ? 'Compressing Proof...' : 'Take or Upload Proof Photo'}
                  </label>
                )}
                
                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {proofImage ? '✅ Proof verified! You will receive +5 bonus points.' : 'Skip the photo and log without bonus points.'}
                </p>
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
                disabled={(step === 1 && !selectedType) || isCompressing}
                className="btn" 
                style={{ 
                  flex: 2,
                  opacity: ((step === 1 && !selectedType) || isCompressing) ? 0.5 : 1
                }}
              >
                {step === 4 ? (proofImage ? 'Post with Proof' : 'Log Without Photo') : 'Next'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WorkoutLogOverlay;
