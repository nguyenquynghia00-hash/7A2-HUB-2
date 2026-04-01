import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Comment } from '../types';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CommentSectionProps {
  postId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    });
    return unsubscribe;
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Anonymous',
        text: newComment,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
      <div className="space-y-2 sm:space-y-3">
        {comments.length === 0 ? (
          <p className="text-center py-3 sm:py-4 text-slate-400 text-xs sm:text-sm italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 sm:gap-3 group">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-slate-600 shrink-0">
                {comment.authorName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl rounded-tl-none border border-slate-100 shadow-sm relative">
                  <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-900">{comment.authorName}</span>
                    <span className="text-[8px] sm:text-[10px] text-slate-400">
                      {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{comment.text}</p>
                  
                  {(auth.currentUser?.uid === comment.authorId || auth.currentUser?.email === 'nguyenquynghia00@gmail.com') && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="absolute -right-1.5 -top-1.5 sm:-right-2 sm:-top-2 p-1 sm:p-1.5 bg-white border border-slate-100 text-slate-400 hover:text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={10} className="sm:w-3 sm:h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {auth.currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận..."
            className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          <button
            disabled={isSubmitting || !newComment.trim()}
            type="submit"
            className="p-1.5 sm:p-2 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </form>
      ) : (
        <p className="text-center text-[10px] sm:text-xs text-slate-500">Đăng nhập để bình luận.</p>
      )}
    </div>
  );
};
