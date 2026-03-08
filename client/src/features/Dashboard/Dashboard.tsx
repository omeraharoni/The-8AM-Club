import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  User as UserIcon, 
  LogOut,
  Check, 
  Users, 
  Plus, 
  List, 
  Dumbbell,
  Footprints,
  Sun,
  Moon,
  Edit2,
  Save,
  X,
  Camera,
  Heart,
  Zap,
  Eye,
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { User, ActivityLog } from '../../types';
import WorkoutLogOverlay from './WorkoutLogOverlay';
import StepsLogOverlay from './StepsLogOverlay';
import SleepLogOverlay from './SleepLogOverlay';
import CreateGroupOverlay from './CreateGroupOverlay';
import GroupsDashboard from '../Groups/GroupsDashboard';
import ProfileTab from './ProfileTab';

interface DashboardProps {
  onLogout: () => void;
}

interface MeResponse {
  user: User & { email: string, dob: string, gender: string, profilePic?: string };
  activities: ActivityLog[];
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/').pop() || 'log';

  const [workoutType, setWorkoutType] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => localStorage.getItem('activeGroupId'));
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [popups, setPopups] = useState<{ id: number, text: string, className: string }[]>([]);
  const [isWorkoutLogOpen, setIsWorkoutLogOpen] = useState(false);
  const [isStepsLogOpen, setIsStepsLogOpen] = useState(false);
  const [isSleepLogOpen, setIsSleepLogOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [lastWakeupTime, setLastWakeupTime] = useState<number | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number | null>(null);

  // Group Editing State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupData, setEditGroupData] = useState({
    name: '',
    description: '',
    category: '',
    weeklyWakeupTarget: 5,
    weeklyWorkoutTarget: 4,
    wakeupTimeTarget: '08:00'
  });

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    dob: '',
    gender: '',
    profilePic: ''
  });
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { compressImage } = await import('../../utils/imageUtils');
        const compressed = await compressImage(file);
        setEditData({ ...editData, profilePic: compressed });
      } catch (err) {
        console.error("Profile pic compression failed", err);
      }
    }
  };

  const [carouselIndex, setCarouselIndex] = useState(1); // Start on Sleep (index 1)
  const [dragOffset, setDragOffset] = useState(0);
  
  const cards = [
    { id: 'steps', title: 'Daily Steps', desc: 'Track movement.', icon: Footprints, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', action: () => setIsStepsLogOpen(true), btn: 'STEPS' },
    { id: 'sleep', title: 'Sleep & Rise', desc: 'Log recovery.', icon: Moon, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', action: () => setIsSleepLogOpen(true), btn: 'RECOVERY' },
    { id: 'workout', title: 'Workout', desc: 'Log sweat.', icon: Dumbbell, color: 'var(--primary)', bg: 'rgba(251, 191, 36, 0.1)', action: () => setIsWorkoutLogOpen(true), btn: 'WORKOUT' }
  ];

  const handleDrag = (_: any, info: any) => {
    setDragOffset(info.offset.x);
  };

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setCarouselIndex((prev) => (prev + 1) % 3);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setCarouselIndex((prev) => (prev - 1 + 3) % 3);
    }
    setDragOffset(0);
  };

  // --- QUERIES ---
  
  const { data: userData, isLoading: userLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api.get('/activity/me').then(res => res.data),
    retry: false,
  });

  const { data: progressData } = useQuery<any>({
    queryKey: ['progress'],
    queryFn: () => api.get('/user/progress').then(res => res.data),
  });

  const { data: groupsData } = useQuery<any[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(res => res.data),
    refetchInterval: 30000,
  });
  const groups = Array.isArray(groupsData) ? groupsData : [];

  const { data: pendingRequestsData } = useQuery<any[]>({
    queryKey: ['group-requests'],
    queryFn: () => api.get('/groups/requests/pending').then(res => res.data),
    refetchInterval: 30000,
  });
  const pendingRequests = Array.isArray(pendingRequestsData) ? pendingRequestsData : [];

  const { data: leaderboardData } = useQuery<any>({
    queryKey: ['leaderboard', selectedGroupId],
    queryFn: () => api.get(`/groups/${selectedGroupId}/leaderboard`).then(res => res.data),
    enabled: !!selectedGroupId,
    refetchInterval: 10000,
  });
  const leaderboard = leaderboardData?.leaderboard || [];
  const memberCount = leaderboardData?.memberCount || 0;

  const [isGroupFolded, setIsGroupFolded] = useState(false);

  // --- AUTO-SELECT STORY GROUP ---
  useEffect(() => {
    if (activeTab === 'stories' && groups.length > 0) {
      const currentHasStories = leaderboardData?.stories?.length > 0;
      
      if (!currentHasStories) {
        // Try to find any other group that HAS stories
        for (const g of groups) {
          const gId = g.id || g._id;
          if (gId === selectedGroupId) continue;
          
          const gData = queryClient.getQueryData<any>(['leaderboard', gId]);
          if (gData?.stories?.length > 0) {
            setSelectedGroupId(gId);
            return;
          }
        }
      }
    }
  }, [activeTab, groups, selectedGroupId, leaderboardData, queryClient]);

  // Persistence and fallback logic
  useEffect(() => {
    if (groups.length > 0) {
      const storedId = localStorage.getItem('activeGroupId');
      const isValid = groups.some((g: any) => (g.id || g._id) === storedId);
      
      // Only auto-select if we don't have a valid selection AND we haven't explicitly set it to null for joining
      // We check if storedId exists but is invalid, or if selectedGroupId is truly undefined (initial state)
      if (selectedGroupId === undefined || (selectedGroupId && !isValid)) {
        const fallbackId = isValid ? storedId : (groups[0]._id || groups[0].id);
        setSelectedGroupId(fallbackId);
        if (fallbackId) localStorage.setItem('activeGroupId', fallbackId);
      }
    }
  }, [groups]); // Only re-run when groups change, not when selectedGroupId is manually toggled

  // Sync edit data when user loads
  useEffect(() => {
    if (userData?.user) {
      setEditData({
        username: userData.user.username,
        email: userData.user.email || '',
        dob: userData.user.dob ? userData.user.dob.split('T')[0] : '',
        gender: userData.user.gender || 'prefer-not-to-say',
        profilePic: userData.user.profilePic || ''
      });
    }
  }, [userData]);

  // --- MUTATIONS ---

  const addPopup = (text: string, className: string) => {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { id, text, className }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 3500); 
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
      addPopup('Profile Updated! ✅', 'popup-right');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Failed to update profile', 'popup-error');
    }
  });

  const logActivityMutation = useMutation({
    mutationFn: (data: { type: string, value: number, note?: string, isShared?: boolean, isSolo?: boolean, proofImage?: string }) => 
      api.post('/activity/activity', data),
    onSuccess: (res, variables) => {
      const pts = res.data.pointsEarned;
      const displayPts = parseFloat(pts.toFixed(1));
      const ptsText = `+${displayPts} pts`;
      
      if (variables.proofImage) {
        addPopup('PROOF VERIFIED! 🔥', 'popup-right');
        navigate('/dashboard/stories');
      }

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
    mutationFn: (data: { 
      name: string, 
      description: string, 
      category: string,
      weeklyWakeupTarget: number,
      weeklyWorkoutTarget: number,
      wakeupTimeTarget: string
    }) => api.post('/groups', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(res.data.id || res.data._id);
      setIsCreateGroupOpen(false);
      navigate('/dashboard/groups');
    }
  });

  const joinByCodeMutation = useMutation({
    mutationFn: (code: string) => {
      console.log('Attempting to join group with code:', code);
      return api.post(`/groups/join/${code}`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      
      // If join resulted in immediate membership
      if (res.data.groupId) {
        setSelectedGroupId(res.data.groupId);
        queryClient.invalidateQueries({ queryKey: ['leaderboard', res.data.groupId] });
      } else if (groups.length > 0) {
        // If it was just a request, switch back to an existing group so they aren't stuck on the join screen
        setSelectedGroupId(groups[0].id || groups[0]._id);
      }
      
      setJoinCodeInput('');
      addPopup(res.data.message || 'Joined group successfully!', 'popup-right');
      navigate('/dashboard/groups');
    },
    onError: (err: any) => {
      console.error('Join group error:', err);
      addPopup(err.response?.data?.message || 'Failed to join group', 'popup-error');
    }
  });

  const respondMutation = useMutation({
    mutationFn: (data: { id: string, accept: boolean }) => 
      api.post(`/invitations/${data.id}/respond`, { accept: data.accept }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      addPopup(res.data.message || 'Request processed! ✅', 'popup-right');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Action failed', 'popup-error');
    }
  });

  const syncMembershipMutation = useMutation({
    mutationFn: (groupId: string) => api.post(`/groups/${groupId}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedGroupId] });
      addPopup('Membership synced! 🔄', 'popup-right');
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data: any) => api.put(`/groups/${selectedGroupId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsEditingGroup(false);
      addPopup('Group updated! ✅', 'popup-right');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Failed to update group', 'popup-error');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.delete(`/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(null);
      addPopup('Group deleted successfully 🗑️', 'popup-right');
      navigate('/dashboard/groups');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Failed to delete group', 'popup-error');
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (data: { groupId: string, userId: string }) => 
      api.delete(`/groups/${data.groupId}/members/${data.userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', selectedGroupId] });
      addPopup('Member removed 🚪', 'popup-right');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Failed to remove member', 'popup-error');
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.post(`/groups/${groupId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(null);
      addPopup('You left the group', 'popup-right');
    },
    onError: (err: any) => {
      addPopup(err.response?.data?.message || 'Failed to leave group', 'popup-error');
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

  const handleWorkoutLog = (data: { type: string, value: number, isShared: boolean, isSolo: boolean, proofImage?: string }) => {
    logActivityMutation.mutate({
      type: 'workout',
      value: data.value,
      note: data.type,
      isShared: data.isShared,
      isSolo: data.isSolo,
      proofImage: data.proofImage
    });
  };

  const handleStepsLog = (steps: number) => {
    logActivityMutation.mutate({
      type: 'steps',
      value: steps
    });
  };

  const handleSleepLog = (data: { value: number, note: string, proofImage?: string }) => {
    const activityType = data.note === 'wakeup' ? 'wakeup' : 'sleep';
    logActivityMutation.mutate({
      type: activityType,
      value: data.value,
      note: data.note,
      proofImage: data.proofImage
    });
  };

  const handleCreateGroup = () => {
    setIsCreateGroupOpen(true);
  };

  const startEditingGroup = () => {
    if (selectedGroup) {
      setEditGroupData({
        name: selectedGroup.name,
        description: selectedGroup.description || '',
        category: selectedGroup.category || '',
        weeklyWakeupTarget: selectedGroup.weeklyWakeupTarget || 5,
        weeklyWorkoutTarget: selectedGroup.weeklyWorkoutTarget || 4,
        wakeupTimeTarget: selectedGroup.wakeupTimeTarget || '08:00'
      });
      setIsEditingGroup(true);
    }
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
                              <Route path="stories" element={
                                <div style={{ paddingBottom: '2rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
                                    <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: '900', letterSpacing: '-1px' }}>CLUB <span style={{ color: 'var(--primary)' }}>STORIES</span></h2>
                                  </div>
                    
                                  {/* --- PREMIUM STORY BUBBLES --- */}
                                  <div style={{ 
                                    display: 'flex', 
                                    gap: '1.5rem', 
                                    padding: '0.5rem',
                                    overflowX: 'auto',
                                    paddingBottom: '1rem',
                                    msOverflowStyle: 'none',
                                    scrollbarWidth: 'none'
                                  }}>
                                    {groups.map((g: any) => {
                                      const isActive = selectedGroupId === (g.id || g._id);
                                      const groupLeaderboardData = queryClient.getQueryData<any>(['leaderboard', g.id || g._id]);
                                      const hasStories = groupLeaderboardData?.stories?.length > 0;
                                      const showRing = hasStories;
                    
                                      return (
                                        <motion.div 
                                          key={g.id || g._id}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => {
                                            setSelectedGroupId(g.id || g._id);
                                            if (hasStories) {
                                              setCurrentStoryIndex(0);
                                            }
                                          }}
                                          style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '0.75rem',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                          }}
                                        >
                                          <div style={{ 
                                            width: '82px', 
                                            height: '82px', 
                                            borderRadius: '50%', 
                                            padding: '3px',
                                            background: (showRing) 
                                              ? 'linear-gradient(45deg, #f59e0b, #fbbf24, #f59e0b, #fcd34d)' 
                                              : 'rgba(255,255,255,0.05)',
                                            position: 'relative',
                                            boxShadow: showRing ? '0 0 25px rgba(251, 191, 36, 0.25)' : 'none',
                                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            transform: showRing ? 'scale(1.05)' : 'scale(1)'
                                          }}>
                                            <div style={{ 
                                              width: '100%', 
                                              height: '100%', 
                                              borderRadius: '50%', 
                                              background: '#0f172a',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '1.8rem',
                                              fontWeight: '900',
                                              color: (isActive || showRing) ? 'white' : 'rgba(255,255,255,0.2)',
                                              border: '3px solid #0a0f1e',
                                              overflow: 'hidden'
                                            }}>
                                              {g.name[0].toUpperCase()}
                                            </div>
                                            {showRing && (
                                              <div style={{ 
                                                position: 'absolute', 
                                                bottom: '-2px', 
                                                right: '-2px', 
                                                background: '#ef4444', 
                                                color: 'white', 
                                                fontSize: '0.6rem', 
                                                fontWeight: '900', 
                                                padding: '2px 8px', 
                                                borderRadius: '1rem',
                                                border: '2px solid #0f172a',
                                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                                              }}>
                                                LIVE
                                              </div>
                                            )}
                                          </div>
                                          <span style={{ 
                                            fontSize: '0.8rem', 
                                            fontWeight: (isActive || showRing) ? '800' : '500',
                                            color: (isActive || showRing) ? 'white' : 'var(--muted)',
                                            textAlign: 'center',
                                            maxWidth: '90px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            letterSpacing: (isActive || showRing) ? '0' : '0.5px'
                                          }}>{g.name}</span>
                                        </motion.div>
                                      );
                                    })}

                                    {/* Create Club Bubble */}
                                    <div 
                                      onClick={() => navigate('/dashboard/groups')}
                                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                      <div style={{ width: '82px', height: '82px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                        <Plus size={32} />
                                      </div>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: '500' }}>Add Club</span>
                                    </div>
                                  </div>
                    
                                  {/* --- STORY HIGHLIGHT RECAP (Modern Grid) --- */}
                                  <div style={{ marginTop: '2.5rem', padding: '0 0.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                      {selectedGroup ? `Inside ${selectedGroup.name}` : 'Group Highlights'}
                                    </h3>
                                    
                                    {selectedGroupId && leaderboardData?.stories?.length > 0 ? (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {leaderboardData.stories.slice(0, 4).map((story: any, i: number) => (
                                          <motion.div 
                                            key={story.id}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setCurrentStoryIndex(i)}
                                            style={{ 
                                              aspectRatio: '3/4', borderRadius: '1.5rem', background: '#000', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' 
                                            }}
                                          >
                                            <img src={story.image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                                            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.8)', padding: '2px' }}>
                                                {story.profilePic ? <img src={story.profilePic} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ fontSize: '0.6rem', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>{story.username[0]}</div>}
                                              </div>
                                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{story.username}</span>
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '0.75rem', fontSize: '0.6rem', fontWeight: '900', color: 'white' }}>
                                              {story.type.toUpperCase()}
                                            </div>
                                          </motion.div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '2rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <Camera size={48} style={{ color: 'var(--muted)', marginBottom: '1rem', opacity: 0.3 }} />
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.1rem' }}>The Feed is Quiet</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                                          {groups.length === 0 
                                            ? 'Join a club to start seeing daily stories!' 
                                            : `No one in ${selectedGroup?.name || 'the club'} has logged a story yet today.`
                                          }
                                        </p>
                                        <button 
                                          className="btn" 
                                          style={{ marginTop: '1.5rem', width: 'auto', padding: '0.75rem 2rem', borderRadius: '1rem' }} 
                                          onClick={() => navigate(groups.length === 0 ? '/dashboard/groups' : '/dashboard/log')}
                                        >
                                          {groups.length === 0 ? 'Find Clubs' : 'Be the First'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              } />
          <Route path="progress" element={
            <div style={{ paddingBottom: '2rem' }}>
              {/* --- SECTION 1: PERSONAL MASTERY & STREAKS --- */}
              <div className="card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
                  <Sun size={120} />
                </div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '900' }}>PERSONAL MASTERY</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Current Streak</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)' }}>{progressData?.personal?.streaks?.current || 0}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>DAYS</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Longest Streak</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{progressData?.personal?.streaks?.longest || 0}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>DAYS</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{progressData?.personal?.thirtyDayStats?.workouts || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Workouts</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{progressData?.personal?.thirtyDayStats?.avgSleep || 0}h</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Avg Sleep</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{progressData?.personal?.thirtyDayStats?.stepConsistency || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>10k Days</div>
                  </div>
                </div>
              </div>

              {/* --- SECTION 2: TEAM SYNERGY --- */}
              <div className="card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center' }}>
                  <Users size={20} style={{ marginRight: '0.75rem' }} /> TEAM SYNERGY
                </h2>

                {progressData?.groupStats && progressData.groupStats.length > 0 ? (
                  progressData.groupStats.map((group: any) => (
                    <div key={group.groupId} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1.25rem' }}>
                      <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: 'white' }}>{group.name}</h3>
                      
                      {/* Wakeups Bar */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--muted)' }}>Team Wakeups</span>
                          <span style={{ fontWeight: 'bold' }}>{group.actual.wakeup} / {group.targets.wakeup}</span>
                        </div>
                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min((group.actual.wakeup / group.targets.wakeup) * 100, 100)}%`, 
                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                            borderRadius: '6px',
                            transition: 'width 1s ease-out'
                          }}></div>
                        </div>
                      </div>

                      {/* Workouts Bar */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--muted)' }}>Team Workouts</span>
                          <span style={{ fontWeight: 'bold' }}>{group.actual.workout} / {group.targets.workout}</span>
                        </div>
                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min((group.actual.workout / group.targets.workout) * 100, 100)}%`, 
                            background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                            borderRadius: '6px',
                            transition: 'width 1s ease-out'
                          }}></div>
                        </div>
                      </div>

                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        background: 'rgba(251, 191, 36, 0.05)', 
                        borderRadius: '0.75rem', 
                        fontSize: '0.8rem', 
                        textAlign: 'center',
                        border: '1px dashed rgba(251, 191, 36, 0.2)'
                      }}>
                        You contributed <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{group.myContribution.wakeup}%</span> of the team's wakeups! 🏆
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                      You're currently in "Solo Challenge" mode.
                    </div>
                    <button className="btn" onClick={() => navigate('/dashboard/groups')} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                      Join a Team to Compete
                    </button>
                  </div>
                )}
              </div>

              {/* --- SECTION 3: SMART STATS --- */}
              <div className="card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '900' }}>SMART STATISTICS</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Wakeup Accuracy</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Success rate before 8 AM</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>
                      {progressData?.personal?.thirtyDayStats?.wakeups > 0 
                        ? Math.round((progressData.personal.thirtyDayStats.wakeups / 30) * 100) 
                        : 0}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Step Consistency</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Days meeting 10k target</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>
                      {progressData?.personal?.thirtyDayStats?.stepConsistency || 0} / 30
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />

          <Route path="log" element={
            <div style={{ textAlign: 'center', overflowX: 'hidden' }}>
              <h1 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                color: 'white', 
                marginTop: '1rem', 
                marginBottom: '0.5rem',
                letterSpacing: '-1px' 
              }}>
                What's up, <span style={{ color: 'var(--primary)' }}>CHAMP?</span>
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Ready to conquer the day?</p>

              <div style={{ 
                position: 'relative',
                height: '420px',
                width: '100%',
                margin: '0 0 1.5rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none'
              }}>
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {cards.map((card, index) => {
                    const Icon = card.icon;
                    // Calculate circular index difference for infinite wrap
                    let diff = index - carouselIndex;
                    if (diff > 1) diff -= 3;
                    if (diff < -1) diff += 3;

                    const isCenter = diff === 0;
                    
                    return (
                      <motion.div 
                        key={card.id}
                        animate={{ 
                          x: diff * 220, 
                          scale: isCenter ? 1.15 : 0.8,
                          opacity: isCenter ? 1 : 0.5,
                          zIndex: isCenter ? 10 : 5,
                          filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 450, 
                          damping: 35, 
                          mass: 0.6 
                        }}
                        onClick={() => {
                          if (isCenter) card.action();
                          else setCarouselIndex(index);
                        }}
                        style={{ 
                          position: 'absolute',
                          width: '260px', 
                          height: '320px', 
                          borderRadius: '2.5rem', 
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)', 
                          border: isCenter ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.05)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer', 
                          overflow: 'hidden',
                          boxShadow: isCenter ? '0 30px 60px rgba(0,0,0,0.6), 0 0 20px rgba(251, 191, 36, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.03 }}>
                          <Icon size={180} />
                        </div>
                        <div style={{ 
                          width: '70px', 
                          height: '70px', 
                          borderRadius: '50%', 
                          background: card.bg, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          marginBottom: '1.25rem', 
                          boxShadow: isCenter ? `0 0 30px ${card.bg}` : 'none' 
                        }}>
                          <Icon size={32} color={card.color} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', color: 'white', margin: '0 0 0.4rem 0', fontWeight: '900', letterSpacing: '-0.5px' }}>{card.title}</h3>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0, padding: '0 2rem', textAlign: 'center', lineHeight: 1.3 }}>{card.desc}</p>
                        <div style={{ 
                          marginTop: '1.5rem', 
                          background: isCenter ? card.bg : 'rgba(255,255,255,0.05)', 
                          color: isCenter ? card.color : 'rgba(255,255,255,0.2)', 
                          padding: '0.5rem 1.25rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.7rem', 
                          fontWeight: '900',
                          transition: 'all 0.3s'
                        }}>{card.btn}</div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {pendingRequests.length > 0 && (
                <div className="card" style={{ borderColor: 'var(--primary)', borderStyle: 'dashed', borderWidth: 1, marginTop: '2rem', textAlign: 'center', background: 'rgba(251, 191, 36, 0.05)' }}>
                  <h2 style={{ fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)' }}>
                    <Users size={18} style={{ marginRight: '0.5rem' }} /> New Join Requests
                  </h2>
                  {pendingRequests.map((req: any) => (
                    <div key={req._id} className="leaderboard-item" style={{ flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 0' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        <b>{req.fromUsername}</b> wants to join <b>{req.groupName}</b>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                        <button 
                          className="btn" 
                          style={{ height: '40px', padding: '0 1.5rem', fontSize: '0.9rem', width: 'auto' }} 
                          onClick={() => respondMutation.mutate({ id: req._id, accept: true })}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn" 
                          style={{ height: '40px', padding: '0 1.5rem', fontSize: '0.9rem', width: 'auto', background: '#475569' }} 
                          onClick={() => respondMutation.mutate({ id: req._id, accept: false })}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          } />

          <Route path="groups" element={
            <GroupsDashboard 
              groups={groups}
              selectedGroup={selectedGroup}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              leaderboard={leaderboard}
              memberCount={memberCount}
              user={user}
              onHandleCreateGroup={handleCreateGroup}
              onJoinByCode={(code) => joinByCodeMutation.mutate(code)}
              joinByCodeIsPending={joinByCodeMutation.isPending}
              onStartEditingGroup={startEditingGroup}
              syncMembership={(id) => syncMembershipMutation.mutate(id)}
              respondToRequest={(data) => respondMutation.mutate(data)}
              onLeaveGroup={(id) => leaveGroupMutation.mutate(id)}
              onRemoveMember={(groupId, userId) => removeMemberMutation.mutate({ groupId, userId })}
              onDeleteGroup={(id) => deleteGroupMutation.mutate(id)}
              pendingRequests={pendingRequests}
            />
          } />

          <Route path="profile" element={
            <ProfileTab 
              user={user}
              editData={editData}
              setEditData={setEditData}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onLogout={onLogout}
              updateProfileMutation={updateProfileMutation}
              handleProfilePicChange={handleProfilePicChange}
            />
          } />
          
          <Route path="/" element={<Navigate to="log" replace />} />
        </Routes>
      </div>

      <div className="bottom-nav">
        <Link to="/dashboard/stories" className={`nav-item ${activeTab === 'stories' ? 'active' : ''}`}>
          <Camera size={20} />
          <span>Stories</span>
        </Link>
        <Link to="/dashboard/progress" className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`}>
          <List size={20} />
          <span>Progress</span>
        </Link>
        <Link to="/dashboard/log" className={`nav-item ${activeTab === 'log' ? 'active' : ''}`}>
          <Activity size={20} />
          <span>Log</span>
        </Link>
        <Link 
          to="/dashboard/groups" 
          className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setSelectedGroupId(null)}
        >
          <div style={{ position: 'relative' }}>
            <Users size={20} />
            {pendingRequests.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '-8px', 
                right: '-10px', 
                background: '#ef4444', 
                color: 'white',
                width: '18px', 
                height: '18px', 
                borderRadius: '50%',
                border: '2px solid var(--card)',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pendingRequests.length}
              </div>
            )}
          </div>
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

      <AnimatePresence>
        {currentStoryIndex !== null && leaderboardData?.stories?.[currentStoryIndex] && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCurrentStoryIndex(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 3000, backdropFilter: 'blur(15px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 3001, display: 'flex', flexDirection: 'column' }}
              onClick={() => {
                const next = currentStoryIndex + 1;
                if (next < leaderboardData.stories.length) {
                  setCurrentStoryIndex(next);
                } else {
                  setCurrentStoryIndex(null);
                }
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* --- PROGRESS BAR --- */}
                <div style={{ position: 'absolute', top: '15px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 3005 }}>
                  {leaderboardData.stories.map((_: any, idx: number) => (
                    <div key={idx} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? '100%' : '0%', 
                        background: 'white',
                        transition: idx === currentStoryIndex ? 'none' : 'width 0.1s linear'
                      }} />
                    </div>
                  ))}
                </div>

                {/* --- HEADER --- */}
                <div style={{ padding: '40px 20px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3005 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: leaderboardData.stories[currentStoryIndex].profilePic ? 'transparent' : 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold', 
                      color: 'var(--bg)',
                      overflow: 'hidden',
                      border: leaderboardData.stories[currentStoryIndex].profilePic ? '1.5px solid var(--primary)' : 'none'
                    }}>
                      {leaderboardData.stories[currentStoryIndex].profilePic ? (
                        <img src={leaderboardData.stories[currentStoryIndex].profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        leaderboardData.stories[currentStoryIndex].username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{leaderboardData.stories[currentStoryIndex].username}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                        {leaderboardData.stories[currentStoryIndex].type.toUpperCase()} • {new Date(leaderboardData.stories[currentStoryIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Activity Stat Badge */}
                  {leaderboardData.stories[currentStoryIndex].note && (
                    <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {leaderboardData.stories[currentStoryIndex].note}
                    </div>
                  )}

                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentStoryIndex(null); }} 
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '8px', color: 'white', cursor: 'pointer' }}
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* --- IMAGE --- */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                  <img 
                    src={leaderboardData.stories[currentStoryIndex].image} 
                    style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
                    alt="Story proof" 
                  />
                </div>

                {/* --- FOOTER HINT --- */}
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', letterSpacing: '1px' }}>
                  TAP TO NEXT STORY
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingGroup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingGroup(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'var(--card)', borderTopLeftRadius: '2rem', borderTopRightRadius: '2rem',
                padding: '2rem', zIndex: 3001, maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Edit Group</h2>
                <button onClick={() => setIsEditingGroup(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Group Name</label>
                  <input className="input" value={editGroupData.name} onChange={(e) => setEditGroupData({...editGroupData, name: e.target.value})} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Category</label>
                  <input className="input" value={editGroupData.category} onChange={(e) => setEditGroupData({...editGroupData, category: e.target.value})} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Description</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    value={editGroupData.description} 
                    onChange={(e) => setEditGroupData({...editGroupData, description: e.target.value})}
                    style={{ resize: 'none', padding: '0.75rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Weekly Rise Goal</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={editGroupData.weeklyWakeupTarget} 
                      onChange={(e) => setEditGroupData({...editGroupData, weeklyWakeupTarget: parseInt(e.target.value)})} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Weekly Workout Goal</label>
                    <input 
                      type="number" 
                      className="input" 
                      value={editGroupData.weeklyWorkoutTarget} 
                      onChange={(e) => setEditGroupData({...editGroupData, weeklyWorkoutTarget: parseInt(e.target.value)})} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Target Wakeup Time</label>
                  <select 
                    className="input" 
                    value={editGroupData.wakeupTimeTarget} 
                    onChange={(e) => setEditGroupData({...editGroupData, wakeupTimeTarget: e.target.value})}
                    style={{ background: 'var(--bg)', color: 'white' }}
                  >
                    <option value="none">None</option>
                    {['04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'].map(t => (
                      <option key={t} value={t}>{t} AM</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn" 
                    style={{ flex: 2 }}
                    onClick={() => updateGroupMutation.mutate(editGroupData)}
                    disabled={updateGroupMutation.isPending}
                  >
                    Save Changes
                  </button>
                  <button 
                    className="btn" 
                    style={{ flex: 1, background: '#ef4444' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this group? This cannot be undone.')) {
                        deleteGroupMutation.mutate(selectedGroupId!);
                        setIsEditingGroup(false);
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      <CreateGroupOverlay 
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={(data) => createGroupMutation.mutate(data)}
      />
    </div>
  );
};

export default Dashboard;
