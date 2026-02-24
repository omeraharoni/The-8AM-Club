import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '../../services/api';

interface AuthFormProps {
  onLoginSuccess: (token: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync username with email if checkbox is checked
  useEffect(() => {
    if (useEmailAsUsername && isRegistering) {
      setUsername(email);
    }
  }, [email, useEmailAsUsername, isRegistering]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation for registration
    if (isRegistering) {
      if (!gender) {
        setError('Please select your gender');
        setLoading(false);
        return;
      }
      if (!dob) {
        setError('Please provide your date of birth');
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = isRegistering ? '/register' : '/login';
      const payload = isRegistering 
        ? { username, password, email, dob, gender } 
        : { username, password };
      
      const res = await api.post(endpoint, payload);
      
      if (isRegistering) {
        setIsRegistering(false);
        alert('Registered successfully! Now log in.');
      } else {
        localStorage.setItem('token', res.data.token);
        onLoginSuccess(res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const res = await api.post('/google-login', {
        email: decoded.email,
        name: decoded.name,
        googleId: decoded.sub
      });
      localStorage.setItem('token', res.data.token);
      onLoginSuccess(res.data.token);
    } catch (err: any) {
      setError('Google Login failed');
    }
  };

  return (
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
        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div style={{ marginBottom: '1rem' }}>
              <input 
                className="input" 
                type="email"
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={useEmailAsUsername} 
                  onChange={(e) => setUseEmailAsUsername(e.target.checked)} 
                />
                Use email as username
              </label>
            </div>
          )}

          {!useEmailAsUsername || !isRegistering ? (
            <input 
              className="input" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          ) : null}

          <input 
            className="input" 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          {isRegistering && (
            <>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Date of Birth (Required)</label>
                <input 
                  className="input" 
                  type="date"
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)} 
                  required 
                />
              </div>
              
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Gender (Required)</label>
                <select 
                  className="input" 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  style={{ background: 'var(--bg)', color: 'white' }}
                  required
                >
                  <option value="" disabled>Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </>
          )}

          <button className="btn" type="submit" style={{ marginTop: '1.5rem' }}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google Login failed')}
          locale="en_US"
          shape="pill"
          theme="filled_blue"
          text="continue_with"
        />
      </div>

      <p 
        style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.875rem' }} 
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
      </p>
    </div>
  );
};

export default AuthForm;
