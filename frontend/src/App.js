import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import authService from './services/authService';

// Lazy loading route components for performance & bundle splitting
const LoginPage = lazy(() => import('./components/LoginPage'));
const CredentialVerify = lazy(() => import('./components/shared/CredentialVerify'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

// Teacher Components
const ChallengeManagement = lazy(() => import('./components/teacher/ChallengeManagement'));
const TeacherChallengeDetail = lazy(() => import('./components/teacher/TeacherChallengeDetail'));
const TopicManagement = lazy(() => import('./components/lecturer/TopicManagement'));
const SubmissionReview = lazy(() => import('./components/lecturer/SubmissionReview'));
const RubricsManagement = lazy(() => import('./components/lecturer/RubricsManagement'));
const ScoreComparison = lazy(() => import('./components/lecturer/ScoreComparison'));
const EntranceTestManager = lazy(() => import('./components/lecturer/EntranceTestManager'));
const CourseManagement = lazy(() => import('./components/lecturer/CourseManagement'));
const ClassManagement = lazy(() => import('./components/lecturer/ClassManagement'));
const StudentManagement = lazy(() => import('./components/lecturer/StudentManagement'));
const BlockchainDebugPage = lazy(() => import('./components/debug/BlockchainDebugPage'));

// Student Components
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard'));
const TopicRegistration = lazy(() => import('./components/student/TopicRegistration'));
const ChallengeList = lazy(() => import('./components/student/ChallengeList'));
const StudentSubmissionView = lazy(() => import('./components/student/StudentSubmissionView'));
const AchievementList = lazy(() => import('./components/student/AchievementList'));
const ReportUpload = lazy(() => import('./components/student/ReportUpload'));
const ProgressTracking = lazy(() => import('./components/student/ProgressTracking'));
const ProgressLog = lazy(() => import('./components/student/ProgressLog'));
const EntranceTest = lazy(() => import('./components/student/EntranceTest'));
const GroupManagement = lazy(() => import('./components/student/GroupManagement'));

// Admin & Others
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminRequests = lazy(() => import('./components/admin/AdminRequests'));
const PendingApproval = lazy(() => import('./components/PendingApproval'));

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

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<LoadingFallback />}>
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
            
            {/* Legacy Lecturer Routes */}
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
      </Suspense>
    </Router>
  );
}

export default App;
