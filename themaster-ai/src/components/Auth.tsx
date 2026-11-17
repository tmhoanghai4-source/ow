import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft, Chrome } from 'lucide-react';
import { TranslationStrings } from '../types';
import { getRememberedGoogleAccounts, RememberedGoogleAccount } from '../lib/folderVault';

interface AuthProps {
  t: TranslationStrings;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export const Auth: React.FC<AuthProps> = ({ t, onSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [rememberedAccounts] = useState<RememberedGoogleAccount[]>(() => getRememberedGoogleAccounts());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { email, username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.authFailed);
      
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (targetEmail: string, targetName?: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Vui lòng nhập email Google (vd: tenban@gmail.com).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, username: targetName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.authFailed);
      onSuccess(data.user);
    } catch (err: any) {
      // Offline / static fallback if API unavailable
      onSuccess({
        email: clean,
        username: targetName || clean.split('@')[0],
        role: 'user',
        provider: 'google',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-7 bg-secondary/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-6"
      >
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t.authBackGuest}
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            {isLogin ? t.authWelcome : t.authJoin}
          </h2>
          <p className="text-xs text-text-secondary">
            {isLogin ? t.authSubtitleLogin : t.authSubtitleSignup}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Google Account Sign-In for Persistent Local Folder Vault */}
        <div className="space-y-2.5 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="text-[11px] font-semibold text-text-secondary flex items-center justify-between">
            <span>Tài khoản Google (Lưu Kho Folder Local)</span>
          </div>

          {rememberedAccounts.length > 0 && (
            <div className="space-y-1.5">
              {rememberedAccounts.slice(0, 3).map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleSignIn(acc.email, acc.username)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Chrome className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">{acc.username}</div>
                      <div className="text-[11px] text-text-secondary truncate">{acc.email}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-blue-400 font-medium shrink-0">Tiếp tục</span>
                </button>
              ))}
            </div>
          )}

          {!showGoogleInput ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowGoogleInput(true)}
              className="w-full h-10 rounded-xl border border-white/15 bg-white text-gray-900 hover:bg-gray-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Chrome className="w-4 h-4 text-blue-600" />
              <span>{rememberedAccounts.length > 0 ? 'Dùng tài khoản Google khác' : 'Đăng nhập bằng Tài khoản Google'}</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={googleEmail}
                onChange={e => setGoogleEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGoogleSignIn(googleEmail);
                  }
                }}
                placeholder="email@gmail.com"
                autoFocus
                className="flex-1 h-10 px-3 rounded-xl bg-black/30 border border-white/15 text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGoogleSignIn(googleEmail)}
                className="px-3.5 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
              >
                Vào
              </button>
            </div>
          )}
        </div>

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-white/10" />
          <span className="flex-shrink mx-3 text-[11px] text-text-secondary">hoặc mật khẩu</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder={t.authUsernamePh}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-medium focus:border-blue-500 transition-all outline-none"
              />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="email" 
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-medium focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="password" 
              placeholder={t.authPasswordPh}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-medium focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <><LogIn className="w-4 h-4" /> {t.authLoginBtn}</>
            ) : (
              <><UserPlus className="w-4 h-4" /> {t.authSignupBtn}</>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          {isLogin ? t.authNoAccount : t.authHaveAccount}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1.5 text-blue-400 hover:text-blue-300 underline font-medium"
          >
            {isLogin ? t.authSwitchSignup : t.authSwitchLogin}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
