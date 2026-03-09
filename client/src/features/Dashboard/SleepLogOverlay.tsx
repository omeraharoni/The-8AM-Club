import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Trash2, Zap, Sun } from 'lucide-react';
import { compressImage } from '../../utils/imageUtils';

interface SleepLogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (data: { value: number, note: string, proofImage?: string }) => void;
  isLoading?: boolean;
  initialWakeTime?: number;
}

const SleepLogOverlay = ({ isOpen, onClose, onLog, isLoading, initialWakeTime }: SleepLogOverlayProps) => {
  const [mode, setMode] = useState<'wakeup' | 'cycle'>('wakeup');
  const [step, setStep] = useState(1);
  const [bedTime, setBedTime] = useState(23.0); 
  const [wakeTime, setWakeTime] = useState(7.0);
  const [duration, setDuration] = useState(8.0);
  const [proofImage, setProofImage] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const hour = now.getHours();
      const mins = now.getMinutes();
      const currentTime = hour + (mins / 60);

      // Default to cycle at night (8 PM - 4 AM), otherwise wakeup
      if (hour >= 20 || hour < 4) {
        setMode('cycle');
        setWakeTime(Math.round(currentTime * 6) / 6); // Round to nearest 10 mins
      } else {
        setMode('wakeup');
        setWakeTime(currentTime); // Set to ACTUAL current time
      }
      
      if (initialWakeTime !== undefined) {
        setWakeTime(initialWakeTime);
      }
    }
  }, [isOpen, initialWakeTime]);

  useEffect(() => {
    let diff = wakeTime - bedTime;
    if (diff < 0) diff += 24; 
    setDuration(parseFloat(diff.toFixed(1)));
  }, [bedTime, wakeTime]);

  const updateTimeToNow = () => {
    const now = new Date();
    const currentTime = now.getHours() + (now.getMinutes() / 60);
    setWakeTime(currentTime);
  };

  const resetAndClose = () => {
    setStep(1);
    setProofImage(undefined);
    onClose();
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

  const formatTime = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    const displayMins = mins >= 60 ? 0 : mins;
    const displayHours = mins === 60 ? (hours + 1) % 24 : hours;
    return `${displayHours.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}`;
  };

  const handleLog = () => {
    if (isLoading) return;
    
    onLog({
      value: duration, 
      note: mode === 'cycle' ? `${formatTime(bedTime)} - ${formatTime(wakeTime)}` : 'wakeup',
      proofImage
    });
    resetAndClose();
  };

  const TimeRoller = ({ value, label, onChange, step = 0.5, onNow }: { value: number, label: string, onChange: (v: number) => void, step?: number, onNow?: () => void }) => {
    const [dragY, setDragY] = useState(0);
    const pixelsPerStep = 45; 

    const handleDrag = (_: any, info: any) => {
      setDragY(info.offset.y);
    };

    const handleDragEnd = (_: any, info: any) => {
      const dragDistance = info.offset.y;
      // Increased power factor for "aggressive" scrolling
      const velocityBoost = info.velocity.y * 0.25; 
      const totalMovement = dragDistance + velocityBoost;
      
      // Calculate how many 10-min steps to move
      const deltaSteps = Math.round(totalMovement / pixelsPerStep);
      
      if (deltaSteps !== 0) {
        let newValue = value - (deltaSteps * step);
        // Normalize value to 0-24 range
        while (newValue < 0) newValue += 24;
        while (newValue >= 24) newValue -= 24;
        
        // Final rounding to ensure we stay on the 10-min grid
        const roundedValue = Math.round(newValue * 6) / 6;
        onChange(roundedValue);
      }
      setDragY(0);
    };

    const indices = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, touchAction: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <span style={{ 
            color: 'var(--muted)', 
            fontSize: '0.6rem', 
            textTransform: 'uppercase', 
            fontWeight: 'bold', 
            letterSpacing: '1.5px',
            opacity: 0.7
          }}>{label}</span>
          {onNow && (
            <button 
              onClick={onNow}
              style={{ 
                background: 'rgba(251, 191, 36, 0.1)', 
                border: '1px solid rgba(251, 191, 36, 0.2)', 
                color: 'var(--primary)', 
                fontSize: '0.55rem', 
                fontWeight: '900', 
                padding: '1px 6px', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              NOW
            </button>
          )}
        </div>
        
        <div style={{ 
          position: 'relative',
          height: '200px',
          width: '100%',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
          borderRadius: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.5)',
          perspective: '1000px'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '0', 
            right: '0', 
            height: '40px', 
            transform: 'translateY(-50%)',
            background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.05) 20%, rgba(251,191,36,0.05) 80%, transparent)',
            borderTop: '1px solid rgba(251,191,36,0.15)',
            borderBottom: '1px solid rgba(251,191,36,0.15)',
            zIndex: 1,
            pointerEvents: 'none'
          }} />

          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            animate={{ y: dragY }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'grab',
              zIndex: 2,
              width: '100%',
            }}
            whileTap={{ cursor: 'grabbing' }}
          >
            {indices.map((i) => {
              const v = (value + (i * step) + 24) % 24;
              const distanceFromCenter = i - (dragY / pixelsPerStep);
              const absDistance = Math.abs(distanceFromCenter);
              const rotateX = distanceFromCenter * 25; 
              const opacity = Math.max(0, 1 - (absDistance / 4.5)); 
              const scale = 1 - (absDistance * 0.08); 
              const translateY = distanceFromCenter * 2; 

              return (
                <div 
                  key={i}
                  style={{ 
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: i === 0 ? '900' : '600',
                    color: i === 0 ? 'var(--primary)' : 'var(--muted)',
                    fontFamily: 'monospace',
                    opacity: opacity,
                    transform: `rotateX(${rotateX}deg) scale(${scale}) translateY(${translateY}px)`,
                    transformOrigin: 'center center',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                >
                  {formatTime(v)}
                </div>
              );
            })}
          </motion.div>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to bottom, #1e293b 0%, transparent 40%, transparent 60%, #1e293b 100%)',
            pointerEvents: 'none',
            zIndex: 3,
            opacity: 0.95
          }} />
        </div>
      </div>
    );
  };

  const isExactMode = initialWakeTime !== undefined;

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
              backdropFilter: 'blur(8px)'
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
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -15px 35px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.05)',
              overflowY: 'auto'
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
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  onClick={() => setMode('wakeup')}
                  style={{ 
                    padding: '6px 16px', 
                    borderRadius: '0.75rem', 
                    border: 'none', 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    background: mode === 'wakeup' ? 'var(--primary)' : 'transparent',
                    color: mode === 'wakeup' ? 'black' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  WAKE UP
                </button>
                <button 
                  onClick={() => setMode('cycle')}
                  style={{ 
                    padding: '6px 16px', 
                    borderRadius: '0.75rem', 
                    border: 'none', 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    background: mode === 'cycle' ? 'var(--primary)' : 'transparent',
                    color: mode === 'cycle' ? 'black' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  MANUAL
                </button>
              </div>
              <button onClick={resetAndClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {step === 1 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center', padding: '1rem 0' }}
              >
                <div>
                  <p style={{ margin: '0', color: 'var(--primary)', fontSize: '1.4rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {mode === 'wakeup' ? 'Good Morning, Champ! ☀️' : 'Manual Sleep Cycle 🌙'}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: '1.5' }}>
                    {mode === 'wakeup' ? 'Confirm your rest to log your rise.' : 'Log your full sleep duration below.'}
                  </p>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.02))', 
                  padding: '2.5rem 1.5rem', 
                  borderRadius: '2.5rem', 
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '4rem', fontWeight: '900', color: 'white', lineHeight: 0.8, letterSpacing: '-3px' }}>
                    {duration}<span style={{ fontSize: '1.4rem', color: 'var(--muted)', marginLeft: '8px', fontWeight: '600', letterSpacing: '0' }}>h slept</span>
                  </div>
                  {duration >= 7 ? (
                    <div style={{ 
                      color: '#22c55e', 
                      fontSize: '0.8rem', 
                      fontWeight: '900', 
                      marginTop: '1.5rem', 
                      background: 'rgba(34, 197, 94, 0.12)', 
                      padding: '0.5rem 1.2rem', 
                      borderRadius: '2rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      <Check size={16} strokeWidth={3} /> BATTERY FULLY LOADED (+5 pts)
                    </div>
                  ) : (
                    <div style={{ 
                      color: 'var(--muted)', 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      marginTop: '1.5rem',
                      opacity: 0.6
                    }}>
                      Goal: 7h+ for power bonus
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '1.5rem', 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1.5rem', 
                  borderRadius: '2rem', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  alignItems: 'center' 
                }}>
                  <TimeRoller value={bedTime} label="Bedtime" onChange={setBedTime} step={1/6} />
                  <div style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 'bold', opacity: 0.1, marginTop: '20px' }}>→</div>
                  <div style={{ flex: 1 }}>
                    {mode === 'wakeup' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ 
                          color: 'var(--muted)', 
                          fontSize: '0.65rem', 
                          marginBottom: '1rem', 
                          textTransform: 'uppercase', 
                          fontWeight: '800', 
                          letterSpacing: '2px',
                          opacity: 0.6
                        }}>Wake up</span>
                        <div 
                          onClick={updateTimeToNow}
                          style={{ 
                            height: '200px', 
                            width: '100%', 
                            background: 'rgba(251, 191, 36, 0.03)', 
                            borderRadius: '1.5rem', 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '2px solid var(--primary)',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)'
                          }}
                        >
                          <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', fontFamily: 'monospace' }}>{formatTime(wakeTime)}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '900', marginTop: '0.75rem', letterSpacing: '1px' }}>SYNC NOW</span>
                        </div>
                      </div>
                    ) : (
                      <TimeRoller 
                        value={wakeTime} 
                        label="Wake up" 
                        onChange={setWakeTime} 
                        step={1/6}
                        onNow={updateTimeToNow}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                style={{ textAlign: 'center', flex: 1 }}
              >
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '1.5rem', border: '1px dashed var(--primary)' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>EARLY RISE BONUS</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    "The world belongs to those who wake up first. ☀️ Snap a proof photo now for +5 Bonus Points!"
                  </p>
                </div>

                {proofImage ? (
                  <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
                    <img src={proofImage} alt="Proof Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => setProofImage(undefined)}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', padding: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    {/* CAMERA BUTTON */}
                    <label style={{ 
                      flex: 1, 
                      padding: '1.5rem', 
                      borderRadius: '1.5rem', 
                      background: 'rgba(251, 191, 36, 0.08)', 
                      border: '1.5px solid rgba(251, 191, 36, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      cursor: isCompressing ? 'wait' : 'pointer'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        disabled={isCompressing}
                      />
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={26} strokeWidth={2.5} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>Take Photo</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Snap proof right now</div>
                      </div>
                    </label>

                    {/* LIBRARY BUTTON */}
                    <label style={{ 
                      flex: 1, 
                      padding: '1.5rem', 
                      borderRadius: '1.5rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1.5px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      cursor: isCompressing ? 'wait' : 'pointer'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        disabled={isCompressing}
                      />
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={26} strokeWidth={2.5} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>Photo Library</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Choose from your gallery</div>
                      </div>
                    </label>
                  </div>
                )}                
                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {proofImage ? '✅ Proof verified! You will receive +5 bonus points.' : 'Skip the photo and log without bonus points.'}
                </p>
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              {step === 2 && (
                <button 
                  onClick={() => setStep(1)}
                  className="btn" 
                  style={{ background: '#475569', flex: 1 }}
                >
                  Back
                </button>
              )}
              <button 
                onClick={step === 1 ? () => setStep(2) : handleLog}
                disabled={isLoading || isCompressing}
                className="btn" 
                style={{ 
                  flex: 2,
                  fontWeight: '900',
                  opacity: (isLoading || isCompressing) ? 0.7 : 1,
                  boxShadow: '0 8px 25px rgba(251, 191, 36, 0.3)',
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  fontSize: '1.1rem'
                }}
              >
                {step === 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <Zap size={22} fill="black" />
                    {mode === 'wakeup' ? "I'M AWAKE NOW! ☀️" : "LOG SLEEP CYCLE 🔋"}
                  </div>
                ) : (
                  proofImage ? 'Post with Proof 🔋' : 'BATTERY LOADED! 🔋'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SleepLogOverlay;
