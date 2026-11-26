import { useState, useEffect } from 'react';

const API_URL = 'https://campus-issue-tracker-server.vercel.app';
const CLOUDINARY_CLOUD_NAME = 'dl8ro18e';
const CLOUDINARY_UPLOAD_PRESET = 'campus_issues';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  const [issueData, setIssueData] = useState({ title: '', description: '', category: 'Electrical', location: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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
    setIsUploading(true);
    
    let imageUrl = null;

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const cloudinaryData = await cloudinaryRes.json();
        
        if (cloudinaryData.secure_url) {
          imageUrl = cloudinaryData.secure_url;
        } else {
          throw new Error("Image upload failed");
        }
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/issues`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...issueData, image_url: imageUrl })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIssueMsg('✅ Issue reported successfully!');
        setIssueData({ title: '', description: '', category: 'Electrical', location: '' });
        setImageFile(null);
        document.getElementById('image-input').value = '';
        fetchIssues();
      } else {
        setIssueMsg(`❌ ${data.error}`);
      }
    } catch (err) {
      setIssueMsg('❌ Server error or image upload failed');
      console.error(err);
    } finally {
      setIsUploading(false);
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

  // --- DASHBOARD VIEW ---
  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <nav className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2 transition-colors hover:text-blue-800 cursor-default">
              <span>🏫</span> Campus Issue Tracker
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                {user.name} {user.role === 'admin' && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full ml-1 animate-pulse">Admin</span>}
              </span>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium transition-all duration-200 hover:scale-105 active:scale-95">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {user.role === 'student' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 transition-shadow duration-300 hover:shadow-md animate-slide-up">
              <h2 className="text-lg font-bold mb-4">Report a New Issue</h2>
              <form onSubmit={handleIssueSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="title" placeholder="Issue Title" value={issueData.title} onChange={(e) => setIssueData({...issueData, title: e.target.value})} required className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" />
                  <input name="location" placeholder="Location (e.g., Hostel Room 12)" value={issueData.location} onChange={(e) => setIssueData({...issueData, location: e.target.value})} required className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" />
                </div>
                <select name="category" value={issueData.category} onChange={(e) => setIssueData({...issueData, category: e.target.value})} className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200">
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Wi-Fi">Wi-Fi</option>
                  <option value="Cleanliness">Cleanliness</option>
                  <option value="Other">Other</option>
                </select>
                <textarea name="description" placeholder="Describe the issue in detail..." value={issueData.description} onChange={(e) => setIssueData({...issueData, description: e.target.value})} required className="border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px] transition-all duration-200" />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attach a Photo (Optional)</label>
                  <input id="image-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:transition-all file:duration-200 file:cursor-pointer" />
                </div>

                <button type="submit" disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                  {isUploading ? 'Uploading...' : 'Submit Issue'}
                </button>
              </form>
              {issueMsg && <p className={`mt-3 text-sm font-medium animate-slide-up ${issueMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{issueMsg}</p>}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold mb-4">{user.role === 'admin' ? 'All Campus Issues' : 'Your Reported Issues'}</h2>
            {issues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed animate-slide-up">
                <p className="text-slate-500">No issues found. Everything is working perfectly!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {issues.map(issue => (
                  <div key={issue.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 border border-slate-200 transition-all duration-300 hover:shadow-md hover:-translate-y-1 animate-slide-up ${issue.status === 'resolved' ? 'border-l-green-500' : issue.status === 'in_progress' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{issue.title}</h3>
                        <p className="text-sm text-slate-500">
                          {issue.student_name && <span className="mr-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">By {issue.student_name}</span>}
                          <span className="mr-2 font-medium">📍 {issue.location}</span>
                          <span className="font-medium">🏷️ {issue.category}</span>
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-colors duration-300
                        ${issue.status === 'resolved' ? 'bg-green-100 text-green-700' : issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 mt-2">{issue.description}</p>
                    
                    {issue.image_url && (
                      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200">
                        <img src={issue.image_url} alt="Issue attachment" className="max-h-64 object-cover transition-transform duration-500 hover:scale-105" />
                      </div>
                    )}

                    {user.role === 'admin' && (
                      <div className="flex justify-end border-t border-slate-100 pt-3 mt-3">
                        <button onClick={() => handleResolve(issue.id, issue.status)} className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95">
                          Mark as {issue.status === 'open' ? 'In Progress' : issue.status === 'in_progress' ? 'Resolved' : 'Open'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- LOGIN/REGISTER VIEW ---
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md animate-slide-up transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2 animate-bounce">🏫</h1>
          <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-slate-500 text-sm mt-1">Campus Issue Tracker</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="animate-slide-up">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input name="name" placeholder="John Doe" onChange={handleChange} required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input name="email" type="email" placeholder="student@campus.edu" onChange={handleChange} required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" />
          </div>
          
          <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 w-full">
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-center text-sm font-medium animate-slide-up ${message.startsWith('✅') ? 'text-green-600' : message.startsWith('❌') ? 'text-red-600' : 'text-slate-500'}`}>
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;