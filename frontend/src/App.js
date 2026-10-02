import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import LoginPage from './components/LoginPage';
import CredentialVerify from './components/shared/CredentialVerify';
import MainLayout from './components/layout/MainLayout';
// Legacy Lecturer Components
import LecturerDashboard from './components/lecturer/LecturerDashboard';
import TopicManagement from './components/lecturer/TopicManagement';
import SubmissionReview from './components/lecturer/SubmissionReview';
import RubricsManagement from './components/lecturer/RubricsManagement';
import ScoreComparison from './components/lecturer/ScoreComparison';
import EntranceTestManager from './components/lecturer/EntranceTestManager';
import CourseManagement from './components/lecturer/CourseManagement';
import ClassManagement from './components/lecturer/ClassManagement';
import StudentManagement from './components/lecturer/StudentManagement';
// New Teacher Components
import ChallengeManagement from './components/teacher/ChallengeManagement';
// Student Components
import StudentDashboard from './components/student/StudentDashboard';
import TopicRegistration from './components/student/TopicRegistration';
import ChallengeList from './components/student/ChallengeList';
import StudentSubmissionView from './components/student/StudentSubmissionView';
import AchievementList from './components/student/AchievementList';
import TeacherChallengeDetail from './components/teacher/TeacherChallengeDetail';
import ReportUpload from './components/student/ReportUpload';
import ProgressTracking from './components/student/ProgressTracking';
import ProgressLog from './components/student/ProgressLog';
import EntranceTest from './components/student/EntranceTest';
import GroupManagement from './components/student/GroupManagement';
// CN1 & CN4 Components (Yến Nhi)
import TeacherTopicsPage from './components/cn1_cn4/TeacherTopicsPage';
import StudentTopicsPage from './components/cn1_cn4/StudentTopicsPage';
import RegistrationApprovalPage from './components/cn1_cn4/RegistrationApprovalPage';
import Web3ReportPage from './components/cn1_cn4/Web3ReportPage';

// Admin & Others
import BlockchainDebugPage from './components/debug/BlockchainDebugPage';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRequests from './components/admin/AdminRequests';
import PendingApproval from './components/PendingApproval';
// Contexts
import { ClassProvider } from './contexts/ClassContext';
import { LecturerClassProvider } from './contexts/LecturerClassContext';

// Protected Route component
function ProtectedRoute({ children, allowedRoles }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setCurrentUser(authService.getCurrentUser());
  }, []);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (allowedRoles && currentUser) {
    if (!allowedRoles.includes(currentUser.role_id)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

// Public Route component (redirect to dashboard if already authenticated)
function PublicRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setCurrentUser(authService.getCurrentUser());
  }, []);

  if (isAuthenticated && currentUser) {
    if (currentUser.role_id === 'ADMIN_ROLE') return <Navigate to="/admin" replace />;
    if (currentUser.role_id === 'TEACHER_ROLE') return <Navigate to="/teacher/challenges" replace />;
    return <Navigate to="/student/challenges" replace />;
  }
  return children;
}

// Helper to handle raw /dashboard fallback
function RoleRedirect() {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  if (user.role_id === 'ADMIN_ROLE') return <Navigate to="/admin" replace />;
  if (user.role_id === 'TEACHER_ROLE') return <Navigate to="/teacher/challenges" replace />;
  return <Navigate to="/student/challenges" replace />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/dashboard" element={<RoleRedirect />} />
        <Route path="/verify/:credentialId" element={<CredentialVerify />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Nested User Routes under MainLayout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN_ROLE']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
        </Route>

        <Route path="/teacher" element={
          <ProtectedRoute allowedRoles={['TEACHER_ROLE']}>
            <LecturerClassProvider>
              <MainLayout />
            </LecturerClassProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/teacher/challenges" replace />} />
          <Route path="challenges" element={<ChallengeManagement />} />
          <Route path="challenges/:id/participants" element={<TeacherChallengeDetail />} />
          
          {/* CN1 & CN4 Routes */}
          <Route path="manage-topics-cn1" element={<TeacherTopicsPage />} />
          <Route path="approve-registrations-cn1" element={<RegistrationApprovalPage />} />

          {/* Legacy Lecturer Routes - still kept but not on menu by default */}
          <Route path="topics" element={<TopicManagement />} />
          <Route path="review" element={<SubmissionReview />} />
          <Route path="rubrics" element={<RubricsManagement />} />
          <Route path="comparison" element={<ScoreComparison />} />
          <Route path="entrance-test/:deTaiId" element={<EntranceTestManager />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="blockchain" element={<BlockchainDebugPage />} />
        </Route>

        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['STUDENT_ROLE']}>
            <ClassProvider>
              <MainLayout />
            </ClassProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/student/challenges" replace />} />
          <Route path="challenges" element={<ChallengeList />} />
          <Route path="submissions/:id" element={<StudentSubmissionView />} />
          <Route path="achievements" element={<AchievementList />} />
          
          {/* CN1 & CN4 Student Routes */}
          <Route path="student-topics-cn1" element={<StudentTopicsPage />} />
          <Route path="web3-report-cn4" element={<Web3ReportPage />} />

          {/* Legacy Student Routes */}
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="register" element={<TopicRegistration />} />
          <Route path="upload" element={<ReportUpload />} />
          <Route path="progress-log" element={<ProgressLog />} />
          <Route path="progress" element={<ProgressTracking />} />
          <Route path="group" element={<GroupManagement />} />
          <Route path="entrance-test/:deTaiId" element={<EntranceTest />} />
        </Route>

        {/* Unknown */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
