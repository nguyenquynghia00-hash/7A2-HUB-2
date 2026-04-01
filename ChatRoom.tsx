import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Message } from '../types';
import { Send, Hash, Users, Image as ImageIcon, Trash2, MessageCircle, Loader2, X, Smile, Paperclip, File, Video, Download } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [severity, setSeverity] = useState<'normal' | 'warning' | 'alert'>('normal');

  const isAdmin = auth.currentUser?.email === 'nguyenquynghia00@gmail.com';
  const isTech = userRole === 'tech' || userRole === 'admin';

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribeRole = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
        let currentRole = 'student';
        if (docSnap.exists()) {
          currentRole = docSnap.data().role || 'student';
        }
        if (auth.currentUser?.email === 'nguyenquynghia00@gmail.com') currentRole = 'admin';
        else if (auth.currentUser?.email === 'nqnghia2013@gmail.com') currentRole = 'tech';
        setUserRole(currentRole);
      }, (error) => handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`));
      return () => unsubscribeRole();
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));

    // Real-time user count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserCount(snapshot.size);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => {
      unsubscribeMessages();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, filePreview, uploadProgress]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !auth.currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (selectedFile) {
        const storageRef = ref(storage, `chat/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        fileUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      await addDoc(collection(db, 'messages'), {
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Anonymous',
        authorPhoto: auth.currentUser.photoURL || '',
        text: newMessage.trim() || null,
        imageUrl: fileType?.startsWith('image/') ? fileUrl : null,
        fileUrl: !fileType?.startsWith('image/') ? fileUrl : null,
        fileName,
        fileType,
        createdAt: serverTimestamp(),
        severity: isTech ? severity : 'normal'
      });

      setNewMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      setUploadProgress(null);
      setSeverity('normal');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      // Use a custom toast or notification instead of alert
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'messages', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const renderMessageContent = (msg: Message, isMe: boolean) => {
    let bgClass = isMe 
      ? 'bg-indigo-600 text-white rounded-tr-none' 
      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none';

    if (msg.severity === 'warning') {
      bgClass = 'bg-amber-400 text-amber-900 border border-amber-500 rounded-tr-none rounded-tl-none';
    } else if (msg.severity === 'alert') {
      bgClass = 'bg-rose-500 text-white border border-rose-600 rounded-tr-none rounded-tl-none';
    }

    return (
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] shadow-sm text-xs sm:text-sm font-medium leading-relaxed ${bgClass}`}>
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="Shared content" className="rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 max-w-full h-auto shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.imageUrl, '_blank')} referrerPolicy="no-referrer" />
        )}
        
        {msg.fileUrl && (
          <div className="mb-1.5 sm:mb-2">
            {msg.fileType?.startsWith('video/') ? (
              <video controls className="rounded-lg sm:rounded-xl w-full max-h-48 sm:max-h-64 bg-black shadow-sm">
                <source src={msg.fileUrl} type={msg.fileType} />
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            ) : (
              <a 
                href={msg.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all ${
                  isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg ${isMe ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                  {msg.fileType?.includes('pdf') ? <File size={window.innerWidth < 640 ? 16 : 20} /> : <Paperclip size={window.innerWidth < 640 ? 16 : 20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-900'}`}>{msg.fileName}</p>
                  <p className={`text-[8px] sm:text-[10px] ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>Nhấn để tải xuống</p>
                </div>
                <Download size={window.innerWidth < 640 ? 14 : 16} className={isMe ? 'text-white/60' : 'text-slate-300'} />
              </a>
            )}
          </div>
        )}
        
        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
      </div>
    );
  };

  const renderDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!currentMsg.createdAt) return null;
    const currentDate = currentMsg.createdAt.toDate();
    if (!prevMsg || !prevMsg.createdAt) {
      return (
        <div className="flex justify-center my-6">
          <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
            {format(currentDate, 'eeee, d MMMM', { locale: vi })}
          </span>
        </div>
      );
    }
    const prevDate = prevMsg.createdAt.toDate();
    if (!isSameDay(currentDate, prevDate)) {
      return (
        <div className="flex justify-center my-6">
          <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
            {format(currentDate, 'eeee, d MMMM', { locale: vi })}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-none sm:rounded-[2.5rem] border-none sm:border border-slate-100 shadow-none sm:shadow-2xl flex flex-col h-[85vh] lg:h-[700px] overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-6 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Hash className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-xl leading-tight">Nhóm Chat 7A2</h3>
            <p className="text-[9px] sm:text-xs text-indigo-100 flex items-center gap-1 sm:gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              {userCount} thành viên
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="p-2 sm:p-3 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-colors">
            <Users className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-indigo-100" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-1.5 sm:space-y-2 bg-slate-50/30 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <MessageCircle size={window.innerWidth < 640 ? 32 : 40} className="opacity-20" />
            </div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-40">Bắt đầu cuộc trò chuyện...</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = auth.currentUser?.uid === msg.authorId;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isSameAuthor = prevMsg?.authorId === msg.authorId;
            const dateSeparator = renderDateSeparator(msg, prevMsg);

            return (
              <React.Fragment key={msg.id}>
                {dateSeparator}
                <motion.div 
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-end gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameAuthor ? 'mt-0.5 sm:mt-1' : 'mt-4 sm:mt-6'}`}
                >
                  {/* Avatar */}
                  {!isMe && !isSameAuthor ? (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl overflow-hidden bg-indigo-100 flex-shrink-0 border-2 border-white shadow-sm">
                      {msg.authorPhoto ? (
                        <img src={msg.authorPhoto} alt={msg.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-600 font-black text-[10px] sm:text-xs">
                          {msg.authorName.charAt(0)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-6 sm:w-8 flex-shrink-0" />
                  )}

                  <div className={`flex flex-col max-w-[80%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && !isSameAuthor && (
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-0.5 sm:mb-1">
                        {msg.authorName}
                      </span>
                    )}
                    
                    <div className="relative group">
                      {renderMessageContent(msg, isMe)}

                      {/* Admin Delete Button */}
                      {isAdmin && (
                        <button 
                          onClick={() => setDeleteId(msg.id)}
                          className={`absolute top-0 ${isMe ? '-left-10' : '-right-10'} p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {!isSameAuthor && (
                      <span className="text-[9px] font-bold text-slate-400 mt-1.5 px-1 uppercase tracking-tighter">
                        {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm', { locale: vi }) : '...'}
                      </span>
                    )}
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-6 border-t border-slate-50 bg-white">
        <AnimatePresence>
          {(filePreview || selectedFile) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 relative inline-block"
            >
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-24 sm:h-32 rounded-xl sm:rounded-2xl shadow-lg border-4 border-white" />
              ) : (
                <div className="h-24 sm:h-32 w-40 sm:w-48 bg-slate-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4">
                  {selectedFile?.type.startsWith('video/') ? <Video className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2" /> : <File className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2" />}
                  <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{selectedFile?.name}</span>
                </div>
              )}
              <button 
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {uploadProgress !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">
              <span>Đang tải lên...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {auth.currentUser ? (
          <div className="flex flex-col gap-3">
            {isTech && (
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button" 
                  onClick={() => setSeverity('normal')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${severity === 'normal' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Bình thường
                </button>
                <button 
                  type="button" 
                  onClick={() => setSeverity('warning')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Cảnh báo
                </button>
                <button 
                  type="button" 
                  onClick={() => setSeverity('alert')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${severity === 'alert' ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Khẩn cấp
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 sm:p-4 bg-slate-50 text-slate-400 rounded-lg sm:rounded-2xl hover:bg-slate-100 hover:text-indigo-600 transition-all"
              >
                <Paperclip className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="w-full pl-3 sm:pl-6 pr-8 sm:pr-12 py-2.5 sm:py-4 bg-slate-50 border-none rounded-lg sm:rounded-[1.5rem] text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
                <button type="button" className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors">
                  <Smile className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                </button>
              </div>

              <button
                disabled={isSubmitting || (!newMessage.trim() && !selectedFile)}
                type="submit"
                className="p-2.5 sm:p-4 bg-indigo-600 text-white rounded-lg sm:rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center min-w-[40px] sm:min-w-[56px]"
              >
                {isSubmitting ? <Loader2 className="w-[18px] h-[18px] sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-[18px] h-[18px] sm:w-5 sm:h-5" />}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl text-center">
            <p className="text-sm font-bold text-slate-500">Vui lòng đăng nhập để tham gia trò chuyện cùng lớp.</p>
          </div>
        )}
      </div>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-3 sm:mb-4">
                <Trash2 size={window.innerWidth < 640 ? 24 : 32} />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Xác nhận xóa?</h3>
              <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tin nhắn này?</p>
              <div className="flex gap-3 sm:gap-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm sm:text-base">Hủy</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-sm sm:text-base">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
