import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Space, Spin, Alert, Typography, Row, Col, Card, Statistic, 
  Button, Modal, Form, Input, Select, Popconfirm, message, Upload
} from 'antd';
import { 
  TeamOutlined, UserAddOutlined, UserOutlined, CheckCircleOutlined, 
  UploadOutlined, DownloadOutlined, ReloadOutlined, DeleteOutlined, 
  KeyOutlined, InboxOutlined, PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import axios from 'axios';
import io from 'socket.io-client';
import authService from '../../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requestsCount, setRequestsCount] = useState(0);
  const [lecturers, setLecturers] = useState([]);
  const [studentStats, setStudentStats] = useState({ total: 0, activated: 0, unactivated: 0, activationRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals for Teachers
  const [addTeacherModalVisible, setAddTeacherModalVisible] = useState(false);
  const [importTeacherModalVisible, setImportTeacherModalVisible] = useState(false);
  const [parsedTeacherImportData, setParsedTeacherImportData] = useState([]);
  const [importingTeachers, setImportingTeachers] = useState(false);
  const [importTeacherResult, setImportTeacherResult] = useState(null);

  const [formTeacher] = Form.useForm();

  const getAuthConfig = () => {
    const token = authService.getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const config = getAuthConfig();
      
      const [reqRes, lecRes, stuRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/requests`, config).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE_URL}/admin/lecturers`, config).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE_URL}/admin/students`, config).catch(() => ({ data: { success: false } }))
      ]);

      if (reqRes.data?.success) setRequestsCount(reqRes.data.requests?.length || 0);
      if (lecRes.data?.success) setLecturers(lecRes.data.lecturers || []);
      if (stuRes.data?.success && stuRes.data.stats) setStudentStats(stuRes.data.stats);
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Lỗi khi tải dữ liệu. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io(SOCKET_URL);
    socket.on('connect', () => {
      socket.emit('admin:join');
    });

    socket.on('admin:newRequest', () => {
      setRequestsCount(prev => prev + 1);
    });

    const handleRefresh = () => fetchData();
    window.addEventListener('admin:refreshBadge', handleRefresh);

    return () => {
      socket.disconnect();
      window.removeEventListener('admin:refreshBadge', handleRefresh);
    };
  }, []);

  // 1. Thêm giáo viên mới
  const handleAddTeacher = async (values) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/teachers`, {
        maGV: values.maGV.trim().toUpperCase(),
        hoTen: values.hoTen.trim(),
        toBoMon: values.toBoMon,
        email: values.email?.trim()
      }, getAuthConfig());

      if (res.data.success) {
        message.success(res.data.message || 'Thêm giáo viên thành công!');
        setAddTeacherModalVisible(false);
        formTeacher.resetFields();
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi thêm giáo viên.');
    }
  };

  // 2. Mở khóa ví / Cấp lại mã PIN giáo viên
  const handleResetTeacherPin = async (teacherId, teacherName) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/teachers/${teacherId}/reset-pin`, {}, getAuthConfig());
      if (res.data.success) {
        message.success(`Đã cấp lại mã PIN mới cho Thầy/Cô ${teacherName}: ${res.data.newPin}`);
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cấp lại mã PIN giáo viên.');
    }
  };

  // 3. Xóa giáo viên
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/admin/teachers/${teacherId}`, getAuthConfig());
      if (res.data.success) {
        message.success(`Đã xóa Thầy/Cô ${teacherName} khỏi danh mục.`);
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa giáo viên.');
    }
  };

  // 4. File Upload giáo viên
  const handleTeacherFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (!jsonData || jsonData.length === 0) {
          message.warning('File rỗng.');
          return;
        }

        const normalized = jsonData.map((row, idx) => ({
          key: idx,
          maGV: row['Mã GV'] || row['Mã Giáo Viên'] || row['maGV'] || row['MaGV'] || '',
          hoTen: row['Họ và Tên'] || row['Họ Tên'] || row['hoTen'] || row['HoTen'] || '',
          toBoMon: row['Tổ Bộ Môn'] || row['Bộ Môn'] || row['toBoMon'] || 'Tổ Tự Nhiên & STEM',
          email: row['Email'] || row['email'] || ''
        })).filter(r => r.maGV && r.hoTen);

        if (normalized.length === 0) {
          message.error('Không tìm thấy các cột: "Mã GV", "Họ và Tên". Vui lòng tải file mẫu!');
          return;
        }

        setParsedTeacherImportData(normalized);
        setImportTeacherResult(null);
        message.success(`Đã đọc ${normalized.length} giáo viên từ file Excel!`);
      } catch (err) {
        console.error('File parse error:', err);
        message.error('Không thể đọc file. Kiểm tra định dạng Excel (.xlsx/.csv).');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // 5. Gửi import giáo viên lên backend
  const handleConfirmImportTeachers = async () => {
    if (parsedTeacherImportData.length === 0) return;
    setImportingTeachers(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/teachers/bulk-import`, {
        teachers: parsedTeacherImportData
      }, getAuthConfig());

      if (res.data.success) {
        setImportTeacherResult(res.data);
        message.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi import giáo viên.');
    } finally {
      setImportingTeachers(false);
    }
  };

  // 6. Tải file mẫu giáo viên
  const handleDownloadTeacherTemplate = () => {
    const templateData = [
      { 'Mã GV': 'GV_TOAN_01', 'Họ và Tên': 'Thầy Nguyễn Văn Toàn', 'Tổ Bộ Môn': 'Tổ Toán - Tin học', 'Email': 'toan.nv@thpt.edu.vn' },
      { 'Mã GV': 'GV_STEM_02', 'Họ và Tên': 'Cô Trần Thị Mai', 'Tổ Bộ Môn': 'Tổ Khoa Học Tự Nhiên & STEM', 'Email': 'mai.tt@thpt.edu.vn' },
      { 'Mã GV': 'GV_HOA_03', 'Họ và Tên': 'Thầy Lê Văn Hóa', 'Tổ Bộ Môn': 'Tổ Hóa Học & STEM', 'Email': 'hoa.lv@thpt.edu.vn' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachGiaoVienMau');
    XLSX.writeFile(workbook, 'mau_import_giao_vien_k12.xlsx');
    message.success('Đã tải xuống file Excel mẫu Giáo viên!');
  };

  // 7. Xuất danh sách giáo viên có PIN
  const handleExportTeachers = () => {
    if (lecturers.length === 0) {
      message.warning('Không có dữ liệu để xuất.');
      return;
    }

    const exportData = lecturers.map(g => ({
      'Mã Giáo Viên': g.MaGV,
      'Họ và Tên': g.HoTen,
      'Tổ Bộ Môn': g.ToBoMon || 'Bộ Môn K-12',
      'Email': g.Email,
      'Mã PIN Kích Hoạt': g.IsActivated ? 'Đã kích hoạt ví' : (g.ActivationPin || 'Chưa cấp'),
      'Trạng Thái': g.IsActivated ? 'Đã liên kết ví MetaMask' : 'Chờ kích hoạt',
      'Địa Chỉ Ví Web3': (g.WalletAddress && !g.WalletAddress.startsWith('0x0000000000000000000000000000000000000000')) ? g.WalletAddress : 'Chưa có'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachGiaoVien');
    XLSX.writeFile(workbook, `danh_sach_giao_vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
    message.success('Đã xuất file danh sách giáo viên thành công!');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  }

  const lecturerColumns = [
    {
      title: 'Mã Giáo Viên',
      dataIndex: 'MaGV',
      key: 'MaGV',
      width: 140,
      render: (text) => <Tag color="blue" style={{ fontWeight: 600 }}>{text}</Tag>,
    },
    {
      title: 'Họ và Tên',
      dataIndex: 'HoTen',
      key: 'HoTen',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Tổ Bộ Môn',
      dataIndex: 'ToBoMon',
      key: 'ToBoMon',
      render: (text) => <Tag color="geekblue">{text || 'Bộ Môn K-12'}</Tag>
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      render: (text) => <Text type="secondary">{text}</Text>
    },
    {
      title: 'Mã PIN Bảo Mật',
      key: 'ActivationPin',
      width: 160,
      render: (_, record) => {
        if (record.IsActivated) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Đã kích hoạt ví</Tag>;
        }
        return (
          <Tag color="gold" icon={<KeyOutlined />} style={{ letterSpacing: '2px', fontWeight: 'bold' }}>
            {record.ActivationPin || '888888'}
          </Tag>
        );
      }
    },
    {
      title: 'Ví MetaMask',
      dataIndex: 'WalletAddress',
      key: 'WalletAddress',
      render: (wallet, record) => {
        const isBound = wallet && !wallet.startsWith('0x0000000000000000000000000000000000000000');
        if (isBound) {
          return (
            <Space orientation="vertical" size={0}>
              <Tag color="green" icon={<CheckCircleOutlined />}>Đã liên kết ví</Tag>
              <Text type="secondary" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {wallet.substring(0, 6)}...{wallet.slice(-4)}
              </Text>
            </Space>
          );
        }
        return <Tag color="default">Chưa liên kết</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space orientation="horizontal" size="small">
          <Popconfirm
            title="Mở khóa ví & Cấp PIN mới?"
            description="Thầy/Cô sẽ được cấp mã PIN mới và có thể liên kết ví MetaMask mới."
            onConfirm={() => handleResetTeacherPin(record._id, record.HoTen)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button size="small" icon={<ReloadOutlined />} type="dashed" danger={record.IsActivated}>
              {record.IsActivated ? 'Reset ví' : 'Cấp lại PIN'}
            </Button>
          </Popconfirm>

          <Popconfirm
            title="Xác nhận xóa Giáo viên?"
            description={`Bạn có chắc muốn xóa Thầy/Cô ${record.HoTen} (${record.MaGV})?`}
            onConfirm={() => handleDeleteTeacher(record._id, record.HoTen)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<DeleteOutlined />} danger type="text" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản trị hệ thống K-12</Title>
          <Text type="secondary">Nền tảng Quản lý Định danh & Đề tài học tập Web3 Giáo dục Phổ thông</Text>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />} 
            size="large"
            onClick={() => setAddTeacherModalVisible(true)}
          >
            + Thêm Giáo Viên Mới
          </Button>
          <Button 
            type="primary" 
            icon={<UploadOutlined />} 
            size="large"
            style={{ backgroundColor: '#52c41a' }}
            onClick={() => navigate('/admin/students')}
          >
            Quản Lý & Import Học Sinh
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* 4 Thống kê chính */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card 
            bordered={false} 
            hoverable 
            onClick={() => navigate('/admin/students')} 
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
          >
            <Statistic
              title="Tổng số Học sinh K-12"
              value={studentStats.total}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card 
            bordered={false} 
            hoverable 
            onClick={() => navigate('/admin/students')} 
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
          >
            <Statistic
              title="Tỷ lệ kích hoạt Ví Học sinh"
              value={studentStats.activationRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tổng số Cán bộ / Giáo viên"
              value={lecturers.length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card 
            bordered={false} 
            hoverable 
            onClick={() => navigate('/admin/requests')} 
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
          >
            <Statistic
              title="Yêu cầu chờ Ban Giám Hiệu"
              value={requestsCount}
              prefix={<UserAddOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Danh sách giáo viên */}
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Danh sách Cán bộ / Giáo viên chính thức ({lecturers.length})
            </Title>
            <Text type="secondary" style={{ fontSize: '0.85rem' }}>
              Giáo viên dùng Mã GV kèm Mã PIN 6 số bí mật để kích hoạt ví MetaMask giảng dạy.
            </Text>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExportTeachers}>
              Xuất Danh Sách Giáo Viên
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportTeacherModalVisible(true)} style={{ color: '#722ed1', borderColor: '#d3adf7' }}>
              Import Excel Giáo Viên
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddTeacherModalVisible(true)}>
              + Thêm Giáo Viên
            </Button>
          </Space>
        </div>

        {lecturers.length === 0 ? (
          <Text type="secondary">Chưa có Giáo viên nào.</Text>
        ) : (
          <Table 
            columns={lecturerColumns} 
            dataSource={lecturers.map(l => ({ ...l, key: l._id }))} 
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        )}
      </div>

      {/* Modal: Thêm giáo viên mới */}
      <Modal
        title="Thêm Cán Bộ / Giáo Viên Mới"
        open={addTeacherModalVisible}
        onCancel={() => setAddTeacherModalVisible(false)}
        footer={null}
      >
        <Form form={formTeacher} layout="vertical" onFinish={handleAddTeacher}>
          <Form.Item
            name="maGV"
            label="Mã Cán Bộ / Giáo Viên (Mã GV)"
            rules={[{ required: true, message: 'Vui lòng nhập Mã Giáo Viên!' }]}
          >
            <Input placeholder="Ví dụ: GV_HOA_01" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="hoTen"
            label="Họ và Tên Giáo Viên"
            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
          >
            <Input placeholder="Ví dụ: Thầy Lê Văn Hóa" />
          </Form.Item>

          <Form.Item
            name="toBoMon"
            label="Tổ Bộ Môn / Môn Giảng Dạy"
            initialValue="Tổ Khoa Học Tự Nhiên & STEM"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập Tổ Bộ Môn!' }]}
          >
            <Select>
              <Option value="Tổ Toán - Tin học">Tổ Toán - Tin học</Option>
              <Option value="Tổ Khoa Học Tự Nhiên & STEM">Tổ Khoa Học Tự Nhiên & STEM</Option>
              <Option value="Tổ Vật Lý & Công Nghệ">Tổ Vật Lý & Công Nghệ</Option>
              <Option value="Tổ Hóa Học & Sinh Học">Tổ Hóa Học & Sinh Học</Option>
              <Option value="Tổ Ngữ Văn - Xã Hội">Tổ Ngữ Văn - Xã Hội</Option>
              <Option value="Tổ Ngoại Ngữ">Tổ Ngoại Ngữ</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Công Tác (Tùy chọn)"
          >
            <Input placeholder="hoa.lv@thpt.edu.vn" />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Hệ thống sẽ tự động cấp Mã PIN 6 số bí mật để Thầy/Cô kích hoạt ví MetaMask cá nhân."
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddTeacherModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Thêm & Cấp Mã PIN
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal: Import Excel Giáo Viên */}
      <Modal
        title="Import Danh Sách Giáo Viên (Excel / CSV)"
        open={importTeacherModalVisible}
        onCancel={() => {
          setImportTeacherModalVisible(false);
          setParsedTeacherImportData([]);
          setImportTeacherResult(null);
        }}
        width={750}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTeacherTemplate}>
            Tải File Excel Mẫu
          </Button>,
          <Button key="close" onClick={() => setImportTeacherModalVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importingTeachers}
            disabled={parsedTeacherImportData.length === 0}
            onClick={handleConfirmImportTeachers}
          >
            Xác Nhận Import ({parsedTeacherImportData.length} Giáo Viên)
          </Button>
        ]}
      >
        <Alert
          type="info"
          showIcon
          message="Hướng dẫn Import Giáo viên đầu kỳ:"
          description="Điền các cột 'Mã GV', 'Họ và Tên', 'Tổ Bộ Môn', 'Email', sau đó kéo thả file vào khung. Mỗi giáo viên sẽ được cấp Mã PIN bảo mật để liên kết ví MetaMask."
          style={{ marginBottom: 16 }}
        />

        <Dragger
          name="file"
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleTeacherFileUpload}
          showUploadList={false}
          style={{ padding: '20px 0', marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#722ed1' }} />
          </p>
          <p className="ant-upload-text">Nhấp hoặc kéo thả file Excel / CSV vào đây để tải lên</p>
          <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
        </Dragger>

        {importTeacherResult && (
          <Alert
            type="success"
            showIcon
            message={importTeacherResult.message}
            description={`Tạo mới: ${importTeacherResult.stats.created} | Cập nhật: ${importTeacherResult.stats.updated}`}
            style={{ marginBottom: 16 }}
          />
        )}

        {parsedTeacherImportData.length > 0 && (
          <div>
            <Text strong>Xem trước danh sách đọc được ({parsedTeacherImportData.length} giáo viên):</Text>
            <Table
              size="small"
              dataSource={parsedTeacherImportData.slice(0, 5)}
              pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: 'Mã GV', dataIndex: 'maGV', key: 'maGV', render: (t) => <Tag color="blue">{t}</Tag> },
                { title: 'Họ và Tên', dataIndex: 'hoTen', key: 'hoTen' },
                { title: 'Tổ Bộ Môn', dataIndex: 'toBoMon', key: 'toBoMon' },
                { title: 'Email', dataIndex: 'email', key: 'email' }
              ]}
              footer={() => parsedTeacherImportData.length > 5 ? `... và ${parsedTeacherImportData.length - 5} giáo viên khác` : null}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;
