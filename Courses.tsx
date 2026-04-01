import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Star, Zap, Crown, BookOpen, X, Send } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { CourseRegistrations } from './CourseRegistrations';
import { UserProfile } from '../types';
import { VIP_COURSES } from '../constants';

export const Courses: React.FC = () => {
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    note: ''
  });

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setUserProfile(doc.data() as UserProfile);
    });
    return () => unsubscribe();
  }, [user]);

  const isUserAdmin = userProfile?.role === 'admin' || userProfile?.role === 'tech';
  const userVipCourseId = userProfile?.vipCourseId;
  const isVipActive = userProfile?.isVip && (!userProfile?.vipExpiresAt || new Date(userProfile.vipExpiresAt) > new Date());

  const courses = [
    {
      id: '1-month',
      title: 'Khóa 1 Tháng',
      price: '2.000 Đ',
      features: ['Canva', 'PowerPoint', 'Gemini', 'NotebookLM'],
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      color: 'from-blue-500 to-cyan-400'
    },
    {
      id: '12-months',
      title: 'Khóa 12 Tháng',
      price: '24.000 Đ',
      features: ['Canva', 'PowerPoint', 'Gemini', 'NotebookLM', 'Claude AI', 'ChatGPT'],
      icon: <Star className="w-6 h-6 text-amber-500" />,
      color: 'from-amber-500 to-orange-400',
      popular: true
    },
    {
      id: '3-years',
      title: 'Khóa 3 Năm',
      price: '72.000 Đ',
      features: ['Tất cả các AI', 'Canva', 'PowerPoint', 'Gemini', 'NotebookLM', 'Claude AI', 'ChatGPT', 'Và nhiều hơn nữa...'],
      icon: <Crown className="w-6 h-6 text-purple-500" />,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const handleOpenModal = (course: any) => {
    setSelectedCourse(course);
    setFormData({
      name: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      note: ''
    });
    setSuccessMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !user) return;
    
    setIsSubmitting(true);
    try {
      // Create registration record
      await addDoc(collection(db, 'course_registrations'), {
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        price: selectedCourse.price,
        userId: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        note: formData.note,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        title: 'Đăng ký khóa học mới!',
        message: `${formData.name} đã đăng ký ${selectedCourse.title}.\nSĐT: ${formData.phone}\nEmail: ${formData.email}${formData.note ? `\nGhi chú: ${formData.note}` : ''}`,
        type: 'course_registration',
        createdAt: serverTimestamp()
      });

      // Send personal notification to the user
      await addDoc(collection(db, 'user_notifications'), {
        userId: user.uid,
        title: 'Đăng ký thành công!',
        message: `Bạn đã đăng ký thành công ${selectedCourse.title}. Chúng tôi sẽ sớm liên hệ với bạn.`,
        type: 'course_registration_success',
        read: false,
        createdAt: serverTimestamp()
      });

      setSuccessMessage('Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting registration:', error);
      alert('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative">
      <div className="text-center space-y-3 sm:space-y-4">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Khóa Học AI & Kỹ Năng</h2>
        <p className="text-xs sm:text-base text-slate-500 max-w-2xl mx-auto">Nâng cao kỹ năng của bạn với các khóa học chất lượng cao, giá cả học sinh.</p>
        {(isVipActive || isUserAdmin) && (
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-bold border border-amber-200 shadow-sm animate-bounce">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>
              {isUserAdmin 
                ? 'Bạn là Quản trị viên - Đã mở khóa tất cả khóa học!' 
                : `Bạn đang sở hữu ${VIP_COURSES.find(c => c.id === userVipCourseId)?.title || 'Khóa học'} - VIP Active!`}
            </span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-xl border ${course.popular ? 'border-amber-400 shadow-amber-100' : 'border-slate-100'} overflow-hidden flex flex-col`}
          >
            {course.popular && (
              <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] sm:text-xs font-bold text-center py-0.5 sm:py-1 uppercase tracking-wider">
                Phổ biến nhất
              </div>
            )}
            <div className="p-5 sm:p-8 flex-1 mt-3 sm:mt-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${course.color} bg-opacity-10 flex items-center justify-center mb-4 sm:mb-6 shadow-inner`}>
                <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                  {course.icon}
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">{course.title}</h3>
              <div className="flex items-baseline gap-1 mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{course.price}</span>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {course.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-600 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-8 pt-0 mt-auto">
              {(isUserAdmin || (isVipActive && userVipCourseId === course.id)) ? (
                <div className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Đã sở hữu</span>
                </div>
              ) : (
                <button 
                  onClick={() => handleOpenModal(course)}
                  className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white bg-gradient-to-r ${course.color} hover:opacity-90 transition-opacity shadow-lg text-sm sm:text-base`}
                >
                  Đăng ký ngay
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <CourseRegistrations />

      {/* Registration Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCourse && (
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
              <div className={`bg-gradient-to-r ${selectedCourse.color} p-4 sm:p-6 text-white relative`}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <h3 className="text-xl sm:text-2xl font-bold mb-1">Đăng ký khóa học</h3>
                <p className="text-xs sm:text-sm text-white/80">{selectedCourse.title} - {selectedCourse.price}</p>
              </div>

              <div className="p-4 sm:p-6">
                {successMessage ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Check className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Thành công!</h4>
                    <p className="text-xs sm:text-sm text-slate-600">{successMessage}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm"
                        placeholder="Nhập họ và tên của bạn"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm"
                        placeholder="Nhập email liên hệ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Số điện thoại / Zalo</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Ghi chú thêm (Tùy chọn)</label>
                      <textarea
                        value={formData.note}
                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20 sm:h-24 text-xs sm:text-sm"
                        placeholder="Bạn có yêu cầu gì thêm không?"
                      ></textarea>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 sm:py-4 rounded-xl font-bold text-white bg-gradient-to-r ${selectedCourse.color} hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 text-sm sm:text-base ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Xác nhận đăng ký</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
