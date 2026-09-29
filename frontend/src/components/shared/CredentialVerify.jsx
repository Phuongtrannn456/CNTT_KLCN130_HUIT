import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Result, Spin, Tag, Descriptions, Typography, Button, Space, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const CredentialVerify = () => {
  const { credentialId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/credentials/${credentialId}/verify`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin xác minh chứng chỉ số.');
      } finally {
        setLoading(false);
      }
    };

    if (credentialId) {
      fetchVerification();
    }
  }, [credentialId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spin size="large" tip="Đang kiểm tra dữ liệu Blockchain..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
        <Card>
          <Result
            status="error"
            title="Không tìm thấy chứng chỉ số"
            subTitle={error || 'Mã chứng chỉ không tồn tại trong hệ thống.'}
            extra={<Link to="/"><Button type="primary" icon={<ArrowLeftOutlined />}>Về trang chủ</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const isVerified = data.verified === true;
  const credential = data.data || {};
  const details = data.details || {};

  return (
    <div style={{ maxWidth: 880, margin: '40px auto', padding: '0 16px' }}>
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyCertificateOutlined style={{ fontSize: 48, color: isVerified ? '#52c41a' : '#f5222d' }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 8 }}>
            Xác minh Chứng chỉ Học tập Web3
          </Title>
          <Text type="secondary">Hệ thống Giáo dục Phổ thông Web3 & AI Verification</Text>
        </div>

        {isVerified ? (
          <Alert
            message="CHỨNG CHỈ ĐƯỢC XÁC THỰC THÀNH CÔNG TRÊN BLOCKCHAIN"
            description="Thành tích học tập này đã được neo (anchored) trên mạng Blockchain và đối chiếu hợp lệ với chữ ký số của học sinh và nhà trường."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24 }}
          />
        ) : (
          <Alert
            message="CHỨNG CHỈ KHÔNG HỢP LỆ HOẶC ĐÃ BỊ THU HỒI"
            description={data.reason || 'Chứng chỉ số này chưa được xác nhận trên blockchain hoặc đã bị giáo viên thu hồi.'}
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            style={{ marginBottom: 24 }}
          />
        )}

        <Descriptions title="Thông tin chứng chỉ số (Không chứa dữ liệu cá nhân nhạy cảm)" bordered column={1}>
          <Descriptions.Item label="Mã Chứng chỉ (Credential ID)">
            <Text copyable strong>{credential.credentialId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cuộc thi / Hoạt động Học tập">
            <Text strong>{credential.challenge || 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Loại Thành tích (Achievement Type)">
            <Tag color="blue">{credential.achievementType || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái Hiện tại">
            {credential.status === 'ANCHORED' ? (
              <Tag color="success">ANCHORED (Đã ghi nhận trên Blockchain)</Tag>
            ) : credential.status === 'REVOKED' ? (
              <Tag color="error">REVOKED (Đã thu hồi)</Tag>
            ) : (
              <Tag color="default">{credential.status}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Ví Học sinh (Student Wallet)">
            <Text code copyable>{credential.studentWallet || 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Ví Giáo viên / Trường (Issuer Wallet)">
            <Text code copyable>{credential.issuerWallet || 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian cấp">
            {credential.issuedAt ? dayjs(credential.issuedAt).format('DD/MM/YYYY HH:mm:ss') : 'N/A'}
          </Descriptions.Item>
        </Descriptions>

        {credential.blockchain && (
          <Descriptions title="Bằng chứng Xác thực On-Chain (Blockchain Proof)" bordered column={1} style={{ marginTop: 24 }}>
            <Descriptions.Item label="Mạng Blockchain (Network)">
              <Tag color="purple">{credential.blockchain.network || 'Hardhat / Localhost'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ Smart Contract">
              <Text code copyable>{credential.blockchain.contractAddress || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã Giao dịch (Transaction Hash)">
              <Text code copyable>{credential.blockchain.transactionHash || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Khối (Block Number)">
              <Text strong>{credential.blockchain.blockNumber ?? 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đối chiếu Hash Dữ liệu (Metadata Hash Match)">
              {details.hashMatch ? <Tag color="green">Khớp 100% (Keccak256)</Tag> : <Tag color="red">Không khớp</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Xác thực Quyền sở hữu Ví (Ownership Match)">
              {details.ownershipMatch ? <Tag color="green">Chính chủ</Tag> : <Tag color="red">Không khớp</Tag>}
            </Descriptions.Item>
          </Descriptions>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Space>
            <Link to="/">
              <Button icon={<ArrowLeftOutlined />}>Quay lại trang chủ</Button>
            </Link>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CredentialVerify;
