import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tag, Button, Spin, Empty, message, Alert } from 'antd';
import { AppstoreOutlined, FileTextOutlined, UserOutlined, ClockCircleOutlined, StarOutlined } from '@ant-design/icons';
import challengeService from '../../services/challengeService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const ChallengeList = () => {
  const [challenges, setChallenges] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    fetchRecommendations();
  }, []);

  const fetchData = async () => {
    try {
      const chalRes = await challengeService.getChallenges();
      if (chalRes.success) setChallenges(chalRes.challenges);

      const partRes = await challengeService.getMyParticipations();
      if (partRes.success) {
        setParticipations(partRes.participations.map(p => p.challenge?._id || p.challenge));
      }
    } catch (error) {
      message.error('Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await challengeService.getRecommendedChallenges();
      if (res.success) {
        setRecommendations(res.recommendations || []);
        setAiAvailable(res.aiAvailable !== false);
      }
    } catch (error) {
      setAiAvailable(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleJoin = async (id) => {
    try {
      await challengeService.joinChallenge(id);
      message.success('Đăng ký tham gia thành công!');
      fetchData(); // Refresh participations
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi đăng ký');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  const renderChallengeCard = (chal, extra = null) => {
    const isJoined = participations.includes(chal._id);
    const isClosed = chal.status === 'Closed' || chal.status === 'Completed';
    const isExpired = chal.deadline && dayjs().isAfter(dayjs(chal.deadline));

    return (
      <Col xs={24} sm={12} lg={8} key={chal._id}>
        <Card
          hoverable
          title={<span style={{ whiteSpace: 'normal', height: 'auto', minHeight: '48px', display: 'flex', alignItems: 'center' }}>{chal.title}</span>}
          extra={<Tag color={isClosed ? 'red' : 'green'}>{chal.status}</Tag>}
          style={{ height: '100%', display: 'flex', flexDirection: 'column', border: extra ? '1px solid #1890ff' : '1px solid #f0f0f0' }}
          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {extra && <div style={{ marginBottom: 12 }}>{extra}</div>}
          <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: 'Đọc thêm' }}>
            {chal.description}
          </Paragraph>
          
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary"><FileTextOutlined /> Môn học: </Text>
              <Tag color="blue">{chal.subject}</Tag>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary"><UserOutlined /> Khối lớp: </Text>
              {chal.eligibleGrades?.join(', ') || 'Tất cả'}
            </div>

            {chal.deadline && (
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary"><ClockCircleOutlined /> Hạn nộp: </Text>
                <Text type={isExpired ? 'danger' : 'secondary'}>
                  {dayjs(chal.deadline).format('DD/MM/YYYY HH:mm')}
                </Text>
              </div>
            )}

            {isJoined ? (
              <Button type="primary" block onClick={() => navigate(`/student/submissions/${chal._id}`)}>
                Vào không gian làm bài
              </Button>
            ) : (
              <Button 
                type="default" 
                block 
                onClick={() => handleJoin(chal._id)}
                disabled={isClosed || isExpired}
              >
                Tham gia ngay
              </Button>
            )}
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <AppstoreOutlined style={{ marginRight: '10px' }} />
        Khám phá Cuộc thi & Dự án Học tập
      </Title>

      <div style={{ marginBottom: 32 }}>
        <Title level={4}><StarOutlined style={{ color: '#faad14', marginRight: 8 }}/> Gợi ý cho bạn (AI Matching)</Title>
        {aiLoading ? (
          <Spin tip="AI đang phân tích gợi ý..." />
        ) : !aiAvailable ? (
          <Alert type="warning" message="AI Gợi ý hiện không khả dụng. Bạn vẫn có thể xem toàn bộ danh sách bên dưới." showIcon />
        ) : recommendations.length === 0 ? (
          <Text type="secondary">Chưa có gợi ý nào phù hợp nhất với bạn lúc này.</Text>
        ) : (
          <Row gutter={[24, 24]}>
            {recommendations.map(rec => renderChallengeCard(rec.challenge, (
              <Alert 
                type="info" 
                message={`Độ phù hợp: ${Math.round(rec.matchScore * 100)}%`} 
                description={rec.reasoning} 
                showIcon 
              />
            )))}
          </Row>
        )}
      </div>

      <Title level={4}>Tất cả Cuộc thi / Dự án</Title>
      {challenges.length === 0 ? (
        <Empty description="Hiện chưa có Cuộc thi / Dự án nào phù hợp với bạn" style={{ marginTop: '50px' }} />
      ) : (
        <Row gutter={[24, 24]}>
          {challenges.map(chal => renderChallengeCard(chal))}
        </Row>
      )}
    </div>
  );
};

export default ChallengeList;
