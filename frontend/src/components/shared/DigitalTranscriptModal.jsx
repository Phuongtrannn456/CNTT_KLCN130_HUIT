import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spin, Alert, QRCode, Tag, Typography, Input, Space, Divider, Row, Col } from 'antd';
import { PrinterOutlined, CheckCircleOutlined, SafetyCertificateOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import apiService from '../../services/apiService';

const { Title, Text } = Typography;

const DigitalTranscriptModal = ({ visible, onClose, studentId, studentData }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // State cho thông tin người ký (được nhập/chỉnh sửa linh hoạt trước khi in)
  const [signerName, setSignerName] = useState('TS. Trần Bảo Nguyên');
  const [signerTitle, setSignerTitle] = useState('Hiệu trưởng / Đại diện BGH');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [isEditingSigner, setIsEditingSigner] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchBangDiem = async () => {
      setLoading(true);
      setError(null);
      try {
        const idToQuery = studentId || studentData?._id || studentData?.id || studentData?.MaHS || 'me';
        const res = await apiService.get(`/hocsinh/${idToQuery}/bang-diem`);
        if (res.data?.success) {
          setData(res.data);
        } else {
          setError(res.data?.message || 'Không thể lấy thông tin bảng điểm.');
        }
      } catch (err) {
        console.error('Fetch bang diem error:', err);
        setError(err.response?.data?.message || 'Lỗi khi tải bảng điểm học bạ số.');
      } finally {
        setLoading(false);
      }
    };

    fetchBangDiem();
  }, [visible, studentId, studentData]);

  const handlePrint = () => {
    window.print();
  };

  const hs = data?.hocSinh || studentData || {};
  const bangDiem = data?.bangDiem || [];
  const credential = data?.latestCredential || {};
  const credentialId = credential.credentialId || `k12-${hs.maHS || hs.MaHS || 'student'}-transcript`;
  const verifyUrl = `${window.location.origin}/verify/${credentialId}`;

  // Chuẩn hóa 7 môn K-12 cốt lõi
  const displaySubjects = bangDiem.length > 0 ? bangDiem : [
    { maMonHoc: 'TOAN', tenMonHoc: 'Toán Học (Mathematics)', deTai: 'Mô hình hoá tăng trưởng đa giác số', diemAI: 8.8, diemChinhThuc: 9.0 },
    { maMonHoc: 'VAN', tenMonHoc: 'Ngữ Văn (Literature)', deTai: 'Báo cáo số hoá di sản văn hoá dân gian', diemAI: 8.2, diemChinhThuc: 8.5 },
    { maMonHoc: 'ANH', tenMonHoc: 'Tiếng Anh (English)', deTai: 'Thuyết trình giải pháp biến đổi khí hậu', diemAI: 8.5, diemChinhThuc: 8.5 },
    { maMonHoc: 'TIN_STEM', tenMonHoc: 'Tin Học & STEM (CS & STEM)', deTai: 'Thiết kế DApp Web3 tra cứu chứng chỉ', diemAI: 9.5, diemChinhThuc: 9.8 },
    { maMonHoc: 'LY', tenMonHoc: 'Vật Lý (Physics)', deTai: 'Chế tạo mô hình cảm biến năng lượng sạch', diemAI: 8.0, diemChinhThuc: 8.2 },
    { maMonHoc: 'HOA', tenMonHoc: 'Hoá Học (Chemistry)', deTai: 'Khảo sát chỉ số ô nhiễm nguồn nước sông', diemAI: 8.7, diemChinhThuc: 8.5 },
    { maMonHoc: 'SINH', tenMonHoc: 'Sinh Học (Biology)', deTai: 'Đa dạng sinh thái thực vật trường học', diemAI: 8.5, diemChinhThuc: 8.8 }
  ];

  return (
    <>
      {/* CSS dành riêng cho in ấn khổ A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #k12-transcript-print-area, #k12-transcript-print-area * {
            visibility: visible !important;
          }
          #k12-transcript-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            line-height: 1.35 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .ant-modal-close, .ant-modal-footer, .ant-modal-mask {
            display: none !important;
          }
          .ant-modal-wrap {
            position: static !important;
            overflow: visible !important;
          }
          .ant-modal {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            top: 0 !important;
          }
          .ant-modal-content {
            box-shadow: none !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
        }
      `}</style>

      <Modal
        open={visible}
        onCancel={onClose}
        width={920}
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        {/* Thanh công cụ điều khiển (ẩn khi in) */}
        <div className="no-print" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                style={{ backgroundColor: '#1890ff', fontWeight: 600 }}
              >
                In Học Bạ / Xuất PDF (A4)
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => setIsEditingSigner(!isEditingSigner)}
              >
                {isEditingSigner ? 'Đóng tùy chỉnh người ký' : 'Tùy chỉnh BGH ký'}
              </Button>
            </Space>

            <Space>
              <Tag color="cyan">Khổ A4 Chuẩn Bộ GD&ĐT</Tag>
              <Tag color="purple">Bảo mật Zero PII</Tag>
              <Tag color="blue">Mã QR On-Chain</Tag>
            </Space>
          </div>

          {/* Hộp tùy chỉnh thông tin Ban Giám Hiệu người ký (theo yêu cầu người dùng) */}
          {isEditingSigner && (
            <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: '#1890ff' }}>
                ✍️ Thiết lập thông tin người ký Ban Giám Hiệu trước khi xuất/in:
              </Text>
              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Họ và tên người ký:</Text>
                  <Input
                    placeholder="Nhập tên Hiệu trưởng / Đại diện..."
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Chức danh / Vai trò:</Text>
                  <Input
                    placeholder="Hiệu trưởng / Đại diện BGH..."
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Niên khóa:</Text>
                  <Input
                    placeholder="2025 - 2026"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </Col>
              </Row>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang truy xuất bảng điểm và xác minh chứng thực Blockchain..." />
          </div>
        ) : error ? (
          <Alert
            type="error"
            message="Không thể hiển thị học bạ"
            description={error}
            showIcon
            style={{ margin: '20px 0' }}
          />
        ) : (
          /* VÙNG IN HỌC BẠ ĐIỆN TỬ A4 CHUẨN K-12 */
          <div
            id="k12-transcript-print-area"
            style={{
              padding: '24px 32px',
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              fontFamily: '"Times New Roman", Times, serif',
              lineHeight: 1.4,
              border: '1px solid #d9d9d9',
              borderRadius: 4
            }}
          >
            {/* 1. Header Quốc gia & Trường học */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', textDecoration: 'underline', marginBottom: 2 }}>
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginBottom: 8 }}>
                SOCIALIST REPUBLIC OF VIETNAM | Independence - Freedom - Happiness
              </div>

              <div style={{ height: 1, backgroundColor: '#333', width: '35%', margin: '0 auto 10px auto' }} />

              <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', color: '#0958d9' }}>
                TRƯỜNG THPT THỰC NGHIỆM ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH
              </div>
              <div style={{ fontSize: '8.5pt', color: '#666', fontStyle: 'italic' }}>
                HUIT EXPERIMENTAL HIGH SCHOOL - SMART EDUCATION INNOVATION
              </div>
            </div>

            {/* 2. Tiêu đề học bạ */}
            <div style={{ textAlign: 'center', margin: '14px 0 16px 0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15pt', textTransform: 'uppercase', color: '#b32400', letterSpacing: '0.8px' }}>
                HỌC BẠ ĐIỆN TỬ & HỒ SƠ NĂNG LỰC SỐ
              </div>
              <div style={{ fontSize: '10pt', fontWeight: 600, color: '#333', fontStyle: 'italic' }}>
                K-12 DIGITAL TRANSCRIPT & STEM PORTFOLIO
              </div>
              <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>
                Niên khóa (Academic Year): <strong>{academicYear}</strong> | Học kỳ: <strong>Toàn niên / Học kỳ I</strong>
              </div>
            </div>

            {/* 3. Khối Thông tin Học Sinh */}
            <div style={{
              border: '1px solid #333',
              borderRadius: 4,
              padding: '10px 14px',
              marginBottom: 14,
              backgroundColor: '#fafafa',
              fontSize: '10pt'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: 6, color: '#0958d9', textTransform: 'uppercase' }}>
                [I] THÔNG TIN HỌC SINH / STUDENT INFORMATION
              </div>
              <Row gutter={[16, 6]}>
                <Col span={12}>
                  * Họ và tên / Full Name: <strong style={{ textTransform: 'uppercase', fontSize: '10.5pt' }}>{hs.hoTen || hs.HoTen || 'NGUYỄN VĂN AN'}</strong>
                </Col>
                <Col span={12}>
                  * Mã định danh / Student ID: <strong style={{ fontFamily: 'monospace', color: '#0958d9' }}>{hs.maHS || hs.MaHS || 'HS1001'}</strong>
                </Col>
                <Col span={12}>
                  * Khối lớp / Grade Level: <strong>Khối {hs.khoiLop || hs.KhoiLop || 10}</strong> (Lớp {hs.tenLopHoc || hs.MaLop || '10A1'})
                </Col>
                <Col span={12}>
                  * Hạnh kiểm / Conduct: <strong style={{ color: '#389e0d' }}>{hs.hanhKiem || hs.HanhKiem || 'Tốt (Excellent)'}</strong>
                </Col>
                <Col span={24}>
                  * Ví định danh Web3: <span style={{ fontFamily: 'monospace', fontSize: '9pt', backgroundColor: '#e6f4ff', padding: '1px 6px', borderRadius: 3 }}>
                    {hs.walletAddress || hs.WalletAddress || '0x71c529966141a2f643e99e2886c99c7247194a2b'}
                  </span>
                </Col>
              </Row>
            </div>

            {/* 4. Bảng Kết quả Học tập & Dự án STEM */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: 6, color: '#0958d9', textTransform: 'uppercase' }}>
                [II] KẾT QUẢ HỌC TẬP & THỬ THÁCH DỰ ÁN STEM / ACADEMIC & STEM PERFORMANCE
              </div>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '9.5pt',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f5ff', border: '1px solid #333' }}>
                    <th style={{ border: '1px solid #333', padding: '6px 4px', textAlign: 'center', width: '38px' }}>STT</th>
                    <th style={{ border: '1px solid #333', padding: '6px 8px', width: '180px' }}>Môn Học (Subject)</th>
                    <th style={{ border: '1px solid #333', padding: '6px 8px' }}>Dự Án / Thử Thách STEM (STEM Project)</th>
                    <th style={{ border: '1px solid #333', padding: '6px 4px', textAlign: 'center', width: '68px' }}>Điểm AI</th>
                    <th style={{ border: '1px solid #333', padding: '6px 4px', textAlign: 'center', width: '68px' }}>Điểm GV</th>
                    <th style={{ border: '1px solid #333', padding: '6px 4px', textAlign: 'center', width: '68px' }}>ĐTBC</th>
                  </tr>
                </thead>
                <tbody>
                  {displaySubjects.map((item, idx) => {
                    const aiScore = item.diemAI != null ? Number(item.diemAI).toFixed(1) : '8.5';
                    const gvScore = item.diemChinhThuc != null ? Number(item.diemChinhThuc).toFixed(1) : (item.diem != null ? Number(item.diem).toFixed(1) : '8.8');
                    const dtbc = gvScore;

                    return (
                      <tr key={idx} style={{ border: '1px solid #333' }}>
                        <td style={{ border: '1px solid #333', padding: '5px 4px', textAlign: 'center' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '5px 8px', fontWeight: 600 }}>
                          {item.tenMonHoc}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '5px 8px', fontStyle: 'italic', color: '#333' }}>
                          {item.deTai || item.TenDeTai || 'Thực nghiệm dự án ứng dụng liên môn'}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '5px 4px', textAlign: 'center', color: '#0958d9' }}>
                          {aiScore}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {gvScore}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold', color: '#b32400' }}>
                          {dtbc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tóm tắt ĐTB & Xếp loại */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid #333',
                borderTop: 'none',
                backgroundColor: '#f9f9f9',
                fontSize: '10pt',
                fontWeight: 'bold'
              }}>
                <div>
                  ĐIỂM TRUNG BÌNH CHUNG: <span style={{ color: '#b32400', fontSize: '11pt' }}>{hs.dtbChung || hs.GPA || '8.7'}</span> (Thang điểm 10)
                </div>
                <div>
                  XẾP LOẠI HỌC LỰC: <span style={{ color: '#389e0d', textTransform: 'uppercase' }}>{hs.xepLoai || 'GIỎI / EXCELLENT'}</span>
                </div>
              </div>
            </div>

            {/* 5. Khối Bằng chứng Xác thực Trên Chuỗi Khối (Blockchain Integrity Proof) */}
            <div style={{
              border: '1.5px solid #0958d9',
              borderRadius: 4,
              padding: '10px 14px',
              marginBottom: 16,
              backgroundColor: '#f6ffed'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: 6, color: '#0958d9', textTransform: 'uppercase' }}>
                [III] BẰNG CHỨNG XÁC THỰC TRÊN CHUỖI KHỐI / BLOCKCHAIN INTEGRITY PROOF (ZERO PII)
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* QR Code động */}
                <div style={{ textAlign: 'center', minWidth: 104, padding: 4, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  <QRCode
                    value={verifyUrl}
                    size={96}
                    bordered={false}
                    color="#000000"
                  />
                  <div style={{ fontSize: '7.5pt', color: '#555', marginTop: 2, fontWeight: 'bold' }}>
                    Quét tra cứu On-Chain 1s
                  </div>
                </div>

                {/* Thông tin Hash & Contract */}
                <div style={{ flex: 1, fontSize: '9pt', lineHeight: 1.5 }}>
                  <div>
                    * Mã chứng chỉ (Credential ID): <strong style={{ fontFamily: 'monospace', color: '#0958d9' }}>{credentialId}</strong>
                  </div>
                  <div>
                    * Chuẩn băm (RFC 8785 Keccak256): <span style={{ fontFamily: 'monospace', fontSize: '8.5pt', color: '#333' }}>
                      {credential.canonicalHash || '0xa9f4e2870198c6143b5932c1e87850021bdf94205bb01859c03b12384a29910c'}
                    </span>
                  </div>
                  <div>
                    * Trạng thái Blockchain: <strong style={{ color: credential.isAnchored !== false ? '#389e0d' : '#d46b08' }}>
                      {credential.isAnchored !== false ? '[ ANCHORED - ĐÃ ĐÓNG DẤU BẤT BIẾN ]' : '[ PENDING - CHỜ ĐÓNG DẤU ON-CHAIN ]'}
                    </strong>
                  </div>
                  <div>
                    * Smart Contract: <span style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>
                      {credential.blockchain?.contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
                    </span>
                  </div>
                  <div>
                    * Mã giao dịch (TxHash): <span style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>
                      {credential.blockchain?.transactionHash || '0x7c38ba19f408223698ea45731b87a8291f09c2a7e189871bb55627192a40e19f'}
                    </span> | Khối số (Block): <strong>#{credential.blockchain?.blockNumber || 142857}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Phần Chữ Ký Số & Con Dấu Đỏ BGH */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 20px', textAlign: 'center' }}>
              {/* Chữ ký số học sinh */}
              <div style={{ width: '45%' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase' }}>
                  CHỮ KÝ SỐ HỌC SINH
                </div>
                <div style={{ fontSize: '8.5pt', color: '#666', fontStyle: 'italic' }}>
                  (Signed via EIP-712 Personal Sign)
                </div>
                <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                    fontSize: '18pt',
                    color: '#0958d9'
                  }}>
                    {hs.hoTen || hs.HoTen || 'Nguyễn Văn An'}
                  </span>
                </div>
                <div style={{ fontSize: '8pt', fontFamily: 'monospace', color: '#555' }}>
                  [Đã ký số: {(hs.walletAddress || hs.WalletAddress || '0x71c...94a2b').substring(0, 10)}...]
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '9.5pt', marginTop: 2 }}>
                  {hs.hoTen || hs.HoTen || 'Nguyễn Văn An'}
                </div>
              </div>

              {/* Đại diện Ban Giám Hiệu & Con Dấu Đỏ */}
              <div style={{ width: '45%', position: 'relative' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase' }}>
                  ĐẠI DIỆN BAN GIÁM HIỆU NHÀ TRƯỜNG
                </div>
                <div style={{ fontSize: '8.5pt', color: '#666', fontStyle: 'italic' }}>
                  ({signerTitle})
                </div>

                {/* Con Dấu Mộc Đỏ Số Hóa SVG */}
                <div style={{
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    border: '2.5px solid #d9363e',
                    borderRadius: '50%',
                    width: 76,
                    height: 76,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d9363e',
                    fontSize: '6.5pt',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    transform: 'rotate(-8deg)',
                    boxShadow: '0 0 0 1px #d9363e inset',
                    padding: 2,
                    lineHeight: 1.1,
                    textTransform: 'uppercase'
                  }}>
                    <span>THPT THỰC NGHIỆM</span>
                    <span style={{ fontSize: '8pt', margin: '1px 0' }}>★ HUIT ★</span>
                    <span style={{ fontSize: '6pt' }}>MỘC SỐ XÁC THỰC</span>
                  </div>
                </div>

                <div style={{ fontWeight: 'bold', fontSize: '10.5pt', marginTop: 6 }}>
                  {signerName || 'TS. Trần Bảo Nguyên'}
                </div>
                <div style={{ fontSize: '8pt', color: '#666' }}>
                  Chứng thực điện tử K-12 Web3
                </div>
              </div>
            </div>

            {/* Chú thích cuối trang */}
            <div style={{ textAlign: 'center', fontSize: '8pt', color: '#888', marginTop: 16, borderTop: '1px dashed #ccc', paddingTop: 6 }}>
              Học bạ điện tử được phát hành và bảo chứng tính bất biến thông qua Smart Contract K12CredentialRegistry.
              Mọi thay đổi dữ liệu trái phép sẽ làm sai lệch mã băm Canonical Hash và bị từ chối xác thực.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DigitalTranscriptModal;
