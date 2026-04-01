import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Star, MessageSquare, Calendar, Loader2, Award, TrendingUp, User } from 'lucide-react';
import { motion } from 'motion/react';

export const MonthlyEvaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'monthly_evaluations'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvaluations(evals);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'monthly_evaluations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 pb-16 sm:pb-20">
      <div className="relative overflow-hidden bg-indigo-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-200">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-3xl font-black mb-1.5 sm:mb-2 flex items-center gap-2 sm:gap-3">
            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            Đánh giá định kỳ
          </h2>
          <p className="text-indigo-100 max-w-md text-xs sm:text-base">
            Xem lại các nhận xét và đánh giá từ giáo viên để theo dõi quá trình tiến bộ của bạn.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
          <TrendingUp className="w-48 h-48 sm:w-72 sm:h-72" />
        </div>
      </div>

      {evaluations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-slate-300">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5 sm:mb-2">Chưa có đánh giá nào</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-xs sm:text-base">
            Giáo viên sẽ gửi nhận xét cho bạn vào cuối mỗi tháng. Hãy chăm chỉ học tập nhé!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {evaluations.map((evaluation, index) => (
            <motion.div
              key={evaluation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900">Tháng {evaluation.month}</h4>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${star <= evaluation.rating ? 'text-amber-400' : 'text-slate-200'}`} 
                          fill={star <= evaluation.rating ? 'currentColor' : 'none'} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 text-xs sm:text-sm font-medium">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Người đánh giá: Admin</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-100 relative">
                <div className="absolute -top-2.5 sm:-top-3 left-4 sm:left-6 bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-100 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Nhận xét chi tiết
                </div>
                <p className="text-xs sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap italic mt-1 sm:mt-0">
                  "{evaluation.content}"
                </p>
              </div>

              <div className="mt-3 sm:mt-4 flex justify-end">
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Gửi vào: {evaluation.createdAt?.toDate().toLocaleDateString('vi-VN')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
