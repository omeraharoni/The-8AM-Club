import { useState, useEffect } from 'react';
import { 
  Activity, 
  User as UserIcon, 
  LogOut,
  Check, 
  Users, 
  Plus, 
  Send, 
  Bell, 
  List, 
  Dumbbell,
  Footprints,
  Sun,
  Moon,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import api from '../../services/api';
import type { User, ActivityLog } from '../../types';
import WorkoutLogOverlay from './WorkoutLogOverlay';
import StepsLogOverlay from './StepsLogOverlay';
import SleepLogOverlay from './SleepLogOverlay';

interface DashboardProps {
  onLogout: () => void;
}

interface MeResponse {
  user: User & { email: string, dob: string, gender: string };
  activities: ActivityLog[];
}

const WORKOUT_INSPIRATION = [
  { name: 'Strength Training', description: 'Weights & Calisthenics', pts: '10 pts', calories: '400-600 kcal/hr', icon: <Dumbbell size={24} /> },
  { name: 'Running', description: 'Steady pace or HIIT', pts: '10 pts', calories: '600-800 kcal/hr', icon: <Activity size={24} /> },
  { name: 'Yoga & Mobility', description: 'Focus on recovery', pts: '5 pts', calories: '180-250 kcal/hr', icon: <Sun size={24} /> },
  { name: 'Brisk Walking', description: 'Active recovery', pts: '5 pts', calories: '250-350 kcal/hr', icon: <Footprints size={24} /> },
  { name: 'Cycling', description: 'Endurance or Sprints', pts: '10 pts', calories: '450-700 kcal/hr', icon: <Activity size={24} /> }
];

const Dashboard = ({ onLogout }: DashboardProps) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const activeTab = location.pathname.split('/').pop() || 'log';

  const [workoutType, setWorkoutType] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [popups, setPopups] = useState<{ id: number, text: string, className: string }[]>([]);
  const [isWorkoutLogOpen, setIsWorkoutLogOpen] = useState(false);
  const [isStepsLogOpen, setIsStepsLogOpen] = useState(false);
  const [isSleepLogOpen, setIsSleepLogOpen] = useState(false);
  const [lastWakeupTime, setLastWakeupTime] = useState<number | null>(null);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    dob: '',
    gender: ''
  });

  // --- QUERIES ---
  
  const { data: userData, isLoading: userLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api.get('/me').then(res => res.data),
    retry: false,
  });

  const { data: groupsData } = useQuery<any[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(res => res.data),
  });
  const groups = Array.isArray(groupsData) ? groupsData : [];

  const { data: invitationsData } = useQuery<any[]>({
    queryKey: ['invitations'],
    queryFn: () => api.get('/invitations').then(res => res.data),
    refetchInterval: 30000,
  });
  const invitations = Array.isArray(invitationsData) ? invitationsData : [];

  const { data: leaderboardData } = useQuery<any[]>({
    queryKey: ['leaderboard', selectedGroupId],
    queryFn: () => api.get(`/groups/${selectedGroupId}/leaderboard`).then(res => res.data),
    enabled: !!selectedGroupId,
  });
  const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id || groups[0]._id);
    }
  }, [groups, selectedGroupId]);

  // Sync edit data when user loads
  useEffect(() => {
    if (userData?.user) {
      setEditData({
        username: userData.user.username,
        email: userData.user.email || '',
        dob: userData.user.dob ? userData.user.dob.split('T')[0] : '',
        gender: userData.user.gender || 'prefer-not-to-say'
      });
    }
  }, [userData]);

  // --- MUTATIONS ---

  const addPopup = (text: string, className: string) => {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { id, text, className }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 3500); // Stay for 3.5 seconds
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof editData) => api.put('/user/profile', data).then(res => res.data),
    onSuccess: (response) => {
      queryClient.setQueryData(['me'], (oldData: MeResponse | undefined) => {
        if (!oldData) return undefined;
        return {
          ...oldData,
          user: response.user
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      alert('Profile updated!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  });

  const logActivityMutation = useMutation({
    mutationFn: (data: { type: string, value: number, note?: string, isShared?: boolean }) => 
      api.post('/activity', data),
    onSuccess: (res, variables) => {
      const pts = res.data.pointsEarned;
      const displayPts = parseFloat(pts.toFixed(1));
      const ptsText = `+${displayPts} pts`;
      
      if (variables.type === 'sleep' && variables.value >= 7) {
        addPopup(ptsText, 'popup-left');
        addPopup("BATTERY LOADED! YOU'RE READY! 🔋", 'popup-right');
      } else if (pts > 0 || variables.type === 'sleep') {
        addPopup(ptsText, 'popup-left');
      }

      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (selectedGroupId) queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedGroupId] });
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => api.post('/groups', { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(res.data.id || res.data._id);
    }
  });

  const inviteMutation = useMutation({
    mutationFn: (targetUsername: string) => 
      api.post('/invitations', { groupId: selectedGroupId, targetUsername }),
    onSuccess: () => {
      setInviteUsername('');
      alert('Invitation sent!');
    }
  });

  const respondMutation = useMutation({
    mutationFn: (data: { id: string, accept: boolean }) => 
      api.post(`/invitations/${data.id}/respond`, { accept: data.accept }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  // --- HANDLERS ---

  const handleLog = (type: string, val: string) => {
    const value = parseInt(val);
    if (type !== 'wakeup' && (isNaN(value) || value < 0)) return;

    if (type === 'wakeup') {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const exactTime = hour + (minutes / 60.0);
      setLastWakeupTime(exactTime);
      setIsSleepLogOpen(true);
    }

    logActivityMutation.mutate({ 
      type, 
      value: value || 0, 
      note: type === 'workout' ? workoutType : '' 
    });
  };

  const handleWorkoutLog = (data: { type: string, value: number, isShared: boolean }) => {
    logActivityMutation.mutate({
      type: 'workout',
      value: data.value,
      note: data.type,
      isShared: data.isShared
    });
  };

  const handleStepsLog = (steps: number) => {
    logActivityMutation.mutate({
      type: 'steps',
      value: steps
    });
  };

  const handleSleepLog = (data: { value: number, note: string }) => {
    logActivityMutation.mutate({
      type: 'sleep',
      value: data.value,
      note: data.note
    });
  };

  const handleCreateGroup = () => {
    const name = prompt('Enter Group Name:');
    if (name) createGroupMutation.mutate(name);
  };

  const user = userData?.user;
  const activities = userData?.activities || [];
  const selectedGroup = groups.find((g: any) => (g.id || g._id) === selectedGroupId);

  const todaySteps = (() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const stepEntry = activities.find((act: any) => 
      act.type === 'steps' && new Date(act.timestamp) >= startOfToday
    );
    return stepEntry ? stepEntry.value : 0;
  })();

  const weeklyGoal = 7;
  const progressPercent = Math.min(((user?.workoutCount || 0) + (user?.wakeupCount || 0)) / (weeklyGoal * 2) * 100, 100);

  if (userLoading && !user) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--muted)' }}>Loading the Club...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="tab-content" style={{ minHeight: '60vh' }}>
        <Routes>
          <Route path="workouts" element={
            <div>
              <h2 style={{ fontSize: '1.1rem', padding: '0 0.5rem', marginBottom: '1rem' }}>Workouts</h2>
              {WORKOUT_INSPIRATION.map((w, i) => (
                <div key={i} className="workout-item" style={{ cursor: 'pointer' }} onClick={() => { setWorkoutType(w.name); setIsWorkoutLogOpen(true); }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="workout-icon-circle">{w.icon}</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{w.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>{w.description}</p>
                    </div>
                  </div>
                  <span className="badge">{w.pts}</span>
                </div>
              ))}
            </div>
          } />

          <Route path="progress" element={
            <div>
              <div className="card" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Weekly Goal Progress</h2>
                <div className="gauge-container">
                  <div className="gauge-bg"></div>
                  <div className="gauge-fill" style={{ transform: `rotate(${45 + (progressPercent * 1.8)}deg)` }}></div>
                  <div className="gauge-text">{Math.round(progressPercent)}%</div>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  Your goal is to hit 7 workouts and 7 early wakeups this week.
                </p>
              </div>
              
              <div className="card">
                <h2 style={{ fontSize: '1.1rem' }}><Check size={18} style={{ marginRight: '0.5rem' }} /> Activity Log</h2>
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No activities logged yet this week.</p>
                ) : (
                  activities.map((act: any, idx: number) => (
                    <div key={idx} className="leaderboard-item" style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>
                          {act.type === 'steps' ? `${act.value} Steps` : 
                           act.type === 'workout' ? `${act.value} min ${act.note || 'Workout'}` : 
                           act.type === 'sleep' ? `${act.value} hrs Sleep` : 
                           act.points > 0 ? 'Early Wakeup ☀️' : 'Late Wakeup 😴'}
                        </span>
                        {act.type === 'sleep' && act.note && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{act.note}</span>}
                        {act.isShared && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>Shared Practice ✨</span>}
                      </div>
                      <span className="badge">+{act.points} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          } />

          <Route path="log" element={
            <div style={{ textAlign: 'center' }}>
              <div className="wakeup-circle-btn" onClick={() => handleLog('wakeup', '0')}>
                <Sun size={32} />
                <div style={{ marginTop: '0.5rem' }}>WAKEUP</div>
              </div>

              <div className="log-grid">
                <div 
                  className="mini-log-btn"
                  onClick={() => setIsStepsLogOpen(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <Footprints size={20} color="var(--primary)" />
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>STEPS</div>
                  <div className="badge">Log Today</div>
                </div>
                <div 
                  className="mini-log-btn" 
                  style={{ gridColumn: 'span 2', cursor: 'pointer', borderColor: 'var(--primary)' }}
                  onClick={() => setIsWorkoutLogOpen(true)}
                >
                  <Dumbbell size={24} color="var(--primary)" />
                  <div style={{ fontWeight: 'bold', color: 'white' }}>LOG WORKOUT</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Select type, duration & more</div>
                </div>
                <div 
                  className="mini-log-btn"
                  onClick={() => setIsSleepLogOpen(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <Moon size={20} color="var(--primary)" />
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>SLEEP</div>
                  <div className="badge">Log Night</div>
                </div>
              </div>

              {invitations.length > 0 && (
                <div className="card" style={{ borderColor: 'var(--primary)', borderWidth: 1, borderStyle: 'solid', marginTop: '2rem' }}>
                  <h2 style={{ fontSize: '1rem' }}><Bell size={18} style={{ marginRight: '0.5rem' }} /> Invites</h2>
                  {invitations.map((inv: any) => (
                    <div key={inv.id || inv._id} className="leaderboard-item" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem' }}><b>{inv.fromUsername}</b> invited you to <b>{inv.groupName}</b></div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" style={{ height: '32px', padding: '0', fontSize: '0.8rem' }} onClick={() => respondMutation.mutate({ id: inv.id || inv._id, accept: true })}>Accept</button>
                        <button className="btn" style={{ height: '32px', padding: '0', fontSize: '0.8rem', background: '#475569' }} onClick={() => respondMutation.mutate({ id: inv.id || inv._id, accept: false })}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card" style={{ marginTop: '2rem', textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.1rem' }}><Check size={18} style={{ marginRight: '0.5rem' }} /> Today's Activity</h2>
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No logs today yet.</p>
                ) : (
                  activities.slice(0, 5).map((act: any, idx: number) => (
                    <div key={idx} className="leaderboard-item" style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>
                          {act.type === 'steps' ? `${act.value.toLocaleString()} Steps` : 
                           act.type === 'workout' ? `${act.value} min ${act.note || 'Workout'}` : 
                           act.type === 'sleep' ? `${act.value} hrs Sleep` : 
                           act.points > 0 ? 'Early Wakeup ☀️' : 'Late Wakeup 😴'}
                        </span>
                        {act.type === 'sleep' && act.note && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{act.note}</span>}
                        {act.isShared && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>Shared Practice ✨</span>}
                      </div>
                      <span className="badge">+{parseFloat(act.points.toFixed(1))} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          } />

          <Route path="groups" element={
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}><Users size={18} style={{ marginRight: '0.5rem' }} /> Groups</h2>
                <button className="btn" style={{ width: 'auto', padding: '0.4rem' }} onClick={handleCreateGroup}>
                  <Plus size={18} />
                </button>
              </div>
              
              {groups.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Join a group to compete!</p>
              ) : (
                <>
                  <div className="group-tabs">
                    {groups.map((g: any) => (
                      <button 
                        key={g.id || g._id} 
                        className="badge" 
                        style={{ 
                          cursor: 'pointer',
                          background: selectedGroupId === (g.id || g._id) ? 'var(--primary)' : 'var(--card)',
                          color: selectedGroupId === (g.id || g._id) ? 'var(--bg)' : 'var(--primary)',
                          padding: '0.4rem 0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => setSelectedGroupId(g.id || g._id)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  {selectedGroup && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Leaderboard</h3>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <input className="input" placeholder="Invite..." style={{ margin: 0, padding: '0.3rem', fontSize: '0.75rem', width: '80px' }} value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} />
                          <button className="btn" style={{ width: 'auto', padding: '0.3rem' }} onClick={() => inviteMutation.mutate(inviteUsername)}><Send size={14} /></button>
                        </div>
                      </div>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Name</th>
                              <th>Pts</th>
                              <th>W/O</th>
                              <th>Rise</th>
                              <th>Zzz</th>
                              <th>Steps</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.map((item: any, index: number) => (
                              <tr key={index} style={{ color: item.username === user?.username ? 'var(--primary)' : 'inherit' }}>
                                <td>{index + 1}</td>
                                <td>{item.username}</td>
                                <td><b>{item.weeklyPoints}</b></td>
                                <td>{item.workouts}</td>
                                <td>{item.wakeups}</td>
                                <td>{item.sleep}</td>
                                <td>{item.steps}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          } />

          <Route path="profile" element={
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Profile</h2>
                <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                  <LogOut size={24} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Username</label>
                  {isEditing ? (
                    <input className="input" value={editData.username} onChange={(e) => setEditData({...editData, username: e.target.value})} />
                  ) : (
                    <div className="input" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'transparent' }}>{user?.username}</div>
                  )}
                </div>
                
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Email Address</label>
                  {isEditing ? (
                    <input className="input" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                  ) : (
                    <div className="input" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'transparent' }}>{user?.email || 'Not provided'}</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Gender</label>
                    {isEditing ? (
                      <select className="input" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})} style={{ background: 'var(--bg)', color: 'white' }}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    ) : (
                      <div className="input" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'transparent', textTransform: 'capitalize' }}>
                        {user?.gender || 'Unknown'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Date of Birth</label>
                    {isEditing ? (
                      <input className="input" type="date" value={editData.dob} onChange={(e) => setEditData({...editData, dob: e.target.value})} />
                    ) : (
                      <div className="input" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'transparent' }}>
                        {user?.dob ? new Date(user.dob).toLocaleDateString() : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                {isEditing ? (
                  <>
                    <button className="btn" onClick={() => updateProfileMutation.mutate(editData)}>
                      <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Changes
                    </button>
                    <button className="btn" style={{ background: '#475569' }} onClick={() => setIsEditing(false)}>
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <button className="btn" style={{ background: 'var(--muted)', color: 'white' }} onClick={() => setIsEditing(true)}>
                    <Edit2 size={18} style={{ marginRight: '0.5rem' }} /> Edit Profile
                  </button>
                )}
              </div>
            </div>
          } />
          
          <Route path="/" element={<Navigate to="log" replace />} />
        </Routes>
      </div>

      <div className="bottom-nav">
        <Link to="/dashboard/workouts" className={`nav-item ${activeTab === 'workouts' ? 'active' : ''}`}>
          <Dumbbell size={20} />
          <span>Workouts</span>
        </Link>
        <Link to="/dashboard/progress" className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`}>
          <List size={20} />
          <span>Progress</span>
        </Link>
        <Link to="/dashboard/log" className={`nav-item ${activeTab === 'log' ? 'active' : ''}`}>
          <Activity size={20} />
          <span>Log</span>
        </Link>
        <Link to="/dashboard/groups" className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`}>
          <Users size={20} />
          <span>Groups</span>
        </Link>
        <Link to="/dashboard/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
          <UserIcon size={20} />
          <span>Profile</span>
        </Link>
      </div>

      {popups.map(popup => (
        <div key={popup.id} className={`points-popup ${popup.className}`}>
          {popup.text}
        </div>
      ))}

      <WorkoutLogOverlay 
        isOpen={isWorkoutLogOpen}
        initialType={workoutType}
        onClose={() => { setIsWorkoutLogOpen(false); setWorkoutType(''); }}
        onLog={handleWorkoutLog}
      />

      <StepsLogOverlay 
        isOpen={isStepsLogOpen}
        initialSteps={todaySteps}
        isLoading={logActivityMutation.isPending}
        onClose={() => setIsStepsLogOpen(false)}
        onLog={handleStepsLog}
      />

      <SleepLogOverlay 
        isOpen={isSleepLogOpen}
        initialWakeTime={lastWakeupTime ?? undefined}
        isLoading={logActivityMutation.isPending}
        onClose={() => setIsSleepLogOpen(false)}
        onLog={handleSleepLog}
      />
    </div>
  );
};

export default Dashboard;
