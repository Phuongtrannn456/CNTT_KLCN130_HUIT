import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Empty, Spin, message, Button, Tag, Space, Divider } from 'antd';
import { TrophyOutlined, SafetyCertificateOutlined, ShareAltOutlined } from '@ant-design/icons';
import challengeService from '../../services/challengeService';
import apiService from '../../services/apiService';
import dayjs from 'dayjs';
import { ethers } from 'ethers';

const { Title, Text } = Typography;

const AchievementList = () => {
  const [achievements, setAchievements] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const achRes = await challengeService.getMyAchievements();
      if (achRes.success) setAchievements(achRes.achievements);

      const credRes = await apiService.get('/credentials/me');
      if (credRes.data.success) setCredentials(credRes.data.credentials);
    } catch (error) {
      message.error('Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (achievementId) => {
    setClaiming(true);
    try {
      if (!window.ethereum) {
        message.error('Vui lòng cài đặt MetaMask!');
        setClaiming(false);
        return;
      }
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Lấy claim message từ backend
      const msgRes = await apiService.get(`/credentials/claim-message/${achievementId}`);
      const { messageToSign, credentialId } = msgRes.data;

      // 2. Ký message bằng MetaMask
      const signature = await signer.signMessage(messageToSign);

      // 3. Gửi chữ ký lên backend để lưu Blockchain
      const claimRes = await apiService.post('/credentials/claim', {
        credentialId,
        signature
      });

      if (claimRes.data.success) {
        message.success('Đã lưu huy hiệu lên Blockchain thành công!');
        fetchData();
      } else {
        message.error(claimRes.data.message || 'Lỗi lưu blockchain');
      }

    } catch (err) {
      if (err.code === 4001) {
        message.warning('Bạn đã từ chối ký!');
      } else {
        message.error(err.response?.data?.message || err.message || 'Lỗi không xác định');
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <TrophyOutlined style={{ marginRight: '10px', color: '#faad14' }} />
        Thành tích & Chứng nhận của tôi
      </Title>

      {achievements.length === 0 ? (
        <Empty description="Bạn chưa có thành tích nào. Hãy tham gia dự án và hoàn thành tốt nhé!" />
      ) : (
        <Row gutter={[24, 24]}>
          {achievements.map((ach) => {
            const credential = credentials.find(c => c.achievement === achievementId || (c.achievement && c.achievement._id === achievementId));
            const isAnchored = credential && credential.status === 'ANCHORED';
            const isPending = credential && credential.status === 'PENDING_CHAIN';

            return (
              <Col xs={24} sm={12} lg={8} key={achievementId}>
                <Card
                  hoverable
                  style={{ height: '100%', borderTop: '4px solid #faad14' }}
                >
                  <Title level={4} style={{ color: '#faad14' }}>{ach.achievementType}</Title>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Dự án: </Text>
                    <Text strong>{ach.challenge?.title || 'N/A'}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Cấp bởi: </Text>
                    <Text>{ach.issuer?.fullName || 'N/A'}</Text>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Ngày cấp: </Text>
                    <Text>{dayjs(ach.issuedAt).format('DD/MM/YYYY')}</Text>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  {isAnchored ? (
                    <div>
                      <Tag color="green" icon={<SafetyCertificateOutlined />}>Verified On-Chain</Tag>
                      <div style={{ marginTop: 12 }}>
                        <Space>
                          <Button 
                            type="primary" 
                            ghost 
                            onClick={() => window.open(`/verify/${ach.credentialId}`, '_blank')}
                          >
                            Xác minh (Verify)
                          </Button>
                          <Button icon={<ShareAltOutlined />} onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/verify/${ach.credentialId}`);
                            message.success('Đã copy link xác minh!');
                          }}>Chia sẻ</Button>
                        </Space>
                      </div>
                    </div>
                  ) : isPending ? (
                    <Tag color="orange">Đang xác nhận Blockchain...</Tag>
                  ) : (
                    <Button 
                      type="primary" 
                      loading={claiming} 
                      onClick={() => handleClaim(achievementId)}
                      block
                    >
                      Nhận Web3 Credential
                    </Button>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default AchievementList;
