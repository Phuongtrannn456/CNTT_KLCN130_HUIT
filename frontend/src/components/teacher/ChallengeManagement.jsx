import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Card, Typography, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import challengeService from '../../services/challengeService';
import authService from '../../services/authService';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const ChallengeManagement = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [form] = Form.useForm();
  const currentUser = authService.getCurrentUser();

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const data = await challengeService.getChallenges();
      if (data.success) {
        setChallenges(data.challenges);
      }
    } catch (error) {
      message.error('Lỗi khi tải danh sách Challenge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Quản lý Dự án & Cuộc thi - Web3 Giáo Dục Phổ Thông';
    fetchChallenges();
  }, []);

  const handleAdd = () => {
    setEditingChallenge(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingChallenge(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      subject: record.subject,
      challengeType: record.challengeType,
      eligibleGrades: record.eligibleGrades,
      deadline: record.deadline ? dayjs(record.deadline) : null,
      maxTeamSize: record.maxTeamSize
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await challengeService.deleteChallenge(id);
      message.success('Xóa Challenge thành công');
      fetchChallenges();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa Challenge này');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        deadline: values.deadline ? values.deadline.toISOString() : null
      };

      if (editingChallenge) {
        await challengeService.updateChallenge(editingChallenge._id, payload);
        message.success('Cập nhật Challenge thành công');
      } else {
        await challengeService.createChallenge(payload);
        message.success('Tạo Challenge thành công');
      }
      setIsModalVisible(false);
      fetchChallenges();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Có lỗi xảy ra');
      }
    }
  };

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'challengeId',
      key: 'challengeId',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Tên Cuộc thi / Dự án',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Môn học',
      dataIndex: 'subject',
      key: 'subject',
      width: 120,
    },
    {
      title: 'Khối lớp',
      dataIndex: 'eligibleGrades',
      key: 'eligibleGrades',
      width: 120,
      render: (grades) => grades?.join(', ') || 'N/A'
    },
    {
      title: 'Deadline',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY HH:mm') : 'N/A',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'Open' ? 'green' : status === 'Closed' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
      width: 100,
    },
    {
      title: 'Người tạo',
      key: 'createdBy',
      render: (_, record) => record.createdBy?.fullName || 'N/A'
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => {
        const isOwner = record.createdBy?._id === currentUser?.id;
        return (
          <Space size="middle">
            <Button 
              type="primary" 
              onClick={() => navigate(`/teacher/challenges/${record._id}/participants`)} 
              disabled={!isOwner}
              aria-label={`Chấm bài cho ${record.title}`}
            >
              Chấm bài
            </Button>
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={!isOwner} aria-label={`Sửa ${record.title}`}>Sửa</Button>
            {isOwner ? (
              <Popconfirm title="Xóa Challenge này?" onConfirm={() => handleDelete(record._id)} okText="Xóa" cancelText="Hủy">
                <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa ${record.title}`}>Xóa</Button>
              </Popconfirm>
            ) : (
              <Button type="text" danger disabled icon={<DeleteOutlined />} aria-label="Không có quyền xóa">Xóa</Button>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card style={{ margin: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Quản lý Cuộc thi & Dự án (Challenges)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Tạo Challenge
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={challenges} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingChallenge ? "Cập nhật Challenge" : "Tạo Challenge mới"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText={editingChallenge ? "Cập nhật" : "Tạo mới"}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Tên Cuộc thi / Dự án"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input placeholder="VD: Sáng tạo khoa học kỹ thuật 2026" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả ngắn"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả mục tiêu của challenge..." />
          </Form.Item>

          <Space style={{ display: 'flex' }} size="large">
            <Form.Item
              name="subject"
              label="Môn học"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <Select placeholder="Chọn môn">
                <Option value="Toán">Toán</Option>
                <Option value="Vật lý">Vật lý</Option>
                <Option value="Hóa học">Hóa học</Option>
                <Option value="Tin học">Tin học</Option>
                <Option value="STEM">STEM</Option>
                <Option value="Ngoại ngữ">Ngoại ngữ</Option>
                <Option value="Khác">Khác</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="challengeType"
              label="Loại hình"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <Select placeholder="Loại hình">
                <Option value="Project">Project (Dự án)</Option>
                <Option value="STEM">STEM</Option>
                <Option value="Competition">Competition (Thi đấu)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="eligibleGrades"
              label="Khối lớp (Eligibility)"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <Select mode="multiple" placeholder="Khối lớp">
                <Option value={10}>Khối 10</Option>
                <Option value={11}>Khối 11</Option>
                <Option value={12}>Khối 12</Option>
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }} size="large">
            <Form.Item
              name="deadline"
              label="Hạn nộp bài (Deadline)"
              rules={[{ required: true }]}
              style={{ width: 200 }}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" />
            </Form.Item>

            <Form.Item
              name="maxTeamSize"
              label="Số lượng thành viên tối đa / Nhóm"
              rules={[{ required: true }]}
              style={{ width: 250 }}
            >
              <Select>
                <Option value={1}>Cá nhân (1)</Option>
                <Option value={2}>Nhóm 2</Option>
                <Option value={3}>Nhóm 3</Option>
                <Option value={4}>Nhóm 4</Option>
                <Option value={5}>Nhóm 5</Option>
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default ChallengeManagement;
