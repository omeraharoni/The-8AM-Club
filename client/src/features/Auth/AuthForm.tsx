import { useState, useEffect, type FormEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '../../services/api';

interface AuthFormProps {
  onLoginSuccess: (token: string) => void;
}

const AuthForm = ({ onLoginSuccess }: AuthFormProps) => {
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

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setUsername('');
    setPassword('');
    setEmail('');
    setDob('');
    setGender('');
    setUseEmailAsUsername(false);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
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
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering 
        ? { 
            username: username.trim(), 
            password: password.trim(), 
            email: email.trim().toLowerCase(), 
            dob, 
            gender 
          } 
        : { 
            username: username.trim(), 
            password: password.trim() 
          };
      
      const res = await api.post(endpoint, payload);
      
      if (isRegistering) {
        setIsRegistering(false);
        alert('Registered successfully! Now log in.');
        // After registration, reset form for login
        setUsername('');
        setPassword('');
      } else {
        const token = res.data.token;
        localStorage.setItem('token', token);
        onLoginSuccess(token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const res = await api.post('/auth/google-login', {
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

      {isRegistering && (
        <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px dashed var(--primary)', fontSize: '0.75rem', textAlign: 'center' }}>
          💡 Already used Google? Use your <b>Google Email</b> here to set a password!
        </div>
      )}

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
              placeholder={isRegistering ? "Username" : "Username or Email"} 
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
          
          {!isRegistering && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Trouble logging in? Try using your email as the username.
            </p>
          )}
        </form>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google Login failed')}
          shape="pill"
          theme="filled_blue"
          text="continue_with"
        />
      </div>

      <p 
        style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.875rem' }} 
        onClick={toggleMode}
      >
        {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
      </p>
    </div>
  );
};

export default AuthForm;
