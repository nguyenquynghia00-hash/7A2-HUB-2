import React, { useState, useEffect } from 'react';
import { Post, UserProfile } from '../types';
import { Video, Presentation, FileText, MessageCircle, ExternalLink, Trash2, Clock, User, Palette, Sparkles, MessageSquare, Zap, Bot, BookOpen, X, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { auth, db } from '../firebase';
import { doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { CommentSection } from './CommentSection';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [userVipCourseId, setUserVipCourseId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('student');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as UserProfile;
        setIsVip(!!userData.isVip);
        setVipExpiresAt(userData.vipExpiresAt || null);
        setUserVipCourseId(userData.vipCourseId || null);
        setCurrentUserRole(userData.role || 'student');
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = auth.currentUser?.email === 'nguyenquynghia00@gmail.com' || currentUserRole === 'admin' || currentUserRole === 'tech';
  const isAuthor = auth.currentUser?.uid === post.authorId || isAdmin;
  
  const isVipActive = isVip && (!vipExpiresAt || new Date(vipExpiresAt) > new Date());
  const canAccess = isAdmin || !post.isVip || (isVipActive && (!post.vipCourseId || userVipCourseId === post.vipCourseId));

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setShowConfirmDelete(false);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const getIcon = () => {
    switch (post.type) {
      case 'video': return <Video size={16} />;
      case 'presentation': return <Presentation size={16} />;
      case 'document': return <FileText size={16} />;
      case 'canva': return <Palette size={16} />;
      case 'powerpoint': return <Presentation size={16} />;
      case 'gemini': return <Sparkles size={16} />;
      case 'chatgpt': return <MessageSquare size={16} />;
      case 'gamma': return <Zap size={16} />;
      case 'claude': return <Bot size={16} />;
      case 'notebooklm': return <BookOpen size={16} />;
    }
  };

  const getTypeLabel = () => {
    switch (post.type) {
      case 'video': return 'Video';
      case 'presentation': return 'Slide';
      case 'document': return 'Tài liệu';
      case 'canva': return 'Canva';
      case 'powerpoint': return 'Powerpoint';
      case 'gemini': return 'Gemini';
      case 'chatgpt': return 'ChatGPT';
      case 'gamma': return 'Gamma AI';
      case 'claude': return 'Claude AI';
      case 'notebooklm': return 'NotebookLM';
    }
  };

  const getTypeColor = () => {
    switch (post.type) {
      case 'video': return 'from-rose-500 to-orange-500';
      case 'presentation': return 'from-blue-500 to-cyan-500';
      case 'document': return 'from-emerald-500 to-teal-500';
      case 'canva': return 'from-cyan-500 to-blue-500';
      case 'powerpoint': return 'from-orange-500 to-red-500';
      case 'gemini': return 'from-indigo-500 to-violet-500';
      case 'chatgpt': return 'from-green-500 to-emerald-500';
      case 'gamma': return 'from-purple-500 to-fuchsia-500';
      case 'claude': return 'from-amber-500 to-orange-500';
      case 'notebooklm': return 'from-teal-500 to-cyan-500';
      default: return 'from-indigo-500 to-purple-500';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 overflow-hidden flex flex-col relative"
    >
      <div className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-gradient-to-r ${getTypeColor()}`}></div>
      
      {post.coverImage && (
        <div className="w-full h-40 sm:h-56 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
          <img 
            src={post.coverImage} 
            alt={post.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-white/20">
            {getIcon()}
            <span>{getTypeLabel()}</span>
          </div>
          {post.isVip && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-amber-500 text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg border border-amber-400">
              <Sparkles size={10} className="sm:w-3 sm:h-3" />
              <span>VIP</span>
            </div>
          )}
        </div>
      )}
      
      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 sm:mb-4">
          {!post.coverImage && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r ${getTypeColor()} text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm`}>
                {getIcon()}
                <span>{getTypeLabel()}</span>
              </div>
              {post.isVip && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-amber-500 text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <Sparkles size={10} className="sm:w-3 sm:h-3" />
                  <span>VIP</span>
                </div>
              )}
            </div>
          )}
          
          {isAuthor && (
            <div className={`relative ${post.coverImage ? 'absolute top-3 right-3 sm:top-4 sm:right-4 z-20' : 'ml-auto'}`}>
              {showConfirmDelete ? (
                <div className="absolute right-0 top-0 flex items-center gap-1.5 sm:gap-2 bg-white shadow-xl border border-slate-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2 z-30 min-w-[140px] sm:min-w-[160px]">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">Xóa bài?</span>
                  <button onClick={handleDelete} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg hover:bg-red-600 transition-colors">Có</button>
                  <button onClick={() => setShowConfirmDelete(false)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg hover:bg-slate-200 transition-colors">Không</button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowConfirmDelete(true)} 
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${post.coverImage ? 'bg-white/20 backdrop-blur-md text-white hover:bg-red-500 border border-white/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                >
                  <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="text-base sm:text-xl font-black text-slate-900 mb-1.5 sm:mb-3 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-slate-500 text-[10px] sm:text-sm mb-3 sm:mb-6 line-clamp-3 leading-relaxed">{post.description}</p>

        <div className="mt-auto pt-3 sm:pt-5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-black text-xs sm:text-sm border-2 border-white shadow-sm shrink-0">
              {post.authorName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-none mb-1">{post.authorName}</span>
              <div className="flex items-center gap-1 text-[8px] sm:text-[11px] font-medium text-slate-400">
                <Clock size={10} className="sm:w-3 sm:h-3" />
                <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: vi }) : 'Vừa xong'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all ${
                showComments 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              title="Bình luận"
            >
              <MessageCircle size={16} className={`sm:w-[18px] sm:h-[18px] ${showComments ? 'fill-current' : ''}`} />
            </button>
            {!canAccess ? (
              <div className="p-2 sm:p-2.5 bg-slate-100 text-slate-400 rounded-lg sm:rounded-xl cursor-not-allowed flex items-center gap-1.5 sm:gap-2" title="Nội dung VIP">
                <Lock size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="text-[10px] sm:text-xs font-bold">VIP</span>
              </div>
            ) : post.type === 'video' ? (
              <button
                onClick={() => setShowVideo(true)}
                className="p-2 sm:p-2.5 bg-rose-600 text-white rounded-lg sm:rounded-xl hover:bg-rose-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                title="Xem video"
              >
                <Video size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            ) : (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 sm:p-2.5 bg-slate-900 text-white rounded-lg sm:rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                title="Xem tài liệu"
              >
                <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
              </a>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex justify-end">
                <button onClick={() => setShowVideo(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                  <X size={24} />
                </button>
              </div>
              <video src={post.url} controls className="w-full" />
            </motion.div>
          </motion.div>
        )}
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50/80 border-t border-slate-100 backdrop-blur-sm"
          >
            <CommentSection postId={post.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
