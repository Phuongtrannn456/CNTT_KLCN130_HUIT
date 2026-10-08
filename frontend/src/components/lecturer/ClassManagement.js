import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Button, Modal, Form, Input, Select, Space, Tag,
  Popconfirm, message, Spin, Descriptions, List, Avatar, Badge, Tabs, Divider, AutoComplete, Alert
} from 'antd';
import { Plus, Pencil, Trash2, School, Eye, UserPlus, UserMinus, Users, Clock, XCircle, CheckCircle } from 'lucide-react';
import authService from '../../services/authService';
import managementService from '../../services/managementService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;

const ClassManagement = () => {
  const currentUser = authService.getCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = 'Quản lý Lớp học - Web3 Giáo Dục Phổ Thông';
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addSvModalVisible, setAddSvModalVisible] = useState(false);
  const [allHocSinh, setAllHocSinh] = useState([]);
  const [selectedSvId, setSelectedSvId] = useState(null);
  const [svSearchOptions, setSvSearchOptions] = useState([]);
  const [form] = Form.useForm();
  const [svSearchText, setSvSearchText] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  // Lời mời pending
  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const { data: { lopHocs = [], monHocs = [] } = {}, isLoading: loading } = useQuery({
    queryKey: ['classes', currentUser?.id],
    queryFn: async () => {
      let lops = [];
      let mons = [];
      try {
        const [lopRes, monRes] = await Promise.all([
          managementService.getLopHocByGV(currentUser.id),
          managementService.getMonHocByGV(currentUser.id),
        ]);
        if (lopRes.success) lops = lopRes.data || [];
        if (monRes.success) mons = monRes.data || [];
      } catch (err) {
        message.error('Lỗi tải dữ liệu');
      }
      return { lopHocs: lops, monHocs: mons };
    },
    enabled: !!currentUser?.id,
  });

  const handleOpenModal = (record = null) => {
    setEditingItem(record);
    if (record) {
      form.setFieldsValue({
        MaLopHoc: record.MaLopHoc,
        TenLopHoc: record.TenLopHoc,
        MonHoc: record.MonHoc?._id || record.MonHoc,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        const res = await managementService.updateLopHoc(editingItem._id, values);
        if (res.success) message.success('Cập nhật lớp học thành công');
      } else {
        const res = await managementService.createLopHoc({
          ...values,
          GiaoVien: currentUser.id,
        });
        if (res.success) message.success('Tạo lớp học thành công');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Lỗi thao tác';
      message.error(errMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await managementService.deleteLopHoc(id);
      if (res.success) {
        message.success('Đã xóa lớp học');
        queryClient.invalidateQueries({ queryKey: ['classes'] });
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi xóa lớp học');
    }
  };

  // Xem chi tiết lớp học
  const handleViewDetail = async (record) => {
    try {
      setDetailLoading(true);
      setDetailVisible(true);
      const [res, invRes] = await Promise.all([
        managementService.getLopHocDetail(record._id),
        managementService.getInvitesByLopHoc(record._id),
      ]);
      if (res.success) {
        setDetailData(res.data);
      }
      if (invRes.success) {
        setPendingInvites((invRes.data || []).filter(inv => inv.TrangThai === 'ChoChapNhan'));
      }
    } catch (err) {
      message.error('Lỗi tải chi tiết lớp học');
    } finally {
      setDetailLoading(false);
    }
  };

  // Mở modal thêm SV → gửi lời mời thay vì add trực tiếp
  const handleOpenAddSv = async () => {
    try {
      const res = await managementService.getAllHocSinh();
      const svList = Array.isArray(res) ? res : (res?.data || []);
      setAllHocSinh(svList);
      // Lọc ra SV chưa có trong lớp VÀ chưa có lời mời pending
      const currentSvIds = (detailData?.lopHoc?.HocSinh || []).map(sv => sv._id);
      const pendingSvIds = pendingInvites.map(inv => inv.HocSinh?._id);
      const excludeIds = [...currentSvIds, ...pendingSvIds];
      
      setSvSearchOptions(
        svList
          .filter(sv => !excludeIds.includes(sv._id))
          .map(sv => ({
            value: sv._id,
            label: `${sv.MaHS} - ${sv.HoTen} (${sv.Email})`,
          }))
      );
      setAddSvModalVisible(true);
    } catch (err) {
      message.error('Lỗi tải danh sách học sinh');
    }
  };

  // Gửi lời mời thay vì add trực tiếp
  const handleInviteSv = async () => {
    if (!detailData?.lopHoc?._id) return;
    try {
      let res;
      if (selectedSvId) {
        res = await managementService.inviteHocSinhToLop(detailData.lopHoc._id, selectedSvId);
      } else if (svSearchText.trim()) {
        // Tìm SV theo MaHS rồi invite
        const found = allHocSinh.find(sv => sv.MaHS === svSearchText.trim());
        if (found) {
          res = await managementService.inviteHocSinhToLop(detailData.lopHoc._id, found._id);
        } else {
          message.warning('Không tìm thấy học sinh với mã này');
          return;
        }
      } else {
        return;
      }

      if (res.success) {
        message.success(res.message || 'Đã gửi lời mời. Chờ học sinh chấp nhận.');
        setAddSvModalVisible(false);
        setSelectedSvId(null);
        setSvSearchText('');
        handleViewDetail({ _id: detailData.lopHoc._id });
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  // Import batch → invite batch
  const handleImportSv = async () => {
    if (!importText.trim() || !detailData?.lopHoc?._id) return;
    try {
      const danhSachMaHS = importText
        .split(/[\s,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

      if (danhSachMaHS.length === 0) {
        message.warning('Danh sách trống');
        return;
      }

      const res = await managementService.inviteBatchToLop(detailData.lopHoc._id, danhSachMaHS);
      if (res.success) {
        message.success(res.message || 'Import lời mời thành công');
        setImportModalVisible(false);
        setImportText('');
        handleViewDetail({ _id: detailData.lopHoc._id });
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi import lời mời');
    }
  };

  // Hủy lời mời pending
  const handleCancelInvite = async (inviteId) => {
    try {
      const res = await managementService.cancelClassInvite(inviteId);
      if (res.success) {
        message.success('Đã hủy lời mời');
        handleViewDetail({ _id: detailData.lopHoc._id });
      }
    } catch (err) {
      message.error('Lỗi hủy lời mời');
    }
  };

  const handleRemoveSv = async (hsId) => {
    if (!detailData?.lopHoc?._id) return;
    try {
      const res = await managementService.removeHocSinhFromLop(detailData.lopHoc._id, hsId);
      if (res.success) {
        message.success('Đã xóa học sinh khỏi lớp');
        handleViewDetail({ _id: detailData.lopHoc._id });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
      }
    } catch (err) {
      message.error('Lỗi xóa học sinh khỏi lớp');
    }
  };

  const handleSvSearch = (searchText) => {
    const currentSvIds = (detailData?.lopHoc?.HocSinh || []).map(sv => sv._id);
    const pendingSvIds = pendingInvites.map(inv => inv.HocSinh?._id);
    const excludeIds = [...currentSvIds, ...pendingSvIds];

    const filtered = allHocSinh
      .filter(sv => !excludeIds.includes(sv._id))
      .filter(sv => {
        const text = searchText.toLowerCase();
        return (
          sv.MaHS?.toLowerCase().includes(text) ||
          sv.HoTen?.toLowerCase().includes(text) ||
          sv.Email?.toLowerCase().includes(text)
        );
      })
      .map(sv => ({
        value: sv._id,
        label: `${sv.MaHS} - ${sv.HoTen} (${sv.Email})`,
      }));
    setSvSearchOptions(filtered);
  };

  // Trạng thái đăng ký
  const trangThaiColor = {
    ChoDuyet: 'gold', DaDuyet: 'green', TuChoi: 'red',
    ChoTest: 'orange', DangLamTest: 'blue', DaSubmit: 'cyan', ChoDoi: 'purple', Thua: 'default',
  };

  const columns = [
    {
      title: 'Mã Lớp',
      dataIndex: 'MaLopHoc',
      key: 'MaLopHoc',
      width: 130,
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Tên Lớp Học',
      dataIndex: 'TenLopHoc',
      key: 'TenLopHoc',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Môn Học',
      dataIndex: 'MonHoc',
      key: 'MonHoc',
      render: (mh) => mh ? <Tag color="blue">{mh.MaMonHoc} — {mh.TenMonHoc}</Tag> : '—',
    },
    {
      title: 'Giáo Viên',
      dataIndex: 'GiaoVien',
      key: 'GiaoVien',
      render: (gv) => {
        if (!gv) return '—';
        return <Text strong style={{ color: '#595959' }}>{gv.HoTen || gv.MaGV || '—'}</Text>;
      },
    },
    {
      title: 'Sĩ Số',
      dataIndex: 'siSo',
      key: 'siSo',
      width: 90,
      align: 'center',
      render: (val) => <Badge count={val || 0} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Eye size={16} />} onClick={() => handleViewDetail(record)} style={{ color: '#1677ff' }} />
          <Button type="text" icon={<Pencil size={16} />} onClick={() => handleOpenModal(record)} style={{ color: '#faad14' }} />
          <Popconfirm
            title="Xóa lớp học này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<Trash2 size={16} />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Bảng SV trong chi tiết lớp học
  const svColumns = [
    {
      title: 'Mã HS',
      dataIndex: 'MaHS',
      key: 'MaHS',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
    },
    { title: 'Họ Tên', dataIndex: 'HoTen', key: 'HoTen' },
    { title: 'Email', dataIndex: 'Email', key: 'Email', ellipsis: true },
    {
      title: 'GPA',
      dataIndex: 'GPA',
      key: 'GPA',
      width: 80,
      align: 'center',
      render: (val) => <Tag color={val >= 3.0 ? 'green' : val >= 2.0 ? 'orange' : 'red'}>{val?.toFixed(1) || '—'}</Tag>,
    },
    { title: 'Khối Lớp / Ban', dataIndex: 'ChuyenNganh', key: 'ChuyenNganh', ellipsis: true },
    {
      title: '',
      key: 'remove',
      width: 50,
      render: (_, sv) => (
        <Popconfirm title="Xóa học sinh khỏi lớp?" onConfirm={() => handleRemoveSv(sv._id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
          <Button type="text" icon={<UserMinus size={14} />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  // Bảng lời mời pending
  const inviteColumns = [
    {
      title: 'Mã HS',
      key: 'MaHS',
      width: 120,
      render: (_, inv) => <Tag color="orange">{inv.HocSinh?.MaHS || '—'}</Tag>,
    },
    {
      title: 'Họ Tên',
      key: 'HoTen',
      render: (_, inv) => inv.HocSinh?.HoTen || '—',
    },
    {
      title: 'Email',
      key: 'Email',
      ellipsis: true,
      render: (_, inv) => <Text type="secondary">{inv.HocSinh?.Email || '—'}</Text>,
    },
    {
      title: 'Trạng Thái',
      key: 'TrangThai',
      width: 130,
      render: () => <Tag icon={<Clock size={12} style={{ marginRight: 4 }} />} color="gold">Chờ chấp nhận</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, inv) => (
        <Popconfirm title="Hủy lời mời này?" onConfirm={() => handleCancelInvite(inv._id)} okText="Hủy mời" cancelText="Không" okButtonProps={{ danger: true }}>
          <Button type="text" icon={<XCircle size={14} />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Quản Lý Lớp Học
        </Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          Thêm Lớp Học
        </Button>
      </div>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={lopHocs}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có lớp học nào. Hãy thêm môn học trước rồi tạo lớp.' }}
        />
      </Card>

      {/* Modal Tạo/Sửa Lớp Học */}
      <Modal
        title={editingItem ? 'Chỉnh Sửa Lớp Học' : 'Thêm Lớp Học Mới'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingItem(null); }}
        okText={editingItem ? 'Cập Nhật' : 'Tạo Mới'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="MaLopHoc" label="Mã Lớp Học" rules={[{ required: true, message: 'Nhập mã lớp' }]}>
            <Input placeholder="VD: 21DHT01" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item name="TenLopHoc" label="Tên Lớp Học" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
            <Input placeholder="VD: Lớp Blockchain ứng dụng" />
          </Form.Item>
          <Form.Item name="MonHoc" label="Môn Học" rules={[{ required: true, message: 'Chọn môn học' }]}>
            <Select placeholder="Chọn môn học">
              {monHocs.map(mh => (
                <Select.Option key={mh._id} value={mh._id}>
                  {mh.MaMonHoc} — {mh.TenMonHoc}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chi Tiết Lớp Học */}
      <Modal
        title={detailData?.lopHoc ? `Chi Tiết Lớp: ${detailData.lopHoc.TenLopHoc}` : 'Chi Tiết Lớp Học'}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailData(null); setPendingInvites([]); }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : detailData ? (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Mã Lớp">{detailData.lopHoc.MaLopHoc}</Descriptions.Item>
              <Descriptions.Item label="Tên Lớp">{detailData.lopHoc.TenLopHoc}</Descriptions.Item>
              <Descriptions.Item label="Môn Học">
                {detailData.lopHoc.MonHoc?.MaMonHoc} — {detailData.lopHoc.MonHoc?.TenMonHoc}
              </Descriptions.Item>
              <Descriptions.Item label="Sĩ Số">
                {detailData.lopHoc.HocSinh?.length || 0} học sinh
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              defaultActiveKey="hocsinh"
              items={[
                {
                  key: 'hocsinh',
                  label: (
                    <Space>
                      <span>Học Sinh ({detailData.lopHoc.HocSinh?.length || 0})</span>
                      {pendingInvites.length > 0 && (
                        <Badge count={pendingInvites.length} size="small" style={{ backgroundColor: '#faad14' }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div>
                      <div style={{ marginBottom: 12, textAlign: 'right' }}>
                        <Space>
                          <Button type="primary" icon={<UserPlus size={14} />} onClick={handleOpenAddSv}>
                            Mời Học Sinh
                          </Button>
                          <Button type="dashed" onClick={() => setImportModalVisible(true)}>
                            Import Danh Sách HS
                          </Button>
                        </Space>
                      </div>

                      {/* Bảng học sinh đã trong lớp */}
                      <Table
                        columns={svColumns}
                        dataSource={detailData.lopHoc.HocSinh || []}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'Chưa có học sinh nào trong lớp' }}
                      />

                      {/* Bảng lời mời đang chờ */}
                      {pendingInvites.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <Divider orientation="left" orientationMargin={0}>
                            <Space>
                              <Clock size={14} style={{ color: '#faad14' }} />
                              <Text type="warning" strong>Lời mời đang chờ chấp nhận ({pendingInvites.length})</Text>
                            </Space>
                          </Divider>
                          <Table
                            columns={inviteColumns}
                            dataSource={pendingInvites}
                            rowKey="_id"
                            pagination={false}
                            size="small"
                          />
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'nhom',
                  label: `Nhóm & Dự Án (${detailData.dangKys?.length || 0})`,
                  children: (
                    <div>
                      {(!detailData.dangKys || detailData.dangKys.length === 0) ? (
                        <Text type="secondary">Chưa có nhóm nào đăng ký dự án.</Text>
                      ) : (
                        <List
                          dataSource={detailData.dangKys}
                          renderItem={(dk) => (
                            <Card
                              size="small"
                              style={{ marginBottom: 12 }}
                              title={
                                <Space>
                                  <Users size={16} />
                                  <Text strong>Dự án: {dk.DeTai?.TenDeTai || dk.DeTai?.MaDeTai || '—'}</Text>
                                  <Tag color={trangThaiColor[dk.TrangThai] || 'default'}>{dk.TrangThai}</Tag>
                                </Space>
                              }
                            >
                              {dk.TruongNhom && (
                                <div style={{ marginBottom: 4 }}>
                                  <Text type="secondary">Trưởng nhóm: </Text>
                                  <Tag color="blue">{dk.TruongNhom.HoTen} ({dk.TruongNhom.MaHS})</Tag>
                                </div>
                              )}
                              {dk.HocSinh && !dk.TruongNhom && (
                                <div style={{ marginBottom: 4 }}>
                                  <Text type="secondary">Học sinh: </Text>
                                  <Tag>{dk.HocSinh.HoTen} ({dk.HocSinh.MaHS})</Tag>
                                </div>
                              )}
                              {dk.ThanhVien && dk.ThanhVien.length > 0 && (
                                <div>
                                  <Text type="secondary">Thành viên: </Text>
                                  {dk.ThanhVien.map((tv, i) => (
                                    <Tag key={i} color={tv.TrangThaiTV === 'DaChapNhan' ? 'green' : tv.TrangThaiTV === 'TuChoi' ? 'red' : 'gold'}>
                                      {tv.HocSinh?.HoTen || '—'} ({tv.VaiTro})
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </Card>
                          )}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'duan',
                  label: `Dự Án Môn (${detailData.deTais?.length || 0})`,
                  children: (
                    <Table
                      dataSource={detailData.deTais || []}
                      rowKey="_id"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Mã Dự Án', dataIndex: 'MaDeTai', key: 'MaDeTai', render: (t) => <Tag>{t}</Tag> },
                        { title: 'Tên Dự Án', dataIndex: 'TenDeTai', key: 'TenDeTai' },
                        {
                          title: 'Trạng Thái', dataIndex: 'TrangThai', key: 'TrangThai',
                          render: (t) => <Tag color={t === 'MoDangKy' ? 'green' : t === 'DaChot' ? 'orange' : 'blue'}>{t}</Tag>,
                        },
                      ]}
                      locale={{ emptyText: 'Chưa có dự án nào thuộc môn học này' }}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Modal Mời Học Sinh (trước đây là Thêm) */}
      <Modal
        title="Mời Học Sinh Vào Lớp"
        open={addSvModalVisible}
        onOk={handleInviteSv}
        onCancel={() => { setAddSvModalVisible(false); setSelectedSvId(null); setSvSearchText(''); }}
        okText="Gửi Lời Mời"
        cancelText="Hủy"
        okButtonProps={{ disabled: !selectedSvId && !svSearchText.trim() }}
      >
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Học sinh sẽ nhận được lời mời và cần chấp nhận trước khi được thêm vào lớp."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            Tìm kiếm theo Mã HS, Họ tên hoặc Email (hoặc tự gõ Mã HS):
          </Text>
          <AutoComplete
            style={{ width: '100%' }}
            options={svSearchOptions}
            onSearch={(text) => {
              setSvSearchText(text);
              handleSvSearch(text);
            }}
            value={svSearchText}
            onChange={(val) => {
              setSvSearchText(val);
              const found = allHocSinh.find(sv => sv._id === val || sv.MaHS === val);
              if (!found) setSelectedSvId(null);
            }}
            onSelect={(value) => {
              setSelectedSvId(value);
              const sv = allHocSinh.find(s => s._id === value);
              if (sv) setSvSearchText(sv.MaHS);
            }}
            placeholder="Gõ để tìm học sinh..."
            allowClear
            onClear={() => { setSelectedSvId(null); setSvSearchText(''); }}
          />
        </div>
      </Modal>

      {/* Modal Import Học Sinh Hàng Loạt */}
      <Modal
        title="Import Lời Mời Học Sinh"
        open={importModalVisible}
        onOk={handleImportSv}
        onCancel={() => { setImportModalVisible(false); setImportText(''); }}
        okText="Gửi Lời Mời"
        cancelText="Hủy"
      >
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Tất cả học sinh trong danh sách sẽ nhận được lời mời và cần chấp nhận trước khi được thêm vào lớp."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            Nhập danh sách Mã HS (phân cách bởi dấu phẩy, khoảng trắng hoặc xuống dòng):
          </Text>
          <Input.TextArea
            rows={6}
            placeholder={"VD: HS001, HS002\nHS003 HS004"}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
