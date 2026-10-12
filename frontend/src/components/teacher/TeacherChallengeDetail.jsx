import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Tag, Button, Spin, message, Modal, Input, InputNumber, Form, Alert, Select, Divider, Space, Row, Col } from 'antd';
import { EyeOutlined, CheckCircleOutlined, RobotOutlined } from '@ant-design/icons';
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
      message.error(error.response?.data?.message || 'L?i khi l?y d? li?u');
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
      message.error('L?i khi l?y b�i n?p');
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
        message.success('AI ph�n t�ch th�nh c�ng!');
      } else {
        message.warning('AI hi?n kh�ng kh? d?ng.');
      }
    } catch (error) {
      message.error('L?i khi g?i AI ph�n t�ch.');
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
        // T? d?ng di?n di?m g?i � v�o form (nhung teacher v?n c� th? s?a)
        form.setFieldsValue({
          teacherTotalScore: res.suggestion.aiTotalScore,
          teacherFeedback: res.suggestion.aiFeedback
        });
        message.success('AI g?i � ch?m di?m th�nh c�ng!');
      } else {
        message.warning('AI hi?n kh�ng kh? d?ng.');
      }
    } catch (error) {
      message.error('L?i khi g?i AI g?i � ch?m di?m.');
    } finally {
      setAiSuggesting(false);
    }
  };

  const onEvalSubmit = async (values) => {
    if (studentSubmissions.length === 0) return;
    const latestSub = studentSubmissions[0];
    
    // ��ng g�i c? AI suggestions (n?u c�) d? backend luu
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
        // teacherScore c� th? map th�m UI cho t?ng rubric trong tuong lai
      }));
    }
    
    try {
      await challengeService.evaluateSubmission(latestSub._id, payload);
      message.success('Luu d�nh gi� th�nh c�ng');
      setIsEvalModalVisible(false);
      fetchData(); // Refresh to show if finalized
    } catch (error) {
      message.error(error.response?.data?.message || 'L?i khi luu d�nh gi�');
    }
  };

  const columns = [
    { title: 'H?c sinh', dataIndex: ['student', 'fullName'], key: 'name' },
    { title: 'Kh?i l?p', dataIndex: ['student', 'gradeLevel'], key: 'grade' },
    { 
      title: 'Ng�y tham gia', 
      key: 'joinedAt', 
      render: (_, record) => dayjs(record.joinedAt).format('DD/MM/YYYY HH:mm') 
    },
    {
      title: 'Thao t�c',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" icon={<EyeOutlined />} onClick={() => handleReview(record)}>
          Xem & Ch?m b�i
        </Button>
      )
    }
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  const isFinalized = currentEvaluation?.status === 'FINAL';

  return (
    <div style={{ padding: '24px' }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>Quay l?i Qu?n l� Challenge</Button>
      
      <Card title={<Title level={3} style={{ margin: 0 }}>Danh s�ch Tham gia: {challenge?.title}</Title>}>
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
          <Alert message="H?c sinh chua n?p b�i" type="info" showIcon />
        ) : (
          <div>
            <Card type="inner" title={`Bài nộp mới nhất (Version ${studentSubmissions[0].version})`}>
              <Text type="secondary">Th?i gian n?p: {dayjs(studentSubmissions[0].createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              {studentSubmissions[0].isLate && <Tag color="red" style={{ marginLeft: 8 }}>N?p mu?n</Tag>}
              
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {studentSubmissions[0].content}
              </div>

              {!isFinalized && (
                <div style={{ marginTop: 16 }}>
                  <Button type="dashed" icon={<RobotOutlined />} loading={aiAnalyzing} onClick={handleAiAnalysis}>
                    AI Ph�n T�ch B�i N?p
                  </Button>
                </div>
              )}
            </Card>

            {aiAnalysisResult && (
              <Alert 
                style={{ marginTop: 16 }}
                message="K?t qu? Ph�n t�ch t? AI (Tham kh?o)"
                description={
                  <div>
                    <p><b>�i?m m?nh:</b> {aiAnalysisResult.strengths}</p>
                    <p><b>�i?m y?u:</b> {aiAnalysisResult.weaknesses}</p>
                    <p><b>V?n d? ph�t hi?n:</b> {aiAnalysisResult.issues?.join(', ') || 'Kh�ng'}</p>
                  </div>
                }
                type="info"
                showIcon
              />
            )}

            <Divider />

            <Title level={4}>��nh gi� & Ch?m di?m</Title>
            {isFinalized ? (
              <Alert message="B�i n�y d� ch?t di?m (FINAL). Kh�ng th? s?a d?i." type="success" showIcon style={{ marginBottom: 16 }} />
            ) : (
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" ghost icon={<RobotOutlined />} loading={aiSuggesting} onClick={handleAiSuggest}>
                  G?i � ch?m di?m (AI Suggested Evaluation)
                </Button>
              </div>
            )}

            <Row gutter={24}>
              {/* AI Column */}
              <Col span={12}>
                <Card title="G?i � t? AI" size="small" style={{ height: '100%', backgroundColor: '#f0f5ff' }}>
                  {aiSuggestionResult ? (
                    <div>
                      <Title level={5} style={{ color: '#1890ff' }}>T?ng di?m AI: {aiSuggestionResult.aiTotalScore}</Title>
                      <Paragraph><b>Nh?n x�t:</b> {aiSuggestionResult.aiFeedback}</Paragraph>
                      
                      {aiSuggestionResult.rubricScores?.map((r, idx) => (
                        <div key={idx} style={{ marginBottom: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
                          <Text strong>{r.criteriaName}</Text>: <Text type="danger">{r.aiScore}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{r.aiFeedback}</Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Chua c� g?i �. B?m n�t ph�a tr�n d? AI t? d?ng d�nh gi�.</Text>
                  )}
                </Card>
              </Col>

              {/* Teacher Column */}
              <Col span={12}>
                <Card title="Quy?t d?nh c?a Gi�o vi�n" size="small" style={{ height: '100%' }}>
                  <Form form={form} layout="vertical" onFinish={onEvalSubmit} initialValues={{ status: 'DRAFT' }}>
                    <Form.Item name="teacherTotalScore" label="�i?m s? ch�nh th?c" rules={[{ required: true, message: 'Nh?p di?m' }]}>
                      <InputNumber min={0} max={100} step={0.5} disabled={isFinalized} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item name="teacherFeedback" label="Nh?n x�t ch�nh th?c" rules={[{ required: true, message: 'Nh?p nh?n x�t' }]}>
                      <Input.TextArea rows={6} disabled={isFinalized} />
                    </Form.Item>

                    <Form.Item name="status" label="Tr?ng th�i">
                      <Select disabled={isFinalized}>
                        <Select.Option value="DRAFT">Luu Nh�p (H?c sinh chua xem du?c)</Select.Option>
                        <Select.Option value="FINAL">Ch?t �i?m (FINAL - Ph�t Achievement)</Select.Option>
                      </Select>
                    </Form.Item>

                    {!isFinalized && (
                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />} block size="large">
                          Luu K?t Qu?
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

