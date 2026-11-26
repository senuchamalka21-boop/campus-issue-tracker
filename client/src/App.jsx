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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'report', 'users'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'open', 'in_progress', 'resolved'
  const [usersList, setUsersList] = useState([]);

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
        setActiveTab('dashboard'); // Go back to dashboard after submit
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
    // Filter issues based on the stat card clicked
    const filteredIssues = issues.filter(issue => filterStatus === 'all' ? true : issue.status === filterStatus);

    return (
      <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <span className="text-2xl">🏫</span>
            <h1 className="text-xl font-bold text-white tracking-wide">CampusTracker</h1>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-2">Main Menu</p>
            <button onClick={() => { setActiveTab('dashboard'); setFilterStatus('all'); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
              <span>📊</span> Dashboard
            </button>

            {/* Only students see the Report button in the menu */}
            {user.role === 'student' && (
              <button onClick={() => { setActiveTab('report'); setEditingIssue(null); setIssueData({ title: '', description: '', category: 'Electrical', location: '' }); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                <span>➕</span> Report Issue
              </button>
            )}

            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                <span>👥</span> Manage Users
              </button>
            )}
          </div>

          <div className="p-4 border-t border-slate-800">
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
          
          {/* TAB: DASHBOARD (ISSUES LIST + STATS) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto animate-slide-up">
              
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]} 👋</h2>
                  <p className="text-slate-500 mt-1">Here is what's happening on campus today.</p>
                </div>
                {user.role === 'student' && (
                  <button onClick={() => setActiveTab('report')} className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm items-center gap-2">
                    <span>➕</span> New Issue
                  </button>
                )}
              </div>

              {/* STATS CARDS (Clickable Filters) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <button onClick={() => setFilterStatus('all')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'all' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Issues</p>
                  <p className="text-3xl font-bold text-slate-800">{issues.length}</p>
                </button>
                <button onClick={() => setFilterStatus('open')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'open' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className="text-sm font-medium text-slate-500 mb-1">Open</p>
                  <p className="text-3xl font-bold text-blue-600">{issues.filter(i => i.status === 'open').length}</p>
                </button>
                <button onClick={() => setFilterStatus('in_progress')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'in_progress' ? 'border-amber-500 bg-amber-50' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className="text-sm font-medium text-slate-500 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-amber-500">{issues.filter(i => i.status === 'in_progress').length}</p>
                </button>
                <button onClick={() => setFilterStatus('resolved')} className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${filterStatus === 'resolved' ? 'border-green-500 bg-green-50' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}>
                  <p className="text-sm font-medium text-slate-500 mb-1">Resolved</p>
                  <p className="text-3xl font-bold text-green-500">{issues.filter(i => i.status === 'resolved').length}</p>
                </button>
              </div>

              {/* ISSUES LIST */}
              <h3 className="text-xl font-bold mb-4">
                {filterStatus === 'all' ? 'All Issues' : filterStatus === 'open' ? 'Open Issues' : filterStatus === 'in_progress' ? 'Issues in Progress' : 'Resolved Issues'}
              </h3>
              
              {filteredIssues.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                  <p className="text-4xl mb-3">✨</p>
                  <p className="text-slate-500 font-medium text-lg">No issues found here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredIssues.map(issue => (
                    <div key={issue.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-md hover:border-slate-300 group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{issue.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider
                              ${issue.status === 'resolved' ? 'bg-green-100 text-green-700' : issue.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mb-3 flex items-center gap-4">
                            {issue.student_name && <span className="flex items-center gap-1">👤 {issue.student_name}</span>}
                            <span className="flex items-center gap-1">📍 {issue.location}</span>
                            <span className="flex items-center gap-1">🏷️ {issue.category}</span>
                          </p>
                          <p className="text-slate-600 text-sm">{issue.description}</p>
                          
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
                              <button onClick={() => startEdit(issue)} className="text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">Edit</button>
                            )}
                            {(user.role === 'admin' || issue.status === 'resolved') && (
                              <button onClick={() => handleDeleteIssue(issue.id)} className="text-xs font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">Delete</button>
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
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-slide-up">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-bold">{editingIssue ? 'Edit Issue Details' : 'Report a New Issue'}</h2>
                <p className="text-slate-500 text-sm mt-1">Please provide as much detail as possible.</p>
              </div>

              <form onSubmit={handleIssueSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Title</label>
                  <input type="text" name="title" placeholder="E.g., Broken fan in Room 12" value={issueData.title} onChange={(e) => setIssueData({...issueData, title: e.target.value})} required className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select name="category" value={issueData.category} onChange={(e) => setIssueData({...issueData, category: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white">
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Wi-Fi">Wi-Fi / Network</option>
                      <option value="Cleanliness">Cleanliness</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input type="text" name="location" placeholder="E.g., Hostel Room 12" value={issueData.location} onChange={(e) => setIssueData({...issueData, location: e.target.value})} required className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea name="description" placeholder="Describe the issue in detail..." value={issueData.description} onChange={(e) => setIssueData({...issueData, description: e.target.value})} required className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px] resize-y" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attach Photo (Optional)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <p className="text-slate-500 text-sm"><span className="text-blue-600 font-medium">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">{imageFile ? imageFile.name : 'PNG, JPG up to 5MB'}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setActiveTab('dashboard')} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-lg transition-all">Cancel</button>
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
                <h2 className="text-3xl font-bold text-slate-800">User Management</h2>
                <p className="text-slate-500 mt-1">Manage student accounts, promote to admin, or delete accounts.</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                      <th className="p-5 font-medium">User</th>
                      <th className="p-5 font-medium">Role</th>
                      <th className="p-5 font-medium">Joined</th>
                      <th className="p-5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">{u.name.charAt(0)}</div>
                            <div>
                              <p className="font-medium text-slate-800">{u.name} {u.id === user.id && <span className="text-xs text-blue-500 font-normal">(You)</span>}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-5 text-sm text-slate-500">
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
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
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