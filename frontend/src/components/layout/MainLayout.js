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
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingRequestsCount(res.data.requests.length);
      }
    } catch (e) {
      console.error('Failed to fetch pending requests count', e);
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

      const socket = io(process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000');
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
    }
  }, [isAdmin, fetchPendingRequestsCount]);

  const studentMenuItems = [
    { key: '/student', icon: <Monitor size={18} />, label: 'Dashboard Học Sinh' },
    { key: '/student/group', icon: <BookOpen size={18} />, label: 'Nhóm Học Sinh' },
    { key: '/student/challenges', icon: <Award size={18} />, label: 'Đăng Ký Dự Án' },
    { key: '/student/upload', icon: <FileText size={18} />, label: 'Nộp Báo Cáo Dự Án' },
    { key: '/student/progress-log', icon: <CheckCircle size={18} />, label: 'Nhật Ký Tiến Độ' },
    { key: '/student/progress', icon: <UserIcon size={18} />, label: 'Kết Quả & Điểm' }
  ];

  const teacherMenuItems = [
    { key: '/teacher', icon: <Monitor size={18} />, label: 'Dashboard Giáo Viên' },
    { key: '/teacher/challenges', icon: <Award size={18} />, label: 'Quản Lý Dự Án' },
    { key: '/teacher/courses', icon: <BookOpen size={18} />, label: 'Quản Lý Môn Học' },
    { key: '/teacher/classes', icon: <School size={18} />, label: 'Quản Lý Lớp Học' },
    { key: '/teacher/students', icon: <Users size={18} />, label: 'Quản Lý Học Sinh' },
    { key: '/teacher/rubrics', icon: <ClipboardList size={18} />, label: 'Tiêu Chí Rubrics' },
    { key: '/teacher/review', icon: <FileText size={18} />, label: 'Chấm Điểm (AI)' },
    { key: '/teacher/comparison', icon: <BarChart2 size={18} />, label: 'So Sánh AI & Giáo Viên' },
    { key: '/teacher/blockchain', icon: <ShieldCheck size={18} />, label: 'Đối Chiếu Blockchain' }
  ];

  const adminMenuItems = [
    { key: '/admin', icon: <Monitor size={18} />, label: 'Dashboard Quản Trị' },
    { 
      key: '/admin/requests', 
      icon: <Bell size={18} />, 
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Yêu cầu</span>
          <Badge count={pendingRequestsCount} size="small" />
        </div>
      ) 
    }
  ];

  const menuItems = isAdmin ? adminMenuItems : (isTeacher ? teacherMenuItems : studentMenuItems);

  const headerMenu = (
    <Menu items={[
      { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...${currentUser?.walletAddress?.substring(currentUser?.walletAddress.length - 4)}` },
      { type: 'divider' },
      { key: 'logout', danger: true, icon: <LogOut size={16} />, label: 'Đăng xuất', onClick: handleLogout }
    ]} />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} theme="light">
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: collapsed ? 12 : 16, color: '#1677ff' }}>
          {collapsed ? 'W3PT' : 'Web3 Phổ Thông'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: isMobile ? '0 12px' : '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {!isAdmin && <ClassSelector />}
          </div>
          <Dropdown menu={{
            items: [
              { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...` },
              { type: 'divider' },
              { key: 'profile', icon: <UserIcon size={16} />, label: 'Hồ sơ cá nhân', onClick: () => navigate(isTeacher ? '/teacher' : '/student') },
              { type: 'divider' },
              { key: 'logout', danger: true, icon: <LogOut size={16} />, label: 'Đăng xuất', onClick: handleLogout }
            ]
          }} placement="bottomRight">
            <Button type="text" style={{ height: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserIcon size={18} />} style={{ backgroundColor: '#1677ff' }} />
              {!collapsed && <span>{currentUser?.name || 'Tài khoản'}</span>}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? '12px 8px' : '24px 16px', padding: isMobile ? 12 : 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          {/* Output nested routes here */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
