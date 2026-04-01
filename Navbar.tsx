import React, { useState, useEffect, useRef } from 'react';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, User as UserIcon, Sparkles, Bell, CheckCircle, X, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VipRedeem } from './VipRedeem';
import { MaintenanceToggle } from './MaintenanceToggle';

export const Navbar: React.FC = () => {
  const [user] = useAuthState(auth);
  const [localProfile, setLocalProfile] = useState({
    displayName: '',
    photoURL: '',
    isVip: false,
    role: 'student',
    vipExpiresAt: null as string | null,
    vipCourseId: ''
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVipRedeem, setShowVipRedeem] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'user_notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'user_notifications'));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'user_notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
  };

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setLocalProfile({
            displayName: data.displayName || user.displayName || '',
            photoURL: data.photoURL || user.photoURL || '',
            isVip: !!data.isVip,
            role: data.role || 'student',
            vipExpiresAt: data.vipExpiresAt || null,
            vipCourseId: data.vipCourseId || ''
          });
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLocalProfile(prev => ({
        ...prev,
        displayName: customEvent.detail.displayName,
        photoURL: customEvent.detail.photoURL
      }));
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-20 items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-lg shadow-indigo-200 transform rotate-3 hover:rotate-0 transition-all cursor-pointer border-2 border-white">
              <img src="https://ais-pre-jero3ppv3dobqhl6dhx3un-341941663870.asia-southeast1.run.app/" alt="Logo 7A2" className="w-full h-full object-cover" onError={(e) => {
                // Fallback if image not uploaded yet
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">7A</div>';
              }} />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight leading-tight">
                THCS Quảng Phú Cầu
              </span>
              <span className="text-[7px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Lớp 7A2 (2025 - 2028)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {localProfile.role === 'admin' && <MaintenanceToggle isAdmin={true} />}
                {!localProfile.isVip && (
                  <button
                    onClick={() => setShowVipRedeem(true)}
                    className="hidden md:flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-xs font-black border border-amber-200 hover:bg-amber-200 transition-all shadow-sm"
                  >
                    <Key size={14} />
                    <span>KÍCH HOẠT VIP</span>
                  </button>
                )}
                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <Bell size={24} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <h3 className="font-bold text-slate-900">Thông báo</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Đánh dấu đã đọc
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-sm">Chưa có thông báo nào</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-50">
                              {notifications.map((notif) => (
                                <div 
                                  key={notif.id} 
                                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                                  onClick={() => markAsRead(notif.id)}
                                >
                                  <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                      <CheckCircle size={16} />
                                    </div>
                                    <div>
                                      <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                        {notif.title}
                                      </h4>
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{notif.message}</p>
                                      <span className="text-[10px] text-slate-400 mt-2 block">
                                        {notif.createdAt ? notif.createdAt.toDate().toLocaleString('vi-VN') : 'Vừa xong'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-1 sm:gap-4 bg-slate-50 p-1 sm:p-2 pr-2 sm:pr-4 rounded-full border border-slate-100 shadow-sm">
                  {localProfile.photoURL ? (
                    <img src={localProfile.photoURL} alt="Avatar" className="w-6 h-6 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                      <UserIcon size={14} className="text-indigo-600" />
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 leading-tight">{localProfile.displayName || 'Học sinh'}</span>
                      {localProfile.isVip && (
                        <div 
                          className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5"
                          title={localProfile.vipExpiresAt ? `Hết hạn: ${new Date(localProfile.vipExpiresAt).toLocaleDateString('vi-VN')}` : 'Vĩnh viễn'}
                        >
                          <Sparkles size={8} />
                          <span>VIP {localProfile.vipCourseId && `(${localProfile.vipCourseId})`}</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      localProfile.role === 'admin' || localProfile.role === 'tech'
                        ? 'text-amber-600' 
                        : 'text-indigo-600'
                    }`}>
                      {localProfile.role === 'admin' ? 'Quản trị viên' : localProfile.role === 'tech' ? 'Kỹ thuật viên' : 'Học sinh'}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>
                  <button
                    onClick={() => setShowVipRedeem(true)}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                    title="Kích hoạt VIP bằng mã"
                  >
                    <Key size={16} className="sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={logout}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <VipRedeem isOpen={showVipRedeem} onClose={() => setShowVipRedeem(false)} />
    </nav>
  );
};
