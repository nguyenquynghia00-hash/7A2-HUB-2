import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { User, Search, Loader2 } from 'lucide-react';

interface MemberListProps {
  onSelectUser: (uid: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => unsubscribe();
  }, []);

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
    <div className="space-y-4 sm:space-y-6">
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-slate-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          placeholder="Tìm kiếm thành viên..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredUsers.map((user) => (
          <button
            key={user.uid}
            onClick={() => onSelectUser(user.uid)}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left w-full"
          >
            <div className="relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm sm:text-base text-slate-900">{user.displayName || 'Học sinh'}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500">{user.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
