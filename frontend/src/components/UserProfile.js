import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Tag, Descriptions, Alert, Typography, Select, Space } from 'antd';
import { SafetyCertificateOutlined, LockOutlined, TagOutlined, ApartmentOutlined, BookOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const { Option } = Select;

const UserProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setProfile(res.data.user);
        form.setFieldsValue({
          skills: res.data.user.skills || [],
          department: res.data.user.department || '',
          gradeLevel: res.data.user.gradeLevel || '',
          school: res.data.user.school || 'THPT Chuyên / K-12 STEM Partner'
        });
      }
    } catch (error) {
      if (error.response && (error.response.status === 404 || error.response.status === 401)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        message.error('Không thể tải thông tin hồ sơ.');
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (values) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await axios.put(`${API_URL}/auth/profile`, values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        message.success('Cập nhật hồ sơ năng lực thành công (Zero-PII bảo toàn)!');
        setProfile(res.data.user);
      }
    } catch (error) {
      message.error('Lỗi khi cập nhật hồ sơ.');
    }
    setLoading(false);
  };

  if (!profile) return <div style={{ padding: 24 }}>Đang tải...</div>;

  const isTeacher = profile.role === 'teacher' || profile.role_id === 2;
  const isStudent = profile.role === 'student' || profile.role_id === 3;

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 0' }}>
      <Card 
        title="Hồ sơ Năng lực Web3 (Zero-PII Profile)" 
        bordered={false} 
        style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
          message="Cơ chế bảo mật Web3 Pure Pseudonymity (Ẩn danh tuyệt đối)"
          description="Hệ thống vận hành theo triết lý Zero-PII: Không lưu trữ Họ tên thật hay Email cá nhân. Mọi thành viên đều được định danh qua DID và Địa chỉ ví MetaMask nhằm đảm bảo tính công bằng và chống thiên vị khi giao đề tài và chấm điểm."
        />

        <Descriptions 
          title="Định danh Mật mã học (On-chain Identity)" 
          column={1} 
          bordered 
          size="small" 
          style={{ marginBottom: 28 }}
        >
          <Descriptions.Item label="Địa chỉ ví Web3 (Wallet)">
            <Text copyable style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {profile.walletAddress}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Định danh hiển thị (DID Pseudonym)">
            <Tag color="cyan" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 4 }}>
              <LockOutlined /> {profile.fullName || profile.hoTen || 'Zero-PII DID'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Hộp thư DID (Pseudonymous Mail)">
            <Text style={{ fontFamily: 'monospace', color: '#666' }}>
              {profile.email || `did_${profile.walletAddress?.slice(2, 8).toLowerCase()}@k12.did`}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Vai trò hệ thống (Role)">
            <Tag color={profile.role === 'admin' ? 'red' : isTeacher ? 'green' : 'blue'}>
              {profile.role?.toUpperCase() || (isTeacher ? 'TEACHER' : 'STUDENT')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Mã định danh K-12 (DID Code)">
            <Tag color="purple">
              {profile.schoolId || (isTeacher ? `GV_DID#${profile.walletAddress?.slice(2, 8).toUpperCase()}` : `HS_DID#${profile.walletAddress?.slice(2, 8).toUpperCase()}`)}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <h3 style={{ marginBottom: 16 }}>Cập nhật Năng lực & Chuyên môn (Non-PII)</h3>
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          {isTeacher ? (
            <Form.Item 
              label="Tổ bộ môn chuyên môn (Department)" 
              name="department" 
              rules={[{ required: true, message: 'Vui lòng chọn tổ bộ môn' }]}
            >
              <Select placeholder="Chọn tổ chuyên môn">
                <Option value="Toán - Tin học">Tổ Toán - Tin học</Option>
                <Option value="Khoa học Tự nhiên & STEM">Tổ Khoa học Tự nhiên & STEM</Option>
                <Option value="Vật lý & Robot học">Tổ Vật lý & Kỹ thuật Robot</Option>
                <Option value="Hóa học & Sinh học Ứng dụng">Tổ Hóa - Sinh Ứng dụng</Option>
                <Option value="Công nghệ & AI">Tổ Công nghệ & Trí tuệ Nhân tạo</Option>
              </Select>
            </Form.Item>
          ) : (
            <Form.Item 
              label="Khối lớp THPT (Grade Level)" 
              name="gradeLevel" 
              rules={[{ required: true, message: 'Vui lòng chọn khối lớp' }]}
            >
              <Select placeholder="Chọn khối lớp K-12">
                <Option value="Khối 10">Khối 10 (THPT K-12)</Option>
                <Option value="Khối 11">Khối 11 (THPT K-12)</Option>
                <Option value="Khối 12">Khối 12 (THPT K-12)</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item 
            label="Kỹ năng & Lĩnh vực quan tâm (Skills & STEM Tags)" 
            name="skills"
            tooltip="Hệ thống AI SBERT sẽ dùng các thẻ kỹ năng này để tính toán độ tương thích với các Thử thách STEM mà không cần biết bạn là ai."
          >
            <Select 
              mode="tags" 
              style={{ width: '100%' }} 
              placeholder="Nhập hoặc chọn kỹ năng (vd: Python, IoT, Arduino, Robotics, Machine Learning, Web3)"
              tokenSeparators={[',']}
            >
              <Option value="Python">Python</Option>
              <Option value="Arduino / C++">Arduino / C++</Option>
              <Option value="IoT & Sensors">IoT & Sensors</Option>
              <Option value="Robotics">Robotics</Option>
              <Option value="Trí tuệ nhân tạo (AI)">Trí tuệ nhân tạo (AI)</Option>
              <Option value="Web3 & Blockchain">Web3 & Blockchain</Option>
              <Option value="Data Science">Data Science</Option>
              <Option value="Thiết kế 3D / CAD">Thiết kế 3D / CAD</Option>
              <Option value="Tự động hóa">Tự động hóa</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label="Đơn vị / Cơ sở giáo dục (School Partner)" 
            name="school"
          >
            <Input prefix={<ApartmentOutlined />} placeholder="Nhập cơ sở giáo dục hoặc đối tác K-12" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SafetyCertificateOutlined />}>
              Lưu hồ sơ năng lực
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default UserProfile;
