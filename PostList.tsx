import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { Post, UserProfile } from '../types';
import { PostCard } from './PostCard';
import { Search, Filter, LayoutGrid, List, FileText, Video, Presentation, Upload, Palette, Sparkles, MessageSquare, Zap, Bot, BookOpen, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthState } from 'react-firebase-hooks/auth';

interface PostListProps {
  onUploadClick: () => void;
}

export const PostList: React.FC<PostListProps> = ({ onUploadClick }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'presentation' | 'document' | 'canva' | 'powerpoint' | 'gemini' | 'chatgpt' | 'gamma' | 'claude' | 'notebooklm'>('all');
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setUserProfile(doc.data() as UserProfile);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));
    return unsubscribe;
  }, []);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'tech';
  const isVip = userProfile?.isVip || isAdmin;

  const filteredPosts = posts.filter(post => {
    // Access control: Only VIPs/Admins can see VIP posts
    if (post.isVip && !isVip) return false;

    const matchesSearch = (post.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (post.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || post.type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 gap-4 sm:gap-6">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm sm:text-base text-slate-500 font-bold tracking-wide animate-pulse">Đang tải nội dung...</p>
      </div>
    );
  }

  const filterOptions = [
    { id: 'all', label: 'Tất cả', icon: LayoutGrid },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'presentation', label: 'Slide', icon: Presentation },
    { id: 'document', label: 'Tài liệu', icon: FileText },
    { id: 'canva', label: 'Canva', icon: Palette },
    { id: 'powerpoint', label: 'Powerpoint', icon: Presentation },
    { id: 'gemini', label: 'Gemini', icon: Sparkles },
    { id: 'chatgpt', label: 'ChatGPT', icon: MessageSquare },
    { id: 'gamma', label: 'Gamma AI', icon: Zap },
    { id: 'claude', label: 'Claude AI', icon: Bot },
    { id: 'notebooklm', label: 'NotebookLM', icon: BookOpen },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 items-start lg:items-center justify-between bg-slate-50/50 p-1 sm:p-2 rounded-2xl sm:rounded-[2rem] border border-slate-100">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm bài giảng, video..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3.5 bg-white border-none rounded-xl sm:rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm text-xs sm:text-base text-slate-700 font-medium placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto overflow-x-auto pb-1.5 sm:pb-2 lg:pb-0 px-1.5 sm:px-2 lg:px-0 hide-scrollbar">
          {filterOptions.map((item) => {
            const Icon = item.icon;
            const isActive = filter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-1.5 sm:py-3 rounded-lg sm:rounded-[1.25rem] text-[10px] sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                    : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-indigo-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-3 rounded-lg sm:rounded-[1.25rem] text-[10px] sm:text-sm font-bold whitespace-nowrap transition-all duration-300 bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Đăng nhanh
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filteredPosts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 text-center border border-dashed border-slate-200 shadow-sm"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 transform -rotate-6">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 mb-1.5 sm:mb-2">Không tìm thấy kết quả</h3>
            <p className="text-xs sm:text-lg text-slate-500">Hãy thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8"
          >
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
