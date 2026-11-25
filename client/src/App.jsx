import { useState, useEffect } from 'react';

const API_URL = 'https://campus-issue-tracker-server.vercel.app';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  // Issue states
  const [issueData, setIssueData] = useState({ title: '', description: '', category: 'Electrical', location: '' });
  const [issueMsg, setIssueMsg] = useState('');
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      fetchIssues();
    }
  }, []);

  const fetchIssues = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/issues`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setIssues(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Loading...');

    const url = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(`✅ Success: ${data.message}`);
        
        if (isLogin) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          fetchIssues();
        } else {
          setIsLogin(true);
          setMessage('Registration successful! Please login.');
          setFormData({ ...formData, password: '' }); 
        }
      } else {
        setMessage(`❌ Error: ${data.error || 'Something went wrong'}`);
      }
    } catch (err) {
      setMessage('❌ Server error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMessage('');
    setIssueMsg('');
    setIssues([]);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIssueMsg('Submitting...');
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/issues`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(issueData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setIssueMsg('✅ Issue reported successfully!');
        setIssueData({ title: '', description: '', category: 'Electrical', location: '' });
        fetchIssues();
      } else {
        setIssueMsg(`❌ ${data.error}`);
      }
    } catch (err) {
      setIssueMsg('❌ Server error');
    }
  };

  const handleResolve = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'in_progress' : currentStatus === 'in_progress' ? 'resolved' : 'open';
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- DASHBOARD VIEW (If logged in) ---
  if (user) {
    return (
      <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
          <h2>Welcome, {user.name} {user.role === 'admin' && '(Admin)'}</h2>
          <button onClick={handleLogout} style={{ padding: '5px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        
        {user.role === 'student' && (
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <h3>Report a Campus Issue</h3>
            
            <form onSubmit={handleIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <input name="title" placeholder="Issue Title" value={issueData.title} onChange={(e) => setIssueData({...issueData, title: e.target.value})} required style={{ padding: '8px' }} />
              
              <select name="category" value={issueData.category} onChange={(e) => setIssueData({...issueData, category: e.target.value})} style={{ padding: '8px' }}>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Wi-Fi">Wi-Fi</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="Other">Other</option>
              </select>

              <input name="location" placeholder="Location (e.g., Hostel Room 12)" value={issueData.location} onChange={(e) => setIssueData({...issueData, location: e.target.value})} required style={{ padding: '8px' }} />
              
              <textarea name="description" placeholder="Describe the issue..." value={issueData.description} onChange={(e) => setIssueData({...issueData, description: e.target.value})} required style={{ padding: '8px', minHeight: '80px' }} />
              
              <button type="submit" style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Submit Issue
              </button>
            </form>
            
            <p style={{ color: issueMsg.startsWith('✅') ? 'green' : 'red', marginTop: '15px' }}>{issueMsg}</p>
          </div>
        )}

        <div style={{ marginTop: '40px' }}>
          <h3>{user.role === 'admin' ? 'All Campus Issues' : 'Your Reported Issues'}</h3>
          {issues.length === 0 ? (
            <p>No issues reported yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {issues.map(issue => (
                <li key={issue.id} style={{ backgroundColor: 'white', padding: '15px', marginBottom: '10px', borderRadius: '5px', borderLeft: `5px solid ${issue.status === 'resolved' ? '#10b981' : issue.status === 'in_progress' ? '#f59e0b' : '#2563eb'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{issue.title} {issue.student_name && <span style={{fontSize: '12px', color: 'gray'}}> (by {issue.student_name})</span>}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>
                    <strong>Location:</strong> {issue.location} | <strong>Category:</strong> {issue.category}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>
                      Status: <strong style={{ color: issue.status === 'resolved' ? '#10b981' : issue.status === 'in_progress' ? '#f59e0b' : '#2563eb', textTransform: 'capitalize' }}>{issue.status.replace('_', ' ')}</strong>
                    </p>
                    {user.role === 'admin' && (
                      <button onClick={() => handleResolve(issue.id, issue.status)} style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Change Status
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // --- LOGIN/REGISTER VIEW ---
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isLogin && (
          <input name="name" placeholder="Name" onChange={handleChange} required style={{ padding: '8px' }} />
        )}
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required style={{ padding: '8px' }} />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required style={{ padding: '8px' }} />
        
        <button type="submit" style={{ padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <p style={{ color: message.startsWith('✅') ? 'green' : 'red', marginTop: '15px' }}>
        {message}
      </p>

      <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  );
}

export default App;