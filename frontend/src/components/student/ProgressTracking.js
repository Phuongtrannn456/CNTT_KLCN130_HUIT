import React, { useState } from 'react';
import {
  Steps, Typography, Card, Alert, Progress as AntProgress, Row, Col,
  Divider, Skeleton, Tag, Space, Tabs, Table, Statistic, Tooltip, Button
} from 'antd';
import {
  CheckCircle, Clock, Search, BookOpen, BrainCircuit,
  GraduationCap, Award, ShieldCheck, RefreshCw, ExternalLink
} from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useClassContext } from '../../contexts/ClassContext';
import { useQuery } from '@tanstack/react-query';

const { Title, Paragraph, Text } = Typography;

const ProgressTracking = () => {
  const isMobile = useIsMobile();
  const { selectedClassId } = useClassContext();
  const user = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState('transcript');

  // Query 1: Bảng điểm tổng hợp tất cả các môn K-12
  const {
    data: bangDiemRes,
    isLoading: loadingBangDiem,
    refetch: refetchBangDiem,
    isFetching: fetchingBangDiem
  } = useQuery({
    queryKey: ['bang-diem-hocsinh', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await aiApiService.getBangDiemHocSinh(user.id);
    },
    enabled: !!user?.id,
  });

  // Query 2: Tiến độ đề tài đang làm trong lớp học được chọn
  const { data: progressData = {}, isLoading: loadingProgress } = useQuery({
    queryKey: ['progress-tracking', user?.id, selectedClassId],
    queryFn: async () => {
      let result = {
        registration: null,
        finalGrade: null,
        latestProgress: null,
        aiResult: null
      };
      if (!user || !selectedClassId) return result;

      try {
        const regRes = await aiApiService.getMyRegistration(user.id, selectedClassId);
        const activeReg = regRes.registration;
        result.registration = activeReg;

        if (activeReg) {
          const deTaiId = activeReg.DeTai?._id || activeReg.DeTai;

          if (activeReg.TrangThai === 'DaDuyet') {
            try {
              const diemRes = await aiApiService.getDiemByHocSinh(user.id);
              if (diemRes && diemRes.length > 0) {
                const topicGrade = diemRes.find(g => (g.DeTai?._id || g.DeTai).toString() === deTaiId.toString());
                if (topicGrade) {
                  result.finalGrade = topicGrade;
                }
              }
            } catch (e) {
              console.warn('Lỗi lấy điểm học sinh:', e);
            }

            try {
              const progressRes = await aiApiService.getProgressByHocSinh(user.id, deTaiId);
              const logs = progressRes?.data || [];
              const latest = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
              result.latestProgress = latest || null;
            } catch (err) {
              console.warn('Lỗi lấy tiến độ gần nhất:', err);
            }

            try {
              const bcRes = await aiApiService.getMyBaoCao(user.id, deTaiId);
              if (bcRes && bcRes.baocao) {
                const topic = activeReg.DeTai;
                const demoText = `Báo cáo: ${bcRes.baocao.TieuDe}. Đề tài đồ án: ${topic?.TenDeTai || ''}. Báo cáo hoàn chỉnh.`;
                const aiRes = await aiApiService.analyzeReportAI(demoText, topic?.YeuCau || []);
                result.aiResult = aiRes;
              }
            } catch (err) {
              console.warn('Lỗi kiểm tra báo cáo:', err);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching progress tracking:', e);
      }
      return result;
    },
    enabled: !!(user?.id && selectedClassId),
  });

  const { registration, finalGrade, latestProgress, aiResult } = progressData;

  const getCurrentStep = () => {
    if (!registration) return 0;
    if (registration.TrangThai === 'ChoDuyet') return 0;
    if (registration.TrangThai === 'DaDuyet') {
      if (finalGrade?.TxHash) return 4;
      if (finalGrade) return 3;
      if (aiResult) return 2;
      return 1;
    }
    return 0;
  };

  const topicName = registration?.DeTai?.TenDeTai || '';
  const topicRequires = registration?.DeTai?.YeuCau || [];
  const regStatus = registration?.TrangThai;

  const hocSinhInfo = bangDiemRes?.hocSinh || {};
  const bangDiemList = bangDiemRes?.bangDiem || [];

  // Định nghĩa các cột cho Bảng Điểm K-12
  const transcriptColumns = [
    {
      title: 'Môn Học',
      key: 'monHoc',
      width: 170,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.tenMonHoc}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="purple" style={{ fontSize: 11 }}>{record.maLopHoc || '10A'}</Tag>
            <Tag style={{ fontSize: 11 }}>{record.maMonHoc}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Giáo Viên Bộ Môn',
      key: 'giaoVien',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong>{record.giaoVien?.hoTen || 'Chưa phân công'}</Text>
          <div style={{ marginTop: 2 }}>
            <Tag color="cyan" style={{ fontSize: 11 }}>{record.giaoVien?.toBoMon || 'Tổ bộ môn'}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Dự Án STEM / Nhiệm Vụ',
      dataIndex: 'deTai',
      key: 'deTai',
      render: (val) => <Text style={{ color: '#262626' }}>{val || 'Chưa đăng ký'}</Text>
    },
    {
      title: 'Điểm AI',
      dataIndex: 'diemAI',
      key: 'diemAI',
      width: 90,
      align: 'center',
      render: (val) => val != null ? <Tag color="geekblue">{Number(val).toFixed(1)}</Tag> : <Text type="secondary">—</Text>
    },
    {
      title: 'Điểm Chính Thức',
      key: 'diemChinhThuc',
      width: 130,
      align: 'center',
      render: (_, record) => {
        if (record.diemChinhThuc != null) {
          const val = Number(record.diemChinhThuc);
          const color = val >= 8.0 ? 'success' : val >= 6.5 ? 'processing' : val >= 5.0 ? 'warning' : 'error';
          return (
            <Tag color={color} style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px' }}>
              {val.toFixed(1)} / 10
            </Tag>
          );
        }
        if (record.trangThai === 'DangThucHien') {
          return <Tag color="blue">Đang làm</Tag>;
        }
        if (record.trangThai === 'ChoDuyet') {
          return <Tag color="orange">Chờ duyệt</Tag>;
        }
        return <Tag color="default">Chưa có</Tag>;
      }
    },
    {
      title: 'Nhận Xét Sư Phạm',
      dataIndex: 'nhanXet',
      key: 'nhanXet',
      render: (val) => val ? (
        <Text italic style={{ color: '#595959' }}>"{val}"</Text>
      ) : (
        <Text type="secondary" italic>Chưa có nhận xét</Text>
      )
    },
    {
      title: 'Bảo Chứng Web3',
      key: 'web3',
      width: 140,
      align: 'center',
      render: (_, record) => {
        if (record.txHash) {
          return (
            <Tooltip title={`TxHash: ${record.txHash}`}>
              <Tag color="green" icon={<ShieldCheck size={12} style={{ marginRight: 4 }} />}>
                Blockchain
              </Tag>
            </Tooltip>
          );
        }
        if (record.diemChinhThuc != null) {
          return <Tag color="orange">Chờ ghi chuỗi</Tag>;
        }
        return <Tag color="default">Chưa ghi</Tag>;
      }
    }
  ];

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: isMobile ? '0 8px' : '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Kết Quả Học Tập & Điểm Số</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Theo dõi bảng điểm tổng hợp tất cả các môn học và lộ trình dự án STEM chuẩn K-12.
          </Paragraph>
        </div>
        {activeTab === 'transcript' && (
          <Button
            icon={<RefreshCw size={14} className={fetchingBangDiem ? 'spin' : ''} />}
            onClick={() => refetchBangDiem()}
            loading={fetchingBangDiem}
          >
            Làm mới
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: 'transcript',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={18} />
                Bảng Điểm Tổng Hợp K-12
              </span>
            ),
            children: (
              <div>
                {/* Thẻ Thông Tin Học Sinh & Tổng Quan Điểm Số */}
                <Card
                  bordered={false}
                  style={{
                    marginBottom: 20,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={10}>
                      <Space direction="vertical" size={4}>
                        <Space align="center">
                          <Title level={4} style={{ margin: 0 }}>
                            {hocSinhInfo.hoTen || user?.name || 'Học Sinh'}
                          </Title>
                          <Tag color="blue">Khối {hocSinhInfo.khoiLop || 10}</Tag>
                          <Tag color="green">Hạnh kiểm: {hocSinhInfo.hanhKiem || 'Tốt'}</Tag>
                        </Space>
                        <Text type="secondary">
                          Mã Học Sinh: <Text strong>{hocSinhInfo.maHS || '—'}</Text> | Email: {hocSinhInfo.email || '—'}
                        </Text>
                        {hocSinhInfo.walletAddress && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Ví Web3: {hocSinhInfo.walletAddress.slice(0, 6)}...{hocSinhInfo.walletAddress.slice(-4)}
                          </Text>
                        )}
                      </Space>
                    </Col>

                    <Col xs={12} sm={6} md={4} style={{ textAlign: 'center' }}>
                      <Statistic
                        title="ĐTB Tất Cả Môn"
                        value={hocSinhInfo.dtbChung || 0}
                        precision={1}
                        suffix="/ 10"
                        valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                      />
                    </Col>

                    <Col xs={12} sm={6} md={4} style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Xếp Loại"
                        value={hocSinhInfo.xepLoai || 'Chưa có'}
                        valueStyle={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: hocSinhInfo.dtbChung >= 8.0 ? '#52c41a' : hocSinhInfo.dtbChung >= 6.5 ? '#1890ff' : '#faad14'
                        }}
                      />
                    </Col>

                    <Col xs={12} sm={6} md={3} style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Số Môn Đã Chấm"
                        value={hocSinhInfo.soMonDaCoDiem || 0}
                        suffix={`/ ${hocSinhInfo.tongSoMon || 0}`}
                        valueStyle={{ fontSize: 18 }}
                      />
                    </Col>

                    <Col xs={12} sm={6} md={3} style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Huy Hiệu Web3"
                        value={hocSinhInfo.soHuyHieuWeb3 || 0}
                        prefix={<Award size={16} style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a', fontSize: 18 }}
                      />
                    </Col>
                  </Row>
                </Card>

                {/* Bảng Chi Tiết Điểm Từng Môn Học */}
                <Card
                  title={<Text strong style={{ fontSize: 16 }}>Bảng Điểm Chi Tiết Theo Môn Học</Text>}
                  bordered={false}
                  style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  {loadingBangDiem ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                  ) : bangDiemList.length === 0 ? (
                    <Alert
                      message="Chưa có dữ liệu lớp học"
                      description="Học sinh chưa được gán vào lớp học nào. Vui lòng liên hệ Giáo viên bộ môn hoặc Ban Quản Trị."
                      type="info"
                      showIcon
                    />
                  ) : (
                    <Table
                      dataSource={bangDiemList}
                      columns={transcriptColumns}
                      rowKey="lopHocId"
                      pagination={false}
                      scroll={{ x: 800 }}
                    />
                  )}
                </Card>
              </div>
            )
          },
          {
            key: 'stepper',
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={18} />
                Tiến Độ Đề Tài Đang Làm
              </span>
            ),
            children: (
              <div>
                {/* Thông tin đề tài đang chọn */}
                {registration ? (
                  <Card style={{ marginBottom: 16, borderLeft: '4px solid #1677ff', borderRadius: 8 }}>
                    <Space wrap>
                      <BookOpen size={18} />
                      <Text strong>Đề tài: {topicName}</Text>
                      <Tag color={regStatus === 'DaDuyet' ? 'blue' : 'processing'}>
                        {regStatus === 'DaDuyet' ? 'Đã Duyệt' : 'Chờ Duyệt'}
                      </Tag>
                    </Space>
                    {topicRequires.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {topicRequires.map((t, i) => <Tag key={i} color="blue">{t}</Tag>)}
                      </div>
                    )}
                  </Card>
                ) : (
                  <Alert
                    message="Chưa chọn đề tài trong lớp này"
                    description="Vui lòng chuyển lớp ở thanh chọn phía trên hoặc đăng ký một đề tài để theo dõi tiến độ."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <Steps
                    direction={isMobile ? 'vertical' : 'horizontal'}
                    current={getCurrentStep()}
                    items={[
                      {
                        title: 'Đăng ký Dự án',
                        description: regStatus === 'DaDuyet' ? 'Đã phê duyệt' : (regStatus === 'ChoDuyet' ? 'Đang chờ duyệt' : 'Chưa đăng ký'),
                        icon: <BookOpen size={24} />
                      },
                      {
                        title: 'Nộp Báo cáo',
                        description: regStatus === 'DaDuyet' ? 'Sẵn sàng nộp' : 'Chờ duyệt dự án',
                        icon: <CheckCircle size={24} />
                      },
                      {
                        title: 'AI Phân Tích',
                        description: aiResult ? `Điểm AI: ${aiResult.score}/10` : 'Chờ nộp báo cáo',
                        icon: <BrainCircuit size={24} color={aiResult ? '#1677ff' : undefined} />
                      },
                      {
                        title: 'Giáo Viên Đánh Giá',
                        description: finalGrade ? `Điểm: ${finalGrade.Diem}/10` : 'Chờ chấm điểm',
                        icon: <Search size={24} color={finalGrade ? '#1677ff' : undefined} />
                      },
                      {
                        title: 'Blockchain',
                        description: finalGrade?.TxHash ? 'Ghi hệ thống hoàn tất' : 'Chờ xác thực',
                        icon: <Clock size={24} color={finalGrade?.TxHash ? '#1677ff' : undefined} />
                      },
                    ]}
                  />
                </Card>

                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                  <Col xs={24} lg={12}>
                    <Card
                      title={<span><BrainCircuit size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Đánh giá từ AI (PhoBERT)</span>}
                      bordered={false}
                      style={{ borderRadius: 12, height: '100%' }}
                    >
                      {aiResult ? (
                        <>
                          <Alert
                            message={`Điểm AI PhoBERT: ${aiResult.score} / 10`}
                            description={
                              <div>
                                <Text>Phản hồi: {aiResult.feedback}</Text>
                                {aiResult.issues && aiResult.issues.length > 0 && (
                                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                    {aiResult.issues.map((iss, i) => (
                                      <li key={i}><Text type="danger">{iss}</Text></li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Tag color="cyan">Model: {aiResult.model || 'vinai/phobert-base'}</Tag>
                          <Tag color="geekblue">Provider: {aiResult.aiProvider || 'local-fastapi'}</Tag>
                        </>
                      ) : (
                        <Alert
                          message={regStatus === 'DaDuyet' ? 'Chưa có phân tích AI' : 'Chờ duyệt đề tài'}
                          description="Học sinh nộp báo cáo PDF ở trang 'Nộp Báo Cáo', sau đó AI sẽ tự động phân tích và chấm điểm sơ bộ."
                          type="info"
                          showIcon
                        />
                      )}
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <Card title="Tiến độ tuần gần nhất" bordered={false} style={{ height: '100%', borderRadius: 12 }}>
                      {latestProgress ? (
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Tag color="geekblue">Tuần {latestProgress.TuanSo || '—'}</Tag>
                          <Text strong>{latestProgress.PhanTramHoanThanh || 0}% hoàn thành</Text>
                          <Tag color={latestProgress.TrangThaiDanhGia === 'Dat' ? 'success' : latestProgress.TrangThaiDanhGia === 'CanBoSung' ? 'warning' : 'default'}>
                            {latestProgress.TrangThaiDanhGia || 'Chờ đánh giá'}
                          </Tag>
                          {latestProgress.DiemTienDo != null && (
                            <Text type="secondary">Điểm tuần: {latestProgress.DiemTienDo}</Text>
                          )}
                        </Space>
                      ) : (
                        <Alert
                          message="Chưa có nhật ký tuần"
                          type="info"
                          showIcon
                        />
                      )}
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <Card title="Điểm Số Chính Thức" bordered={false} style={{ height: '100%', textAlign: 'center', borderRadius: 12 }}>
                      <AntProgress
                        type="dashboard"
                        percent={finalGrade ? Math.round(finalGrade.Diem * 10) : (aiResult ? Math.round(aiResult.score * 10) : 0)}
                        format={() => finalGrade ? `${finalGrade.Diem}/10` : (aiResult ? `${aiResult.score}/10` : 'Chờ')}
                        strokeColor={finalGrade ? '#52c41a' : aiResult ? '#1677ff' : '#d9d9d9'}
                        size={160}
                      />
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ minHeight: 60, textAlign: 'left' }}>
                        {finalGrade ? (
                          <div>
                            <Text strong style={{ color: '#52c41a' }}>Giáo Viên Đã Chấm:</Text>
                            {finalGrade.NhanXet && <Text italic type="secondary" style={{ display: 'block' }}>"{finalGrade.NhanXet}"</Text>}
                            {finalGrade.TxHash && (
                              <div style={{ marginTop: 8 }}>
                                <Tag color="green">Blockchain Confirmed</Tag>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Text type="secondary">
                            {aiResult ? 'Điểm dự đoán từ PhoBERT AI. Giáo viên chưa chấm.' : 'Chờ Giáo Viên Chấm Điểm'}
                          </Text>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default ProgressTracking;
