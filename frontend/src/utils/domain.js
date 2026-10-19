export const getDomainTerminology = () => {
  const mode = process.env.REACT_APP_DOMAIN_MODE || 'K12';

  if (mode === 'K12') {
    return {
      STUDENT: 'Học sinh',
      TEACHER: 'Giáo viên',
      PROJECT: 'Dự án / Cuộc thi',
      MAJOR: 'Lĩnh vực / Môn học',
      GPA: 'Điểm trung bình',
      DEPARTMENT: 'Tổ bộ môn'
    };
  }

  // Fallback K-12
  return {
    STUDENT: 'Học sinh',
    TEACHER: 'Giáo viên',
    PROJECT: 'Dự án / Thử thách',
    MAJOR: 'Khối lớp / Lĩnh vực',
    GPA: 'Điểm trung bình',
    DEPARTMENT: 'Tổ bộ môn'
  };
};
