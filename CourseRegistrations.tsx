import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { Loader2, Check, X, Info, UserCheck } from 'lucide-react';
import { VIP_COURSES, getVipExpirationDate } from '../constants';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { UserProfile } from '../types';

export const CourseRegistrations: React.FC = () => {
  const [user] = useAuthState(auth);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Check if user is admin
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const userData = doc.data() as UserProfile;
      setIsAdmin(userData?.role === 'admin');
    });

    return () => unsubscribeUser();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'course_registrations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistrations(regs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'course_registrations'));

    return () => unsubscribe();
  }, [isAdmin]);

  const handleConfirm = async (reg: any) => {
    try {
      // 1. Update registration status
      try {
        await updateDoc(doc(db, 'course_registrations', reg.id), { status: 'confirmed' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `course_registrations/${reg.id}`);
      }
      
      // 2. Automatically grant VIP to the user
      const expirationDate = getVipExpirationDate(reg.courseId);
      try {
        await updateDoc(doc(db, 'users', reg.userId), {
          isVip: true,
          vipCourseId: reg.courseId,
          vipExpiresAt: expirationDate
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${reg.userId}`);
      }

      // 3. Send notification to user
      try {
        await addDoc(collection(db, 'user_notifications'), {
          userId: reg.userId,
          title: 'VIP đã được kích hoạt!',
          message: `Khóa học ${reg.courseTitle} của bạn đã được xác nhận. Quyền lợi VIP đã được kích hoạt!`,
          type: 'vip_activated',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'user_notifications');
      }

      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: 'Đã xác nhận và kích hoạt VIP!' }
      }));
    } catch (error) {
      console.error('Error confirming registration:', error);
      alert('Có lỗi xảy ra khi xác nhận. Vui lòng kiểm tra quyền hạn.');
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="mt-8 sm:mt-12 space-y-4 sm:space-y-6">
      <h3 className="text-xl sm:text-2xl font-black text-slate-900">Danh sách đăng ký khóa học</h3>
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">Học viên</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">Khóa học</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">Trạng thái</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedRegistration(reg)}>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="font-bold text-slate-900">{reg.name}</div>
                    <div className="text-slate-500 text-[10px] sm:text-xs">{reg.email}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-700">{reg.courseTitle}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className={`px-2 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold ${reg.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {reg.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                    {reg.status === 'pending' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleConfirm(reg); }}
                        className="p-1.5 sm:p-2 bg-emerald-100 text-emerald-600 rounded-md sm:rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Xác nhận & Kích hoạt VIP"
                      >
                        <UserCheck className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedRegistration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-slate-900 p-4 sm:p-6 text-white relative">
                <button 
                  onClick={() => setSelectedRegistration(null)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <h3 className="text-lg sm:text-2xl font-bold mb-1">Thông tin chi tiết</h3>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Học viên</label>
                  <p className="text-sm sm:text-base text-slate-900 font-bold">{selectedRegistration.name}</p>
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <p className="text-sm sm:text-base text-slate-900">{selectedRegistration.email}</p>
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                  <p className="text-sm sm:text-base text-slate-900">{selectedRegistration.phone}</p>
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Khóa học</label>
                  <p className="text-sm sm:text-base text-slate-900 font-bold">{selectedRegistration.courseTitle}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{selectedRegistration.price}</p>
                </div>
                {selectedRegistration.note && (
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Ghi chú</label>
                    <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-100">{selectedRegistration.note}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Trạng thái</label>
                  <p className={`text-sm sm:text-base font-bold ${selectedRegistration.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedRegistration.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
