import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, createStudentAccount, auth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Shield, User, Wrench, Search, Loader2, Key, RefreshCw, Plus, Star, MessageSquare, X } from 'lucide-react';
import { VIP_COURSES, getVipExpirationDate } from '../constants';

export const MemberManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', username: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [evaluatingUser, setEvaluatingUser] = useState<UserProfile | null>(null);
  const [evaluationContent, setEvaluationContent] = useState('');
  const [evaluationRating, setEvaluationRating] = useState(5);
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [viewingEvaluations, setViewingEvaluations] = useState<UserProfile | null>(null);
  const [userEvaluations, setUserEvaluations] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      try {
        await updateDoc(doc(db, 'users', uid), { role: newRole });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: 'Đã cập nhật quyền thành viên!' }
      }));
    } catch (error) {
      console.error('Error updating role:', error);
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Không thể cập nhật quyền.' }
      }));
    }
  };

  const handleVipToggle = async (uid: string, currentVip: boolean) => {
    try {
      try {
        await updateDoc(doc(db, 'users', uid), { isVip: !currentVip });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: `Đã ${!currentVip ? 'kích hoạt' : 'hủy'} quyền VIP!` }
      }));
    } catch (error) {
      console.error('Error updating VIP status:', error);
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi', message: 'Không thể cập nhật trạng thái VIP.' }
      }));
    }
  };

  const handleVipCourseChange = async (uid: string, courseId: string) => {
    try {
      const expirationDate = getVipExpirationDate(courseId);
      const isVip = courseId !== 'none';
      
      try {
        await updateDoc(doc(db, 'users', uid), { 
          vipCourseId: courseId,
          vipExpiresAt: expirationDate,
          isVip: isVip
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }

      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { 
          title: 'Thành công', 
          message: `Đã cập nhật khóa học VIP cho thành viên!` 
        }
      }));
    } catch (error) {
      console.error('Error updating VIP course:', error);
    }
  };

  const generateVipKey = async (uid: string) => {
    const randomKey = Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
      try {
        await updateDoc(doc(db, 'users', uid), { vipActivationKey: randomKey });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: 'Đã tạo mã kích hoạt mới!' }
      }));
    } catch (error) {
      console.error('Error generating key:', error);
    }
  };

  const handleVipDetailsUpdate = async (uid: string, field: string, value: string) => {
    try {
      try {
        await updateDoc(doc(db, 'users', uid), { [field]: value });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const handleSendEvaluation = async () => {
    if (!evaluatingUser || !evaluationContent.trim()) return;
    
    setIsSubmittingEval(true);
    try {
      const month = new Date().toISOString().substring(0, 7); // YYYY-MM
      await addDoc(collection(db, 'monthly_evaluations'), {
        userId: evaluatingUser.uid,
        userName: evaluatingUser.displayName || 'Học sinh',
        month,
        content: evaluationContent,
        rating: evaluationRating,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      });
      
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: `Đã gửi nhận xét cho ${evaluatingUser.displayName}!` }
      }));
      setEvaluatingUser(null);
      setEvaluationContent('');
      setEvaluationRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'monthly_evaluations');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  useEffect(() => {
    if (!viewingEvaluations) {
      setUserEvaluations([]);
      return;
    }

    const q = query(
      collection(db, 'monthly_evaluations'),
      where('userId', '==', viewingEvaluations.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserEvaluations(evals);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'monthly_evaluations'));

    return () => unsubscribe();
  }, [viewingEvaluations]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.username || !newStudent.password) return;
    
    setIsCreating(true);
    try {
      await createStudentAccount(newStudent.name, newStudent.username, newStudent.password);
      setNewStudent({ name: '', username: '', password: '' });
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Thành công', message: 'Đã tạo tài khoản học sinh mới!' }
      }));
    } catch (error: any) {
      console.error('Error creating account:', error);
      let message = 'Không thể tạo tài khoản.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Tên tài khoản này đã tồn tại.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Lỗi: Bạn chưa bật tính năng "Email/Password" trong Firebase Console. Vui lòng bật nó để tạo tài khoản.';
      }
      window.dispatchEvent(new CustomEvent('local-notification', {
        detail: { title: 'Lỗi cấu hình', message }
      }));
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Create Account Section */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Tạo tài khoản học sinh mới
        </h3>
        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Họ và tên"
            value={newStudent.name}
            onChange={e => setNewStudent({...newStudent, name: e.target.value})}
            className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            type="text"
            placeholder="Tên đăng nhập"
            value={newStudent.username}
            onChange={e => setNewStudent({...newStudent, username: e.target.value})}
            className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={newStudent.password}
            onChange={e => setNewStudent({...newStudent, password: e.target.value})}
            className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={isCreating}
            className="bg-slate-900 text-white rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 sm:w-4 sm:h-4 animate-spin" /> : <Plus className="w-4 h-4 sm:w-4 sm:h-4" />}
            {isCreating ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>
        <p className="mt-2 sm:mt-3 text-[8px] sm:text-[10px] text-slate-500 italic">
          * Tài khoản sẽ có định dạng: <span className="font-bold">tên_đăng_nhập</span>. Cung cấp tên đăng nhập và mật khẩu này cho học sinh.
        </p>
      </div>

      {/* Member Gallery Section */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 sm:mb-6 flex items-center gap-1.5 sm:gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Ảnh đại diện thành viên
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4">
          {users.map((user) => (
            <div key={user.uid} className="flex flex-col items-center gap-1.5 sm:gap-2 group">
              <div className="relative">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border-2 border-slate-100 group-hover:border-indigo-500 transition-all shadow-sm" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 border-2 border-slate-100 group-hover:border-indigo-500 transition-all">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
                {user.role === 'admin' && (
                  <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-amber-400 text-white p-0.5 sm:p-1 rounded-md sm:rounded-lg shadow-sm">
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                )}
                {user.role === 'tech' && (
                  <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-emerald-400 text-white p-0.5 sm:p-1 rounded-md sm:rounded-lg shadow-sm">
                    <Wrench className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                )}
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 truncate w-full text-center px-1">
                {user.displayName || 'Học sinh'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            placeholder="Tìm kiếm thành viên..."
          />
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Tổng số: <span className="text-slate-900 font-bold">{users.length}</span> thành viên
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Thành viên</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Email</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">VIP</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Khóa</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Hạn dùng</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Mã kích hoạt</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Vai trò</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold whitespace-nowrap">Đánh giá</th>
                <th className="px-3 sm:px-6 py-2 sm:py-4 font-bold text-right whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative shrink-0">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <User className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-[100px]">
                        <span className="font-bold text-slate-900 truncate">{user.displayName || 'Học sinh'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-slate-500 truncate max-w-[100px] sm:max-w-[200px]">{user.email}</td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <button
                      onClick={() => handleVipToggle(user.uid, !!user.isVip)}
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        user.isVip 
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {user.isVip ? 'VIP' : 'Thường'}
                    </button>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <select
                      value={user.vipCourseId || 'none'}
                      onChange={(e) => handleVipCourseChange(user.uid, e.target.value)}
                      className="w-24 sm:w-32 bg-slate-50 border border-slate-200 rounded-md sm:rounded-lg px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {VIP_COURSES.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <input
                      type="date"
                      value={user.vipExpiresAt ? user.vipExpiresAt.split('T')[0] : ''}
                      onChange={(e) => handleVipDetailsUpdate(user.uid, 'vipExpiresAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="bg-slate-50 border border-slate-200 rounded-md sm:rounded-lg px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <code className="bg-slate-100 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[8px] sm:text-[10px] font-mono text-slate-600 whitespace-nowrap">
                        {user.vipActivationKey || '---'}
                      </code>
                      <button 
                        onClick={() => generateVipKey(user.uid)}
                        className="p-0.5 sm:p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        title="Tạo mã mới"
                      >
                        <RefreshCw className="w-3 h-3 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      user.role === 'tech' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role === 'admin' && <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {user.role === 'tech' && <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {user.role === 'student' && <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {user.role === 'admin' ? 'Quản trị viên' : user.role === 'tech' ? 'Kỹ thuật viên' : 'Học sinh'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => setEvaluatingUser(user)}
                        className="p-1 sm:p-2 bg-indigo-50 text-indigo-600 rounded-md sm:rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
                        title="Đánh giá tháng"
                      >
                        <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => setViewingEvaluations(user)}
                        className="p-1 sm:p-2 bg-slate-50 text-slate-600 rounded-md sm:rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                        title="Xem lịch sử đánh giá"
                      >
                        <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-[10px] sm:text-sm rounded-md sm:rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-1 sm:p-2 outline-none cursor-pointer"
                    >
                      <option value="student">Học sinh</option>
                      <option value="tech">Kỹ thuật viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 sm:px-6 py-4 sm:py-8 text-center text-slate-500 text-xs sm:text-sm">
                    Không tìm thấy thành viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Modal */}
      {evaluatingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Đánh giá thành viên</h3>
                  <p className="text-[10px] sm:text-xs text-indigo-100">Gửi nhận xét tháng cho {evaluatingUser.displayName}</p>
                </div>
              </div>
              <button onClick={() => setEvaluatingUser(null)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Xếp hạng (1-5 sao)</label>
                <div className="flex gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setEvaluationRating(star)}
                      className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                        evaluationRating >= star ? 'text-amber-400 scale-110' : 'text-slate-200'
                      }`}
                    >
                      <Star className="w-6 h-6 sm:w-8 sm:h-8" fill={evaluationRating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Nội dung nhận xét</label>
                <textarea
                  value={evaluationContent}
                  onChange={(e) => setEvaluationContent(e.target.value)}
                  placeholder="Nhập nhận xét chi tiết về quá trình học tập, thái độ và kết quả của học sinh trong tháng này..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs sm:text-sm min-h-[100px] sm:min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                <button
                  onClick={() => setEvaluatingUser(null)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-xs sm:text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSendEvaluation}
                  disabled={isSubmittingEval || !evaluationContent.trim()}
                  className="flex-[2] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  {isSubmittingEval ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Star className="w-4 h-4 sm:w-5 sm:h-5" />}
                  Gửi đánh giá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Evaluations Modal */}
      {viewingEvaluations && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg sm:rounded-xl">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Lịch sử đánh giá</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">Các nhận xét đã gửi cho {viewingEvaluations.displayName}</p>
                </div>
              </div>
              <button onClick={() => setViewingEvaluations(null)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-3 sm:space-y-4">
              {userEvaluations.length === 0 ? (
                <div className="text-center py-8 sm:py-10 text-slate-400 text-xs sm:text-sm">
                  Chưa có đánh giá nào cho thành viên này.
                </div>
              ) : (
                userEvaluations.map((evaluation) => (
                  <div key={evaluation.id} className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div>
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                          Tháng {evaluation.month}
                        </span>
                        <div className="flex gap-0.5 mt-1.5 sm:mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${star <= evaluation.rating ? 'text-amber-400' : 'text-slate-200'}`} 
                              fill={star <= evaluation.rating ? 'currentColor' : 'none'} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] text-slate-400">
                        {evaluation.createdAt?.toDate().toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {evaluation.content}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setViewingEvaluations(null)}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-all text-xs sm:text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
