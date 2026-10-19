import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, Avatar, theme, Dropdown, Badge } from 'antd';
import { BookOpen, LogOut, FileText, User as UserIcon, Monitor, CheckCircle, Award, ClipboardList, BarChart2, School, Users, GraduationCap, Bell, ShieldCheck } from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import axios from 'axios';
import io from 'socket.io-client';
import { useIsMobile } from '../../hooks/useResponsive';
import ClassSelector from '../common/ClassSelector';

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const isMobile = useIsMobile();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(isMobile);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchPendingRequestsCount = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (!token) return;
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingRequestsCount(res.data.requests.length);
      }
    } catch (e) {
      // Muted for lighthouse
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/');
    } else {
      setCurrentUser(user);
    }

    // Listen for MetaMask account changes
    authService.onAccountChange((newAccount) => {
      // Always logout when account changes to force re-authentication
      authService.logout();
      navigate('/');
    });

  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const isTeacher = currentUser?.role_id === 'TEACHER_ROLE';
  const isAdmin = currentUser?.role_id === 'ADMIN_ROLE';

  useEffect(() => {
    if (isAdmin) {
      fetchPendingRequestsCount();

      try {
        const socket = io(process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5001', {
          reconnectionAttempts: 2
        });
        socket.on('connect', () => socket.emit('admin:join'));
        socket.on('admin:newRequest', () => {
          setPendingRequestsCount(prev => prev + 1);
        });

        const handleRefresh = () => fetchPendingRequestsCount();
        window.addEventListener('admin:refreshBadge', handleRefresh);

        return () => {
          socket.disconnect();
          window.removeEventListener('admin:refreshBadge', handleRefresh);
        };
      } catch (err) {
        // Muted
      }
    }
  }, [isAdmin, fetchPendingRequestsCount]);

  const studentMenuItems = [
    { key: '/student/dashboard', icon: <Monitor size={18} aria-hidden="true" />, label: 'Tổng Quan Học Sinh' },
    { key: '/student/challenges', icon: <Award size={18} aria-hidden="true" />, label: 'Thử Thách & Dự Án STEM' },
    { key: '/student/group', icon: <Users size={18} aria-hidden="true" />, label: 'Nhóm Học Tập' },
    { key: '/student/upload', icon: <FileText size={18} aria-hidden="true" />, label: 'Nộp Báo Cáo Dự Án' },
    { key: '/student/progress-log', icon: <CheckCircle size={18} aria-hidden="true" />, label: 'Nhật Ký Tiến Độ' },
    { key: '/student/progress', icon: <BarChart2 size={18} aria-hidden="true" />, label: 'Kết Quả & Điểm Số' },
    { key: '/student/achievements', icon: <GraduationCap size={18} aria-hidden="true" />, label: 'Chứng Chỉ & Thành Tích Web3' }
  ];

  const teacherMenuItems = [
    { key: '/teacher/dashboard', icon: <Monitor size={18} aria-hidden="true" />, label: 'Tổng Quan Giáo Viên' },
    { key: '/teacher/challenges', icon: <Award size={18} aria-hidden="true" />, label: 'Thử Thách & Dự Án STEM' },
    { key: '/teacher/topics', icon: <BookOpen size={18} aria-hidden="true" />, label: 'Đề Tài Nghiên Cứu' },
    { key: '/teacher/courses', icon: <GraduationCap size={18} aria-hidden="true" />, label: 'Quản Lý Môn Học' },
    { key: '/teacher/classes', icon: <School size={18} aria-hidden="true" />, label: 'Quản Lý Lớp Học' },
    { key: '/teacher/students', icon: <Users size={18} aria-hidden="true" />, label: 'Quản Lý Học Sinh' },
    { key: '/teacher/rubrics', icon: <ClipboardList size={18} aria-hidden="true" />, label: 'Tiêu Chí Rubrics' },
    { key: '/teacher/review', icon: <FileText size={18} aria-hidden="true" />, label: 'Chấm Điểm & Trợ Lý AI' },
    { key: '/teacher/comparison', icon: <BarChart2 size={18} aria-hidden="true" />, label: 'Đối Soát AI & Giáo Viên' },
    { key: '/teacher/blockchain', icon: <ShieldCheck size={18} aria-hidden="true" />, label: 'Đối Chiếu Blockchain' }
  ];

  const adminMenuItems = [
    { key: "/admin/users", icon: <Users size={18} aria-hidden="true" />, label: "Quản lý Tài khoản" },

    { key: '/admin', icon: <Monitor size={18} aria-hidden="true" />, label: 'Dashboard Quản Trị' },
    { 
      key: '/admin/requests', 
      icon: <Bell size={18} aria-hidden="true" />, 
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Yêu cầu</span>
          <Badge count={pendingRequestsCount} size="small" />
        </div>
      ) 
    }
  ];

  const guestMenuItems = [
    { key: '/profile', icon: <UserIcon size={18} aria-hidden="true" />, label: 'Hồ sơ cá nhân' }
  ];

  const isGuest = currentUser?.role_id === 'GUEST_ROLE';

  const menuItems = isAdmin ? adminMenuItems : (isTeacher ? teacherMenuItems : (isGuest ? guestMenuItems : studentMenuItems));

  const getActiveMenuKey = () => {
    const pathname = location.pathname;
    if (pathname === '/student' || pathname === '/student/') return '/student/dashboard';
    if (pathname === '/teacher' || pathname === '/teacher/') return '/teacher/dashboard';
    if (pathname.startsWith('/student/submissions')) return '/student/challenges';
    if (pathname.startsWith('/teacher/challenges')) return '/teacher/challenges';
    if (pathname.startsWith('/teacher/entrance-test')) return '/teacher/topics';
    return pathname;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} theme="light" breakpoint="lg">
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: collapsed ? 12 : 16, color: '#0050b3' }}>
          {collapsed ? 'W3PT' : 'Web3 Phổ Thông'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[getActiveMenuKey()]}
          items={menuItems}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: isMobile ? '0 12px' : '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {!isAdmin && currentUser?.role_id !== 'GUEST_ROLE' && !location.pathname.startsWith('/profile') && <ClassSelector />}
          </div>
          <Dropdown menu={{
            items: [
              { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...` },
              { type: 'divider' },
              { key: 'profile', icon: <UserIcon size={16} aria-hidden="true" />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
              { type: 'divider' },
              { key: 'logout', danger: true, icon: <LogOut size={16} aria-hidden="true" />, label: 'Đăng xuất', onClick: handleLogout }
            ]
          }} placement="bottomRight">
            <Button type="text" style={{ height: 48, display: 'flex', alignItems: 'center', gap: 8 }} aria-label="Menu tài khoản">
              <Avatar icon={<UserIcon size={18} aria-hidden="true" />} style={{ backgroundColor: '#0050b3' }} />
              {!collapsed && <span>{currentUser?.name || 'Tài khoản'}</span>}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? '12px 8px' : '24px 16px', padding: isMobile ? 12 : 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
