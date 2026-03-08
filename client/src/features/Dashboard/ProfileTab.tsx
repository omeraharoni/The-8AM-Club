import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Edit2, Save, X, Camera } from 'lucide-react';

interface ProfileTabProps {
  user: any;
  editData: {
    username: string;
    email: string;
    dob: string;
    gender: string;
    profilePic: string;
  };
  setEditData: React.Dispatch<React.SetStateAction<any>>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
  updateProfileMutation: any;
  handleProfilePicChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileTab = ({
  user,
  editData,
  setEditData,
  isEditing,
  setIsEditing,
  onLogout,
  updateProfileMutation,
  handleProfilePicChange
}: ProfileTabProps) => {
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Profile</h2>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <LogOut size={24} />
        </button>
      </div>

      {/* --- PROFILE PIC SECTION --- */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div 
          onClick={() => isEditing && profilePicInputRef.current?.click()}
          style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'var(--bg)', 
            border: `2px solid ${isEditing ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
            overflow: 'hidden',
            position: 'relative',
            cursor: isEditing ? 'pointer' : 'default'
          }}
        >
          {editData.profilePic ? (
            <img src={editData.profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--muted)' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          {isEditing && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={24} color="white" />
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={profilePicInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleProfilePicChange} 
        />
        <h3 style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>{user?.username}</h3>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{user?.weeklyPoints || 0} TOTAL PTS</div>
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
            <button className="btn" onClick={() => updateProfileMutation.mutate(editData)} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : <><Save size={18} style={{ marginRight: '0.5rem' }} /> Save Changes</>}
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
  );
};

export default ProfileTab;
