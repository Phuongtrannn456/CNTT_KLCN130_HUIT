import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Descriptions, Tag, Button, Input, Form, message, Spin, Alert, Timeline, Divider } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import challengeService from '../../services/challengeService';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const StudentSubmissionView = () => {
  const { id: challengeId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [challenge, setChallenge] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [evaluation, setEvaluation] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const chalRes = await challengeService.getChallengeById(challengeId);
      if (chalRes.success) setChallenge(chalRes.challenge);

      const partsRes = await challengeService.getMyParticipations();
      if (partsRes.success) {
        const myPart = partsRes.participations.find(p => p.challenge?._id === challengeId || p.challenge === challengeId);
        if (myPart) {
          setParticipation(myPart);
          
          const subsRes = await challengeService.getSubmissions(myPart._id);
          if (subsRes.success) {
            setSubmissions(subsRes.submissions);
            
            if (subsRes.submissions.length > 0) {
              const latestSub = subsRes.submissions[0];
              try {
                const evalRes = await challengeService.getEvaluation(latestSub._id);
                if (evalRes.success && evalRes.evaluation.status === 'FINAL') {
                  setEvaluation(evalRes.evaluation);
                }
              } catch (e) {
                // Ignore DRAFT or not evaluated yet 403/404
              }
            }
          }
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lấy dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [challengeId]);

  const handleJoin = async () => {
    try {
      await challengeService.joinChallenge(challengeId);
      message.success('Tham gia thành công');
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi tham gia');
    }
  };

  const onFinishSubmit = async (values) => {
    if (!participation) return;
    setSubmitting(true);
    try {
      await challengeService.submitWork(participation._id, {
        content: values.content,
        attachments: [] // Tạm thời rỗng nếu backend upload phức tạp
      });
      message.success('Nộp bài thành công');
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (!challenge) return <Alert message="Không tìm thấy Challenge" type="error" />;

  const isClosed = challenge.status === 'Closed' || challenge.status === 'Completed';
  const isExpired = challenge.deadline && dayjs().isAfter(dayjs(challenge.deadline));
  const hasFinalResult = evaluation && evaluation.status === 'FINAL';

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>Quay lại</Button>
      
      <Card title={<Title level={3} style={{ margin: 0 }}>{challenge.title}</Title>} bordered={false}>
        <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Môn học"><Tag color="blue">{challenge.subject}</Tag></Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><Tag color={isClosed ? 'red' : 'green'}>{challenge.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Hạn nộp">{challenge.deadline ? dayjs(challenge.deadline).format('DD/MM/YYYY HH:mm') : 'Không có'}</Descriptions.Item>
          <Descriptions.Item label="Khối lớp">{challenge.eligibleGrades?.join(', ') || 'Tất cả'}</Descriptions.Item>
          <Descriptions.Item label="Giáo viên tạo">{challenge.createdBy?.fullName || 'N/A'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: '16px' }}>
          <Text strong>Mô tả:</Text>
          <Paragraph style={{ marginTop: '8px' }}>{challenge.description}</Paragraph>
        </div>
      </Card>

      {!participation ? (
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>
          <Title level={4}>Bạn chưa tham gia dự án này</Title>
          <Button 
            type="primary" 
            size="large" 
            onClick={handleJoin}
            disabled={isClosed || isExpired}
          >
            Tham gia ngay
          </Button>
        </Card>
      ) : (
        <div style={{ marginTop: '24px' }}>
          {hasFinalResult ? (
            <Card title="Kết quả Đánh giá" style={{ borderColor: '#52c41a' }} headStyle={{ backgroundColor: '#f6ffed' }}>
              <Alert message="Chúc mừng bạn đã hoàn thành!" type="success" showIcon style={{ marginBottom: 16 }} />
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Điểm số"><Text strong style={{ fontSize: '18px' }}>{evaluation.teacherTotalScore}</Text></Descriptions.Item>
                <Descriptions.Item label="Nhận xét của giáo viên">{evaluation.teacherFeedback || 'Không có'}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Card title="Nộp bài">
              {isClosed || isExpired ? (
                <Alert message="Dự án đã đóng hoặc hết hạn, không thể nộp bài." type="warning" showIcon />
              ) : (
                <Form layout="vertical" onFinish={onFinishSubmit}>
                  <Form.Item name="content" label="Nội dung bài làm (hoặc link)" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                    <TextArea rows={6} placeholder="Nhập bài làm của bạn hoặc dán link Google Drive/Github..." />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<CheckCircleOutlined />}>
                    {submissions.length > 0 ? 'Nộp lại (Version mới)' : 'Nộp bài'}
                  </Button>
                </Form>
              )}
            </Card>
          )}

          {submissions.length > 0 && (
            <Card title="Lịch sử Nộp bài" style={{ marginTop: '24px' }}>
              <Timeline>
                {submissions.map((sub, idx) => (
                  <Timeline.Item key={sub._id} color={idx === 0 ? 'green' : 'gray'}>
                    <p style={{ margin: 0 }}>
                      <Text strong>Version {sub.version}</Text> 
                      <Text type="secondary" style={{ marginLeft: 8 }}><ClockCircleOutlined /> {dayjs(sub.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                      {sub.isLate && <Tag color="red" style={{ marginLeft: 8 }}>Nộp muộn</Tag>}
                    </p>
                    <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                      {sub.content}
                    </Paragraph>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSubmissionView;
