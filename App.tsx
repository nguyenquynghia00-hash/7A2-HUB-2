import React, { useState, useEffect, useRef } from 'react';
import { MemberList } from './components/MemberList';
import { Navbar } from './components/Navbar';
import { PostList } from './components/PostList';
import { ChatRoom } from './components/ChatRoom';
import { HomeworkTracker } from './components/HomeworkTracker';
import { Store } from './components/Store';
import { ExamSystem } from './components/ExamSystem';
import { ProfileSettings as Settings } from './components/ProfileSettings';
import { UploadModal } from './components/UploadModal';
import { MemberManagement } from './components/MemberManagement';
import { Courses } from './components/Courses';
import { MonthlyEvaluations } from './components/MonthlyEvaluations';
import { db, auth, loginWithGoogle, loginAsGuest, loginWithEmail, handleFirestoreError, OperationType } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { socket } from './socket';
import { Plus, MessageSquare, Layout, Sparkles, GraduationCap, Settings as SettingsIcon, ClipboardList, ShoppingBag, Bell, X as CloseIcon, Users, MousePointer2, PhoneCall, StickyNote, User, BookOpen, Loader2, LogIn, Shield, Menu, FileText, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { io } from 'socket.io-client';
import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize socket connection outside component to avoid reconnects
// const socket = io(); // Removed local socket initialization

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'chat' | 'exams' | 'homework' | 'store' | 'settings' | 'members' | 'members-management' | 'courses' | 'evaluations'>('posts');
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string, message: string } | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(1);
  const [profile, setProfile] = useState({ displayName: '', photoURL: '' });
  const [userRole, setUserRole] = useState<string>('student');
  const [maintenance, setMaintenance] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const activeTabRef = useRef(activeTab);
  const isInitialChatLoad = useRef(true);
  
  // Quick Note State
  const [quickNote, setQuickNote] = useState(() => localStorage.getItem('quick-note') || '');
  const [guestName, setGuestName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMode, setLoginMode] = useState<'student' | 'admin' | 'account'>('account');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    const maintenanceRef = doc(db, 'settings', 'maintenance');
    const unsub = onSnapshot(maintenanceRef, (docSnap) => {
      if (docSnap.exists()) {
        setMaintenance(docSnap.data().enabled);
      }
    }, (error) => {
      console.error("Maintenance listener error:", error);
    });
    return unsub;
  }, []);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      setAudioUnlocked(true);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('quick-note', quickNote);
  }, [quickNote]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'chat') {
      setUnreadMessages(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName || '', photoURL: user.photoURL || '' });
    }
  }, [user]);

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProfile({
        displayName: customEvent.detail.displayName,
        photoURL: customEvent.detail.photoURL
      });
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    // Listen for WebSocket online users
    socket.on('online-users-count', (count) => {
      setOnlineUsers(count);
    });

    return () => {
      socket.off('online-users-count');
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    isInitialChatLoad.current = true;
    
    // Identify user to socket server for accurate online count
    socket.emit('identify', user.uid);
    
    const handleConnect = () => {
      socket.emit('identify', user.uid);
    };
    socket.on('connect', handleConnect);
    
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [user, profile.displayName]);

  useEffect(() => {
    if (!user) return;
    
    // Real-time user count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen for user role
    const unsubscribeRole = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      let currentRole = 'student';
      if (docSnap.exists()) {
        currentRole = docSnap.data().role || 'student';
      }
      
      if (user.email === 'nguyenquynghia00@gmail.com' && currentRole !== 'admin') {
        updateDoc(doc(db, 'users', user.uid), { role: 'admin' }).catch(console.error);
        currentRole = 'admin';
      } else if (user.email === 'nqnghia2013@gmail.com' && currentRole !== 'tech') {
        updateDoc(doc(db, 'users', user.uid), { role: 'tech' }).catch(console.error);
        currentRole = 'tech';
      }
      
      setUserRole(currentRole);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

    // Listen for new notifications
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.toMillis() || Date.now();
          const now = Date.now();
          
          if (now - createdAt < 5000) {
            setNotification({ title: data.title, message: data.message });
            setTimeout(() => setNotification(null), 5000);
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));

    // Listen for new chat messages
    const messagesQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      // Skip the initial load so we don't play sound for old messages
      if (isInitialChatLoad.current) {
        isInitialChatLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          // If message is not from current user
          if (data.authorId !== user.uid) {
            // Play notification sound if audio is unlocked
            if (audioUnlocked) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => {
                // Silently catch play errors, usually due to browser policy
                if (e.name !== 'NotAllowedError') {
                  console.log('Audio play failed:', e);
                }
              });
            }
            
            if (activeTabRef.current !== 'chat') {
              setUnreadMessages(prev => prev + 1);
            }
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));
    
    // Listen for local notifications
    const handleLocalNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      setNotification({ title: customEvent.detail.title, message: customEvent.detail.message });
      setTimeout(() => setNotification(null), 5000);
    };
    window.addEventListener('local-notification', handleLocalNotification);
    
    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      unsubscribeUsers();
      unsubscribeRole();
      unsubscribeNotifications();
      unsubscribeMessages();
      window.removeEventListener('local-notification', handleLocalNotification);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">Đang chuẩn bị lớp học...</p>
        </div>
      </div>
    );
  }

  if (maintenance && user?.email !== 'nguyenquynghia00@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8">
          <h1 className="text-4xl font-black mb-4">Ứng dụng đang bảo trì</h1>
          <p>Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  const baseTabs = [
    { id: 'posts', label: 'Bài giảng & Video', icon: Layout },
    { id: 'chat', label: 'Nhóm Chat Lớp', icon: MessageSquare },
    { id: 'exams', label: 'Làm bài thi', icon: FileText },
    { id: 'homework', label: 'Bài tập về nhà', icon: ClipboardList },
    { id: 'evaluations', label: 'Đánh giá tháng', icon: Award },
    { id: 'courses', label: 'Khóa học', icon: BookOpen },
    { id: 'store', label: 'Cửa hàng lớp', icon: ShoppingBag },
    { id: 'members', label: 'Danh sách thành viên', icon: Users },
    { id: 'settings', label: 'Cài đặt cá nhân', icon: SettingsIcon },
  ] as const;

  const tabs = (userRole === 'admin' || userRole === 'tech')
    ? [...baseTabs, { id: 'members-management', label: 'Quản lý thành viên', icon: Shield }]
    : baseTabs;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 relative overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
      <Navbar />

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBtn && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 sm:left-auto sm:right-8 sm:w-80"
          >
            <div className="bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 border border-indigo-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Cài đặt Ứng dụng</h4>
                  <p className="text-[10px] opacity-80 font-medium">Trải nghiệm mượt mà hơn!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowInstallBtn(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <CloseIcon size={16} />
                </button>
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-indigo-50 transition-colors"
                >
                  Cài đặt
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[98%] sm:max-w-[95%] mx-auto px-1 sm:px-6 lg:px-8 py-2 sm:py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="bg-white p-4 sm:p-12 rounded-2xl sm:rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 max-w-2xl w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="w-12 h-12 sm:w-24 sm:h-24 bg-white rounded-xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-8 shadow-inner transform -rotate-6 overflow-hidden border-2 border-slate-100">
                <img src="https://ais-pre-jero3ppv3dobqhl6dhx3un-341941663870.asia-southeast1.run.app/" alt="Logo 7A2" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl sm:text-5xl font-black text-slate-900 mb-3 sm:mb-6 tracking-tight leading-tight">
                Chào mừng đến với <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Lớp 7A2 Hub</span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-lg mb-6 sm:mb-10 leading-relaxed max-w-lg mx-auto">
                Nền tảng học tập hiện đại, nơi chia sẻ kiến thức, bài giảng và kết nối cùng bạn bè.
              </p>

              <div className="flex flex-col gap-4 sm:gap-6 max-w-md mx-auto">
                <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-inner">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 mb-3 sm:mb-6">Đăng nhập lớp học</h2>
                  
                  {loginError && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 mb-6">
                      {loginError}
                    </div>
                  )}

                  {loginMode === 'account' ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="text-left ml-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đăng nhập</label>
                        </div>
                        <input 
                          type="text" 
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Ví dụ: nguyenvana"
                          className="w-full bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                        <div className="text-left ml-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mật khẩu</label>
                        </div>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && username.trim() && password.trim()) {
                              setIsLoggingIn(true);
                              setLoginError(null);
                              loginWithEmail(username.trim(), password.trim())
                                .catch(err => setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác!'))
                                .finally(() => setIsLoggingIn(false));
                            }
                          }}
                        />
                      </div>
                      <button
                        disabled={!username.trim() || !password.trim() || isLoggingIn}
                        onClick={() => {
                          setIsLoggingIn(true);
                          setLoginError(null);
                          loginWithEmail(username.trim(), password.trim())
                            .catch(err => setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác!'))
                            .finally(() => setIsLoggingIn(false));
                        }}
                        className="w-full group relative flex items-center justify-center gap-2 sm:gap-3 bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-indigo-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                      >
                        {isLoggingIn ? (
                          <Loader2 className="animate-spin" size={24} />
                        ) : (
                          <>
                            <LogIn size={24} className="text-white" />
                            <span>Vào lớp ngay</span>
                          </>
                        )}
                      </button>
                      
                      <div className="pt-6 flex flex-col gap-3">
                        <button 
                          onClick={() => { setLoginMode('student'); setLoginError(null); }}
                          className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          Bạn chưa có tài khoản? Vào nhanh bằng tên
                        </button>
                        <button 
                          onClick={() => { setLoginMode('admin'); setLoginError(null); }}
                          className="text-xs font-bold text-slate-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Shield size={12} />
                          Đăng nhập dành cho Quản trị viên
                        </button>
                      </div>
                    </div>
                  ) : loginMode === 'student' ? (
                    <div className="space-y-4">
                      <div className="text-left ml-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên của bạn</label>
                      </div>
                      <input 
                        type="text" 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Nhập tên để vào nhanh..."
                        className="w-full bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && guestName.trim()) {
                            setIsLoggingIn(true);
                            loginAsGuest(guestName.trim()).finally(() => setIsLoggingIn(false));
                          }
                        }}
                      />
                      <button
                        disabled={!guestName.trim() || isLoggingIn}
                        onClick={() => {
                          setIsLoggingIn(true);
                          loginAsGuest(guestName.trim()).finally(() => setIsLoggingIn(false));
                        }}
                        className="w-full group relative flex items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoggingIn ? (
                          <Loader2 className="animate-spin" size={24} />
                        ) : (
                          <>
                            <Plus size={24} className="text-indigo-400" />
                            <span>Tham gia ngay</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => { setLoginMode('account'); setLoginError(null); }}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors mt-4 block"
                      >
                        Quay lại đăng nhập bằng tài khoản
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-sm text-slate-500 font-medium">Chế độ đăng nhập dành riêng cho giáo viên và kỹ thuật viên hệ thống.</p>
                      <button
                        onClick={loginWithGoogle}
                        className="w-full group relative inline-flex items-center justify-center gap-2 sm:gap-3 bg-white border-2 border-slate-100 text-slate-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-slate-50 transition-all shadow-md hover:shadow-lg overflow-hidden"
                      >
                        <Sparkles size={24} className="text-amber-500" />
                        <span>Đăng nhập Google (Admin)</span>
                      </button>
                      <button 
                        onClick={() => { setLoginMode('account'); setLoginError(null); }}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors block mx-auto"
                      >
                        Quay lại đăng nhập học sinh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="relative">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden fixed bottom-4 left-4 z-[60] group flex items-center gap-2 bg-slate-900 text-white pl-3 pr-4 py-2 sm:py-4 rounded-full shadow-2xl border-2 sm:border-4 border-white active:scale-95 transition-all hover:bg-indigo-600"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Menu size={20} />
              </div>
              <span className="font-black text-xs sm:text-sm uppercase tracking-widest">Menu Lớp</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar / Navigation Overlay for Mobile */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70]"
                  />
                )}
              </AnimatePresence>

              {/* Sidebar / Navigation */}
              <motion.div
                initial={false}
                animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`
                  lg:col-span-3 space-y-4 sm:space-y-6
                  fixed lg:relative inset-y-0 left-0 z-[80] w-[75%] max-w-sm lg:w-full
                  bg-slate-50 lg:bg-transparent p-4 sm:p-6 lg:p-0
                  lg:!transform-none overflow-y-auto lg:overflow-visible
                `}
              >
                <div className="lg:hidden flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-10 sm:h-10 bg-indigo-600 rounded-md sm:rounded-xl flex items-center justify-center text-white">
                      <GraduationCap size={window.innerWidth < 640 ? 14 : 24} />
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-slate-900">Menu Lớp</h2>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 sm:p-2 bg-slate-200 text-slate-600 rounded-md sm:rounded-xl"
                  >
                    <CloseIcon size={window.innerWidth < 640 ? 16 : 24} />
                  </button>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-2 sm:p-3 shadow-sm border border-slate-200/60">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.id === 'profile') setSelectedUserUid(null);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 sm:px-5 py-2 sm:py-4 lg:py-3.5 rounded-xl sm:rounded-2xl font-bold transition-all duration-200 mb-1 lg:mb-1 last:mb-0 ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-md scale-[1.02]' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Icon size={isActive ? 18 : 16} className={isActive ? 'text-indigo-400' : ''} />
                          <span className="text-sm lg:text-base">{tab.label}</span>
                        </div>
                        {tab.id === 'chat' && unreadMessages > 0 && (
                          <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

              {(userRole === 'admin' || userRole === 'tech') && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-[2rem] font-bold text-lg hover:shadow-lg hover:shadow-indigo-200 transition-all hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <Plus size={24} className="relative z-10" />
                  <span className="relative z-10">Đăng bài mới</span>
                </button>
              )}

              <div className="bg-slate-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-700"></div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/5">
                    <Users size={window.innerWidth < 640 ? 16 : 24} className="text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-lg leading-tight">Thống kê lớp</h4>
                    <p className="text-[10px] text-indigo-300/80 font-bold uppercase tracking-widest mt-0.5">Thời gian thực</p>
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                    <span className="text-xs sm:text-sm text-slate-300 font-medium">Thành viên:</span>
                    <span className="font-black text-base sm:text-xl">{userCount}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                    <span className="text-xs sm:text-sm text-slate-300 font-medium">Đang online:</span>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="relative flex h-2 w-2 sm:h-3 sm:w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 bg-emerald-500"></span>
                      </span>
                      <span className="font-black text-base sm:text-xl text-emerald-400">{onlineUsers}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Note Widget */}
              <div className="bg-amber-50 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm border border-amber-100/60 relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-200/30 rounded-full blur-2xl group-hover:bg-amber-300/40 transition-colors"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                    <StickyNote size={18} />
                  </div>
                  <h4 className="font-bold text-amber-900">Ghi chú nhanh</h4>
                </div>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Viết ghi chú cá nhân của bạn vào đây..."
                  className="w-full bg-transparent border-none outline-none resize-none text-amber-800 placeholder-amber-500/50 text-sm h-32 custom-scrollbar relative z-10 font-medium leading-relaxed"
                />
              </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
              <ErrorBoundary>
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-white shadow-sm border border-slate-200/60 min-h-[70vh] sm:min-h-[80vh] ${activeTab === 'chat' ? 'p-0 sm:p-8 rounded-none sm:rounded-[2.5rem]' : 'p-2 sm:p-8 rounded-xl sm:rounded-[2.5rem]'}`}
                  >
                  {activeTab === 'posts' && (
                    <>
                      <div className="flex items-center justify-between mb-4 sm:mb-8">
                        <h2 className="text-lg sm:text-3xl font-black text-slate-900 tracking-tight">Khám phá bài học</h2>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold">
                          <Sparkles size={16} />
                          <span>Mới nhất</span>
                        </div>
                      </div>
                      <PostList onUploadClick={() => setIsUploadOpen(true)} />
                    </>
                  )}
                  {activeTab === 'chat' && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Thảo luận sôi nổi</h2>
                      <ChatRoom />
                    </>
                  )}
                  {activeTab === 'exams' && (
                    <>
                      <ExamSystem />
                    </>
                  )}
                  {activeTab === 'homework' && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Danh sách bài tập</h2>
                      <HomeworkTracker />
                    </>
                  )}
                  {activeTab === 'evaluations' && (
                    <>
                      <MonthlyEvaluations />
                    </>
                  )}
                  {activeTab === 'courses' && (
                    <>
                      <Courses />
                    </>
                  )}
                  {activeTab === 'store' && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Cửa hàng Lớp 7A2</h2>
                      <Store />
                    </>
                  )}
                  {activeTab === 'members' && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Danh sách thành viên</h2>
                      <MemberList 
                        onSelectUser={(uid) => {
                          setSelectedUserUid(uid);
                        }} 
                      />
                    </>
                  )}
                  {activeTab === 'settings' && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Cài đặt cá nhân</h2>
                      <Settings />
                    </>
                  )}
                  {activeTab === 'members-management' && (userRole === 'admin' || userRole === 'tech') && (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Quản lý thành viên</h2>
                      <MemberManagement />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
          </div>
          </div>
        )}
      </main>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Global Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 20, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.9 }}
            className="fixed top-0 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-slate-800">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <Bell className="animate-bounce" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-lg leading-tight">{notification.title}</h4>
                <p className="text-sm text-slate-400 font-medium mt-0.5 whitespace-pre-line">{notification.message}</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <footer className="py-12 border-t border-slate-200/60 text-center text-slate-400 text-sm font-medium">
        <p>© 2026 Lớp 7A2 Hub. Được xây dựng với ❤️ cho học tập.</p>
      </footer>
    </div>
  );
}
