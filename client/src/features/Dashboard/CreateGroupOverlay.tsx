import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Tag, AlignLeft } from 'lucide-react';

interface CreateGroupOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { 
    name: string, 
    description: string, 
    category: string,
    weeklyWakeupTarget: number,
    weeklyWorkoutTarget: number,
    wakeupTimeTarget: string
  }) => void;
}

const CATEGORIES = ['Fitness', 'Productivity', 'Early Birds', 'Study', 'Other'];

const ScrollablePicker = ({ 
  options, 
  value, 
  onChange, 
  label 
}: { 
  options: any[], 
  value: any, 
  onChange: (val: any) => void,
  label: string
}) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
      {label}
    </label>
    <div 
      style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        overflowX: 'auto', 
        paddingBottom: '0.5rem',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
      className="hide-scrollbar"
    >
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flexShrink: 0,
              minWidth: '60px',
              height: '60px',
              borderRadius: '1.25rem',
              background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
              color: isSelected ? 'var(--bg)' : 'white',
              border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isSelected ? '0 10px 20px rgba(251, 191, 36, 0.2)' : 'none'
            }}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{opt.display}</span>
            {opt.sub && <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: '700', textTransform: 'uppercase' }}>{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  </div>
);

const CreateGroupOverlay = ({ isOpen, onClose, onCreate }: CreateGroupOverlayProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [weeklyWakeupTarget, setWeeklyWakeupTarget] = useState(5);
  const [weeklyWorkoutTarget, setWeeklyWorkoutTarget] = useState(4);
  const [wakeupTimeTarget, setWakeupTimeTarget] = useState('08:00');

  // Options for pickers
  const wakeupOptions = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, display: (i + 1).toString(), sub: 'Days' }));
  const workoutOptions = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, display: (i + 1).toString(), sub: 'Goal' }));
  
  const timeOptions = [
    { value: 'none', display: 'None', sub: '' },
    ...['04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00']
      .map(t => ({ value: t, display: t, sub: 'AM' }))
  ];

  const resetAndClose = () => {
    setName('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setWeeklyWakeupTarget(5);
    setWeeklyWorkoutTarget(4);
    setWakeupTimeTarget('08:00');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ 
      name, 
      description, 
      category, 
      weeklyWakeupTarget, 
      weeklyWorkoutTarget, 
      wakeupTimeTarget 
    });
    resetAndClose();
  };

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
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'white' }}>Start a Group</h2>
              <button onClick={resetAndClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  <Users size={16} /> Group Name
                </label>
                <input 
                  className="input" 
                  placeholder="e.g. 5 AM Warriors" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  <AlignLeft size={16} /> Description
                </label>
                <textarea 
                  className="input" 
                  placeholder="What is this group about?" 
                  style={{ minHeight: '100px', resize: 'none', paddingTop: '0.75rem' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  <Tag size={16} /> Category
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        background: category === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: category === cat ? 'var(--bg)' : 'white',
                        border: '1px solid ' + (category === cat ? 'var(--primary)' : 'transparent'),
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <ScrollablePicker 
                  label="Weekly Wakeup Goal"
                  options={wakeupOptions}
                  value={weeklyWakeupTarget}
                  onChange={setWeeklyWakeupTarget}
                />

                <ScrollablePicker 
                  label="Weekly Workout Goal"
                  options={workoutOptions}
                  value={weeklyWorkoutTarget}
                  onChange={setWeeklyWorkoutTarget}
                />

                <ScrollablePicker 
                  label="Target Wakeup Time"
                  options={timeOptions}
                  value={wakeupTimeTarget}
                  onChange={setWakeupTimeTarget}
                />
                
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '-0.5rem', textAlign: 'center' }}>
                  Users who wake up <b>before</b> the target time earn extra points.
                </p>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  className="btn" 
                  disabled={!name.trim()}
                  style={{ opacity: !name.trim() ? 0.5 : 1 }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateGroupOverlay;
