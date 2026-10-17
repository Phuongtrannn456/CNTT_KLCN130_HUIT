import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, InputNumber, Space, Typography, Table, Tag, Modal, message, Tabs, Empty, Badge, Popconfirm, Alert, Descriptions } from 'antd';
import { Plus, Trash2, Trophy, Code2, ListChecks, ShieldCheck, ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000');

const EntranceTestManager = () => {
  const { deTaiId } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [tieuDe, setTieuDe] = useState('');
  const [moTa, setMoTa] = useState('');
  const [thoiGianLam, setThoiGianLam] = useState(30);
  const [nguongDat, setNguongDat] = useState(75);
  const [cauHoi, setCauHoi] = useState([]);
  const [selectedViolationLog, setSelectedViolationLog] = useState(null);

  // Lắng nghe cập nhật phòng thi thời gian thực
  useEffect(() => {
    if (!deTaiId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('competition:join', { deTaiId, nhomId: 'lecturer' });

    socket.on('competition:winner', (data) => {
      message.info(`🏆 Đã xác định nhóm thắng cuộc: ${data.winnerName || ''}`);
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    });

    socket.on('competition:status', () => {
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    });

    return () => {
      socket.emit('competition:leave', { deTaiId });
      socket.disconnect();
    };
  }, [deTaiId, queryClient]);

  const { data: testData = {}, isLoading: loading } = useQuery({
    queryKey: ['entrance-test', deTaiId, user?.id],
    queryFn: async () => {
      const data = { topic: null, baiTest: null, results: [], registrations: [] };
      try {
        const topics = await aiApiService.getTopics();
        const found = (Array.isArray(topics) ? topics : topics.data || []).find(t => t._id === deTaiId);
        data.topic = found;

        try {
          const test = await aiApiService.getBaiTestByTopic(deTaiId);
          if (test) {
            data.baiTest = test;
            const res = await aiApiService.getTestResults(test._id);
            data.results = res || [];
            try {
              const regs = await aiApiService.getRegistrationsByLecturer(user.id);
              data.registrations = (regs || []).filter(r => {
                const rid = r.DeTai?._id || r.DeTai;
                return rid && rid.toString() === deTaiId;
              });
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          // Ignore, no test found
        }
      } catch (e) {
        console.error(e);
      }
      return data;
    },
    enabled: !!deTaiId && !!user?.id,
  });

  const { topic = null, baiTest = null, results = [], registrations = [] } = testData;

  const handleResetStudent = async (hocSinhId) => {
    if (!hocSinhId) return;
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/baitest/${deTaiId}/reset-student-test`, { hocSinhId }, {
        headers: { Authorization: `Bearer ${authService.getToken()}` }
      });
      message.success('Đã cấp quyền làm lại bài test thành công cho học sinh!');
      setSelectedViolationLog(null);
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (err) {
      message.error(err.response?.data?.error || 'Lỗi cấp quyền thi lại.');
    }
  };

  const handlePrintViolationReport = (record) => {
    if (!record) return;
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      message.warning('Trình duyệt đã chặn cửa sổ pop-up in ấn. Vui lòng cho phép pop-up để in.');
      return;
    }
    const violationRows = (record.LichSuViPham || []).map((vp, idx) => `
      <tr>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #333; padding: 6px;">${vp.LoaiViPham || 'Vi phạm'}</td>
        <td style="border: 1px solid #333; padding: 6px;">${vp.ChiTiet || ''}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${vp.ThoiDiem ? new Date(vp.ThoiDiem).toLocaleTimeString('vi-VN') : 'N/A'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BIÊN BẢN VI PHẠM PHÒNG THI AI</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 30px; font-size: 14pt; line-height: 1.5; }
          .center { text-align: center; }
          .title { font-weight: bold; font-size: 16pt; margin: 20px 0 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12pt; }
          .sig-table { width: 100%; margin-top: 40px; border: none; }
          .sig-table td { border: none; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center">
          <b>BỘ GIÁO DỤC VÀ ĐÀO TẠO - TRƯỜNG ĐẠI HỌC</b><br>
          <b>HỆ THỐNG GIÁM SÁT THI TRỰC TUYẾN AI PROCTORING</b>
          <p>-----------------------------------</p>
          <div class="title">BIÊN BẢN GHI NHẬN HÀNH VI VI PHẠM QUY CHẾ PHÒNG THI</div>
          <i>(Tự động trích xuất bởi Hệ thống Giám sát Liêm chính Học thuật AI)</i>
        </div>

        <p style="margin-top: 25px;">
          Vào hồi ${new Date(record.ThoiGianNop || Date.now()).toLocaleTimeString('vi-VN')}, ngày ${new Date(record.ThoiGianNop || Date.now()).toLocaleDateString('vi-VN')}, hệ thống ghi nhận trường hợp vi phạm quy chế thi trực tuyến đối với thí sinh sau:
        </p>

        <table style="border: none; margin-bottom: 20px;">
          <tr><td style="border:none; width: 220px;"><b>Họ và tên thí sinh:</b></td><td style="border:none;">${record.HocSinh?.HoTen || 'N/A'}</td></tr>
          <tr><td style="border:none;"><b>Mã số học sinh/SV:</b></td><td style="border:none;">${record.HocSinh?.MaHS || 'N/A'}</td></tr>
          <tr><td style="border:none;"><b>Đề tài bài test:</b></td><td style="border:none;">${topic?.TenDeTai || deTaiId}</td></tr>
          <tr><td style="border:none;"><b>Kết luận giám sát AI:</b></td><td style="border:none; color: red;"><b>${record.BiHuyKetQua ? 'ĐÌNH CHỈ THI (0 ĐIỂM)' : record.AI_CheatAssessment}</b> (Chỉ số nghi vấn: ${record.AI_CheatScore || 0}%)</td></tr>
          <tr><td style="border:none;"><b>Lý do xử lý:</b></td><td style="border:none;">${record.LyDoHuy || 'Vi phạm quy chế 1 màn hình duy nhất hoặc mở công cụ DevTools / F12.'}</td></tr>
        </table>

        <b>DANH SÁCH CÁC HÀNH VI VI PHẠM ĐÃ GHI NHẬN:</b>
        <table>
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px;">STT</th>
              <th style="border: 1px solid #333; padding: 6px; width: 150px;">Phân loại</th>
              <th style="border: 1px solid #333; padding: 6px;">Chi tiết hành vi</th>
              <th style="border: 1px solid #333; padding: 6px; width: 110px;">Thời điểm</th>
            </tr>
          </thead>
          <tbody>
            ${violationRows || '<tr><td colspan="4" style="text-align:center; padding: 10px;">Không có vi phạm chi tiết</td></tr>'}
          </tbody>
        </table>

        <table class="sig-table">
          <tr>
            <td style="width: 50%;"><b>HỌC SINH VI PHẠM</b><br><i>(Đã xem biên bản)</i><br><br><br><br><b>${record.HocSinh?.HoTen || ''}</b></td>
            <td style="width: 50%;"><b>GIÁO VIÊN / HỆ THỐNG AI</b><br><i>(Xác thực điện tử)</i><br><br><br><br><b>AI PROCTOR GUARDIAN</b></td>
          </tr>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Thêm câu hỏi
  const addTracNghiem = () => {
    setCauHoi([...cauHoi, {
      LoaiCauHoi: 'TracNghiem',
      NoiDung: '',
      LuaChon: ['', '', '', ''],
      DapAnDung: 'A',
      Diem: 1
    }]);
  };

  const addCode = () => {
    setCauHoi([...cauHoi, {
      LoaiCauHoi: 'Code',
      NoiDung: '',
      NgonNgu: 'python',
      DapAnMau: '',
      Diem: 2
    }]);
  };

  const removeCauHoi = (idx) => {
    setCauHoi(cauHoi.filter((_, i) => i !== idx));
  };

  const updateCauHoi = (idx, field, value) => {
    const updated = [...cauHoi];
    updated[idx] = { ...updated[idx], [field]: value };
    setCauHoi(updated);
  };

  const updateLuaChon = (qIdx, cIdx, value) => {
    const updated = [...cauHoi];
    const choices = [...updated[qIdx].LuaChon];
    choices[cIdx] = value;
    updated[qIdx] = { ...updated[qIdx], LuaChon: choices };
    setCauHoi(updated);
  };

  // Tạo bài test
  const handleCreate = async () => {
    if (cauHoi.length === 0) { message.warning('Hãy thêm ít nhất 1 câu hỏi'); return; }
    setSaving(true);
    try {
      await aiApiService.createBaiTest({
        deTaiId,
        tieuDe: tieuDe || `Bài test: ${topic?.TenDeTai || ''}`,
        moTa,
        cauHoi,
        thoiGianLam,
        nguongDat
      });
      message.success('Tạo bài test thành công!');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi tạo bài test');
    } finally {
      setSaving(false);
    }
  };

  // Chọn nhóm thắng
  const handleSelectWinner = async (result) => {
    try {
      await aiApiService.selectTestWinner(baiTest._id, result.DangKyDeTai || result._id);
      message.success('Đã chọn nhóm thắng!');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi');
    }
  };

  // Xóa bài test
  const handleDelete = async () => {
    try {
      await aiApiService.deleteBaiTest(baiTest._id);
      message.success('Đã xóa bài test');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error('Lỗi xóa');
    }
  };

  // Bảng kết quả
  const resultColumns = [
    {
      title: 'STT',
      key: 'rank',
      width: 50,
      render: (_, __, idx) => <Text strong>{idx + 1}</Text>
    },
    {
      title: 'Nhóm / Học Sinh',
      key: 'student',
      render: (_, r) => (
        <div>
          <Text strong>{r.HocSinh?.HoTen || 'N/A'} ({r.HocSinh?.MaHS})</Text>
          {r.Nhom && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>{r.Nhom.TenNhom || 'Nhóm'}</Tag>}
        </div>
      ),
    },
    {
      title: 'Tổng Điểm',
      key: 'score',
      width: 110,
      align: 'center',
      render: (_, r) => {
        const pct = r.DiemToiDa > 0 ? Math.round((r.TongDiem / r.DiemToiDa) * 100) : 0;
        return (
          <div>
            <Text strong style={{ fontSize: 16, color: '#eb2f96' }}>{r.TongDiem} / {r.DiemToiDa}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{pct}%</Text>
          </div>
        );
      },
    },
    {
      title: 'Kết quả',
      key: 'result',
      width: 140,
      align: 'center',
      render: (_, r) => {
        const pct = r.DiemToiDa > 0 ? Math.round((r.TongDiem / r.DiemToiDa) * 100) : 0;
        const threshold = baiTest?.NguongDat || 75;
        const passed = pct >= threshold;
        // Check competition status from DangKyDeTai
        const regStatus = registrations.find(reg => 
          reg.Nhom?._id === r.Nhom?._id || reg.HocSinh?._id === r.HocSinh?._id
        );
        const isWinner = regStatus?.TrangThai === 'DaDuyet';
        const isLost = regStatus?.TrangThai === 'Thua';
        
        if (isWinner) return <Tag color="gold" style={{ fontSize: 13 }}>🏆 WINNER</Tag>;
        if (isLost) return <Tag color="default" style={{ fontSize: 13 }}>😞 Thua</Tag>;
        return <Tag color={passed ? 'success' : 'error'} style={{ fontSize: 13 }}>{passed ? `✅ Đạt (≥${threshold}%)` : `❌ Không đạt`}</Tag>;
      },
    },
    {
      title: 'Chi Tiết',
      key: 'detail',
      render: (_, r) => (
        <Space>
          {(r.TraLoi || []).map((tl, i) => (
            <Tag key={i} color={tl.DungSai ? 'green' : tl.AI_Similarity >= 0.65 ? 'blue' : 'red'}>
              C{i + 1}: {tl.Diem}/{tl.DiemToiDa}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Giám sát AI (Chống gian lận)',
      key: 'proctoring',
      width: 220,
      render: (_, r) => {
        const isDisqualified = r.BiHuyKetQua;
        const assessment = r.AI_CheatAssessment || 'Liêm chính';
        const color = isDisqualified ? 'red' : assessment === 'Liêm chính' ? 'green' : assessment === 'Nghi vấn nhẹ' ? 'orange' : 'red';
        const hasViolations = (r.SoLanChuyenTab > 0) || (r.SoLanThoatFullscreen > 0) || (r.LichSuViPham?.length > 0) || isDisqualified;

        return (
          <div>
            <Tag color={color} style={{ fontWeight: 700 }}>
              {isDisqualified ? '🛑 ĐÌNH CHỈ THI (ĐIỂM 0)' : assessment === 'Liêm chính' ? '🟢 Liêm chính' : assessment === 'Nghi vấn nhẹ' ? '🟡 Nghi vấn nhẹ' : '🔴 Vi phạm quy chế'}
            </Tag>
            {hasViolations ? (
              <div style={{ marginTop: 4 }}>
                <Button 
                  type="link" 
                  size="small" 
                  danger={isDisqualified}
                  style={{ padding: 0, fontSize: 12, fontWeight: isDisqualified ? 600 : 400 }}
                  onClick={() => setSelectedViolationLog(r)}
                >
                  Xem bằng chứng vi phạm ({r.SoLanThoatFullscreen || 0} thoát FS, {r.SoLanChuyenTab || 0} tab)
                </Button>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>Duy trì 1 màn hình 100%</div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Blockchain',
      key: 'tx',
      width: 100,
      render: (_, r) => r.TxHash
        ? <Tag color="green" icon={<ShieldCheck size={10} />}>On-chain</Tag>
        : <Tag color="default">Chưa ghi</Tag>,
    },
    {
      title: 'Hành Động',
      key: 'action',
      width: 170,
      render: (_, r) => (
        <Space size="small">
          {(r.BiHuyKetQua || (r.LichSuViPham && r.LichSuViPham.length > 0)) && (
            <Button
              type="text"
              danger
              size="small"
              icon={<Printer size={13} />}
              onClick={() => handlePrintViolationReport(r)}
              title="In biên bản vi phạm kỷ luật phòng thi"
            >
              In BB
            </Button>
          )}
          <Popconfirm
            title="Cấp quyền làm lại bài test?"
            description={`Xóa kết quả hiện tại và cho phép thí sinh ${r.HocSinh?.HoTen || ''} làm lại bài?`}
            onConfirm={() => handleResetStudent(r.HocSinh?._id || r.HocSinh)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              ghost
              size="small"
              icon={<RotateCcw size={13} />}
            >
              Thi lại
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <Card loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><Space><ListChecks size={24} /> Quản Lý Bài Test Cạnh Tranh</Space></Title>
        <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/lecturer/topics')}>Quay về Đề Tài</Button>
      </div>
      {topic && (
        <Alert message={`Đề tài: ${topic.TenDeTai}`} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      {baiTest ? (
        // === ĐÃ CÓ BÀI TEST ===
        <Tabs items={[
          {
            key: 'info',
            label: `📋 Thông tin (${baiTest.CauHoi?.length || 0} câu)`,
            children: (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Tiêu đề">{baiTest.TieuDe}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={baiTest.TrangThai === 'MoNop' ? 'green' : 'red'}>{baiTest.TrangThai === 'MoNop' ? 'Đang mở' : 'Đã đóng'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian">{baiTest.ThoiGianLam} phút</Descriptions.Item>
                  <Descriptions.Item label="Số câu">{baiTest.CauHoi?.length || 0}</Descriptions.Item>
                  <Descriptions.Item label="Ngưỡng đạt" span={2}>
                    <Tag color="blue" style={{ fontSize: 14 }}>≥ {baiTest.NguongDat || 75}%</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>Học sinh đạt ngưỡng sẽ được duyệt tự động</Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* Chi tiết câu hỏi */}
                <Title level={5} style={{ marginTop: 20 }}>Chi tiết câu hỏi</Title>
                {(baiTest.CauHoi || []).map((q, idx) => (
                  <Card key={idx} size="small" style={{ marginBottom: 8, borderLeft: `4px solid ${q.LoaiCauHoi === 'TracNghiem' ? '#1677ff' : '#722ed1'}` }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>
                        {q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}
                      </Tag>
                      <Text strong>Câu {idx + 1}</Text>
                      <Text type="secondary">({q.Diem} điểm)</Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 8 }}>{q.NoiDung}</Paragraph>

                    {q.LoaiCauHoi === 'TracNghiem' && (
                      <div>
                        {(q.LuaChon || []).map((lc, cIdx) => {
                          const letter = String.fromCharCode(65 + cIdx);
                          const isCorrect = q.DapAnDung === letter;
                          return (
                            <div key={cIdx} style={{
                              padding: '4px 8px', marginBottom: 2, borderRadius: 4,
                              background: isCorrect ? '#f6ffed' : 'transparent',
                              border: isCorrect ? '1px solid #b7eb8f' : '1px solid #f0f0f0'
                            }}>
                              <Tag color={isCorrect ? 'green' : 'default'}>{letter}</Tag>
                              {lc}
                              {isCorrect && <Text type="success" style={{ marginLeft: 8 }}>✓ Đáp án đúng</Text>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.LoaiCauHoi === 'Code' && (
                      <div>
                        <Text type="secondary">Ngôn ngữ: {q.NgonNgu || 'python'}</Text>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Đáp án mẫu:</Text>
                          <Editor height="150px" language={q.NgonNgu || 'python'} value={q.DapAnMau || ''}
                            theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                <Popconfirm title="Xóa bài test này?" onConfirm={handleDelete}>
                  <Button danger style={{ marginTop: 16 }} icon={<Trash2 size={14} />}>Xóa bài test</Button>
                </Popconfirm>
              </Card>
            )
          },
          {
            key: 'results',
            label: <Badge count={results.length} offset={[10, 0]}>📊 Kết Quả Test</Badge>,
            children: (
              <Table
                columns={resultColumns}
                dataSource={results}
                rowKey="_id"
                pagination={false}
                locale={{ emptyText: <Empty description="Chưa có học sinh nào nộp bài test" /> }}
              />
            )
          }
        ]} />
      ) : (
        // === TẠO BÀI TEST MỚI ===
        <Card title="Tạo Bài Test Đầu Vào" style={{ borderTop: '3px solid #722ed1' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Input placeholder="Tiêu đề bài test" value={tieuDe} onChange={e => setTieuDe(e.target.value)} size="large" />
            <TextArea placeholder="Mô tả bài test" value={moTa} onChange={e => setMoTa(e.target.value)} rows={2} />
            <Space>
              <Text>Thời gian làm bài:</Text>
              <InputNumber value={thoiGianLam} onChange={setThoiGianLam} min={5} max={180} addonAfter="phút" />
            </Space>
            <Space>
              <Text>Ngưỡng đạt (auto-duyệt):</Text>
              <InputNumber value={nguongDat} onChange={setNguongDat} min={0} max={100} addonAfter="%" />
              <Text type="secondary" style={{ fontSize: 12 }}>Học sinh đạt ngưỡng này sẽ được duyệt tự động</Text>
            </Space>

            <Title level={5}>Câu Hỏi ({cauHoi.length})</Title>

            {cauHoi.map((q, idx) => (
              <Card key={idx} size="small" title={
                <Space>
                  <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>{q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}</Tag>
                  <Text>Câu {idx + 1} — {q.Diem} điểm</Text>
                </Space>
              } extra={<Button danger size="small" icon={<Trash2 size={12} />} onClick={() => removeCauHoi(idx)} />}>
                <TextArea placeholder="Nội dung câu hỏi / đề bài" value={q.NoiDung}
                  onChange={e => updateCauHoi(idx, 'NoiDung', e.target.value)} rows={2} style={{ marginBottom: 8 }} />

                <InputNumber size="small" value={q.Diem} onChange={v => updateCauHoi(idx, 'Diem', v)} min={1} max={10} addonBefore="Điểm" style={{ marginBottom: 8 }} />

                {q.LoaiCauHoi === 'TracNghiem' && (
                  <div>
                    {['A', 'B', 'C', 'D'].map((letter, cIdx) => (
                      <Input key={letter} addonBefore={<Tag color={q.DapAnDung === letter ? 'green' : 'default'}
                        style={{ cursor: 'pointer' }} onClick={() => updateCauHoi(idx, 'DapAnDung', letter)}>{letter}</Tag>}
                        placeholder={`Lựa chọn ${letter}`} value={q.LuaChon?.[cIdx] || ''}
                        onChange={e => updateLuaChon(idx, cIdx, e.target.value)}
                        style={{ marginBottom: 4 }} />
                    ))}
                    <Text type="secondary" style={{ fontSize: 12 }}>Click vào chữ cái để chọn đáp án đúng. Đáp án đúng: <Tag color="green">{q.DapAnDung}</Tag></Text>
                  </div>
                )}

                {q.LoaiCauHoi === 'Code' && (
                  <div>
                    <Select value={q.NgonNgu} onChange={v => updateCauHoi(idx, 'NgonNgu', v)}
                      options={[
                        { value: 'python', label: 'Python' },
                        { value: 'javascript', label: 'JavaScript' },
                        { value: 'java', label: 'Java' },
                        { value: 'cpp', label: 'C++' }
                      ]} style={{ width: 150, marginBottom: 8 }} />
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Đáp án mẫu (SBERT sẽ so sánh code học sinh với code này):</Text>
                    <Editor height="200px" language={q.NgonNgu} value={q.DapAnMau || ''}
                      onChange={v => updateCauHoi(idx, 'DapAnMau', v || '')}
                      theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 13 }} />
                  </div>
                )}
              </Card>
            ))}

            <Space>
              <Button icon={<Plus size={14} />} onClick={addTracNghiem}>Thêm Trắc Nghiệm</Button>
              <Button icon={<Code2 size={14} />} onClick={addCode} type="dashed">Thêm Câu Code</Button>
            </Space>

            <Button type="primary" size="large" onClick={handleCreate} loading={saving} disabled={cauHoi.length === 0}
              style={{ width: '100%', background: '#722ed1', borderColor: '#722ed1', color: '#fff' }}>
              Tạo Bài Test ({cauHoi.length} câu)
            </Button>
          </Space>
        </Card>
      )}

      {/* Modal Xem Chi Tiết Vi Phạm Phòng Thi */}
      <Modal
        title={`📋 Nhật Ký Giám Sát Phòng Thi: ${selectedViolationLog?.HocSinh?.HoTen || 'Học sinh'}`}
        open={!!selectedViolationLog}
        onOk={() => setSelectedViolationLog(null)}
        onCancel={() => setSelectedViolationLog(null)}
        footer={[
          <Button key="print" icon={<Printer size={14} />} onClick={() => handlePrintViolationReport(selectedViolationLog)}>
            In Biên Bản Kỷ Luật
          </Button>,
          <Popconfirm
            key="reset"
            title="Cấp quyền làm lại bài test?"
            description={`Xóa kết quả vi phạm và cho phép thí sinh ${selectedViolationLog?.HocSinh?.HoTen || ''} làm lại bài?`}
            onConfirm={() => handleResetStudent(selectedViolationLog?.HocSinh?._id || selectedViolationLog?.HocSinh)}
            okText="Cấp quyền"
            cancelText="Hủy"
          >
            <Button type="primary" danger ghost icon={<RotateCcw size={14} />}>
              Cấp Quyền Thi Lại
            </Button>
          </Popconfirm>,
          <Button key="close" type="primary" onClick={() => setSelectedViolationLog(null)}>
            Đóng
          </Button>
        ]}
        width={650}
      >
        {selectedViolationLog && (
          <div>
            {selectedViolationLog.BiHuyKetQua && (
              <Alert 
                type="error" 
                showIcon 
                message="BÀI THI ĐÃ BỊ ĐÌNH CHỈ & HỦY TOÀN BỘ ĐIỂM SỐ (ĐIỂM 0)"
                description={selectedViolationLog.LyDoHuy || 'Học sinh vi phạm nghiêm trọng quy chế thi 1 màn hình duy nhất.'}
                style={{ marginBottom: 16 }}
              />
            )}
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Học sinh">{selectedViolationLog.HocSinh?.HoTen} ({selectedViolationLog.HocSinh?.MaHS})</Descriptions.Item>
              <Descriptions.Item label="Đánh giá AI">
                <Tag color={selectedViolationLog.AI_CheatAssessment === 'Liêm chính' ? 'green' : selectedViolationLog.AI_CheatAssessment === 'Nghi vấn nhẹ' ? 'orange' : 'red'}>
                  {selectedViolationLog.AI_CheatAssessment || 'Liêm chính'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thoát toàn màn hình">{selectedViolationLog.SoLanThoatFullscreen || 0} lần</Descriptions.Item>
              <Descriptions.Item label="Chuyển tab / Ẩn cửa sổ">{selectedViolationLog.SoLanChuyenTab || 0} lần</Descriptions.Item>
              <Descriptions.Item label="Điểm nghi vấn gian lận" span={2}>
                <Text strong style={{ color: selectedViolationLog.AI_CheatScore > 50 ? '#f5222d' : '#faad14' }}>
                  {selectedViolationLog.AI_CheatScore || 0}%
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Lịch Sử Vi Phạm Theo Mốc Thời Gian:</Title>
            {(!selectedViolationLog.LichSuViPham || selectedViolationLog.LichSuViPham.length === 0) ? (
              <Alert message="Không có vi phạm nào được ghi nhận. Học sinh tuân thủ nghiêm túc 1 màn hình duy nhất." type="success" showIcon />
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {selectedViolationLog.LichSuViPham.map((vp, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', marginBottom: 6, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color="red">{vp.LoaiViPham || 'Vi phạm'}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {vp.ThoiDiem ? new Date(vp.ThoiDiem).toLocaleTimeString('vi-VN') : 'N/A'}
                      </Text>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#cf1322' }}>
                      {vp.ChiTiet || 'Rời khỏi màn hình làm bài'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EntranceTestManager;
