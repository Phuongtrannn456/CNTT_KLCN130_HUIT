import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import { Spin } from 'antd';

// Static imports for core components
import LoginPage from './components/LoginPage';
import MobileLogin from './components/MobileLogin';
import CredentialVerify from './components/shared/CredentialVerify';
import MainLayout from './components/layout/MainLayout';
import PendingApproval from './components/PendingApproval';

// Contexts
import { ClassProvider } from './contexts/ClassContext';
import { LecturerClassProvider } from './contexts/LecturerClassContext';

// Dynamic imports (Code Splitting)
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const AdminRequests = React.lazy(() => import('./components/admin/AdminRequests'));

const ChallengeManagement = React.lazy(() => import('./components/teacher/ChallengeManagement'));
const TeacherChallengeDetail = React.lazy(() => import('./components/teacher/TeacherChallengeDetail'));
const TopicManagement = React.lazy(() => import('./components/lecturer/TopicManagement'));
const SubmissionReview = React.lazy(() => import('./components/lecturer/SubmissionReview'));
const RubricsManagement = React.lazy(() => import('./components/lecturer/RubricsManagement'));
const ScoreComparison = React.lazy(() => import('./components/lecturer/ScoreComparison'));
const EntranceTestManager = React.lazy(() => import('./components/lecturer/EntranceTestManager'));
const CourseManagement = React.lazy(() => import('./components/lecturer/CourseManagement'));
const ClassManagement = React.lazy(() => import('./components/lecturer/ClassManagement'));
const StudentManagement = React.lazy(() => import('./components/lecturer/StudentManagement'));
const BlockchainDebugPage = React.lazy(() => import('./components/debug/BlockchainDebugPage'));

const ChallengeList = React.lazy(() => import('./components/student/ChallengeList'));
const StudentSubmissionView = React.lazy(() => import('./components/student/StudentSubmissionView'));
const AchievementList = React.lazy(() => import('./components/student/AchievementList'));
const StudentDashboard = React.lazy(() => import('./components/student/StudentDashboard'));
const TopicRegistration = React.lazy(() => import('./components/student/TopicRegistration'));
const ReportUpload = React.lazy(() => import('./components/student/ReportUpload'));
const ProgressTracking = React.lazy(() => import('./components/student/ProgressTracking'));
const ProgressLog = React.lazy(() => import('./components/student/ProgressLog'));
const EntranceTest = React.lazy(() => import('./components/student/EntranceTest'));
const GroupManagement = React.lazy(() => import('./components/student/GroupManagement'));

const GlobalLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

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
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/mobile-login" element={<MobileLogin />} />
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
            
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="register" element={<TopicRegistration />} />
            <Route path="upload" element={<ReportUpload />} />
            <Route path="progress-log" element={<ProgressLog />} />
            <Route path="progress" element={<ProgressTracking />} />
            <Route path="group" element={<GroupManagement />} />
            <Route path="entrance-test/:deTaiId" element={<EntranceTest />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
