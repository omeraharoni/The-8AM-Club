import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ChevronRight, 
  Settings, 
  Zap,
  Trash2,
  Edit2,
  LayoutDashboard,
  ShieldCheck,
  UserPlus,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Users as UsersIcon,
  Circle,
  Check,
  Minus
} from 'lucide-react';

interface GroupsDashboardProps {
  groups: any[];
  selectedGroup: any;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  leaderboard: any[];
  memberCount: number;
  user: any;
  onHandleCreateGroup: () => void;
  onJoinByCode: (code: string) => void;
  joinByCodeIsPending: boolean;
  onStartEditingGroup: () => void;
  syncMembership: (id: string) => void;
  respondToRequest: (data: { id: string, accept: boolean }) => void;
  onLeaveGroup: (id: string) => void;
  onRemoveMember: (groupId: string, userId: string) => void;
  onDeleteGroup: (id: string) => void;
  onApplyPenalty: (data: { userId: string, groupId: string, amount: number, reason: string }) => void;
  pendingRequests: any[];
}

const GroupsDashboard = ({
  groups,
  selectedGroup,
  selectedGroupId,
  setSelectedGroupId,
  leaderboard,
  memberCount,
  user,
  onHandleCreateGroup,
  onJoinByCode,
  joinByCodeIsPending,
  onStartEditingGroup,
  syncMembership,
  respondToRequest,
  onLeaveGroup,
  onRemoveMember,
  onDeleteGroup,
  onApplyPenalty,
  pendingRequests
}: GroupsDashboardProps) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [view, setView] = useState<'leaderboard' | 'management'>('leaderboard');
  const [sortConfig, setSortConfig] = useState({ key: 'weeklyPoints', direction: 'desc' });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  // Hub View State
  const [hubView, setHubView] = useState<'list' | 'join'>('list');
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isCodeExposed, setIsCodeExposed] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{id: string, name: string} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [penaltyTarget, setPenaltyTarget] = useState<{id: string, name: string} | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState(10);
  const [penaltyReason, setReason] = useState('');

  // Sync hub view when selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId === null) {
      setHubView('list');
      setIsSidebarCollapsed(true);
    }
    setIsCodeExposed(false);
  }, [selectedGroupId]);

  const handleCopyCode = () => {
    if (selectedGroup?.joinCode) {
      navigator.clipboard.writeText(selectedGroup.joinCode);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const isOwner = selectedGroup?.userRole === 'owner';

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 80px)', 
      background: '#0a0f1e', 
      margin: '-1rem',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      padding: '0.75rem',
      position: 'relative'
    }}>
      {/* --- FLOATING SIDEBAR --- */}
      <motion.div 
        animate={{ 
          width: isSidebarCollapsed ? '0px' : '240px',
          marginRight: isSidebarCollapsed ? '0px' : '0.75rem',
          opacity: isSidebarCollapsed ? 0 : 1,
          x: isSidebarCollapsed ? -20 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ 
          background: '#0f172a', 
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          padding: isSidebarCollapsed ? '0' : '1.5rem 0',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          zIndex: 100
        }}
      >
        {!isSidebarCollapsed && (
          <>
            <div 
              onClick={() => setIsSidebarCollapsed(true)}
              style={{ padding: '0 1.5rem', marginBottom: '2rem', cursor: 'pointer', width: 'fit-content' }}
            >
              <Menu size={24} style={{ color: 'var(--primary)' }} />
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* --- GROUPS SECTION --- */}
              <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                My Groups
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                {groups.map((g: any) => (
                  <div 
                    key={g.id || g._id}
                    onClick={() => {
                      setSelectedGroupId(g.id || g._id);
                      setView('leaderboard');
                      setIsSidebarCollapsed(true);
                    }}
                    style={{ 
                      padding: '0.6rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      color: selectedGroupId === (g.id || g._id) ? 'white' : 'rgba(255,255,255,0.5)',
                      background: selectedGroupId === (g.id || g._id) ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${selectedGroupId === (g.id || g._id) ? 'var(--primary)' : 'transparent'}`
                    }}
                  >
                    <Circle size={8} fill={selectedGroupId === (g.id || g._id) ? 'var(--primary)' : 'transparent'} color={selectedGroupId === (g.id || g._id) ? 'var(--primary)' : 'currentColor'} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  </div>
                ))}
              </div>

              {/* --- ACTIONS SECTION --- */}
              <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Actions
              </div>
              
              <div 
                onClick={() => {
                  onHandleCreateGroup();
                  setIsSidebarCollapsed(true);
                }}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} /> Create Group
              </div>

              <div 
                onClick={() => {
                  setSelectedGroupId(null);
                  setHubView('join');
                  setIsSidebarCollapsed(true);
                }}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  color: (selectedGroupId === null && hubView === 'join') ? 'white' : 'rgba(255,255,255,0.5)',
                  background: (selectedGroupId === null && hubView === 'join') ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={18} /> Join a Group
              </div>
            </nav>
          </>
        )}
      </motion.div>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        
        {/* --- HEADER --- */}
        <header style={{ 
          height: '72px', 
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '0.75rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              <span 
                onClick={() => {
                  setSelectedGroupId(null);
                  setIsSidebarCollapsed(true);
                }}
                style={{ cursor: 'pointer', fontWeight: '500' }}
              >
                Groups
              </span>
              {selectedGroup && (
                <>
                  <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.3 }} />
                  <span style={{ color: 'white', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{selectedGroup.name}</span>
                </>
              )}
            </div>
          </div>

          {selectedGroup?.joinCode && (
            <motion.div 
              layout
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!isCodeExposed) {
                  setIsCodeExposed(true);
                } else {
                  handleCopyCode();
                }
              }}
              style={{ 
                background: isCodeExposed ? 'rgba(251, 191, 36, 0.1)' : 'var(--primary)', 
                border: '1px solid rgba(251, 191, 36, 0.3)',
                color: isCodeExposed ? 'var(--primary)' : 'black', 
                padding: '8px 16px', 
                borderRadius: '1rem', 
                fontSize: '0.75rem', 
                fontWeight: '900', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.2s',
                minWidth: '100px',
                justifyContent: 'center'
              }}
            >
              <AnimatePresence mode="wait">
                {!isCodeExposed ? (
                  <motion.div
                    key="invite"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={14} strokeWidth={4} />
                    <span>INVITE</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {showCopyToast ? (
                      <span style={{ color: '#22c55e' }}>COPIED!</span>
                    ) : (
                      <>
                        <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                          <Check size={10} strokeWidth={4} />
                        </div>
                        <span style={{ letterSpacing: '1px' }}>{selectedGroup.joinCode}</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </header>

        {/* --- VIEW CONTENT --- */}
        <div style={{ flex: 1, overflowY: 'auto', padding: window.innerWidth < 768 ? '1rem' : '1.5rem' }}>
          {!selectedGroup ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {hubView === 'list' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h1 style={{ fontSize: '2.5rem', margin: 0, color: 'white', fontWeight: '900', letterSpacing: '-1.5px' }}>Your <span style={{ color: 'var(--primary)' }}>Clubs</span></h1>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginTop: '0.5rem' }}>Where the early birds compete.</p>
                    </div>
                  </div>

                  {pendingRequests.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ 
                        marginBottom: '2rem', 
                        padding: '1.5rem', 
                        background: 'rgba(251, 191, 36, 0.08)', 
                        borderRadius: '1.5rem', 
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                      }}
                    >
                      <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                        <UserPlus size={20} /> PENDING JOIN REQUESTS ({pendingRequests.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pendingRequests.map((req: any) => (
                          <div key={req._id} style={{ 
                            display: 'flex', 
                            flexDirection: window.innerWidth < 480 ? 'column' : 'row',
                            justifyContent: 'space-between', 
                            alignItems: window.innerWidth < 480 ? 'flex-start' : 'center', 
                            background: 'rgba(0,0,0,0.4)', 
                            padding: '1.25rem', 
                            borderRadius: '1.25rem', 
                            border: '1px solid rgba(255,255,255,0.08)',
                            gap: '1rem'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                              <span style={{ 
                                fontSize: '1rem', 
                                color: 'white', 
                                fontWeight: '900', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                              }}>
                                {req.fromUsername}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                                wants to join <b style={{ color: 'var(--primary)' }}>{req.groupName}</b>
                              </span>
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.6rem', 
                              width: window.innerWidth < 480 ? '100%' : 'auto' 
                            }}>
                              <button 
                                onClick={() => respondToRequest({ id: req._id, accept: true })} 
                                style={{ 
                                  flex: window.innerWidth < 480 ? 1 : 'none',
                                  padding: '10px 20px', 
                                  borderRadius: '0.85rem', 
                                  background: '#22c55e', 
                                  color: 'white', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  fontSize: '0.75rem', 
                                  fontWeight: '900',
                                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                                }}
                              >
                                APPROVE
                              </button>
                              <button 
                                onClick={() => respondToRequest({ id: req._id, accept: false })} 
                                style={{ 
                                  flex: window.innerWidth < 480 ? 1 : 'none',
                                  padding: '10px 20px', 
                                  borderRadius: '0.85rem', 
                                  background: 'rgba(239, 68, 68, 0.1)', 
                                  color: '#ef4444', 
                                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                                  cursor: 'pointer', 
                                  fontSize: '0.75rem', 
                                  fontWeight: '900'
                                }}
                              >
                                DECLINE
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {groups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '2.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <UsersIcon size={40} style={{ color: 'var(--primary)', opacity: 0.5 }} />
                      </div>
                      <h3 style={{ fontSize: '1.4rem', color: 'white', fontWeight: '900', marginBottom: '0.5rem' }}>Connect to Compete</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                        You're not in any clubs yet. Join your team using a code to start tracking points together.
                      </p>
                      <button 
                        onClick={() => setHubView('join')}
                        style={{ background: 'var(--primary)', color: 'black', border: 'none', borderRadius: '1rem', padding: '1rem 2.5rem', fontSize: '1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(251, 191, 36, 0.2)' }}
                      >
                        JOIN FIRST CLUB
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      {groups.map((g: any) => (
                        <motion.div 
                          key={g.id || g._id}
                          whileHover={{ y: -5 }}
                          onClick={() => {
                            setSelectedGroupId(g.id || g._id);
                            setView('leaderboard');
                          }}
                          style={{ 
                            padding: '1.75rem', 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: '2rem', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: '1.5rem', fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' }}>{g.category}</div>
                          <h3 style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>{g.name}</h3>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', marginBottom: '1.5rem' }}>{g.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'white', fontWeight: '700' }}>
                            <div style={{ background: 'var(--primary)', width: '8px', height: '8px', borderRadius: '50%' }} />
                            VIEW CLUB FEED
                          </div>
                        </motion.div>
                      ))}

                      <div 
                        onClick={() => setHubView('join')}
                        style={{ padding: '1.75rem', borderRadius: '2rem', border: '2px dashed rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', opacity: 0.6 }}
                      >
                        <UserPlus size={32} />
                        <span style={{ fontWeight: '800' }}>Join with Code</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ maxWidth: '500px' }}>
                  <button 
                    onClick={() => setHubView('list')}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', cursor: 'pointer', padding: 0 }}
                  >
                    ← Back to Clubs
                  </button>
                  <h1 style={{ fontSize: '2.5rem', margin: 0, color: 'white', fontWeight: '900', letterSpacing: '-1.5px' }}>Join a <span style={{ color: 'var(--primary)' }}>Club</span></h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginTop: '0.5rem', marginBottom: '3rem' }}>Connect with your team using their code.</p>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '1.5rem',
                    background: 'rgba(15, 23, 42, 0.4)', 
                    borderRadius: '2rem', 
                    padding: '2rem', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ 
                      background: 'rgba(0,0,0,0.4)', 
                      borderRadius: '1.25rem', 
                      padding: '4px', 
                      border: '2px solid rgba(251, 191, 36, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onBlurCapture={(e) => e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)'}
                    >
                      <input 
                        placeholder="6-DIGIT CODE"
                        value={joinCodeInput}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setJoinCodeInput(val);
                        }}
                        autoFocus
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'white', 
                          fontSize: '1.5rem', 
                          padding: '1rem', 
                          width: '100%', 
                          fontWeight: '900',
                          letterSpacing: '8px',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                    <button 
                      onClick={() => onJoinByCode(joinCodeInput)}
                      disabled={joinByCodeIsPending || joinCodeInput.length < 3}
                      style={{ 
                        background: 'var(--primary)', 
                        color: 'black', 
                        border: 'none', 
                        borderRadius: '1.25rem', 
                        padding: '1.25rem', 
                        fontSize: '1rem', 
                        fontWeight: '900', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.2)',
                        opacity: (joinByCodeIsPending || joinCodeInput.length < 3) ? 0.7 : 1
                      }}
                    >
                      {joinByCodeIsPending ? 'CONNECTING...' : 'JOIN CLUB NOW'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              {view === 'leaderboard' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <button 
                        onClick={() => setSelectedGroupId(null)}
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          color: 'rgba(255,255,255,0.5)', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '0.75rem', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }}
                      >
                        ← BACK TO CLUBS
                      </button>
                      <h1 style={{ fontSize: '2.5rem', margin: 0, color: 'white', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1 }}>{selectedGroup.name}</h1>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <UsersIcon size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: '500' }}>{memberCount} active members</span>
                      </div>
                    </div>

                    {isOwner && (
                      <button 
                        onClick={() => setView('management')}
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          color: 'white', 
                          padding: '0.75rem', 
                          borderRadius: '1rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <Settings size={20} />
                      </button>
                    )}
                  </div>

                  {/* --- PODIUM --- */}
                  {sortedLeaderboard.length >= 3 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'flex-end', 
                      gap: '1rem', 
                      marginBottom: '3rem',
                      padding: '0 1rem'
                    }}>
                      {/* 2nd Place */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '100px' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #94a3b8', padding: '3px' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                              {sortedLeaderboard[1].profilePic ? <img src={sortedLeaderboard[1].profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#94a3b8' }}>{sortedLeaderboard[1].username[0]}</div>}
                            </div>
                          </div>
                          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: '#94a3b8', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 8px', borderRadius: '1rem' }}>2ND</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80px' }}>{sortedLeaderboard[1].username}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#94a3b8' }}>{sortedLeaderboard[1].weeklyPoints}</div>
                        </div>
                      </motion.div>

                      {/* 1st Place */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transform: 'translateY(-20px)', flex: 1, maxWidth: '120px' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '4px solid var(--primary)', padding: '4px', boxShadow: '0 0 30px rgba(251, 191, 36, 0.2)' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', overflow: 'hidden' }}>
                              {sortedLeaderboard[0].profilePic ? <img src={sortedLeaderboard[0].profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: 'var(--primary)' }}>{sortedLeaderboard[0].username[0]}</div>}
                            </div>
                          </div>
                          <Zap size={24} fill="var(--primary)" style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', color: 'var(--primary)', filter: 'drop-shadow(0 0 8px var(--primary))' }} />
                          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'black', fontSize: '0.75rem', fontWeight: '900', padding: '3px 12px', borderRadius: '1rem' }}>1ST</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100px' }}>{sortedLeaderboard[0].username}</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>{sortedLeaderboard[0].weeklyPoints}</div>
                        </div>
                      </motion.div>

                      {/* 3rd Place */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '100px' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #b45309', padding: '3px' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                              {sortedLeaderboard[2].profilePic ? <img src={sortedLeaderboard[2].profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#b45309' }}>{sortedLeaderboard[2].username[0]}</div>}
                            </div>
                          </div>
                          <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: '#b45309', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 8px', borderRadius: '1rem' }}>3RD</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80px' }}>{sortedLeaderboard[2].username}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#b45309' }}>{sortedLeaderboard[2].weeklyPoints}</div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  <div style={{ 
                    background: 'rgba(255,255,255,0.01)', 
                    borderRadius: '1.5rem', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    overflow: 'hidden' 
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '1rem 0.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', textTransform: 'uppercase', width: '30px', textAlign: 'center' }}>#</th>
                          <th onClick={() => requestSort('username')} style={{ padding: '1rem 0.5rem', color: 'white', fontSize: '0.6rem', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>Member</th>
                          <th onClick={() => requestSort('weeklyPoints')} style={{ padding: '1rem 0.5rem', color: 'white', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}>Pts</th>
                          <th style={{ padding: '1rem 0.5rem', color: 'white', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'center' }}>Work</th>
                          <th style={{ padding: '1rem 0.5rem', color: 'white', fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'center' }}>Rise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLeaderboard.map((item, index) => {
                          const isCurrentUser = item.username === user?.username;
                          return (
                            <tr key={index} style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.02)',
                              background: isCurrentUser ? 'rgba(251, 191, 36, 0.03)' : 'transparent',
                              borderLeft: isCurrentUser ? '2px solid var(--primary)' : 'none'
                            }}>
                              <td style={{ padding: '1rem 0.5rem', color: index < 3 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', fontWeight: '900', fontSize: '0.75rem', textAlign: 'center' }}>{index + 1}</td>
                              <td style={{ padding: '1rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '50%', 
                                    background: item.profilePic ? 'transparent' : 'rgba(255,255,255,0.05)', 
                                    overflow: 'hidden', 
                                    border: isCurrentUser ? '2px solid var(--primary)' : (item.profilePic ? '1px solid rgba(255,255,255,0.1)' : 'none'), 
                                    flexShrink: 0 
                                  }}>
                                    {item.profilePic ? <img src={item.profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem' }}>{item.username[0]}</div>}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ 
                                      fontWeight: isCurrentUser ? '700' : '500', 
                                      color: isCurrentUser ? 'white' : 'rgba(255,255,255,0.9)', 
                                      fontSize: '0.8rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {item.username}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '900', color: isCurrentUser ? 'var(--primary)' : 'white', fontSize: '0.9rem' }}>{item.weeklyPoints}</td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{item.workouts}</td>
                              <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{item.onTimeRises}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '900', letterSpacing: '-1px' }}>Club Settings</h2>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Management Center for <b>{selectedGroup.name}</b></p>
                    </div>
                    <button 
                      onClick={() => setView('leaderboard')}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        color: 'white', 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '1rem', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}
                    >
                      CLOSE
                    </button>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', 
                    gap: '1.5rem',
                    alignItems: 'start'
                  }}>
                    {/* --- LEFT COLUMN --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Identity Card */}
                      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}><Edit2 size={16} /> Club Identity</h3>
                          <button onClick={onStartEditingGroup} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}>EDIT</button>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '1rem' }}>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</div>
                          <div style={{ fontSize: '0.85rem', color: 'white', lineHeight: '1.4' }}>{selectedGroup.description || 'No description provided.'}</div>
                        </div>
                      </div>

                      {/* Invite Card */}
                      <div style={{ padding: '1.5rem', background: 'rgba(251, 191, 36, 0.03)', borderRadius: '1.5rem', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', fontWeight: '800', color: 'var(--primary)' }}>Grow Your Club</h3>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Share this code to invite new members.</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div 
                            onClick={() => !isCodeExposed && setIsCodeExposed(true)}
                            style={{ 
                              flex: 1, 
                              background: 'rgba(0,0,0,0.3)', 
                              padding: '0.75rem', 
                              borderRadius: '0.75rem', 
                              border: '1px solid rgba(255,255,255,0.05)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              cursor: !isCodeExposed ? 'pointer' : 'default',
                              minHeight: '45px'
                            }}
                          >
                            <AnimatePresence mode="wait">
                              {!isCodeExposed ? (
                                <motion.span 
                                  key="show-code"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '1px' }}
                                >
                                  SHOW CODE
                                </motion.span>
                              ) : (
                                <motion.span 
                                  key="exposed-code"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px', color: 'white' }}
                                >
                                  {selectedGroup.joinCode}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <button 
                            onClick={() => {
                              if (!isCodeExposed) setIsCodeExposed(true);
                              handleCopyCode();
                            }}
                            style={{ 
                              background: 'var(--primary)', 
                              color: 'black', 
                              border: 'none', 
                              borderRadius: '0.75rem', 
                              padding: '0 1.5rem', 
                              fontWeight: '900', 
                              fontSize: '0.75rem', 
                              cursor: 'pointer'
                            }}
                          >
                            {showCopyToast ? 'COPIED!' : 'COPY'}
                          </button>
                        </div>
                      </div>

                      {/* Troubleshooting */}
                      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <h4 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem', textTransform: 'uppercase' }}>Help & Support</h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Sync owner status if missing from leaderboard.</span>
                          <button onClick={() => syncMembership(selectedGroupId!)} style={{ background: '#475569', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>FIX</button>
                        </div>
                      </div>
                    </div>

                    {/* --- RIGHT COLUMN --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Roster & Requests */}
                      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}><UsersIcon size={16} /> Members ({leaderboard.length})</h3>
                        
                        {/* Pending inner list */}
                        {pendingRequests.length > 0 && (
                          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '1rem', border: '1px dashed var(--primary)' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '0.75rem' }}>PENDING REQUESTS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {pendingRequests.map((req: any) => (
                                <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{req.fromUsername}</span>
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => respondToRequest({ id: req._id, accept: true })} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer' }}>OK</button>
                                    <button onClick={() => respondToRequest({ id: req._id, accept: false })} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer' }}>NO</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }} className="hide-scrollbar">
                          {leaderboard.map((m: any) => (
                            <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                  {m.profilePic ? <img src={m.profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>{m.username[0]}</div>}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{m.username}</span>
                                {m.userId === selectedGroup.ownerId && <ShieldCheck size={12} style={{ color: 'var(--primary)' }} />}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {isOwner && (
                                  <button 
                                    onClick={() => setPenaltyTarget({ id: m.userId, name: m.username })}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                                    title="Deduct Points"
                                  >
                                    <Minus size={14} />
                                  </button>
                                )}
                                {m.userId !== user?.id && m.userId !== selectedGroup.ownerId && (
                                  <button 
                                    onClick={() => setMemberToRemove({ id: m.userId, name: m.username })}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div style={{ padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.02)' }}>
                        <h3 style={{ fontSize: '0.9rem', color: '#ef4444', marginBottom: '0.5rem', fontWeight: '800' }}>Danger Zone</h3>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1.25rem' }}>Deleting this club is permanent and cannot be undone.</p>
                        <button 
                          className="btn" 
                          onClick={() => setShowDeleteConfirm(true)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '900', fontSize: '0.75rem' }}
                        >
                          DELETE CLUB
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              x: '-50%',
              zIndex: 5000,
              background: '#fbbf24',
              color: '#000',
              padding: '0.75rem 1.5rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)',
              pointerEvents: 'none'
            }}
          >
            <Check size={18} strokeWidth={3} />
            Invite Code Copied!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {memberToRemove && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToRemove(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '340px',
                background: '#1e293b',
                borderRadius: '2rem',
                padding: '2rem',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                zIndex: 6001
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Trash2 size={32} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '900', marginBottom: '0.75rem', margin: 0, letterSpacing: '-0.5px' }}>Remove Member?</h3>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', marginBottom: '2rem' }}>
                Are you sure you want to remove <b>{memberToRemove.name}</b> from the club?
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setMemberToRemove(null)}
                  style={{ flex: 1, padding: '1rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    onRemoveMember(selectedGroupId!, memberToRemove.id);
                    setMemberToRemove(null);
                  }}
                  style={{ flex: 1, padding: '1rem', borderRadius: '1.25rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  REMOVE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '340px',
                background: '#1e293b',
                borderRadius: '2rem',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                zIndex: 6001
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Zap size={32} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '900', marginBottom: '0.75rem', margin: 0, letterSpacing: '-0.5px' }}>Delete Club?</h3>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', marginBottom: '2.5rem' }}>
                This is <b>permanent</b>. You will lose the club, all members, and all historical points forever.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={() => {
                    onDeleteGroup(selectedGroupId!);
                    setShowDeleteConfirm(false);
                  }}
                  style={{ width: '100%', padding: '1rem', borderRadius: '1.25rem', background: '#ef4444', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  DELETE PERMANENTLY
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {penaltyTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPenaltyTarget(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '340px',
                background: '#1e293b',
                borderRadius: '2rem',
                padding: '2rem',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                zIndex: 6001
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Minus size={32} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '900', marginBottom: '0.5rem', margin: 0 }}>Penalty ⚖️</h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
                Deduct points from <b>{penaltyTarget.name}</b>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Points to Deduct</label>
                  <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontWeight: '900', fontSize: '1.2rem' }}>-</span>
                    <input 
                      type="number" 
                      className="input" 
                      value={penaltyAmount || ''} 
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.abs(Number(e.target.value));
                        setPenaltyAmount(val);
                      }}
                      style={{ paddingLeft: '2rem', fontSize: '1.2rem', fontWeight: '900', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    />
                  </div>
                  
                  {/* Quick select chips */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {[5, 10, 20, 50].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setPenaltyAmount(amt)}
                        style={{ 
                          flex: 1, 
                          padding: '0.4rem', 
                          borderRadius: '0.75rem', 
                          background: penaltyAmount === amt ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', 
                          border: `1px solid ${penaltyAmount === amt ? '#ef4444' : 'rgba(255,255,255,0.05)'}`,
                          color: penaltyAmount === amt ? '#ef4444' : 'var(--muted)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Reason (Optional)</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Missed wakeup goal"
                    value={penaltyReason} 
                    onChange={(e) => setReason(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => setPenaltyTarget(null)}
                  style={{ flex: 1, padding: '1rem', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    if (penaltyAmount > 0) {
                      onApplyPenalty({
                        userId: penaltyTarget.id,
                        groupId: selectedGroupId!,
                        amount: penaltyAmount,
                        reason: penaltyReason
                      });
                      setPenaltyTarget(null);
                      setReason('');
                      setPenaltyAmount(10);
                    }
                  }}
                  disabled={!penaltyAmount || penaltyAmount <= 0}
                  style={{ 
                    flex: 1, 
                    padding: '1rem', 
                    borderRadius: '1.25rem', 
                    background: (penaltyAmount > 0) ? '#ef4444' : 'rgba(239, 68, 68, 0.3)', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: '900', 
                    cursor: (penaltyAmount > 0) ? 'pointer' : 'not-allowed' 
                  }}
                >
                  DEDUCT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupsDashboard;
