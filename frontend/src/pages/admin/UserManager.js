import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Space, Alert, Typography } from 'antd';
import { LockOutlined, SecurityScanOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Text } = Typography;

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // Load danh sách user
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      message.error('Lỗi khi tải danh sách người dùng');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Mở modal sửa Role
  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      role: user.role,
      fullName: user.fullName || `DID#${user.walletAddress?.slice(2, 8).toLowerCase()}`,
      schoolId: user.schoolId || '',
      department: user.department || '',
      gradeLevel: user.gradeLevel || ''
    });
    setIsModalVisible(true);
  };

  // Submit sửa Role
  const handleUpdateRole = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/admin/users/${editingUser._id}/role`, values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        message.success('Cập nhật tài khoản thành công (Zero-PII bảo toàn)!');
        setIsModalVisible(false);
        fetchUsers();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    }
  };

  // Khoá/Mở khoá tài khoản
  const handleToggleActive = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/admin/users/${userId}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        message.success(res.data.message);
        fetchUsers();
      }
    } catch (error) {
      message.error('Lỗi khi thay đổi trạng thái');
    }
  };

  // Cấu hình cột cho Ant Design Table
  const columns = [
    {
      title: 'Địa chỉ Ví Web3',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text ? `${text.substring(0,6)}...${text.substring(text.length-4)}` : 'N/A'}</span>
    },
    {
      title: 'Định danh DID (Pseudonym)',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <Tag color="cyan">
          <LockOutlined /> {text || `DID#${record.walletAddress?.substring(2, 8).toLowerCase()}`}
        </Tag>
      )
    },
    {
      title: 'Mã định danh K-12',
      dataIndex: 'schoolId',
      key: 'schoolId',
      render: (text) => text ? <Tag color="purple">{text}</Tag> : <span style={{ color: '#999' }}>Chưa có</span>
    },
    {
      title: 'Vai trò (Role)',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        if (!role) return <Tag>UNKNOWN</Tag>;
        let color = 'default';
        if (role === 'student') color = 'blue';
        if (role === 'teacher') color = 'green';
        if (role === 'admin') color = 'red';
        if (role === 'guest') color = 'orange';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Hoạt động' : 'Bị khoá'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={() => showEditModal(record)}>
            Cấp quyền
          </Button>
          <Button 
            danger={record.isActive} 
            type={!record.isActive ? "primary" : "default"} 
            size="small" 
            onClick={() => handleToggleActive(record._id)}
          >
            {record.isActive ? 'Khoá' : 'Mở khoá'}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 12 }}>Quản lý Tài khoản & Phân quyền Web3</h2>
      <Alert
        type="info"
        showIcon
        icon={<SecurityScanOutlined />}
        style={{ marginBottom: 20, borderRadius: 8 }}
        message="Quản trị Zero-PII (Pure Pseudonymity)"
        description="Toàn bộ danh tính thực của người dùng được ẩn danh hoàn toàn. Quản trị viên chỉ quản lý và phân quyền dựa trên Mã ví MetaMask và Định danh DID tự động nhằm đảm bảo tính bảo mật và công bằng tối đa."
      />

      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal 
        title="Cấp quyền & Cập nhật vai trò (Zero-PII)" 
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        {editingUser && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
            <Text type="secondary">Ví người dùng: </Text>
            <Text strong style={{ fontFamily: 'monospace' }}>{editingUser.walletAddress}</Text>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleUpdateRole}>
          <Form.Item label="Vai trò (Role)" name="role" rules={[{ required: true }]}>
            <Select>
              <Option value="guest">Khách (Guest)</Option>
              <Option value="student">Học sinh (K-12 Student)</Option>
              <Option value="teacher">Giáo viên (K-12 Teacher)</Option>
              <Option value="admin">Quản trị viên (Admin)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label="Định danh DID (Zero-PII Pseudonym)" 
            name="fullName"
            tooltip="Hệ thống tự động sinh từ địa chỉ ví để bảo vệ danh tính cá nhân"
          >
            <Input disabled prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item label="Mã định danh (School ID / DID Code)" name="schoolId">
            <Input placeholder="VD: HS_DID#71C89A hoặc GV_DID#8A93B1" />
          </Form.Item>
          
          <Form.Item noStyle dependencies={['role']}>
            {({ getFieldValue }) => {
              const role = getFieldValue('role');
              if (role === 'student') {
                return (
                  <Form.Item label="Khối Lớp THPT" name="gradeLevel">
                    <Select placeholder="Chọn khối lớp">
                      <Option value={10}>Khối 10</Option>
                      <Option value={11}>Khối 11</Option>
                      <Option value={12}>Khối 12</Option>
                    </Select>
                  </Form.Item>
                );
              }
              if (role === 'teacher') {
                return (
                  <Form.Item label="Tổ Bộ Môn STEM" name="department">
                    <Input placeholder="VD: Tổ Toán - Tin hoặc STEM Tự Nhiên" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Lưu thay đổi</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManager;
