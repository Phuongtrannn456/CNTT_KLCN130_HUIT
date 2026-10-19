import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Tag, Button, Spin, message, Modal, Input, InputNumber, Form, Alert, Select, Divider, Space, Row, Col } from 'antd';
import { EyeOutlined, CheckCircleOutlined, RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import challengeService from '../../services/challengeService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const TeacherChallengeDetail = () => {
  const { id: challengeId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [participants, setParticipants] = useState([]);
  
  const [isEvalModalVisible, setIsEvalModalVisible] = useState(false);
  const [selectedParticipation, setSelectedParticipation] = useState(null);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // AI states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestionResult, setAiSuggestionResult] = useState(null);
  
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const chalRes = await challengeService.getChallengeById(challengeId);
      if (chalRes.success) setChallenge(chalRes.challenge);

      const partsRes = await challengeService.getParticipants(challengeId);
      if (partsRes.success) setParticipants(partsRes.participants);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lấy dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [challengeId]);

  const handleReview = async (participation) => {
    setSelectedParticipation(participation);
    setEvalLoading(true);
    setIsEvalModalVisible(true);
    form.resetFields();
    setCurrentEvaluation(null);
    setStudentSubmissions([]);
    setAiAnalysisResult(null);
    setAiSuggestionResult(null);
    
    try {
      const subsRes = await challengeService.getSubmissions(participation._id);
      if (subsRes.success) {
        setStudentSubmissions(subsRes.submissions);
        if (subsRes.submissions.length > 0) {
          const latestSub = subsRes.submissions[0];
          try {
            const evalRes = await challengeService.getEvaluation(latestSub._id);
            if (evalRes.success && evalRes.evaluation) {
              setCurrentEvaluation(evalRes.evaluation);
              form.setFieldsValue({
                teacherTotalScore: evalRes.evaluation.teacherTotalScore,
                teacherFeedback: evalRes.evaluation.teacherFeedback,
                status: evalRes.evaluation.status
              });
              // Load saved AI results if exist
              if (evalRes.evaluation.aiTotalScore !== undefined) {
                setAiSuggestionResult({
                  aiTotalScore: evalRes.evaluation.aiTotalScore,
                  aiFeedback: evalRes.evaluation.aiFeedback,
                  rubricScores: evalRes.evaluation.rubricScores
                });
              }
            }
          } catch (e) {
            form.setFieldsValue({ status: 'DRAFT' });
          }
        }
      }
    } catch (error) {
      message.error('Lỗi khi lấy bài nộp');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (studentSubmissions.length === 0) return;
    setAiAnalyzing(true);
    try {
      const res = await challengeService.analyzeSubmission(studentSubmissions[0]._id);
      if (res.success && res.aiAvailable) {
        setAiAnalysisResult(res.analysis);
        message.success('AI phân tích thành công!');
      } else {
        message.warning('AI hiện không khả dụng.');
      }
    } catch (error) {
      message.error('Lỗi khi gọi AI phân tích.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleAiSuggest = async () => {
    if (studentSubmissions.length === 0) return;
    setAiSuggesting(true);
    try {
      const res = await challengeService.suggestEvaluation(studentSubmissions[0]._id);
      if (res.success && res.aiAvailable) {
        setAiSuggestionResult(res.suggestion);
        // Tự động điền điểm gợi ý vào form (nhưng teacher vẫn có thể sửa)
        form.setFieldsValue({
          teacherTotalScore: res.suggestion.aiTotalScore,
          teacherFeedback: res.suggestion.aiFeedback
        });
        message.success('AI gợi ý chấm điểm thành công!');
      } else {
        message.warning('AI hiện không khả dụng.');
      }
    } catch (error) {
      message.error('Lỗi khi gọi AI gợi ý chấm điểm.');
    } finally {
      setAiSuggesting(false);
    }
  };

  const onEvalSubmit = async (values) => {
    if (studentSubmissions.length === 0) return;
    const latestSub = studentSubmissions[0];
    
    // Đóng gói cả AI suggestions (nếu có) để backend lưu
    const payload = {
      teacherTotalScore: values.teacherTotalScore,
      teacherFeedback: values.teacherFeedback,
      status: values.status,
    };

    if (aiSuggestionResult) {
      payload.aiTotalScore = aiSuggestionResult.aiTotalScore;
      payload.aiFeedback = aiSuggestionResult.aiFeedback;
      payload.rubricScores = aiSuggestionResult.rubricScores?.map(r => ({
        criteriaName: r.criteriaName,
        aiScore: r.aiScore,
        aiFeedback: r.aiFeedback,
      }));
    }
    
    try {
      await challengeService.evaluateSubmission(latestSub._id, payload);
      if (aiSuggestionResult && values.teacherTotalScore !== undefined) {
        try {
          await challengeService.saveTrainingData(latestSub._id, {
            aiScore: aiSuggestionResult.aiTotalScore,
            teacherScore: values.teacherTotalScore
          });
        } catch (e) { console.warn("Training data save failed", e); }
      }
      message.success('Lưu đánh giá thành công');
      setIsEvalModalVisible(false);
      fetchData(); // Refresh to show if finalized
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lưu đánh giá');
    }
  };

  const columns = [
    { title: 'Học sinh', dataIndex: ['student', 'fullName'], key: 'name' },
    { title: 'Khối lớp', dataIndex: ['student', 'gradeLevel'], key: 'grade' },
    { 
      title: 'Ngày tham gia', 
      key: 'joinedAt', 
      render: (_, record) => dayjs(record.joinedAt).format('DD/MM/YYYY HH:mm') 
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" icon={<EyeOutlined />} onClick={() => handleReview(record)}>
          Xem & Chấm bài
        </Button>
      )
    }
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  const isFinalized = currentEvaluation?.status === 'FINAL';

  return (
    <div style={{ padding: '24px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher/challenges')} style={{ marginBottom: '16px' }}>
        Quay lại Quản lý Challenge
      </Button>
      
      <Card title={<Title level={3} style={{ margin: 0 }}>Danh sách Tham gia: {challenge?.title}</Title>}>
        <Table 
          columns={columns} 
          dataSource={participants} 
          rowKey="_id" 
          pagination={false}
        />
      </Card>

      <Modal
        title={`Đánh giá bài nộp: ${selectedParticipation?.student?.fullName || ""}`}
        open={isEvalModalVisible}
        onCancel={() => setIsEvalModalVisible(false)}
        footer={null}
        width={900}
      >
        {evalLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
        ) : studentSubmissions.length === 0 ? (
          <Alert message="Học sinh chưa nộp bài" type="info" showIcon />
        ) : (
          <div>
            <Card type="inner" title={`Bài nộp mới nhất (Version ${studentSubmissions[0].version})`}>
              <Text type="secondary">Thời gian nộp: {dayjs(studentSubmissions[0].createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              {studentSubmissions[0].isLate && <Tag color="red" style={{ marginLeft: 8 }}>Nộp muộn</Tag>}
              
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {studentSubmissions[0].content}
              </div>

              {!isFinalized && (
                <div style={{ marginTop: 16 }}>
                  <Button type="dashed" icon={<RobotOutlined />} loading={aiAnalyzing} onClick={handleAiAnalysis}>
                    AI Phân Tích Bài Nộp
                  </Button>
                </div>
              )}
            </Card>

            {aiAnalysisResult && (
              <Alert 
                style={{ marginTop: 16 }}
                message="Kết quả Phân tích từ AI (Tham khảo)"
                description={
                  <div>
                    <p><b>Điểm mạnh:</b> {aiAnalysisResult.strengths}</p>
                    <p><b>Điểm yếu:</b> {aiAnalysisResult.weaknesses}</p>
                    <p><b>Vấn đề phát hiện:</b> {aiAnalysisResult.issues?.join(', ') || 'Không'}</p>
                  </div>
                }
                type="info"
                showIcon
              />
            )}

            <Divider />

            <Title level={4}>Đánh giá & Chấm điểm</Title>
            {isFinalized ? (
              <Alert message="Bài này đã chốt điểm (FINAL). Không thể sửa đổi." type="success" showIcon style={{ marginBottom: 16 }} />
            ) : (
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" ghost icon={<RobotOutlined />} loading={aiSuggesting} onClick={handleAiSuggest}>
                  Gợi ý chấm điểm (AI Suggested Evaluation)
                </Button>
              </div>
            )}

            <Row gutter={24}>
              {/* AI Column */}
              <Col span={12}>
                <Card title="Gợi ý từ AI" size="small" style={{ height: '100%', backgroundColor: '#f0f5ff' }}>
                  {aiSuggestionResult ? (
                    <div>
                      <Title level={5} style={{ color: '#1890ff' }}>Tổng điểm AI: {aiSuggestionResult.aiTotalScore}</Title>
                      <Paragraph><b>Nhận xét:</b> {aiSuggestionResult.aiFeedback}</Paragraph>
                      
                      {aiSuggestionResult.rubricScores?.map((r, idx) => (
                        <div key={idx} style={{ marginBottom: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
                          <Text strong>{r.criteriaName}</Text>: <Text type="danger">{r.aiScore}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{r.aiFeedback}</Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Chưa có gợi ý. Bấm nút phía trên để AI tự động đánh giá.</Text>
                  )}
                </Card>
              </Col>

              {/* Teacher Column */}
              <Col span={12}>
                <Card title="Quyết định của Giáo viên" size="small" style={{ height: '100%' }}>
                  <Form form={form} layout="vertical" onFinish={onEvalSubmit} initialValues={{ status: 'DRAFT' }}>
                    <Form.Item name="teacherTotalScore" label="Điểm số chính thức" rules={[{ required: true, message: 'Nhập điểm' }]}>
                      <InputNumber min={0} max={100} step={0.5} disabled={isFinalized} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item name="teacherFeedback" label="Nhận xét chính thức" rules={[{ required: true, message: 'Nhập nhận xét' }]}>
                      <Input.TextArea rows={6} disabled={isFinalized} />
                    </Form.Item>

                    <Form.Item name="status" label="Trạng thái">
                      <Select disabled={isFinalized}>
                        <Select.Option value="DRAFT">Lưu Nháp (Học sinh chưa xem được)</Select.Option>
                        <Select.Option value="FINAL">Chốt Điểm (FINAL - Phát Achievement)</Select.Option>
                      </Select>
                    </Form.Item>

                    {!isFinalized && (
                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />} block size="large">
                          Lưu Kết Quả
                        </Button>
                      </Form.Item>
                    )}
                  </Form>
                </Card>
              </Col>
            </Row>

          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherChallengeDetail;
