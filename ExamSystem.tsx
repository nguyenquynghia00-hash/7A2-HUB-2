import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Clock, ClipboardList, CheckCircle2, AlertCircle, Timer, Send, ChevronRight, ChevronLeft, Trash2, Trophy, User, RefreshCcw, Image as ImageIcon, Upload, Star, Eye, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  questions: Question[];
  requireEssay: boolean;
  essayTaskDescription?: string;
  applicationTaskDescription?: string;
  keyKnowledge?: string;
  createdBy: string;
  createdAt: any;
}

interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  essaySubmission?: string;
  essayScore?: number;
  isGraded?: boolean;
  finishedAt: any;
  answersBreakdown?: { questionId: string, userAnswer: number, correctAnswer: number, isCorrect: boolean, explanation?: string }[];
}

export const ExamSystem: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'create' | 'session' | 'result' | 'grade'>('list');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const unsubscribeExams = onSnapshot(query(collection(db, 'exams'), orderBy('createdAt', 'desc')), (snapshot) => {
      const examData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exams'));

    const unsubscribeResults = onSnapshot(query(collection(db, 'exam_results'), orderBy('finishedAt', 'desc')), (snapshot) => {
      const resultData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setResults(resultData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'exam_results'));

    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(docSnap => {
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role || 'student');
        }
      });
    }

    return () => {
      unsubscribeExams();
      unsubscribeResults();
    };
  }, []);

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setActiveView('session');
  };

  const handleFinishExam = async (score: number, total: number, essayAnswer?: string, answersBreakdown?: any[]) => {
    if (!selectedExam || !auth.currentUser) return;

    const resultData = {
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Học sinh',
      score,
      totalQuestions: total,
      essaySubmission: essayAnswer || null,
      essayScore: 0,
      isGraded: false,
      finishedAt: serverTimestamp(),
      answersBreakdown: answersBreakdown || null,
    };

    try {
      const docRef = await addDoc(collection(db, 'exam_results'), resultData);
      setCurrentResult({ id: docRef.id, ...resultData, finishedAt: new Date() } as any);
      setActiveView('result');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exam_results');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa bài thi?',
      message: 'Bạn có chắc chắn muốn xóa bài thi này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'exams', examId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `exams/${examId}`);
        }
      }
    });
  };

  const handleResetResults = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset bảng điểm?',
      message: 'Bạn có chắc chắn muốn xóa tất cả kết quả thi? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          results.forEach((result) => {
            batch.delete(doc(db, 'exam_results', result.id));
          });
          await batch.commit();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'exam_results');
        }
      }
    });
  };

  const handleDeleteResult = async (resultId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa kết quả?',
      message: 'Bạn có chắc chắn muốn xóa kết quả thi này?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'exam_results', resultId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `exam_results/${resultId}`);
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {activeView === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <h2 className="text-lg sm:text-3xl font-black text-slate-900 tracking-tight">Hệ thống Thi cử</h2>
                <p className="text-[10px] sm:text-base text-slate-500 font-medium">Tham gia các bài kiểm tra để đánh giá năng lực của bạn.</p>
              </div>
              {(userRole === 'admin' || userRole === 'tech') && (
                <button
                  onClick={() => setActiveView('create')}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-indigo-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-xs sm:text-base font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  Tạo bài thi mới
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {exams.length > 0 ? (
                exams.map((exam) => (
                  <div key={exam.id} className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-2 sm:mb-4">
                      <div className="p-1.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {(userRole === 'admin' || userRole === 'tech') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExam(exam.id);
                            }}
                            className="p-1 sm:p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                          </button>
                        )}
                        <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[8px] sm:text-xs font-bold text-slate-500">
                          <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                          {exam.duration} phút
                        </div>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 mb-0.5 sm:mb-2">{exam.title}</h3>
                    <p className="text-slate-500 text-[10px] sm:text-sm mb-3 sm:mb-6 line-clamp-2 font-medium">{exam.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {exam.questions.length} câu hỏi
                        </span>
                        {results.some(r => r.examId === exam.id && r.userId === auth.currentUser?.uid) && !(userRole === 'admin' || userRole === 'tech') ? (
                          <div className="flex items-center gap-1 sm:gap-2 text-emerald-600 font-black text-[10px] sm:text-base">
                            <Sparkles className="w-3 h-3 sm:w-[18px] sm:h-[18px]" />
                            Đã hoàn thành
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartExam(exam)}
                            className="flex items-center gap-1 sm:gap-2 text-indigo-600 font-black text-[10px] sm:text-base hover:gap-1.5 sm:hover:gap-3 transition-all"
                          >
                            {results.some(r => r.examId === exam.id && r.userId === auth.currentUser?.uid) ? 'Làm lại bài thi' : 'Bắt đầu làm bài'}
                            <ChevronRight className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                          </button>
                        )}
                      </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 sm:py-20 text-center bg-slate-50 rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-slate-200">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-slate-300 shadow-sm">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <p className="text-xs sm:text-base text-slate-400 font-bold">Chưa có bài thi nào được tạo.</p>
                </div>
              )}
            </div>

            {results.length > 0 && (
              <div className="space-y-3 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-1.5 sm:gap-3">
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500" />
                    Bảng vàng kết quả
                  </h3>
                  {(userRole === 'admin' || userRole === 'tech') && (
                    <button
                      onClick={handleResetResults}
                      className="flex items-center gap-1 sm:gap-2 text-rose-500 hover:text-rose-600 font-bold text-[10px] sm:text-sm transition-colors"
                    >
                      <RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      Reset bảng điểm
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Thành viên</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Bài thi</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm số</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                          {(userRole === 'admin' || userRole === 'tech') && (
                            <th className="px-3 sm:px-6 py-2 sm:py-4 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {results.map((result) => (
                          <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex items-center gap-1.5 sm:gap-3">
                                <div className="w-5 h-5 sm:w-8 sm:h-8 bg-indigo-100 text-indigo-600 rounded-md sm:rounded-lg flex items-center justify-center font-black text-[8px] sm:text-xs">
                                  {result.userName.charAt(0)}
                                </div>
                                <span className="font-bold text-[10px] sm:text-sm text-slate-700">{result.userName}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 font-medium text-[10px] sm:text-sm text-slate-600">{result.examTitle}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-black ${
                                (result.score / result.totalQuestions) >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                                (result.score / result.totalQuestions) >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {result.score}/{result.totalQuestions}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-slate-400">
                              {result.finishedAt?.toDate ? result.finishedAt.toDate().toLocaleString('vi-VN') : 'Vừa xong'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                                    result.isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {result.isGraded ? 'Đã chấm' : 'Chờ chấm'}
                                  </span>
                                  {result.isGraded && (
                                    <div className="flex flex-col text-[9px] sm:text-[10px] font-bold text-indigo-600">
                                      {(result.essaySubmission || result.essayScore > 0) && (
                                        <span>+{result.essayScore}đ tự luận/thêm</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {(userRole === 'admin' || userRole === 'tech') && (
                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                  {!result.isGraded && (
                                    <button
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setActiveView('grade');
                                      }}
                                      className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      Chấm bài
                                    </button>
                                  )}
                                  {result.isGraded && (
                                    <button
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setActiveView('grade');
                                      }}
                                      className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                      title="Xem chi tiết"
                                    >
                                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteResult(result.id)}
                                    className="p-1.5 sm:p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Xóa kết quả"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ExamCreator onCancel={() => setActiveView('list')} onCreated={() => setActiveView('list')} />
          </motion.div>
        )}

        {activeView === 'session' && selectedExam && (
          <motion.div
            key="session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <ExamSession exam={selectedExam} onFinish={handleFinishExam} onCancel={() => setActiveView('list')} />
          </motion.div>
        )}

        {activeView === 'grade' && selectedResult && (
          <motion.div
            key="grade"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GradeSubmission result={selectedResult} onBack={() => setActiveView('list')} />
          </motion.div>
        )}

        {activeView === 'result' && currentResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-md mx-auto text-center py-12 space-y-8">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">Hoàn thành!</h2>
                <p className="text-slate-500 font-medium">Bạn đã hoàn thành bài thi: <span className="text-indigo-600 font-bold">{currentResult.examTitle}</span></p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs mb-4">Kết quả của bạn</p>
                <div className="text-6xl font-black text-slate-900 mb-2">
                  {currentResult.score}<span className="text-slate-300 text-3xl">/{currentResult.totalQuestions}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000" 
                    style={{ width: `${(currentResult.score / currentResult.totalQuestions) * 100}%` }}
                  ></div>
                </div>
                
                {currentResult.answersBreakdown && (
                  <div className="text-left space-y-4 mt-8">
                    <h4 className="font-black text-slate-900">Chi tiết đáp án:</h4>
                    {currentResult.answersBreakdown.map((b, idx) => {
                      const question = selectedExam?.questions.find(q => q.id === b.questionId);
                      return (
                        <div key={idx} className={`p-4 rounded-xl ${b.isCorrect ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                          <p className="font-bold text-slate-900">Câu {idx + 1}: {question?.text}</p>
                          <p className="text-sm">Đáp án của bạn: <span className="font-bold">{question?.options[b.userAnswer] || 'Chưa trả lời'}</span></p>
                          {!b.isCorrect && (
                            <p className="text-sm">Đáp án đúng: <span className="font-bold text-emerald-600">{question?.options[b.correctAnswer]}</span></p>
                          )}
                          {b.explanation && (
                            <p className="text-sm mt-2 italic text-slate-600">Giải thích: {b.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-slate-500 font-medium italic mt-6">
                  {(currentResult.score / currentResult.totalQuestions) >= 0.8 ? 'Xuất sắc! Bạn làm rất tốt.' :
                   (currentResult.score / currentResult.totalQuestions) >= 0.5 ? 'Khá tốt! Hãy cố gắng hơn nhé.' : 'Cần cố gắng nhiều hơn ở lần sau.'}
                </p>
              </div>
              <button
                onClick={() => setActiveView('list')}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
              >
                Quay lại danh sách
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full relative z-10 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 font-medium mb-8 text-sm">
                {confirmModal.message}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmModal.onConfirm}
                  className="w-full bg-rose-500 text-white py-3.5 rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                >
                  Xác nhận xóa
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExamCreator: React.FC<{ onCancel: () => void, onCreated: () => void }> = ({ onCancel, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [requireEssay, setRequireEssay] = useState(false);
  const [essayTaskDescription, setEssayTaskDescription] = useState('');
  const [applicationTaskDescription, setApplicationTaskDescription] = useState('');
  const [keyKnowledge, setKeyKnowledge] = useState('');
  const [questions, setQuestions] = useState<Omit<Question, 'id'>[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field === 'text') newQuestions[index].text = value;
    if (field === 'correctAnswer') newQuestions[index].correctAnswer = value;
    if (field === 'explanation') newQuestions[index].explanation = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'exams'), {
        title,
        description,
        duration: isNaN(duration) ? 15 : duration,
        requireEssay,
        essayTaskDescription: requireEssay ? essayTaskDescription : '',
        applicationTaskDescription,
        keyKnowledge,
        questions: questions.map((q, i) => ({ ...q, id: `q${i}` })),
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      onCreated();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exams');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onCancel} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-900">Tạo bài thi mới</h2>
        <div className="w-12"></div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Tiêu đề bài thi</label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Kiểm tra Toán 15 phút"
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Mô tả ngắn</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nội dung kiểm tra về chương..."
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Thời gian làm bài (phút)</label>
          <div className="flex items-center gap-4">
            <input
              required
              type="number"
              min="1"
              max="180"
              value={isNaN(duration) ? '' : duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-32 bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <span className="text-slate-500 font-bold">phút</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-12 h-6 rounded-full transition-all relative ${requireEssay ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={requireEssay} 
                onChange={(e) => setRequireEssay(e.target.checked)} 
              />
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requireEssay ? 'left-7' : 'left-1'}`}></div>
            </div>
            <span className="font-bold text-slate-700">Yêu cầu viết bài tự luận</span>
          </label>
          
          {requireEssay && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-2"
            >
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Câu hỏi tự luận</label>
              <textarea
                required={requireEssay}
                value={essayTaskDescription}
                onChange={(e) => setEssayTaskDescription(e.target.value)}
                placeholder="Ví dụ: Hãy nêu cảm nghĩ của em về bài học hôm nay."
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
              />
            </motion.div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Kiến thức trọng tâm</label>
          <textarea
            value={keyKnowledge}
            onChange={(e) => setKeyKnowledge(e.target.value)}
            placeholder="Nhập kiến thức trọng tâm cần ghi nhớ..."
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-32 resize-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Đề bài câu vận dụng (Gửi qua Zalo: 0364975058)</label>
          <textarea
            value={applicationTaskDescription}
            onChange={(e) => setApplicationTaskDescription(e.target.value)}
            placeholder="Nhập đề bài câu vận dụng tại đây. Học sinh sẽ đọc và gửi bài qua Zalo."
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-32 resize-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-900 ml-2">Danh sách câu hỏi</h3>
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 relative group">
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Câu hỏi {qIdx + 1}</label>
              <input
                required
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                placeholder="Nhập câu hỏi..."
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Giải thích (tùy chọn)</label>
              <input
                type="text"
                value={q.explanation || ''}
                onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                placeholder="Nhập giải thích cho câu hỏi này..."
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lựa chọn {String.fromCharCode(65 + oIdx)}</label>
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctAnswer === oIdx}
                      onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </div>
                  <input
                    required
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                    className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 transition-all ${
                      q.correctAnswer === oIdx ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'focus:ring-indigo-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={addQuestion}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
        >
          <Plus size={20} />
          Thêm câu hỏi
        </button>
        <button
          disabled={isSubmitting}
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu bài thi'}
        </button>
      </div>
    </form>
  );
};

const ExamSession: React.FC<{ exam: Exam, onFinish: (score: number, total: number, essayAnswer?: string, answersBreakdown?: any[]) => void, onCancel: () => void }> = ({ exam, onFinish, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [essayAnswer, setEssayAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const timerRef = useRef<any>(null);

  const totalPages = exam.questions.length + (exam.keyKnowledge ? 1 : 0) + (exam.requireEssay ? 1 : 0) + (exam.applicationTaskDescription ? 1 : 0);
  const isKeyKnowledgePage = exam.keyKnowledge && currentIdx === 0;
  const isMCQPage = currentIdx >= (exam.keyKnowledge ? 1 : 0) && currentIdx < (exam.questions.length + (exam.keyKnowledge ? 1 : 0));
  const isEssayPage = exam.requireEssay && currentIdx === (exam.questions.length + (exam.keyKnowledge ? 1 : 0));
  const isApplicationPage = exam.applicationTaskDescription && 
    currentIdx === (exam.questions.length + (exam.keyKnowledge ? 1 : 0) + (exam.requireEssay ? 1 : 0));

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (oIdx: number) => {
    setAnswers({ ...answers, [currentIdx - (exam.keyKnowledge ? 1 : 0)]: oIdx });
  };

  const handleSubmit = async () => {
    let score = 0;
    const breakdown = exam.questions.map((q, idx) => {
      const isCorrect = answers[idx] === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        userAnswer: answers[idx],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });
    onFinish(score, exam.questions.length, essayAnswer, breakdown);
  };

  const currentQuestion = isMCQPage ? exam.questions[currentIdx] : null;
  const progress = ((currentIdx + 1) / totalPages) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with Timer */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-xl py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
            <Timer className={`${timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-indigo-600'}`} size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian còn lại</p>
            <p className={`text-2xl font-black tabular-nums ${timeLeft < 60 ? 'text-rose-500' : 'text-slate-900'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            <span>Tiến độ</span>
            <span>{currentIdx + 1}/{totalPages}</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          Nộp bài
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-200 shadow-xl space-y-10 relative overflow-hidden min-h-[500px]">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        {isMCQPage && currentQuestion && (
          <motion.div 
            key={`q-${currentIdx}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
                Câu hỏi {currentIdx - (exam.keyKnowledge ? 1 : 0) + 1}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {currentQuestion.text}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`group flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all text-left ${
                    answers[currentIdx - (exam.keyKnowledge ? 1 : 0)] === oIdx
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                      : 'bg-slate-50 border-transparent hover:border-indigo-200 text-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 transition-colors ${
                    answers[currentIdx - (exam.keyKnowledge ? 1 : 0)] === oIdx
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-400 group-hover:text-indigo-600'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </div>
                  <span className="font-bold text-lg">{opt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {isKeyKnowledgePage && (
          <motion.div 
            key="knowledge-page"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest">
                Kiến thức trọng tâm
              </span>
              <div className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                {exam.keyKnowledge}
              </div>
            </div>
          </motion.div>
        )}

        {isEssayPage && (
          <motion.div 
            key="essay-page"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
                Phần tự luận
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {exam.essayTaskDescription || 'Vui lòng nhập bài làm tự luận của bạn.'}
              </h3>
            </div>
            <textarea
              value={essayAnswer}
              onChange={(e) => setEssayAnswer(e.target.value)}
              placeholder="Nhập bài làm của bạn tại đây..."
              className="w-full bg-slate-50 border-none rounded-[2rem] px-8 py-6 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-64 resize-none"
            />
          </motion.div>
        )}

        {isApplicationPage && (
          <motion.div 
            key="app-page"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-widest">
                Câu vận dụng
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {exam.applicationTaskDescription}
              </h3>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertCircle size={24} />
                <span className="font-black uppercase tracking-wider text-sm">Hướng dẫn nộp bài</span>
              </div>
              <p className="text-amber-900 font-bold text-lg leading-relaxed">
                Học sinh không cần làm bài này trên hệ thống. Hãy đọc kỹ đề bài, làm ra giấy hoặc máy tính và gửi kết quả cho giáo viên qua Zalo:
              </p>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-amber-100 w-fit">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại / Zalo</p>
                  <p className="text-xl font-black text-slate-900">0364975058</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(prev => prev - 1)}
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 disabled:opacity-30 transition-all"
        >
          <ChevronLeft size={24} />
          Trang trước
        </button>
        <div className="hidden sm:flex gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentIdx ? 'bg-indigo-600 w-8' : 
                (idx >= (exam.keyKnowledge ? 1 : 0) && idx < (exam.questions.length + (exam.keyKnowledge ? 1 : 0)) && answers[idx - (exam.keyKnowledge ? 1 : 0)] !== undefined) || 
                (idx === (exam.questions.length + (exam.keyKnowledge ? 1 : 0)) && exam.requireEssay && essayAnswer.trim()) ? 'bg-indigo-200' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <button
          disabled={currentIdx === totalPages - 1}
          onClick={() => setCurrentIdx(prev => prev + 1)}
          className="flex items-center gap-2 text-indigo-600 font-black hover:text-indigo-700 disabled:opacity-30 transition-all"
        >
          Trang tiếp
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Confirm Submit Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmSubmit(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl max-w-md w-full relative z-10 text-center"
            >
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Send size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Nộp bài thi?</h3>
              <p className="text-slate-500 font-medium mb-8">
                Bạn đã trả lời {Object.keys(answers).length}/{exam.questions.length} câu trắc nghiệm {exam.requireEssay ? `và ${essayAnswer.trim() ? 'đã' : 'chưa'} làm bài tự luận` : ''}. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Xác nhận nộp bài
                </button>
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Tiếp tục làm bài
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GradeSubmission: React.FC<{ result: ExamResult, onBack: () => void }> = ({ result, onBack }) => {
  const [essayScore, setEssayScore] = useState(result.essayScore || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveGrade = async () => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'exam_results', result.id), {
        essayScore: result.essaySubmission ? (isNaN(essayScore) ? 0 : essayScore) : 0,
        isGraded: true
      });
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `exam_results/${result.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-900">Chấm bài thủ công</h2>
        <div className="w-12"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {result.essaySubmission && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-indigo-600 mb-2">
                <ClipboardList size={24} />
                <h3 className="text-lg font-black uppercase tracking-widest">Bài làm tự luận</h3>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl font-medium text-slate-700 whitespace-pre-wrap min-h-[200px]">
                {result.essaySubmission}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 sticky top-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Học sinh</p>
              <p className="text-xl font-black text-slate-900">{result.userName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bài thi</p>
              <p className="text-slate-600 font-bold">{result.examTitle}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm trắc nghiệm</p>
              <p className="text-slate-900 font-black">{result.score}/{result.totalQuestions}</p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <ClipboardList size={14} />
                  Chấm điểm thêm/tự luận (0 - 10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={isNaN(essayScore) ? '' : essayScore}
                  onChange={(e) => setEssayScore(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-2xl text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <p className="text-xs text-slate-400 font-medium italic">
                * Điểm này sẽ được cộng thêm vào kết quả tổng quát của học sinh.
              </p>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handleSaveGrade}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Hoàn tất chấm điểm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
