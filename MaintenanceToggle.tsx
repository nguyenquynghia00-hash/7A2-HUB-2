import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ToggleLeft, ToggleRight } from 'lucide-react';

export function MaintenanceToggle({ isAdmin }: { isAdmin: boolean }) {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const maintenanceRef = doc(db, 'settings', 'maintenance');
    const unsub = onSnapshot(maintenanceRef, (docSnap) => {
      if (docSnap.exists()) {
        setMaintenance(docSnap.data().enabled);
      } else if (isAdmin) {
        setDoc(maintenanceRef, { enabled: false });
      }
    });
    return unsub;
  }, [isAdmin]);

  if (!isAdmin) return null;

  const toggleMaintenance = async () => {
    const maintenanceRef = doc(db, 'settings', 'maintenance');
    await setDoc(maintenanceRef, { enabled: !maintenance }, { merge: true });
  };

  return (
    <button
      onClick={toggleMaintenance}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
        maintenance ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
      }`}
    >
      {maintenance ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
      {maintenance ? 'Tắt bảo trì' : 'Bật bảo trì'}
    </button>
  );
}
