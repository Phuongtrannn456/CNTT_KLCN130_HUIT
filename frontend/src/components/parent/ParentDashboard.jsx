import React, { useState } from 'react';
import { Card, Typography, Row, Col, Tag, Button, Alert, Space, Divider, message, Modal, Input } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import DigitalTranscriptModal from '../shared/DigitalTranscriptModal';

const { Title, Text, Paragraph } = Typography;

const ParentDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parentSigned, setParentSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const handleSignConsent = () => {
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      setParentSigned(true);
      message.success('Ký số đồng thuận phụ huynh thành công! Dữ liệu đã niêm phong bất biến lên Smart Contract.');
    }, 1200);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Card style={{ borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.08)', textAlign: 'center', padding: '10px 10px' }}>
          <Tag color="geekblue" style={{ fontSize: '0.85rem', padding: '4px 12px', marginBottom: 12 }}>
            HỆ THỐNG GIÁO DỤC PHỔ THÔNG K-12 WEB3
          </Tag>
          <Title level={3} style={{ margin: '8px 0 6px 0', color: '#1677ff' }}>
            CỔNG ĐĂNG NHẬP PHỤ HUYNH
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 13 }}>
            Đăng nhập an toàn bằng Mã HS và PIN Phụ huynh 6 số do trường cấp (không cần ví Crypto hay trả phí Gas).
          </Text>

          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            <Text strong>Mã Học Sinh:</Text>
            <Input size="large" defaultValue="HS1001" style={{ marginTop: 6 }} prefix={<UserOutlined />} />
          </div>

          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            <Text strong>Mã PIN Phụ Huynh 6 số bí mật:</Text>
            <Input.Password size="large" defaultValue="888888" style={{ marginTop: 6 }} prefix={<SafetyCertificateOutlined />} />
          </div>

          <Button
            type="primary"
            size="large"
            block
            style={{ height: 46, fontSize: 16, fontWeight: 'bold', background: '#1677ff' }}
            onClick={() => {
              message.success('Đăng nhập thành công! Chào mừng Phụ huynh em Trần Thị Phương (HS1001)');
              setIsLoggedIn(true);
            }}
          >
            Đăng Nhập Cổng Phụ Huynh
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '30px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        {/* Banner Header */}
        <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
          <Tag color="geekblue" style={{ fontSize: '0.85rem', padding: '4px 12px', marginBottom: 8 }}>
            HỆ THỐNG GIÁO DỤC PHỔ THÔNG K-12 WEB3 HUB
          </Tag>
          <Title level={3} style={{ margin: '4px 0 6px 0', color: '#1677ff' }}>
            CỔNG THÔNG TIN PHỤ HUYNH HỌC SINH
          </Title>
          <Text type="secondary">
            Trường THPT Thực Nghiệm HUIT • Niên Khóa: 2025 - 2026 • Giám Sát Học Tập & Ký Số Đồng Thuận
          </Text>
        </div>

        {/* Thông tin học sinh */}
        <div style={{ background: '#f0f5ff', padding: '12px 18px', borderRadius: 8, marginBottom: 20, border: '1px solid #adc6ff' }}>
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={6}>
              <Text type="secondary">Học sinh: </Text>
              <Text strong style={{ fontSize: '1rem', textTransform: 'uppercase' }}>Trần Thị Phương</Text>
            </Col>
            <Col xs={24} sm={6}>
              <Text type="secondary">Lớp: </Text>
              <Tag color="blue">10A1 (Khối 10)</Tag>
            </Col>
            <Col xs={24} sm={6}>
              <Text type="secondary">Mã HS: </Text>
              <Text strong style={{ fontFamily: 'monospace', color: '#0958d9' }}>HS1001</Text>
            </Col>
            <Col xs={24} sm={6}>
              <Text type="secondary">GVCN: </Text>
              <Text strong>Thầy Nguyễn Văn Toàn</Text>
            </Col>
          </Row>
        </div>

        {/* Khối 1: Chuyên cần & Nề nếp */}
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ color: '#0958d9', marginBottom: 10 }}>
            [1] TÌNH HÌNH CHUYÊN CẦN & NỀN NẾP HỌC KỲ
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" bordered style={{ background: '#fafafa' }}>
                <Text type="secondary">Số buổi có mặt:</Text>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#52c41a' }}>45 / 45 Buổi (100%)</div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" bordered style={{ background: '#fafafa' }}>
                <Text type="secondary">Số ngày vắng:</Text>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1890ff' }}>0 Buổi</div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" bordered style={{ background: '#fafafa' }}>
                <Text type="secondary">Hạnh kiểm tháng:</Text>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#52c41a' }}>Tốt (Excellent)</div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Khối 2: Kết quả dự án STEM */}
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ color: '#0958d9', marginBottom: 10 }}>
            [2] KẾT QUẢ CÁC DỰ ÁN HỌC TẬP & THỬ THÁCH STEM MỚI NHẤT
          </Title>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#fafafa', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>Môn Tin Học & STEM: </Text>
                <Text>Thiết kế DApp Web3 tra cứu chứng chỉ số K-12</Text>
              </div>
              <Tag color="green" style={{ fontWeight: 'bold', fontSize: 13 }}>9.8 / 10 (Xuất sắc)</Tag>
            </div>
            <div style={{ padding: '10px 16px', background: '#fff', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>Môn Toán Học: </Text>
                <Text>Mô hình hoá tăng trưởng đa giác số và ứng dụng thực tiễn</Text>
              </div>
              <Tag color="blue" style={{ fontWeight: 'bold', fontSize: 13 }}>9.0 / 10 (Giỏi)</Tag>
            </div>
            <div style={{ padding: '10px 16px', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text strong>Môn Ngữ Văn: </Text>
                <Text>Báo cáo số hoá di sản văn hoá dân gian trong kỷ nguyên số</Text>
              </div>
              <Tag color="blue" style={{ fontWeight: 'bold', fontSize: 13 }}>8.5 / 10 (Giỏi)</Tag>
            </div>
          </div>
        </div>

        {/* Khối 3: Đồng thuận 3 bên */}
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ color: '#0958d9', marginBottom: 10 }}>
            [3] XÁC NHẬN HỌC BẠ ĐIỆN TỬ & KÝ SỐ ĐỒNG THUẬN 3 BÊN
          </Title>
          <Row gutter={[16, 12]} style={{ marginBottom: 14 }}>
            <Col xs={24} sm={8}>
              <div style={{ padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                <Text strong>1. Nhà trường / BGH:</Text>
                <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>ĐÃ PHÊ DUYỆT (Mộc số BGH)</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                <Text strong>2. Học sinh (Trần Thị Phương):</Text>
                <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>ĐÃ KÝ EIP-712 CONFIRM</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{
                padding: 10,
                background: parentSigned ? '#f6ffed' : '#fffbe6',
                border: parentSigned ? '1px solid #b7eb8f' : '1px solid #ffe58f',
                borderRadius: 6
              }}>
                {parentSigned ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                    <Text strong>3. Phụ huynh học sinh:</Text>
                    <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>ĐÃ KÝ SỐ ĐỒNG THUẬN</div>
                  </>
                ) : (
                  <>
                    <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 6 }} />
                    <Text strong>3. Phụ huynh học sinh:</Text>
                    <div style={{ fontSize: 12, color: '#faad14', marginTop: 2 }}>! CHƯA KÝ XÁC NHẬN</div>
                  </>
                )}
              </div>
            </Col>
          </Row>

          {/* Lời cam kết */}
          <div style={{ padding: '12px 16px', background: '#fbfbfb', border: '1px dashed #d9d9d9', borderRadius: 8, marginBottom: 16 }}>
            <Text italic style={{ color: '#555', fontSize: 13 }}>
              "Tôi là Phụ huynh của em Trần Thị Phương (HS1001), xác nhận đã kiểm tra toàn bộ điểm số, nề nếp và nhận xét trên của nhà trường, đồng thuận lưu trữ học bạ số bất biến trên Blockchain."
            </Text>
          </div>

          {/* Nút ký số */}
          {parentSigned ? (
            <div>
              <Alert
                type="success"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message="ĐÃ KHÓA BẤT BIẾN CHỮ KÝ ĐỒNG THUẬN 3 BÊN LÊN BLOCKCHAIN"
                description="Toàn bộ chữ ký (Trường - Trò - Phụ huynh) đã được gói vào Canonical JSON và neo thành công lên Smart Contract K12CredentialRegistry.sol (Mã giao dịch: 0x7c38ba19f408223698ea45731b87a8291f09c2a7e189871bb55627192a40e19f)."
                style={{ marginBottom: 16 }}
              />
              <div style={{ textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PrinterOutlined />}
                  onClick={() => setTranscriptOpen(true)}
                  style={{ background: '#1677ff', fontWeight: 600 }}
                >
                  Xem & In Học Bạ Điện Tử A4 (7 Môn K-12)
                </Button>
                <Button
                  size="large"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => window.open('/verify/HS1001', '_blank')}
                  style={{ fontWeight: 600, borderColor: '#52c41a', color: '#389e0d' }}
                >
                  Tra Cứu Xác Thực On-Chain (Public Verify)
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                size="large"
                loading={signing}
                icon={<CheckOutlined />}
                onClick={handleSignConsent}
                style={{
                  height: 48,
                  padding: '0 28px',
                  fontSize: 15,
                  fontWeight: 'bold',
                  background: '#52c41a',
                  borderColor: '#52c41a'
                }}
              >
                BẤM VÀO ĐÂY ĐỂ KÝ SỐ ĐỒNG THUẬN HỌC BẠ (PIN PHỤ HUYNH)
              </Button>
              <Button
                size="large"
                icon={<PrinterOutlined />}
                onClick={() => setTranscriptOpen(true)}
                style={{ height: 48, fontWeight: 600 }}
              >
                Xem Chi Tiết Học Bạ A4
              </Button>
            </div>
          )}
        </div>
      </Card>
      <DigitalTranscriptModal
        visible={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        studentId="6ae94aebd294387715a38afb"
      />
    </div>
  );
};

export default ParentDashboard;
