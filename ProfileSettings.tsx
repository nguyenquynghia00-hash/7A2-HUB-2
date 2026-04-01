import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType, createAdminAccount } from '../firebase';
import { Camera, User, Phone, BookOpen, GraduationCap, Calendar, Info, Shield, Globe, Cpu, Loader2, CheckCircle2, AlertCircle, Sparkles, Download, Smartphone, Monitor, Key, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ProfileSettings() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [backupUsername, setBackupUsername] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await updateDoc(doc(db, 'users', user.uid), profile);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      
      // Dispatch event to update navbar/other components
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: {
          displayName: profile.displayName,
          photoURL: profile.photoURL
        }
      }));
    } catch (error) {
      setSaveStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      setSaving(true);
      try {
        const file = e.target.files[0];
        const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setProfile({ ...profile, photoURL: url });
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        
        window.dispatchEvent(new CustomEvent('profile-updated', {
          detail: {
            displayName: profile.displayName,
            photoURL: url
          }
        }));
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        setSaveStatus('error');
        console.error('Error uploading avatar:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupUsername || !backupPassword) return;
    setCreatingBackup(true);
    setBackupStatus('idle');
    try {
      await createAdminAccount(profile.displayName, backupUsername, backupPassword);
      setBackupStatus('success');
      setBackupUsername('');
      setBackupPassword('');
      setTimeout(() => setBackupStatus('idle'), 5000);
    } catch (error) {
      setBackupStatus('error');
      console.error('Error creating backup account:', error);
    } finally {
      setCreatingBackup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const webInfo = [
    { label: 'Phiên bản ứng dụng', value: '3.2.5 (Stable)', icon: Info, status: 'Mới nhất' },
    { label: 'Môi trường vận hành', value: 'Production (Cloud Run)', icon: Globe, status: 'Hoạt động' },
    { label: 'Nền tảng phát triển', value: 'React 18 + Vite 5', icon: Cpu, status: 'Tối ưu' },
    { label: 'Cơ sở dữ liệu', value: 'Firebase Firestore', icon: Shield, status: 'Bảo mật' },
    { label: 'Lần cập nhật cuối', value: '20/03/2026 13:33', icon: Calendar, status: 'Đã đồng bộ' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 mb-2">
        <div>
          <h2 className="text-xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">Cài đặt tài khoản</h2>
          <p className="text-[10px] sm:text-sm text-slate-500 font-medium mt-1 sm:mt-2">Cá nhân hóa hồ sơ và xem thông tin hệ thống của bạn.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 bg-indigo-50 px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-2xl border border-indigo-100 self-start md:self-auto">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] sm:text-xs font-black text-indigo-700 uppercase tracking-wider">Hệ thống trực tuyến</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-slate-200/60"
          >
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-900">Thông tin cá nhân</h3>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    placeholder="Nhập họ tên" 
                    value={profile?.displayName || ''} 
                    onChange={e => setProfile({...profile, displayName: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium" 
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input 
                    type="text" 
                    placeholder="Nhập số điện thoại" 
                    value={profile?.phone || ''} 
                    onChange={e => setProfile({...profile, phone: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium" 
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Trường học</label>
                  <input 
                    type="text" 
                    placeholder="Tên trường" 
                    value={profile?.school || ''} 
                    onChange={e => setProfile({...profile, school: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium" 
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Lớp học</label>
                  <input 
                    type="text" 
                    placeholder="Tên lớp" 
                    value={profile?.class || ''} 
                    onChange={e => setProfile({...profile, class: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium" 
                  />
                </div>

                <div className="md:col-span-2 space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ngày sinh (Ngày / Tháng / Năm)</label>
                  <div className="flex gap-2 sm:gap-3">
                    <input 
                      type="number" placeholder="Ngày" min="1" max="31"
                      value={profile?.dobDay || ''} 
                      onChange={e => setProfile({...profile, dobDay: e.target.value})} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                    <input 
                      type="number" placeholder="Tháng" min="1" max="12"
                      value={profile?.dobMonth || ''} 
                      onChange={e => setProfile({...profile, dobMonth: e.target.value})} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                    <input 
                      type="number" placeholder="Năm" min="1900" max="2026"
                      value={profile?.dobYear || ''} 
                      onChange={e => setProfile({...profile, dobYear: e.target.value})} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tiểu sử</label>
                  <textarea 
                    placeholder="Giới thiệu về bạn..." 
                    value={profile?.bio || ''} 
                    onChange={e => setProfile({...profile, bio: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none h-16 sm:h-28 resize-none leading-relaxed font-medium" 
                  />
                </div>
              </div>
              
              <div className="pt-2 sm:pt-4 flex items-center gap-2 sm:gap-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-slate-900 text-white py-2.5 sm:py-4 rounded-lg sm:rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-spin" /> : null}
                  {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                </button>
                
                <AnimatePresence>
                  {saveStatus === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                    </motion.div>
                  )}
                  {saveStatus === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="w-9 h-9 sm:w-12 sm:h-12 bg-rose-100 text-rose-600 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>

          {/* Admin Backup Account Section */}
          {profile?.role === 'admin' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl sm:rounded-[2.5rem] p-3 sm:p-8 shadow-sm border border-slate-200/60"
            >
              <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-8">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-xl font-black text-slate-900">Tài khoản dự phòng (Admin)</h3>
                  <p className="text-[9px] sm:text-xs text-slate-500 font-medium">Tạo tài khoản để đăng nhập khi không dùng được Google.</p>
                </div>
              </div>

              <form onSubmit={handleCreateBackup} className="space-y-2 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-6">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập mới</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: admin_nghia" 
                      value={backupUsername} 
                      onChange={e => setBackupUsername(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-2.5 sm:px-5 py-1.5 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none font-medium" 
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <input 
                      type="password" 
                      placeholder="Nhập mật khẩu" 
                      value={backupPassword} 
                      onChange={e => setBackupPassword(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-2xl px-2.5 sm:px-5 py-1.5 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none font-medium" 
                    />
                  </div>
                </div>
                
                <div className="pt-1.5 sm:pt-4 flex items-center gap-2 sm:gap-4">
                  <button 
                    type="submit" 
                    disabled={creatingBackup || !backupUsername || !backupPassword}
                    className="flex-1 bg-rose-600 text-white py-2 sm:py-4 rounded-lg sm:rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-base"
                  >
                    {creatingBackup ? <Loader2 className="w-3 h-3 sm:w-5 sm:h-5 animate-spin" /> : <Lock className="w-3 h-3 sm:w-5 sm:h-5" />}
                    {creatingBackup ? 'Đang tạo...' : 'Tạo tài khoản dự phòng'}
                  </button>
                  
                  <AnimatePresence>
                    {backupStatus === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="bg-emerald-100 text-emerald-600 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-2xl flex items-center gap-1 sm:gap-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="text-[8px] sm:text-xs font-bold">Thành công!</span>
                      </motion.div>
                    )}
                    {backupStatus === 'error' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="bg-rose-100 text-rose-600 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-2xl flex items-center gap-1 sm:gap-2 shadow-sm"
                      >
                        <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="text-[8px] sm:text-xs font-bold">Lỗi!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview & Avatar */}
        <div className="space-y-3 sm:space-y-8">
          {/* Avatar Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl sm:rounded-[2.5rem] p-3 sm:p-8 shadow-sm border border-slate-200/60 text-center"
          >
            <div className="relative inline-block group">
              <div className="w-16 h-16 sm:w-32 sm:h-32 rounded-xl sm:rounded-[2.5rem] overflow-hidden border-2 sm:border-4 border-white shadow-2xl bg-slate-100 relative">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'User')}&background=random`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" 
                />
                {saving && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="text-white animate-spin w-4 h-4 sm:w-8 sm:h-8" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-3 bg-indigo-600 text-white rounded-lg sm:rounded-2xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 z-10">
                <Camera className="w-3 h-3 sm:w-5 sm:h-5" />
                <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
              </label>
            </div>
            <h4 className="mt-2 sm:mt-6 font-black text-sm sm:text-xl text-slate-900">{profile?.displayName || 'Chưa đặt tên'}</h4>
            <p className="text-slate-500 text-[9px] sm:text-sm font-medium mt-0.5 sm:mt-1">{profile?.class || 'Lớp học'} • {profile?.school || 'Trường học'}</p>
          </motion.div>

          {/* Quick Stats / Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-indigo-600 rounded-xl sm:rounded-[2.5rem] p-3 sm:p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden"
          >
            <div className="absolute -right-10 -bottom-10 w-16 h-16 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h4 className="font-black text-xs sm:text-lg mb-1.5 sm:mb-4 flex items-center gap-1 sm:gap-2">
              <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-amber-300" />
              Trạng thái hồ sơ
            </h4>
            <div className="space-y-1.5 sm:space-y-4">
              <div className="flex justify-between items-center text-[9px] sm:text-sm">
                <span className="opacity-70">Độ hoàn thiện:</span>
                <span className="font-black">85%</span>
              </div>
              <div className="w-full h-1 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-amber-300 rounded-full"></div>
              </div>
              <p className="text-[8px] sm:text-[10px] opacity-60 leading-relaxed italic">
                Cập nhật đầy đủ thông tin giúp bạn kết nối tốt hơn với các thành viên khác trong lớp.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Web Information Table Section */}
      {/* Install App Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden mb-6 sm:mb-8"
      >
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Download className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">Tải ứng dụng về máy</h3>
              <p className="text-[10px] sm:text-sm text-slate-500 font-medium">Cài đặt để truy cập nhanh từ màn hình chính.</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          <div className="p-3 sm:p-6 rounded-xl sm:rounded-3xl bg-slate-50 border border-slate-100 space-y-2 sm:space-y-4">
            <div className="flex items-center gap-1.5 sm:gap-3 text-indigo-600">
              <Smartphone className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              <h4 className="font-black text-[10px] sm:text-sm uppercase tracking-wider">Android / Chrome</h4>
            </div>
            <ul className="text-[10px] sm:text-xs text-slate-600 space-y-1 sm:space-y-2 font-medium">
              <li className="flex gap-1.5 sm:gap-2"><span>1.</span> Mở trang web bằng Chrome.</li>
              <li className="flex gap-1.5 sm:gap-2"><span>2.</span> Nhấn vào dấu 3 chấm (⋮).</li>
              <li className="flex gap-1.5 sm:gap-2"><span>3.</span> Chọn "Cài đặt ứng dụng".</li>
            </ul>
          </div>

          <div className="p-3 sm:p-6 rounded-xl sm:rounded-3xl bg-slate-50 border border-slate-100 space-y-2 sm:space-y-4">
            <div className="flex items-center gap-1.5 sm:gap-3 text-indigo-600">
              <Smartphone className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              <h4 className="font-black text-[10px] sm:text-sm uppercase tracking-wider">iPhone / Safari</h4>
            </div>
            <ul className="text-[10px] sm:text-xs text-slate-600 space-y-1 sm:space-y-2 font-medium">
              <li className="flex gap-1.5 sm:gap-2"><span>1.</span> Mở trang web bằng Safari.</li>
              <li className="flex gap-1.5 sm:gap-2"><span>2.</span> Nhấn vào biểu tượng Chia sẻ (↑).</li>
              <li className="flex gap-1.5 sm:gap-2"><span>3.</span> Chọn "Thêm vào MH chính".</li>
            </ul>
          </div>

          <div className="p-3 sm:p-6 rounded-xl sm:rounded-3xl bg-slate-50 border border-slate-100 space-y-2 sm:space-y-4">
            <div className="flex items-center gap-1.5 sm:gap-3 text-indigo-600">
              <Monitor className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              <h4 className="font-black text-[10px] sm:text-sm uppercase tracking-wider">Máy tính (PC)</h4>
            </div>
            <ul className="text-[10px] sm:text-xs text-slate-600 space-y-1 sm:space-y-2 font-medium">
              <li className="flex gap-1.5 sm:gap-2"><span>1.</span> Mở bằng Chrome hoặc Edge.</li>
              <li className="flex gap-1.5 sm:gap-2"><span>2.</span> Nhìn lên thanh địa chỉ (URL).</li>
              <li className="flex gap-1.5 sm:gap-2"><span>3.</span> Nhấn vào biểu tượng "Cài đặt" (⊕).</li>
            </ul>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden"
      >
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-900 text-white rounded-lg sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <Globe className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black text-slate-900">Thông tin phiên bản Web</h3>
              <p className="text-[8px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Chi tiết kỹ thuật hệ thống</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              v3.2.5 Stable
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[300px] sm:min-w-[400px]">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-3 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thông tin</th>
                <th className="px-3 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Giá trị</th>
                <th className="px-3 sm:px-8 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {webInfo.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-3 sm:px-8 py-2 sm:py-5">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                        <item.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-[10px] sm:text-sm font-bold text-slate-700">{item.label}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-2 sm:py-5">
                    <span className="text-[10px] sm:text-sm font-black text-slate-900">{item.value}</span>
                  </td>
                  <td className="px-3 sm:px-8 py-2 sm:py-5 text-right">
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-black uppercase tracking-tighter">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
            <div className="w-5 h-5 sm:w-8 sm:h-8 bg-white/10 rounded-md sm:rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-300" />
            </div>
            <p className="text-[8px] sm:text-xs font-medium text-slate-400">Dữ liệu của bạn được bảo mật bởi Firebase Security Rules.</p>
          </div>
          <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">© 2026 Lớp 7A2 Hub</p>
        </div>
      </motion.div>
    </div>
  );
}
