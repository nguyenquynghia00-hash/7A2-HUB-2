import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin' | 'tech';
  isVip?: boolean;
  vipExpiresAt?: string;
  vipCourseId?: string;
  vipActivationKey?: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'presentation' | 'document' | 'canva' | 'powerpoint' | 'gemini' | 'chatgpt' | 'gamma' | 'claude' | 'notebooklm';
  url: string;
  coverImage?: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  isVip?: boolean;
  vipCourseId?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: Timestamp;
  severity?: 'normal' | 'warning' | 'alert';
}
