import React, { useState, useEffect, useRef } from 'react';
import { Button, Drawer, Input, Space, Typography, Tag, Avatar, Spin, Tooltip, Card } from 'antd';
import { Bot, Send, Sparkles, Trash2, X, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import apiService from '../../services/apiService';
import MarkdownViewer from './MarkdownViewer';

const { Title, Text, Paragraph } = Typography;

const AiCopilotWidget = () => {
  const location = useLocation();
  const isExamMode = location.pathname.includes('/entrance-test') || location.pathname.includes('/exam-room');

  // KHÓA HOÀN TOÀN AI KHI ĐANG Ở PHÒNG THI CHỐNG GIAN LẬN
  if (isExamMode) {
    return null;
  }
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = authService.getCurrentUser();
  const isStudent = currentUser?.role_id === 'STUDENT_ROLE';
  const isTeacher = currentUser?.role_id === 'TEACHER_ROLE';

  // Câu hỏi gợi ý nhanh theo vai trò (Context-Aware Prompts)
  const quickPrompts = isStudent ? [
    '👥 Nhóm của em và thành viên gồm những ai?',
    '📌 Tiến độ đề tài của em hiện tại?',
    '📊 Điểm số bài test & vi phạm của em?',
    '🔬 Gợi ý các đề tài STEM đang mở?',
    '💡 Dàn ý báo cáo khoa học chuẩn IMRaD?',
    '🐍 Hướng dẫn code Python đọc cảm biến IoT?',
    '🛡️ Cách nhận chứng chỉ Web3 SBT vào ví?'
  ] : isTeacher ? [
    '📊 Thống kê tình hình đăng ký các đề tài?',
    '🚨 Báo cáo các trường hợp vi phạm phòng thi?',
    '🎯 Gợi ý cấu trúc đề tài STEM liên môn GDPT 2018?',
    '⚖️ Bộ tiêu chí Rubrics 100% chuẩn K-12?',
    '📝 Cách tạo bài test cạnh tranh & câu hỏi code?'
  ] : [
    'Hệ thống Web3 Giáo dục K-12 hoạt động thế nào?',
    'Cách đối chiếu giao dịch trên Blockchain?'
  ];

  // Khởi tạo tin nhắn chào mừng
  useEffect(() => {
    if (messages.length === 0) {
      const welcome = isStudent
        ? `Chào bạn! Mình là **AI STEM Mentor** của bạn 🤖. Mình sẵn sàng đồng hành cùng bạn trong các dự án khoa học kỹ thuật, cách viết báo cáo chuẩn Rubrics và hướng dẫn nhận bằng khen Web3 vào ví cá nhân!`
        : isTeacher
        ? `Kính chào Thầy/Cô! Tôi là **AI Trợ Giảng Chuyên Môn** 🤖. Tôi có thể hỗ trợ Thầy/Cô soạn thảo dự án STEM, xây dựng bảng tiêu chí Rubrics chuẩn và đề xuất nhận xét sư phạm cho học sinh.`
        : `Xin chào! Tôi là Trợ lý AI Giáo dục Web3 K-12. Rất vui được hỗ trợ bạn.`;

      setMessages([{ sender: 'ai', text: welcome, time: new Date() }]);
    }
  }, [isStudent, isTeacher]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const question = (textToSend || input).trim();
    if (!question || loading) return;

    const userMsg = { sender: 'user', text: question, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiService.post('/ai/assistant/chat', {
        message: question,
        history: messages.slice(-6).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });

      if (res.data?.success) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: res.data.reply,
          time: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: 'Xin lỗi, hiện tại trợ lý AI chưa thể phản hồi. Vui lòng thử lại sau giây lát!',
          time: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Có lỗi kết nối đến dịch vụ AI. Vui lòng kiểm tra lại mạng hoặc thử lại!',
        time: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{
      sender: 'ai',
      text: 'Đã làm mới cuộc hội thoại. Hãy hỏi tôi bất cứ điều gì về học tập và dự án STEM nhé!',
      time: new Date()
    }]);
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Nút bấm nổi Floating Action Button */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
        <Tooltip title={isStudent ? 'Hỏi AI STEM Mentor' : 'AI Trợ Giảng Chuyên Môn'} placement="left">
          <Button
            type="primary"
            shape="circle"
            size="large"
            onClick={() => setOpen(true)}
            style={{
              width: 58,
              height: 58,
              boxShadow: '0 6px 20px rgba(114, 46, 209, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #722ed1 0%, #1890ff 100%)',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            <Bot size={28} color="#fff" />
          </Button>
        </Tooltip>
      </div>

      {/* Drawer Trợ Lý AI */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar style={{ backgroundColor: '#722ed1' }} icon={<Bot size={18} />} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {isStudent ? 'AI STEM Mentor' : isTeacher ? 'AI Trợ Giảng Chuyên Môn' : 'Trợ Lý AI'}
              </div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                Hỗ trợ học tập K-12 & Web3 Credentials
              </div>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={480}
        extra={
          <Button 
            type="text" 
            size="small" 
            icon={<Trash2 size={14} />} 
            onClick={handleClear}
            title="Làm mới đoạn chat"
          />
        }
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#f9f9fb'
        }}
      >
        {/* Vùng tin nhắn */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((m, idx) => {
            const isMe = m.sender === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 14
                }}
              >
                {!isMe && (
                  <Avatar 
                    size={30} 
                    style={{ backgroundColor: '#722ed1', marginRight: 8, flexShrink: 0, marginTop: 2 }} 
                    icon={<Bot size={17} />} 
                  />
                )}
                <div
                  style={{
                    maxWidth: '85%',
                    padding: isMe ? '10px 14px' : '12px 16px',
                    borderRadius: 14,
                    background: isMe ? '#722ed1' : '#ffffff',
                    color: isMe ? '#ffffff' : '#262626',
                    boxShadow: isMe ? '0 2px 8px rgba(114, 46, 209, 0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                    border: isMe ? 'none' : '1px solid #f0f0f0'
                  }}
                >
                  {isMe ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  ) : (
                    <MarkdownViewer content={m.text} />
                  )}
                </div>
                {isMe && (
                  <Avatar 
                    size={30} 
                    style={{ backgroundColor: '#1890ff', marginLeft: 8, flexShrink: 0, marginTop: 2 }} 
                    icon={<User size={17} />} 
                  />
                )}
              </div>
            );
          })}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8c8c8c', padding: 8 }}>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 13 }}>Trợ lý AI đang suy nghĩ...</Text>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Gợi ý câu hỏi nhanh (Quick Prompts) */}
        <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} color="#faad14" /> Gợi ý câu hỏi nhanh:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickPrompts.map((p, i) => (
              <Tag
                key={i}
                color="purple"
                style={{ cursor: 'pointer', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}
                onClick={() => handleSend(p)}
              >
                {p}
              </Tag>
            ))}
          </div>
        </div>

        {/* Khung nhập tin nhắn */}
        <div style={{ padding: 12, background: '#fff', borderTop: '1px solid #e8e8e8' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder={isStudent ? "Hỏi về phương pháp nghiên cứu, Web3..." : "Hỏi về soạn đề tài, Rubrics..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={() => handleSend()}
              disabled={loading}
              size="large"
              style={{ borderRadius: '8px 0 0 8px' }}
            />
            <Button
              type="primary"
              size="large"
              icon={<Send size={16} />}
              onClick={() => handleSend()}
              loading={loading}
              style={{
                borderRadius: '0 8px 8px 0',
                background: '#722ed1',
                borderColor: '#722ed1'
              }}
            />
          </Space.Compact>
        </div>
      </Drawer>
    </>
  );
};

export default AiCopilotWidget;
