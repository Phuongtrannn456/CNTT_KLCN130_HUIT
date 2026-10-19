import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Card, Row, Col,
  Statistic, Modal, Form, message, Popconfirm, Typography, Upload, Divider, Alert
} from 'antd';
import {
  UserOutlined, UserAddOutlined, UploadOutlined, DownloadOutlined,
  ReloadOutlined, DeleteOutlined, KeyOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SearchOutlined, InboxOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import axios from 'axios';
import authService from '../../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminStudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, activated: 0, unactivated: 0, activationRate: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [khoiLopFilter, setKhoiLopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [parsedImportData, setParsedImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [form] = Form.useForm();

  const getAuthConfig = () => {
    const token = authService.getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchText.trim()) params.search = searchText.trim();
      if (khoiLopFilter) params.khoiLop = khoiLopFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get(`${API_BASE_URL}/admin/students`, {
        ...getAuthConfig(),
        params
      });

      if (res.data.success) {
        setStudents(res.data.students || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('fetchStudents error:', err);
      message.error(err.response?.data?.message || 'Không thể tải danh sách học sinh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [khoiLopFilter, statusFilter]);

  const handleSearch = () => {
    fetchStudents();
  };

  // 1. Thêm học sinh đơn lẻ
  const handleAddStudent = async (values) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/students`, {
        maHS: values.maHS.trim().toUpperCase(),
        hoTen: values.hoTen.trim(),
        khoiLop: values.khoiLop,
        email: values.email?.trim()
      }, getAuthConfig());

      if (res.data.success) {
        message.success(res.data.message || 'Thêm học sinh thành công!');
        setAddModalVisible(false);
        form.resetFields();
        fetchStudents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi thêm học sinh.');
    }
  };

  // 2. Mở khóa ví / Cấp lại mã PIN mới
  const handleResetPin = async (studentId, studentName) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/students/${studentId}/reset-pin`, {}, getAuthConfig());
      if (res.data.success) {
        message.success(`Đã cấp lại mã PIN mới cho em ${studentName}: ${res.data.newPin}`);
        fetchStudents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi cấp lại mã PIN.');
    }
  };

  // 3. Xóa học sinh
  const handleDeleteStudent = async (studentId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/admin/students/${studentId}`, getAuthConfig());
      if (res.data.success) {
        message.success('Đã xóa học sinh khỏi danh sách.');
        fetchStudents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa học sinh.');
    }
  };

  // 4. Đọc file Excel / CSV khi người dùng tải lên
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (!jsonData || jsonData.length === 0) {
          message.warning('File rỗng hoặc không có dữ liệu hợp lệ.');
          return;
        }

        // Chuẩn hóa tên cột
        const normalized = jsonData.map((row, idx) => ({
          key: idx,
          maHS: row['Mã HS'] || row['Mã Học Sinh'] || row['maHS'] || row['MaHS'] || '',
          hoTen: row['Họ và Tên'] || row['Họ Tên'] || row['hoTen'] || row['HoTen'] || '',
          khoiLop: parseInt(row['Khối Lớp'] || row['Khối'] || row['khoiLop'] || 10, 10),
          email: row['Email'] || row['email'] || ''
        })).filter(r => r.maHS && r.hoTen);

        if (normalized.length === 0) {
          message.error('Không tìm thấy các cột bắt buộc: "Mã HS", "Họ và Tên". Vui lòng tải file mẫu!');
          return;
        }

        setParsedImportData(normalized);
        setImportResult(null);
        message.success(`Đã đọc ${normalized.length} học sinh từ file Excel!`);
      } catch (err) {
        console.error('File parse error:', err);
        message.error('Không thể đọc file. Vui lòng kiểm tra định dạng Excel (.xlsx/.csv).');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Chặn upload mặc định của Antd
  };

  // 5. Gửi dữ liệu Import lên Backend
  const handleConfirmImport = async () => {
    if (parsedImportData.length === 0) return;
    setImporting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/students/bulk-import`, {
        students: parsedImportData
      }, getAuthConfig());

      if (res.data.success) {
        setImportResult(res.data);
        message.success(res.data.message);
        fetchStudents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi import học sinh.');
    } finally {
      setImporting(false);
    }
  };

  // 6. Tải file Excel Mẫu chuẩn
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Mã HS': 'HS1001', 'Họ và Tên': 'Trần Thị Phương', 'Khối Lớp': 10, 'Email': 'phuong.tt@school.edu.vn' },
      { 'Mã HS': 'HS1002', 'Họ và Tên': 'Nguyễn Gia Bảo', 'Khối Lớp': 10, 'Email': 'bao.nguyen@school.edu.vn' },
      { 'Mã HS': 'HS1101', 'Họ và Tên': 'Võ Minh Trí', 'Khối Lớp': 11, 'Email': 'tri.vo@school.edu.vn' },
      { 'Mã HS': 'HS1201', 'Họ và Tên': 'Đặng Hoàng Nam', 'Khối Lớp': 12, 'Email': 'nam.dh@school.edu.vn' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachHocSinhMau');
    XLSX.writeFile(workbook, 'mau_import_hoc_sinh_k12.xlsx');
    message.success('Đã tải xuống file Excel mẫu!');
  };

  // 7. Xuất Danh Sách Cấp Mã PIN (để in hoặc phát cho GVCN/Học sinh)
  const handleExportRosterWithPins = () => {
    if (students.length === 0) {
      message.warning('Không có dữ liệu để xuất.');
      return;
    }

    const exportData = students.map(s => ({
      'Mã Học Sinh': s.MaHS,
      'Họ và Tên': s.HoTen,
      'Khối Lớp': s.KhoiLop || 10,
      'Email': s.Email,
      'Mã PIN Kích Hoạt': s.IsActivated ? 'Đã kích hoạt ví' : (s.ActivationPin || 'Chưa cấp'),
      'Trạng Thái': s.IsActivated ? 'Đã liên kết ví MetaMask' : 'Chờ kích hoạt',
      'Địa Chỉ Ví Web3': (s.WalletAddress && !s.WalletAddress.startsWith('0x0000000000000000000000000000000000000000')) ? s.WalletAddress : 'Chưa có'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachCapMaPIN');
    XLSX.writeFile(workbook, `danh_sach_ma_pin_hoc_sinh_${new Date().toISOString().slice(0, 10)}.xlsx`);
    message.success('Đã xuất file danh sách mã PIN kích hoạt thành công!');
  };

  const columns = [
    {
      title: 'Mã Học Sinh',
      dataIndex: 'MaHS',
      key: 'MaHS',
      width: 130,
      render: (text) => <Tag color="blue" style={{ fontWeight: 600 }}>{text}</Tag>
    },
    {
      title: 'Họ và Tên',
      dataIndex: 'HoTen',
      key: 'HoTen',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Khối Lớp',
      dataIndex: 'KhoiLop',
      key: 'KhoiLop',
      width: 100,
      render: (grade) => <Tag color="geekblue">Khối {grade || 10}</Tag>
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      render: (text) => <Text type="secondary">{text}</Text>
    },
    {
      title: 'Mã PIN Kích Hoạt',
      key: 'ActivationPin',
      width: 160,
      render: (_, record) => {
        if (record.IsActivated) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Đã kích hoạt ví</Tag>;
        }
        return (
          <Tag color="gold" icon={<KeyOutlined />} style={{ letterSpacing: '2px', fontWeight: 'bold' }}>
            {record.ActivationPin || 'Chưa cấp'}
          </Tag>
        );
      }
    },
    {
      title: 'Trạng Thái Ví Web3',
      key: 'walletStatus',
      render: (_, record) => {
        const isBound = record.WalletAddress && !record.WalletAddress.startsWith('0x0000000000000000000000000000000000000000');
        if (isBound) {
          const short = `${record.WalletAddress.substring(0, 6)}...${record.WalletAddress.slice(-4)}`;
          return (
            <Space orientation="vertical" size={0}>
              <Tag color="green" icon={<CheckCircleOutlined />}>Đã liên kết ví</Tag>
              <Text type="secondary" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{short}</Text>
            </Space>
          );
        }
        return <Tag color="default" icon={<ClockCircleOutlined />}>Chưa liên kết</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space orientation="horizontal" size="small">
          <Popconfirm
            title="Mở khóa ví & Cấp PIN mới?"
            description="Học sinh sẽ được cấp 1 mã PIN 6 số mới và có thể liên kết ví MetaMask mới."
            onConfirm={() => handleResetPin(record._id, record.HoTen)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button size="small" icon={<ReloadOutlined />} type="dashed" danger={record.IsActivated}>
              {record.IsActivated ? 'Reset ví' : 'Cấp lại PIN'}
            </Button>
          </Popconfirm>

          <Popconfirm
            title="Xác nhận xóa học sinh?"
            description={`Bạn có chắc muốn xóa em ${record.HoTen} (${record.MaHS})?`}
            onConfirm={() => handleDeleteStudent(record._id)}
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản Lý Học Sinh & Định Danh K-12</Title>
          <Text type="secondary">
            Cấp Mã Học Sinh, quản lý mã PIN kích hoạt 6 số và kiểm soát liên kết ví Web3 MetaMask.
          </Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportRosterWithPins}>
            Xuất Danh Sách Mã PIN
          </Button>
          <Button icon={<UploadOutlined />} type="primary" onClick={() => setImportModalVisible(true)} style={{ backgroundColor: '#52c41a' }}>
            Import Excel / CSV
          </Button>
          <Button icon={<UserAddOutlined />} type="primary" onClick={() => setAddModalVisible(true)}>
            + Thêm Học Sinh
          </Button>
        </Space>
      </div>

      {/* Thống kê nhanh */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tổng số Học sinh"
              value={stats.total}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Đã kích hoạt ví Web3"
              value={stats.activated}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Chưa kích hoạt (Chờ cấp PIN)"
              value={stats.unactivated}
              valueStyle={{ color: '#faad14' }}
              prefix={<KeyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tỷ lệ kích hoạt"
              value={stats.activationRate}
              suffix="%"
              valueStyle={{ color: stats.activationRate > 70 ? '#52c41a' : '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc & Tìm kiếm */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="Tìm theo Tên, Mã HS hoặc Email..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Khối Lớp"
              value={khoiLopFilter || undefined}
              onChange={(val) => setKhoiLopFilter(val || '')}
              allowClear
            >
              <Option value="">Tất cả Khối lớp</Option>
              <Option value="10">Khối 10</Option>
              <Option value="11">Khối 11</Option>
              <Option value="12">Khối 12</Option>
            </Select>
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Trạng thái ví"
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              allowClear
            >
              <Option value="">Tất cả trạng thái</Option>
              <Option value="activated">🟢 Đã kích hoạt ví</Option>
              <Option value="unactivated">⚪ Chưa kích hoạt</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
            <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách học sinh */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={students}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} học sinh` }}
        />
      </Card>

      {/* Modal 1: Thêm học sinh đơn lẻ */}
      <Modal
        title="Thêm Học Sinh Mới Vào Danh Sách Trường"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddStudent}>
          <Form.Item
            name="maHS"
            label="Mã Học Sinh (Mã HS)"
            rules={[{ required: true, message: 'Vui lòng nhập Mã Học Sinh!' }]}
          >
            <Input placeholder="Ví dụ: HS1005" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="hoTen"
            label="Họ và Tên Học Sinh"
            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
          >
            <Input placeholder="Ví dụ: Lê Bảo Minh" />
          </Form.Item>

          <Form.Item
            name="khoiLop"
            label="Khối Lớp"
            initialValue={10}
            rules={[{ required: true, message: 'Vui lòng chọn Khối Lớp!' }]}
          >
            <Select>
              <Option value={10}>Khối 10</Option>
              <Option value={11}>Khối 11</Option>
              <Option value={12}>Khối 12</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Học sinh / Phụ huynh (Tùy chọn)"
          >
            <Input placeholder="minh.lb@school.edu.vn" />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Hệ thống sẽ tự động sinh Mã PIN bảo mật 6 số ngẫu nhiên để học sinh kích hoạt ví Web3."
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Thêm & Cấp Mã PIN
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal 2: Import Hàng Loạt Bằng File Excel / CSV */}
      <Modal
        title="Import Danh Sách Học Sinh Đầu Kỳ (Excel / CSV)"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setParsedImportData([]);
          setImportResult(null);
        }}
        width={750}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Tải File Excel Mẫu
          </Button>,
          <Button key="close" onClick={() => setImportModalVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            disabled={parsedImportData.length === 0}
            onClick={handleConfirmImport}
            style={{ backgroundColor: '#52c41a' }}
          >
            Xác Nhận Import ({parsedImportData.length} Học Sinh)
          </Button>
        ]}
      >
        <Alert
          type="info"
          showIcon
          message="Hướng dẫn Import đầu năm học / kỳ mới:"
          description="Tải file Excel mẫu về, điền các cột 'Mã HS', 'Họ và Tên', 'Khối Lớp', 'Email', sau đó kéo thả file vào khung bên dưới. Mỗi học sinh sẽ được tự động cấp Mã PIN 6 số bí mật để kích hoạt ví MetaMask."
          style={{ marginBottom: 16 }}
        />

        <Dragger
          name="file"
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: '20px 0', marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Nhấp hoặc kéo thả file Excel / CSV vào đây để tải lên</p>
          <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
        </Dragger>

        {importResult && (
          <Alert
            type="success"
            showIcon
            message={importResult.message}
            description={`Tạo mới: ${importResult.stats.created} | Cập nhật: ${importResult.stats.updated}`}
            style={{ marginBottom: 16 }}
          />
        )}

        {parsedImportData.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>Xem trước danh sách đọc được ({parsedImportData.length} dòng):</Text>
            </div>
            <Table
              size="small"
              dataSource={parsedImportData.slice(0, 5)}
              pagination={false}
              columns={[
                { title: 'Mã HS', dataIndex: 'maHS', key: 'maHS', render: (t) => <Tag color="blue">{t}</Tag> },
                { title: 'Họ và Tên', dataIndex: 'hoTen', key: 'hoTen' },
                { title: 'Khối Lớp', dataIndex: 'khoiLop', key: 'khoiLop', render: (g) => `Khối ${g}` },
                { title: 'Email', dataIndex: 'email', key: 'email' }
              ]}
              footer={() => parsedImportData.length > 5 ? `... và ${parsedImportData.length - 5} học sinh khác` : null}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminStudentManagement;
