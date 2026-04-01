import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Key, X, Check, Loader2, Sparkles } from 'lucide-react';
import { VIP_COURSES, getVipExpirationDate } from '../constants';

export const VipRedeem: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [user] = useAuthState(auth);
  const [activationKey, setActivationKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activationKey.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // 1. Get current user's profile
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        setMessage({ type: 'error', text: 'Không tìm thấy thông tin tài khoản.' });
        setIsSubmitting(false);
        return;
      }

      const userData = userSnap.data();

      if (!userData.vipActivationKey || userData.vipActivationKey !== activationKey.trim().toUpperCase()) {
        setMessage({ type: 'error', text: 'Mã kích hoạt không đúng hoặc đã hết hạn.' });
        setIsSubmitting(false);
        return;
      }

      // 2. Activate VIP
      const courseId = userData.vipCourseId || '12-months';
      const expirationDate = getVipExpirationDate(courseId);

      await updateDoc(doc(db, 'users', user.uid), {
        isVip: true,
        vipCourseId: courseId,
        vipExpiresAt: expirationDate,
        vipActivationKey: '' // Clear the key after use
      });

      // 3. Create notification
      await addDoc(collection(db, 'user_notifications'), {
        userId: user.uid,
        title: 'Kích hoạt VIP thành công!',
        message: `Bạn đã kích hoạt thành công quyền lợi VIP (${courseId}). Chúc bạn học tập tốt!`,
        type: 'vip_activated',
        read: false,
        createdAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Kích hoạt VIP thành công! Hệ thống sẽ cập nhật sau vài giây.' });
      setTimeout(() => {
        onClose();
        setActivationKey('');
        setMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error redeeming key:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 sm:p-8 text-white relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 backdrop-blur-md border border-white/10">
                <Key size={24} className="sm:w-8 sm:h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2 tracking-tight">Kích hoạt VIP</h3>
              <p className="text-xs sm:text-base text-indigo-100 font-medium">Nhập mã kích hoạt của bạn để mở khóa toàn bộ tính năng.</p>
            </div>

            <div className="p-6 sm:p-8">
              {message?.type === 'success' ? (
                <div className="text-center py-4 sm:py-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Check size={32} className="sm:w-10 sm:h-10 text-emerald-600" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2">Tuyệt vời!</h4>
                  <p className="text-xs sm:text-base text-slate-600 font-medium leading-relaxed">{message.text}</p>
                </div>
              ) : (
                <form onSubmit={handleRedeem} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 sm:mb-3 ml-1">Mã kích hoạt</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Sparkles size={16} className="sm:w-5 sm:h-5 text-indigo-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={activationKey}
                        onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                        className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-base sm:text-lg tracking-widest placeholder:tracking-normal placeholder:font-sans"
                        placeholder="VD: ABC123XYZ"
                        disabled={isSubmitting}
                      />
                    </div>
                    {message?.type === 'error' && (
                      <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-red-500 flex items-center gap-1.5 sm:gap-2 bg-red-50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-red-100">
                        <X size={14} className="sm:w-4 sm:h-4" />
                        {message.text}
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !activationKey.trim()}
                    className={`w-full py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-[0.98] ${isSubmitting || !activationKey.trim() ? 'opacity-70 grayscale cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <>
                        <Sparkles size={18} className="sm:w-6 sm:h-6 text-amber-400" />
                        <span className="text-base sm:text-lg">Kích hoạt ngay</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-slate-400 text-[10px] sm:text-sm font-medium">
                    Chưa có mã? Liên hệ giáo viên để nhận mã.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
