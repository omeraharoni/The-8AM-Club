import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  User as UserIcon, 
  LogOut, 
  Check, 
  Users, 
  Plus, 
  Send, 
  Bell, 
  BarChart2, 
  List, 
  Dumbbell,
  Clock,
  Footprints,
  Sun,
  Moon
} from 'lucide-react';
import './App.css';

const API_URL = '/api';

type User = {
  id: string;
  username: string;
  weeklyPoints: number;
  workoutCount: number;
  wakeupCount: number;
};

type ActivityLog = {
  id: string;
  type: string;
  value: number;
  note?: string;
  points: number;
  timestamp: string;
};

type Group = {
  id: string;
  name: string;
  ownerId: string;
};

type Invitation = {
  id: string;
  groupId: string;
  groupName: string;
  fromUsername: string;
};

const WORKOUT_INSPIRATION = [
  { name: 'Strength Training', description: 'Weights & Calisthenics', pts: '10 pts', calories: '400-600 kcal/hr', icon: <Dumbbell size={24} /> },
  { name: 'Running', description: 'Steady pace or HIIT', pts: '10 pts', calories: '600-800 kcal/hr', icon: <Activity size={24} /> },
  { name: 'Yoga & Mobility', description: 'Focus on recovery', pts: '5 pts', calories: '180-250 kcal/hr', icon: <Sun size={24} /> },
  { name: 'Brisk Walking', description: 'Active recovery', pts: '5 pts', calories: '250-350 kcal/hr', icon: <Footprints size={24} /> },
  { name: 'Cycling', description: 'Endurance or Sprints', pts: '10 pts', calories: '450-700 kcal/hr', icon: <Activity size={24} /> }
];

