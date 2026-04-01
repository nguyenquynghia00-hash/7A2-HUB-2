import React, { useState, useRef } from 'react';
import { X, Video, Presentation, FileText, Link as LinkIcon, Upload, File, Image as ImageIcon, Loader2, Palette, Sparkles, MessageSquare, Zap, Bot, BookOpen, Crown } from 'lucide-react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { VIP_COURSES } from '../constants';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'video' | 'presentation' | 'document' | 'canva' | 'powerpoint' | 'gemini' | 'chatgpt' | 'gamma' | 'claude' | 'notebooklm'>('video');
  const [url, setUrl] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [vipCourseId, setVipCourseId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'link' | 'file'>('link');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const userData = doc.data() as UserProfile;
      setIsAdmin(userData?.role === 'admin' || userData?.role === 'tech');
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Bạn không có quyền đăng bài!' }
      }));
      return;
    }

    if (!title.trim()) {
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Vui lòng nhập tiêu đề!' }
      }));
      return;
    }

    if (uploadMethod === 'link' && !url.trim()) {
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Vui lòng nhập đường dẫn!' }
      }));
      return;
    }

    if (uploadMethod === 'link' && url.trim() && !url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Đường dẫn phải bắt đầu bằng http:// hoặc https://' }
      }));
      return;
    }

    setIsUploading(true);

    try {
      let finalUrl = url;
      let finalCoverUrl = '';

      if (uploadMethod === 'file' && file) {
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        finalUrl = await getDownloadURL(snapshot.ref);
      }

      if (coverImage) {
        const coverRef = ref(storage, `covers/${Date.now()}_${coverImage.name}`);
        const coverSnapshot = await uploadBytes(coverRef, coverImage);
        finalCoverUrl = await getDownloadURL(coverSnapshot.ref);
      }

      await addDoc(collection(db, 'posts'), {
        title,
        description,
        type,
        url: finalUrl,
        isVip,
        ...(isVip && vipCourseId ? { vipCourseId } : {}),
        ...(finalCoverUrl ? { coverImage: finalCoverUrl } : {}),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });

      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: 'Đã đăng bài thành công!' }
      }));

      onClose();
      setTitle('');
      setDescription('');
      setUrl('');
      setIsVip(false);
      setVipCourseId('');
      setFile(null);
      setCoverImage(null);
    } catch (error: any) {
      console.error('Error adding post:', error);
      
      const isStorageError = error.code && error.code.startsWith('storage/');
      const message = isStorageError 
        ? 'Không thể tải tệp lên. Vui lòng kiểm tra Firebase Storage Rules đã được bật và cấp quyền chưa.' 
        : 'Có lỗi xảy ra khi đăng bài. Vui lòng thử lại sau.';
        
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi đăng bài', message: message }
      }));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
          >
            <div className="p-3 sm:p-6 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 text-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 font-bold" />
                </div>
                <h2 className="text-base sm:text-xl font-black text-slate-900">Đăng bài mới</h2>
              </div>
              <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors text-slate-400">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto space-y-4 sm:space-y-8">
              
              <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hình nền bài đăng (Tùy chọn)</label>
                <div 
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-24 sm:h-48 rounded-xl sm:rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverInputRef}
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  {coverImage ? (
                    <>
                      <img src={URL.createObjectURL(coverImage)} alt="Cover Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <span className="text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 rounded-md sm:rounded-lg border border-white/30">Thay đổi hình nền</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 sm:gap-3 text-slate-400 group-hover:text-indigo-500 transition-colors">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-2xl shadow-sm flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-sm font-bold">Nhấn để chọn hình nền</span>
                      <span className="text-[8px] sm:text-xs font-medium opacity-70">Tỉ lệ 16:9 hiển thị tốt nhất</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề</label>
                <input
                  type="text"
                  maxLength={190}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                  placeholder="Nhập tiêu đề bài thuyết trình/video..."
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none h-20 sm:h-24 resize-none leading-relaxed"
                  placeholder="Mô tả ngắn gọn về nội dung..."
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 text-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900">Nội dung VIP</h4>
                  <p className="text-[10px] sm:text-xs text-amber-700 font-medium">Chỉ thành viên VIP mới có thể xem nội dung này.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isVip} 
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 sm:w-11 h-5 sm:h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {isVip && (
                <div className="space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5 sm:gap-2">
                    <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    Khóa học VIP tương ứng (Tùy chọn)
                  </label>
                  <select
                    value={vipCourseId}
                    onChange={(e) => setVipCourseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                  >
                    <option value="">Tất cả thành viên VIP</option>
                    {VIP_COURSES.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium ml-1 italic">
                    * Nếu chọn, chỉ những người sở hữu gói VIP này mới xem được. Nếu để trống, tất cả VIP đều xem được.
                  </p>
                </div>
              )}

              <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Loại nội dung</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
                  {[
                    { id: 'video', label: 'Video', icon: Video, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
                    { id: 'presentation', label: 'Slide', icon: Presentation, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                    { id: 'document', label: 'Tài liệu', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                    { id: 'canva', label: 'Canva', icon: Palette, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200' },
                    { id: 'powerpoint', label: 'Powerpoint', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
                    { id: 'gemini', label: 'Gemini', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                    { id: 'chatgpt', label: 'ChatGPT', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
                    { id: 'gamma', label: 'Gamma AI', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
                    { id: 'claude', label: 'Claude AI', icon: Bot, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
                    { id: 'notebooklm', label: 'NotebookLM', icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as any)}
                      className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${
                        type === item.id
                          ? `${item.border} ${item.bg} ${item.color} shadow-sm transform scale-[1.02]`
                          : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2" />
                      <span className="text-[10px] sm:text-sm font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nguồn nội dung</label>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg sm:rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUploadMethod('link')}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                        uploadMethod === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMethod('file')}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                        uploadMethod === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Tải tệp
                    </button>
                  </div>
                </div>

                {uploadMethod === 'link' ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <LinkIcon className="w-4 h-4 sm:w-4 sm:h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl pl-9 sm:pl-11 pr-4 py-2.5 sm:py-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium"
                      placeholder="Link YouTube, Canva, Drive..."
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all bg-slate-50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-indigo-600">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center">
                          <File className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-[250px]">{file.name}</span>
                        <span className="text-[10px] sm:text-xs font-medium text-slate-400">Nhấn để thay đổi tệp</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center">
                          <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold">Nhấn để chọn tệp từ máy tính</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
            
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-3 sm:gap-4 sticky bottom-0 z-10">
              <button onClick={onClose} className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-sm sm:text-base">Hủy</button>
              <button
                disabled={isUploading || (uploadMethod === 'file' && !file) || (uploadMethod === 'link' && !url) || !title.trim()}
                onClick={handleSubmit}
                className="flex-[2] bg-indigo-600 text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none text-sm sm:text-base"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Đang đăng bài...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Đăng bài ngay</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
