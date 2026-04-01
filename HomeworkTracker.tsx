import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Circle, Clock, AlertCircle, Calendar as CalendarIcon, Plus, Trash2, Edit2, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, addDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import confetti from 'canvas-confetti';

interface Homework {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completedBy?: string[];
  createdAt: any;
}

export const HomeworkTracker: React.FC = () => {
  const [user] = useAuthState(auth);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingHw, setEditingHw] = useState<Homework | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.email === 'nguyenquynghia00@gmail.com';

  const [form, setForm] = useState({
    subject: '',
    title: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  const toggleTaskStatus = async (id: string) => {
    if (!user) return;
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return;

    const isCompleted = hw.completedBy?.includes(user.uid);

    try {
      if (isCompleted) {
        await setDoc(doc(db, 'homework', id), {
          completedBy: arrayRemove(user.uid)
        }, { merge: true });
      } else {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        await setDoc(doc(db, 'homework', id), {
          completedBy: arrayUnion(user.uid)
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error toggling homework status:', error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'homework'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework));
      setHomeworks(data);
      setIsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'homework'));
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!isAdmin || isSaving) return;
    setIsSaving(true);
    try {
      if (editingHw) {
        await setDoc(doc(db, 'homework', editingHw.id), {
          ...form,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        const newHw = {
          ...form,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'homework'), newHw);
        
        // Send notification to all devices
        await addDoc(collection(db, 'notifications'), {
          title: 'Bài tập mới!',
          message: `Môn ${form.subject}: ${form.title}`,
          type: 'homework',
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      setEditingHw(null);
      setForm({ subject: '', title: '', dueDate: '', priority: 'medium' });
    } catch (error) {
      console.error('Error saving homework:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'homework', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting homework:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-amber-500 bg-amber-50';
      case 'low': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Đang tải bài tập...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-4">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg sm:rounded-2xl flex items-center justify-center text-indigo-600">
            <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Tổng số bài tập</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900">{homeworks.length}</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 p-3 sm:p-6 rounded-xl sm:rounded-[2rem] text-white shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 sm:gap-3 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-base font-black uppercase tracking-wider">Thêm bài tập mới</span>
          </button>
        )}
      </div>

      {/* Homework List */}
      <div className="bg-white rounded-xl sm:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-3 sm:p-8 border-b border-slate-50">
          <h3 className="text-base sm:text-xl font-black text-slate-900">Danh sách nhiệm vụ</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {homeworks.length === 0 ? (
            <div className="p-10 sm:p-20 text-center">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-slate-300">
                <ClipboardList size={window.innerWidth < 640 ? 24 : 40} />
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">Chưa có bài tập nào được giao.</p>
            </div>
          ) : (
            homeworks.map((hw, idx) => {
              const isCompleted = user ? hw.completedBy?.includes(user.uid) : false;
              const completedCount = hw.completedBy?.length || 0;
              return (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 sm:p-6 hover:bg-slate-50/50 transition-colors flex items-center gap-2.5 sm:gap-6 group ${isCompleted ? 'opacity-60' : ''}`}
                >
                  <button 
                    onClick={() => toggleTaskStatus(hw.id)}
                    className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-600 shadow-inner' 
                        : 'bg-slate-50 text-slate-300 hover:bg-indigo-50 hover:text-indigo-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" /> : <Circle className="w-4 h-4 sm:w-6 sm:h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-1">
                      <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md ${getPriorityColor(hw.priority)}`}>
                        {hw.priority === 'high' ? 'Quan trọng' : hw.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                      </span>
                      {new Date(hw.dueDate) < new Date() && hw.dueDate !== '' && !isCompleted && (
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-md bg-red-500 text-white">
                          Quá hạn
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-bold text-indigo-600">{hw.subject}</span>
                    </div>
                    <h4 className={`text-sm sm:text-lg font-bold truncate transition-all ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {hw.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-slate-400 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Hạn nộp: {hw.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>{completedCount} người đã làm</span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={() => {
                          setEditingHw(hw);
                          setForm({ subject: hw.subject, title: hw.title, dueDate: hw.dueDate, priority: hw.priority });
                          setIsAdding(true);
                        }}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(hw.id)}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-50 bg-indigo-50/50 flex justify-between items-center">
                <h3 className="text-lg sm:text-2xl font-black text-slate-900">{editingHw ? 'Sửa bài tập' : 'Thêm bài tập mới'}</h3>
                <button onClick={() => { setIsAdding(false); setEditingHw(null); }} className="p-2 sm:p-3 hover:bg-white rounded-xl sm:rounded-2xl transition-colors text-slate-400"><X size={window.innerWidth < 640 ? 20 : 24} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Môn học</label>
                  <input 
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="VD: Toán học"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung bài tập</label>
                  <input 
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="VD: Giải bài tập trang 45 SGK"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hạn nộp</label>
                    <input 
                      type="text"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                      placeholder="VD: 15/03/2026"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                    <select 
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                      className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                    >
                      <option value="high">Quan trọng</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-8 bg-slate-50/50 flex gap-3 sm:gap-4">
                <button onClick={() => { setIsAdding(false); setEditingHw(null); }} className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-600 hover:bg-white transition-all border border-transparent hover:border-slate-200 text-sm sm:text-base">Hủy</button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !form.title || !form.subject}
                  className="flex-1 bg-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  {isSaving ? <Loader2 size={window.innerWidth < 640 ? 16 : 20} className="animate-spin" /> : <Check size={window.innerWidth < 640 ? 16 : 20} />}
                  {editingHw ? 'Cập nhật' : 'Giao bài tập'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
              <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa bài tập này?</p>
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
