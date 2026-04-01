export const VIP_COURSES = [
  { id: '1-month', title: 'Khóa 1 Tháng', durationDays: 30 },
  { id: '12-months', title: 'Khóa 12 Tháng', durationDays: 365 },
  { id: '3-years', title: 'Khóa 3 Năm', durationDays: 1095 },
  { id: 'custom', title: 'Tùy chỉnh', durationDays: 0 },
  { id: 'none', title: 'Thường', durationDays: 0 }
];

export const getVipExpirationDate = (courseId: string): string | null => {
  const course = VIP_COURSES.find(c => c.id === courseId);
  if (!course || course.id === 'none') return null;
  if (course.id === 'custom') return null; // Let user pick manually
  
  const date = new Date();
  date.setDate(date.getDate() + course.durationDays);
  return date.toISOString();
};
