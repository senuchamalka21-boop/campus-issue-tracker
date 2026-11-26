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
  const [editingIssue, setEditingIssue] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [usersList, setUsersList] = useState([]);
  
  // New States: Dark Mode, Search, and Sort
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchIssues();
      if (parsedUser.role === 'admin') fetchUsers();
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
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsersList(data);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
          if (data.user.role === 'admin') fetchUsers();
        } else {
          setIsLogin(true);
          setMessage('Registration successful! Please login.');
          setFormData({ ...formData, password: '' }); 
        }
      } else {
        setMessage(`❌ Error: ${data.error || 'Something went wrong'}`);
      }
    } catch (err) { setMessage('❌ Server error'); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setMessage('');
    setIssueMsg('');
    setIssues([]);
    setUsersList([]);
    setEditingIssue(null);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIssueMsg('Submitting...');
    setIsUploading(true);
    let imageUrl = editingIssue ? editingIssue.image_url : null;

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const cloudData = await cloudRes.json();
        if (cloudData.secure_url) imageUrl = cloudData.secure_url;
      }

      const token = localStorage.getItem('token');
      const url = editingIssue ? `${API_URL}/api/issues/${editingIssue.id}` : `${API_URL}/api/issues`;
      const res = await fetch(url, {
        method: editingIssue ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...issueData, image_url: imageUrl })
      });
      
      if (res.ok) {
        setIssueMsg(`✅ Issue ${editingIssue ? 'updated' : 'reported'} successfully!`);
        setIssueData({ title: '', description: '', category: 'Electrical', location: '' });
        setImageFile(null);
        setEditingIssue(null);
        setActiveTab('dashboard');
        fetchIssues();
      } else {
        const data = await res.json();
        setIssueMsg(`❌ ${data.error}`);
      }
    } catch (err) { setIssueMsg('❌ Server error'); } 
    finally { setIsUploading(false); }
  };

  const handleResolve = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'in_progress' : currentStatus === 'in_progress' ? 'resolved' : 'open';
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/issues/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) fetchIssues();
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm("Delete this issue?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/issues/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) fetchIssues();
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user and all their data?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { fetchUsers(); fetchIssues(); } else { const d = await res.json(); alert(d.error); }
  };

  const handlePromoteUser = async (id) => {
    if (!window.confirm("Promote to Admin?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/admin/users/${id}/promote`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) fetchUsers();
  };

  const startEdit = (issue) => {
    setEditingIssue(issue);
    setIssueData({ title: issue.title, description: issue.description, category: issue.category, location: issue.location });
    setActiveTab('report');
  };

  // --- MAIN DASHBOARD LAYOUT ---
  if (user) {
    // Apply Search, Filter, and Sort
    let processedIssues = issues.filter(issue => filterStatus === 'all' ? true : issue.status === filterStatus);
    
    if (searchQuery) {
      processedIssues = processedIssues.filter(i => 
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    processedIssues.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const themeClass = isDarkMode ? 'dark' : '';

    return (
      <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
        
        {/* SIDEBAR NAVIGATION */}
        <aside className={`w-full md:w-64 flex flex-col shadow-xl z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-slate-900 text-slate-300'}`}>
          <div className={`p-6 flex items-center justify-between border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-800'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏫</span>
              <h1 className="text-xl font-bold text-white tracking-wide">CampusTracker</h1>
            </div>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-2">Main Menu</p>
            <button onClick={() => { setActiveTab('dashboard'); setFilterStatus('all'); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <span>📊</span> Dashboard
            </button>

            {user.role === 'student' && (
              <button onClick={() => { setActiveTab('report'); setEditingIssue(null); setIssueData({ title: '', description: '', category: 'Electrical', location: '' }); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-md' : isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <span>➕</span> Report Issue
              </button>
            )}

            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <span>👥</span> Manage Users
              </button>
            )}

            <div className="mt-auto pt-6">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
                <span className="flex items-center gap-3">{isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
              </button>
            </div>
          </div>

          <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-800'}`}>
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600 text-white py-2 rounded-lg transition-colors duration-200">
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
          
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto animate-slide-up">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Welcome back, {user.name.split(' ')[0]} 👋</h2>
                  <p className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Here is what's happening on campus today.</p>
                </div>
                
                {/* Search and Sort Controls */}
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <input 
                    type="text" 
                    placeholder="🔍 Search issues..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`px-4 py-2 rounded-lg border outline-none transition-all w-full md:w-64 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                  />
                  <select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`px-4 py-2 rounded-lg border outline-none transition-all cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* STATS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <button onClick={() => setFilterStatus('all')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'all' ? 'border-blue-500 ' + (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Issues</p>
                  <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{issues.length}</p>
                </button>
                <button onClick={() => setFilterStatus('open')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'open' ? 'border-blue-500 ' + (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Open</p>
                  <p className="text-3xl font-bold text-blue-500">{issues.filter(i => i.status === 'open').length}</p>
                </button>
                <button onClick={() => setFilterStatus('in_progress')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'in_progress' ? 'border-amber-500 ' + (isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50') : isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Progress</p>
                  <p className="text-3xl font-bold text-amber-500">{issues.filter(i => i.status === 'in_progress').length}</p>
                </button>
                <button onClick={() => setFilterStatus('resolved')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'resolved' ? 'border-green-500 ' + (isDarkMode ? 'bg-green-900/30' : 'bg-green-50') : isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Resolved</p>
                  <p className="text-3xl font-bold text-green-500">{issues.filter(i => i.status === 'resolved').length}</p>
                </button>
              </div>

              {/* ISSUES LIST */}
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {filterStatus === 'all' ? 'All Issues' : filterStatus === 'open' ? 'Open Issues' : filterStatus === 'in_progress' ? 'Issues in Progress' : 'Resolved Issues'}
              </h3>
              
              {processedIssues.length === 0 ? (
                <div className={`text-center py-20 rounded-xl border border-dashed ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className="text-4xl mb-3">✨</p>
                  <p className={`font-medium text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No issues found here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {processedIssues.map(issue => (
                    <div key={issue.id} className={`p-6 rounded-xl shadow-sm border transition-all duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`font-bold text-lg transition-colors ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{issue.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider
                              ${issue.status === 'resolved' ? 'bg-green-100 text-green-700' : issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className={`text-sm mb-3 flex items-center gap-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {issue.student_name && <span className="flex items-center gap-1">👤 {issue.student_name}</span>}
                            <span className="flex items-center gap-1">📍 {issue.location}</span>
                            <span className="flex items-center gap-1">🏷️ {issue.category}</span>
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{issue.description}</p>
                          
                          {issue.image_url && (
                            <div className="mt-4">
                              <img src={issue.image_url} alt="Attachment" className="h-32 rounded-lg object-cover border border-slate-200" />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {user.role === 'admin' && (
                            <button onClick={() => handleResolve(issue.id, issue.status)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium py-2 px-4 rounded-lg transition-all">
                              Mark {issue.status === 'open' ? 'In Progress' : issue.status === 'in_progress' ? 'Resolved' : 'Open'}
                            </button>
                          )}
                          <div className="flex gap-2 justify-end">
                            {issue.status !== 'resolved' && (
                              <button onClick={() => startEdit(issue)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>Edit</button>
                            )}
                            {(user.role === 'admin' || issue.status === 'resolved') && (
                              <button onClick={() => handleDeleteIssue(issue.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-red-900 hover:text-red-400' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'}`}>Delete</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: REPORT ISSUE FORM */}
          {activeTab === 'report' && (user.role === 'student' || editingIssue) && (
            <div className={`max-w-2xl mx-auto p-8 rounded-2xl shadow-sm border animate-slide-up ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`mb-6 border-b pb-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{editingIssue ? 'Edit Issue Details' : 'Report a New Issue'}</h2>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Please provide as much detail as possible.</p>
              </div>

              <form onSubmit={handleIssueSubmit} className="flex flex-col gap-5">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Issue Title</label>
                  <input type="text" name="title" placeholder="E.g., Broken fan in Room 12" value={issueData.title} onChange={(e) => setIssueData({...issueData, title: e.target.value})} required className={`w-full border rounded-lg p-3 outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                    <select name="category" value={issueData.category} onChange={(e) => setIssueData({...issueData, category: e.target.value})} className={`w-full border rounded-lg p-3 outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'}`}>
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Wi-Fi">Wi-Fi / Network</option>
                      <option value="Cleanliness">Cleanliness</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Location</label>
                    <input type="text" name="location" placeholder="E.g., Hostel Room 12" value={issueData.location} onChange={(e) => setIssueData({...issueData, location: e.target.value})} required className={`w-full border rounded-lg p-3 outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
                  <textarea name="description" placeholder="Describe the issue in detail..." value={issueData.description} onChange={(e) => setIssueData({...issueData, description: e.target.value})} required className={`w-full border rounded-lg p-3 outline-none transition-all min-h-[120px] resize-y ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Attach Photo (Optional)</label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative ${isDarkMode ? 'border-slate-600 hover:bg-slate-700/50' : 'border-slate-300 hover:bg-slate-50'}`}>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><span className="text-blue-500 font-medium">Click to upload</span> or drag and drop</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{imageFile ? imageFile.name : 'PNG, JPG up to 5MB'}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setActiveTab('dashboard')} className={`w-1/3 font-medium py-3 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Cancel</button>
                  <button type="submit" disabled={isUploading} className="w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition-all shadow-md hover:shadow-lg">
                    {isUploading ? 'Uploading...' : editingIssue ? 'Save Changes' : 'Submit Issue'}
                  </button>
                </div>
                {issueMsg && <p className={`text-center text-sm font-medium mt-2 ${issueMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{issueMsg}</p>}
              </form>
            </div>
          )}

          {/* TAB: MANAGE USERS (ADMIN ONLY) */}
          {activeTab === 'users' && user.role === 'admin' && (
            <div className="max-w-5xl mx-auto animate-slide-up">
               <div className="mb-8">
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>User Management</h2>
                <p className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage student accounts, promote to admin, or delete accounts.</p>
              </div>

              <div className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <th className="p-5 font-medium">User</th>
                      <th className="p-5 font-medium">Role</th>
                      <th className="p-5 font-medium">Joined</th>
                      <th className="p-5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} className={`border-b last:border-0 transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>{u.name.charAt(0)}</div>
                            <div>
                              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{u.name} {u.id === user.id && <span className="text-xs text-blue-500 font-normal">(You)</span>}</p>
                              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className={`p-5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex gap-2 justify-end">
                            {u.role === 'student' && (
                              <button onClick={() => handlePromoteUser(u.id)} className="text-xs font-medium text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-purple-200">
                                Make Admin
                              </button>
                            )}
                            {u.id !== user.id && (
                              <button onClick={() => handleDeleteUser(u.id)} className="text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-200">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    );
  }

  // --- LOGIN/REGISTER VIEW ---
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 animate-slide-up relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50 rotate-3 transition-transform hover:rotate-12">
            <span className="text-3xl text-white">🏫</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-slate-400 text-sm">Campus Issue Tracker Portal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input name="name" placeholder="John Doe" onChange={handleChange} required className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input name="email" type="email" placeholder="student@campus.edu" onChange={handleChange} required className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
          </div>
          
          <button type="submit" className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-95 w-full">
            {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-3 rounded-lg text-center text-sm font-medium bg-slate-800/80 border ${message.startsWith('✅') ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
            {message}
          </div>
        )}

        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-blue-400 font-medium hover:underline">{isLogin ? 'Sign up' : 'Sign in'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;