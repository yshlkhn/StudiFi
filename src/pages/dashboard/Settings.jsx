import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // AI & Study Preferences
  const [studyGoal, setStudyGoal] = useState('5');
  const [aiTone, setAiTone] = useState('concise');

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');
          setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    loadUserData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mr-3"></div>
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto text-white space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your profile, security credentials, and AI study preferences.</p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
              : 'bg-rose-950/40 border-rose-600 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <div className="bg-gray-900/70 border border-gray-800 backdrop-blur rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-lg">
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Personal Information</h2>
              <p className="text-xs text-gray-400">Update your account name and email view</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-gray-800/40 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Email is managed by Supabase Authentication.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                disabled
                className="w-full bg-gray-800/40 border border-gray-800 rounded-xl px-4 py-2 text-xs font-mono text-gray-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="bg-gray-900/70 border border-gray-800 backdrop-blur rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold">
              🔒
            </div>
            <div>
              <h2 className="text-lg font-semibold">Security & Password</h2>
              <p className="text-xs text-gray-400">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-md"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* AI & Study Preferences Card */}
        <div className="lg:col-span-2 bg-gray-900/70 border border-gray-800 backdrop-blur rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Assistant & Study Preferences</h2>
              <p className="text-xs text-gray-400">Configure quiz difficulty and Grok AI interaction tone</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Default Questions per Quiz
              </label>
              <select
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="5">5 Questions (Quick Practice)</option>
                <option value="10">10 Questions (Standard Quiz)</option>
                <option value="15">15 Questions (Deep Evaluation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                AI Explanation Style
              </label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="concise">Concise & Exam-Focused</option>
                <option value="detailed">Detailed with Code / Examples</option>
                <option value="simplified">Simplified / Beginner Friendly</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}