type LeaderboardItem = {
  username: string;
  weeklyPoints: number;
  workouts: number;
  wakeups: number;
  sleep: number;
  steps: number;
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [activeTab, setActiveTab] = useState('log');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [workout, setWorkout] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardItem[]>([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll for updates
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupLeaderboard(selectedGroup.id);
    }
  }, [selectedGroup]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [meRes, groupsRes, invitesRes] = await Promise.all([
        axios.get(`${API_URL}/me`, config),
        axios.get(`${API_URL}/groups`, config),
        axios.get(`${API_URL}/invitations`, config)
      ]);
      
      setUser(meRes.data.user);
      setActivities(meRes.data.activities);
      setGroups(groupsRes.data);
      setInvitations(invitesRes.data);
      
      if (!selectedGroup && groupsRes.data.length > 0) {
        setSelectedGroup(groupsRes.data[0]);
      }
    } catch (error) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupLeaderboard = async (groupId: string) => {
    try {
      const res = await axios.get(`${API_URL}/groups/${groupId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupLeaderboard(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = isRegistering ? 'register' : 'login';
      const res = await axios.post(`${API_URL}/${endpoint}`, { username, password });
      if (isRegistering) {
        setIsRegistering(false);
        alert('Registered successfully! Now log in.');
      } else {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error occurred');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const logActivity = async (type: string, val: string) => {
    const value = parseInt(val);
    if (type !== 'wakeup' && (isNaN(value) || value < 0)) return;
    try {
      const res = await axios.post(`${API_URL}/activity`, { 
        type, 
        value,
        note: type === 'workout' ? workoutType : ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const pts = res.data.pointsEarned;
      setPointsPopup(pts);
      setTimeout(() => setPointsPopup(null), 1200);

      fetchData();
      if (selectedGroup) fetchGroupLeaderboard(selectedGroup.id);
      setSteps('');
      setWorkout('');
      setWorkoutType('');
      setSleep('');
    } catch (error) {
      alert('Failed to log activity');
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt('Enter Group Name:');
    if (!name) return;
    try {
      const res = await axios.post(`${API_URL}/groups`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      setSelectedGroup(res.data);
    } catch (error) {
      alert('Failed to create group');
    }
  };

  const sendInvitation = async () => {
    if (!token || !selectedGroup || !inviteUsername) return;
    try {
      await axios.post(`${API_URL}/invitations`, { 
        groupId: selectedGroup.id, 
        targetUsername: inviteUsername 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteUsername('');
      alert('Invitation sent!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const respondToInvitation = async (id: string, accept: boolean) => {
    try {
      await axios.post(`${API_URL}/invitations/${id}/respond`, { accept }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      alert('Failed to respond');
    }
  };

  if (!token) {
    return (
      <div className="app">
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>THE 8AM CLUB</h1>
          <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
            {isRegistering ? 'Join the community of winners.' : 'Ready to dominate the day?'}
          </p>

          {error && <div className="error-toast">{error}</div>}

          {loading ? (
            <div className="spinner-container" style={{ height: 'auto', padding: '2rem' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className="btn" type="submit" style={{ marginTop: '1rem' }}>
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', fontSize: '0.875rem' }} 
             onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
          </p>
        </div>
      </div>
    );
  }

  const weeklyGoal = 7; // Example goal
  const progressPercent = Math.min(((user?.workoutCount || 0) + (user?.wakeupCount || 0)) / (weeklyGoal * 2) * 100, 100);

  if (loading && !user) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--muted)' }}>Loading the Club...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>THE 8AM CLUB</h1>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <LogOut size={18} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'workouts' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', padding: '0 0.5rem', marginBottom: '1rem' }}>Workouts</h2>
            {WORKOUT_INSPIRATION.map((w, i) => (
              <div key={i} className="workout-item" style={{ cursor: 'pointer' }} onClick={() => alert(`${w.name}\nAvg. calories: ${w.calories}`)}>
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
        )}

        {activeTab === 'progress' && (
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
                activities.map((act, idx) => (
                  <div key={idx} className="leaderboard-item" style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>
                        {act.type === 'steps' ? `${act.value} Steps` : 
                         act.type === 'workout' ? `${act.value} min Workout` : 
                         act.type === 'sleep' ? `${act.value} hrs Sleep` : 
                         act.points > 0 ? 'Early Wakeup ☀️' : 'Late Wakeup 😴'}
                      </span>
                      {act.note && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{act.note}</span>}
                    </div>
                    <span className="badge">+{act.points} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div style={{ textAlign: 'center' }}>
            <div className="wakeup-circle-btn" onClick={() => logActivity('wakeup', '0')}>
              <Sun size={32} />
              <div style={{ marginTop: '0.5rem' }}>WAKEUP</div>
            </div>

            <div className="log-grid">
              <div className="mini-log-btn">
                <Footprints size={20} color="var(--primary)" />
                <input className="input" placeholder="Steps" value={steps} onChange={(e) => setSteps(e.target.value)} type="number" min="0" style={{ margin: 0, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1px solid var(--muted)', padding: '0' }} />
                <button className="badge" style={{ width: '100%', border: 'none', cursor: 'pointer' }} onClick={() => logActivity('steps', steps)}><Check size={16} /></button>
              </div>
              <div className="mini-log-btn" style={{ gridColumn: 'span 2' }}>
                <Clock size={20} color="var(--primary)" />
                <div style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
                  <input className="input" placeholder="Min" value={workout} onChange={(e) => setWorkout(e.target.value)} type="number" min="0" style={{ flex: 1, margin: 0, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1px solid var(--muted)', padding: '0' }} />
                  <input className="input" placeholder="Type" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} type="text" style={{ flex: 2, margin: 0, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1px solid var(--muted)', padding: '0' }} />
                </div>
                <button className="badge" style={{ width: '100%', border: 'none', cursor: 'pointer' }} onClick={() => logActivity('workout', workout)}><Check size={16} /></button>
              </div>
              <div className="mini-log-btn">
                <Moon size={20} color="var(--primary)" />
                <input className="input" placeholder="Hrs" value={sleep} onChange={(e) => setSleep(e.target.value)} type="number" min="0" style={{ margin: 0, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1px solid var(--muted)', padding: '0' }} />
                <button className="badge" style={{ width: '100%', border: 'none', cursor: 'pointer' }} onClick={() => logActivity('sleep', sleep)}><Check size={16} /></button>
              </div>
            </div>

            {invitations.length > 0 && (
              <div className="card" style={{ borderColor: 'var(--primary)', borderWidth: 1, borderStyle: 'solid', marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1rem' }}><Bell size={18} style={{ marginRight: '0.5rem' }} /> Invites</h2>
                {invitations.map(inv => (
                  <div key={inv.id} className="leaderboard-item" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem' }}><b>{inv.fromUsername}</b> invited you to <b>{inv.groupName}</b></div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn" style={{ height: '32px', padding: '0', fontSize: '0.8rem' }} onClick={() => respondToInvitation(inv.id, true)}>Accept</button>
                      <button className="btn" style={{ height: '32px', padding: '0', fontSize: '0.8rem', background: '#475569' }} onClick={() => respondToInvitation(inv.id, false)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <UserIcon size={24} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.username}</h2>
            </div>
            <div className="stats" style={{ gridTemplateColumns: '1fr' }}>
              <div className="stat-box" style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Weekly Points</div>
                <div className="stat-value" style={{ fontSize: '2.5rem' }}>{user?.weeklyPoints}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-box">
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Workouts</div>
                  <div className="stat-value">{user?.workoutCount}</div>
                </div>
                <div className="stat-box">
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Wakeups</div>
                  <div className="stat-value">{user?.wakeupCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
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
                  {groups.map(g => (
                    <button 
                      key={g.id} 
                      className="badge" 
                      style={{ 
                        cursor: 'pointer',
                        background: selectedGroup?.id === g.id ? 'var(--primary)' : 'var(--card)',
                        color: selectedGroup?.id === g.id ? 'var(--bg)' : 'var(--primary)',
                        padding: '0.4rem 0.8rem',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => setSelectedGroup(g)}
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
                        <button className="btn" style={{ width: 'auto', padding: '0.3rem' }} onClick={sendInvitation}><Send size={14} /></button>
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
                          {groupLeaderboard.map((item, index) => (
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
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'workouts' ? 'active' : ''}`} onClick={() => setActiveTab('workouts')}>
          <Dumbbell size={20} />
          <span>Workouts</span>
        </button>
        <button className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
          <List size={20} />
          <span>Progress</span>
        </button>
        <button className={`nav-item ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
          <Activity size={20} />
          <span>Log</span>
        </button>
        <button className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <BarChart2 size={20} />
          <span>Stats</span>
        </button>
        <button className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          <Users size={20} />
          <span>Groups</span>
        </button>
      </div>

      {/* Floating Points Popup */}
      {pointsPopup !== null && (
        <div key={Date.now()} className="points-popup">
          +{pointsPopup} pts
        </div>
      )}
    </div>
  );
}

export default App;
