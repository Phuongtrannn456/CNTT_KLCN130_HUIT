export const getDomainTerminology = () => {
  const mode = process.env.REACT_APP_DOMAIN_MODE || 'UNIVERSITY';

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

  // Default: UNIVERSITY
  return {
    STUDENT: 'Học sinh',
    TEACHER: 'Giáo viên',
    PROJECT: 'Đề tài',
    MAJOR: 'Chuyên ngành',
    GPA: 'GPA',
    DEPARTMENT: 'Khoa'
  };
};
