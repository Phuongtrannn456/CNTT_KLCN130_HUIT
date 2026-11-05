import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Drawer, 
  Input, 
  Space, 
  Typography, 
  Tag, 
  Avatar, 
  Spin, 
  Tooltip, 
  Form, 
  Select, 
  InputNumber, 
  DatePicker, 
  Alert,
  message,
  Popconfirm,
  Segmented
} from 'antd';
import { Bot, Send, Trash2, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import authService from '../../services/authService';
import apiService from '../../services/apiService';
import MarkdownViewer from './MarkdownViewer';
import { useIsMobile } from '../../hooks/useResponsive';

const { Text } = Typography;
const { TextArea } = Input;

const AiCopilotWidget = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isExamMode = location.pathname.includes('/entrance-test') || location.pathname.includes('/exam-room');

  const currentUser = authService.getCurrentUser();
  const isStudent = currentUser?.role_id === 'STUDENT_ROLE';
  const isTeacher = currentUser?.role_id === 'TEACHER_ROLE';
  const canManage = isTeacher || currentUser?.role_id === 'ADMIN_ROLE';

  const [open, setOpen] = useState(false);
  // activeSideForm: null (chỉ hiện chat) | 'topic' (mở song song form đề tài) | 'test' (mở song song form bài test)
  const [activeSideForm, setActiveSideForm] = useState(null);

  // Khóa hoàn toàn AI khi đang ở phòng thi chống gian lận
  if (isExamMode) {
    return null;
  }

  // Khôi phục lịch sử chat từ localStorage chống reset khi reload / chuyển trang
  const storageKey = currentUser?.id ? `ai_chat_messages_${currentUser.id}` : null;
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Failed to load chat history from localStorage', e);
      }
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Form states cho Thao tác nhanh
  const [topicForm] = Form.useForm();
  const [testForm] = Form.useForm();
  const [submittingTopic, setSubmittingTopic] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [topicSuccess, setTopicSuccess] = useState(null);
  const [testSuccess, setTestSuccess] = useState(null);
  const [teacherTopics, setTeacherTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Sửa / Xóa đề tài & bài test state
  const [topicMode, setTopicMode] = useState('create'); // 'create' | 'edit'
  const [selectedTopicToEdit, setSelectedTopicToEdit] = useState(null);
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [existingTest, setExistingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(false);

  // Lưu tin nhắn vào localStorage khi có thay đổi
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history to localStorage', e);
      }
    }
  }, [messages, storageKey]);

  const userId = currentUser?.id;
  const roleId = currentUser?.role_id;

  // Tải danh sách đề tài của giáo viên để phục vụ Form Tạo & Sửa đề tài, bài test
  const loadTeacherTopics = React.useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingTopics(true);
      const res = await apiService.get('/detai');
      const list = Array.isArray(res.data) ? res.data : [];
      const filtered = roleId === 'TEACHER_ROLE'
        ? list.filter(t => String(t.GiaoVienHuongDan?._id || t.GiaoVienHuongDan) === String(userId))
        : list;
      setTeacherTopics(filtered);
    } catch (err) {
      console.error('Failed to load teacher topics in AI widget:', err);
    } finally {
      setLoadingTopics(false);
    }
  }, [userId, roleId]);

  useEffect(() => {
    if (open && canManage) {
      loadTeacherTopics();
    }
  }, [open, canManage, loadTeacherTopics]);

  // Câu hỏi gợi ý nhanh theo vai trò
  const quickPrompts = isStudent ? [
    'Nhóm của em và thành viên gồm những ai?',
    'Tiến độ đề tài của em hiện tại?',
    'Điểm số bài test & vi phạm của em?',
    'Gợi ý các đề tài STEM đang mở?',
    'Dàn ý báo cáo khoa học chuẩn IMRaD?',
    'Hướng dẫn code Python đọc cảm biến IoT?',
    'Cách nhận chứng chỉ Web3 SBT vào ví?'
  ] : canManage ? [
    'Gợi ý cho tôi 1 đề tài STEM K-12 về IoT và lập trình cảm biến',
    'Soạn dàn ý câu hỏi bài test trắc nghiệm và code Python',
    'Thống kê tình hình đăng ký các đề tài?',
    'Báo cáo các trường hợp vi phạm phòng thi?',
    'Bộ tiêu chí Rubrics 100% chuẩn K-12?'
  ] : [
    'Hệ thống Web3 Giáo dục K-12 hoạt động thế nào?',
    'Cách đối chiếu giao dịch trên Blockchain?'
  ];

  // Khởi tạo tin nhắn chào mừng nếu chưa có lịch sử
  useEffect(() => {
    if (messages.length === 0) {
      const welcome = isStudent
        ? 'Chào bạn! Mình là **AI STEM Mentor** của bạn. Mình sẵn sàng đồng hành cùng bạn trong các dự án khoa học kỹ thuật, cách viết báo cáo chuẩn Rubrics và hướng dẫn nhận bằng khen Web3 vào ví cá nhân!'
        : canManage
        ? 'Kính chào Thầy/Cô! Tôi là **AI Trợ Giảng Chuyên Môn**. Thầy/Cô có thể yêu cầu tôi tạo đề tài tự động, hoặc mở khung form song song để vừa trao đổi vừa điền dữ liệu trực tiếp.'
        : 'Xin chào! Tôi là Trợ lý AI Giáo dục Web3 K-12. Rất vui được hỗ trợ bạn.';

      const initialMsgs = [{ sender: 'ai', text: welcome, time: new Date() }];
      setMessages(initialMsgs);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(initialMsgs));
        } catch (e) {}
      }
    }
  }, [isStudent, canManage, messages.length, storageKey]);

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
      const errMsg = err.response?.data?.reply || err.response?.data?.message || 'Có lỗi kết nối đến dịch vụ AI. Vui lòng kiểm tra lại mạng hoặc thử lại!';
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: errMsg,
        time: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const welcome = isStudent
      ? 'Chào bạn! Mình là **AI STEM Mentor** của bạn. Mình sẵn sàng đồng hành cùng bạn trong các dự án khoa học kỹ thuật, cách viết báo cáo chuẩn Rubrics và hướng dẫn nhận bằng khen Web3 vào ví cá nhân!'
      : canManage
      ? 'Kính chào Thầy/Cô! Tôi là **AI Trợ Giảng Chuyên Môn**. Thầy/Cô có thể yêu cầu tôi tạo đề tài tự động, hoặc mở khung form song song để vừa trao đổi vừa điền dữ liệu trực tiếp.'
      : 'Xin chào! Tôi là Trợ lý AI Giáo dục Web3 K-12. Rất vui được hỗ trợ bạn.';

    const resetMsgs = [{ sender: 'ai', text: welcome, time: new Date() }];
    setMessages(resetMsgs);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(resetMsgs));
      } catch (e) {}
    }
  };

  // Xử lý khi chọn đề tài để sửa
  const handleSelectTopicToEdit = (topicId) => {
    setSelectedTopicToEdit(topicId);
    setTopicSuccess(null);
    const t = teacherTopics.find(item => item._id === topicId);
    if (t) {
      topicForm.setFieldsValue({
        TenDeTai: t.TenDeTai,
        KhoiLopYeuCau: Array.isArray(t.KhoiLopYeuCau) && t.KhoiLopYeuCau.length > 0 ? t.KhoiLopYeuCau : [10, 11, 12],
        SoLuongHocSinh: t.SoLuongHocSinh || 3,
        Deadline: t.Deadline ? dayjs(t.Deadline) : dayjs().add(30, 'day'),
        MoTa: t.MoTa || '',
        YeuCau: Array.isArray(t.YeuCau) ? t.YeuCau.join('\n') : (t.YeuCau || '')
      });
    }
  };

  // Submit Form Đề tài STEM (hỗ trợ cả Tạo mới và Sửa)
  const handleTopicSubmit = async (values) => {
    setSubmittingTopic(true);
    try {
      const deadlineDate = values.Deadline ? values.Deadline.toDate() : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const payload = {
        TenDeTai: values.TenDeTai.trim(),
        MoTa: values.MoTa.trim(),
        MoTaChiTiet: values.MoTaChiTiet || values.MoTa.trim(),
        KhoiLopYeuCau: values.KhoiLopYeuCau || [10, 11, 12],
        SoLuongHocSinh: values.SoLuongHocSinh || 3,
        Deadline: deadlineDate.toISOString(),
        HanDangKy: deadlineDate.toISOString(),
        GiaoVienHuongDan: currentUser.id,
        LoaiDeTai: 'DU_AN_STEM',
        TrangThai: 'MoDangKy',
        YeuCau: values.YeuCau
          ? values.YeuCau.split('\n').map(s => s.trim()).filter(Boolean)
          : ['Kỹ năng nghiên cứu khoa học K-12', 'Làm việc nhóm']
      };

      if (topicMode === 'edit') {
        if (!selectedTopicToEdit) {
          message.warning('Vui lòng chọn đề tài cần chỉnh sửa');
          setSubmittingTopic(false);
          return;
        }
        const res = await apiService.put(`/detai/${selectedTopicToEdit}`, payload);
        const updated = res.data;
        setTopicSuccess({ ...updated, isEdit: true });
        loadTeacherTopics();

        const msgText = `Đã cập nhật thành công đề tài STEM: **${updated.TenDeTai}** (Mã: \`${updated.MaDeTai}\`). [Xem trang Quản lý đề tài](/teacher/topics)`;
        setMessages(prev => [...prev, { sender: 'ai', text: msgText, time: new Date() }]);
      } else {
        payload.MaDeTai = `STEM_${Date.now().toString().slice(-6)}`;
        const res = await apiService.post('/detai', payload);
        const created = res.data;
        setTopicSuccess(created);
        loadTeacherTopics();

        const msgText = `Đã tạo thành công đề tài STEM: **${created.TenDeTai}** (Mã: \`${created.MaDeTai}\`). [Xem trang Quản lý đề tài](/teacher/topics)`;
        setMessages(prev => [...prev, { sender: 'ai', text: msgText, time: new Date() }]);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      message.error(errMsg);
      setMessages(prev => [...prev, { sender: 'ai', text: `Lỗi thao tác đề tài: ${errMsg}`, time: new Date() }]);
    } finally {
      setSubmittingTopic(false);
    }
  };

  // Xóa đề tài STEM an toàn
  const handleDeleteTopic = async () => {
    if (!selectedTopicToEdit) return;
    setDeletingTopic(true);
    try {
      const topicToDelete = teacherTopics.find(t => t._id === selectedTopicToEdit);
      await apiService.delete(`/detai/${selectedTopicToEdit}`);
      message.success('Đã xóa đề tài thành công');
      topicForm.resetFields();
      setSelectedTopicToEdit(null);
      setTopicSuccess(null);
      loadTeacherTopics();

      const msgText = `Đã xóa thành công đề tài STEM: **${topicToDelete?.TenDeTai || 'Đề tài'}** (\`${topicToDelete?.MaDeTai || ''}\`).`;
      setMessages(prev => [...prev, { sender: 'ai', text: msgText, time: new Date() }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      message.error(`Không thể xóa đề tài: ${errMsg}`);
    } finally {
      setDeletingTopic(false);
    }
  };

  // Chọn đề tài áp dụng bài test để kiểm tra bài test cũ
  const handleSelectTopicForTest = async (deTaiId) => {
    setExistingTest(null);
    if (!deTaiId) return;
    try {
      const res = await apiService.get(`/baitest/detai/${deTaiId}`);
      if (res.data) {
        setExistingTest(res.data);
        testForm.setFieldsValue({
          DeTai: deTaiId,
          TieuDe: res.data.TieuDe || '',
          ThoiGianLam: res.data.ThoiGianLam || 30,
          NguongDat: res.data.NguongDat != null ? res.data.NguongDat : 75,
          CauHoiTracNghiem: res.data.CauHoi && res.data.CauHoi[0] ? res.data.CauHoi[0].NoiDung : '',
          CauHoiCode: res.data.BaiTapCode ? res.data.BaiTapCode.DeBai : '',
          CodeMau: res.data.BaiTapCode ? res.data.BaiTapCode.CodeMau : ''
        });
      }
    } catch (err) {
      setExistingTest(null);
    }
  };

  // Submit Form Tạo / Cập nhật bài test đầu vào
  const handleCreateTestSubmit = async (values) => {
    setSubmittingTest(true);
    try {
      const defaultQuestions = [
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: values.CauHoiTracNghiem || 'Nguyên lý khoa học thực nghiệm nào sau đây là nền tảng cốt lõi của đề tài?',
          LuaChon: [
            'A. Tuân thủ phương pháp thực nghiệm khoa học',
            'B. Phỏng đoán không qua kiểm chứng',
            'C. Bỏ qua các yếu tố sai số đo đạc',
            'D. Tùy ý thay đổi dữ liệu kết quả'
          ],
          DapAnDung: 'A',
          Diem: 5
        },
        {
          LoaiCauHoi: 'Code',
          NoiDung: values.CauHoiCode || 'Viết hàm Python tính toán hoặc đọc giá trị dữ liệu từ cảm biến.',
          NgonNgu: 'python',
          DapAnMau: values.CodeMau || 'def doc_du_lieu(x):\n    return round(x * 1.05, 2)',
          Diem: 5
        }
      ];

      const payload = {
        deTaiId: values.DeTai,
        DeTai: values.DeTai,
        tieuDe: values.TieuDe.trim(),
        TieuDe: values.TieuDe.trim(),
        moTa: values.MoTa || 'Bài kiểm tra năng lực đầu vào 1 màn hình duy nhất',
        MoTa: values.MoTa || 'Bài kiểm tra năng lực đầu vào 1 màn hình duy nhất',
        thoiGianLam: values.ThoiGianLam || 30,
        ThoiGianLam: values.ThoiGianLam || 30,
        nguongDat: values.NguongDat != null ? values.NguongDat : 75,
        NguongDat: values.NguongDat != null ? values.NguongDat : 75,
        TrangThai: 'MoNop',
        cauHoi: defaultQuestions,
        CauHoi: defaultQuestions
      };

      const res = await apiService.post('/baitest', payload);
      setTestSuccess(res.data);
      loadTeacherTopics();

      const msgText = `Đã ${existingTest ? 'cập nhật' : 'tạo'} thành công Bài test đầu vào: **${values.TieuDe}** (${values.ThoiGianLam} phút, Ngưỡng đạt: ${values.NguongDat}%). [Xem trang Quản lý đề tài](/teacher/topics)`;
      setMessages(prev => [...prev, { sender: 'ai', text: msgText, time: new Date() }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setMessages(prev => [...prev, { sender: 'ai', text: `Lỗi thao tác bài test: ${errMsg}`, time: new Date() }]);
    } finally {
      setSubmittingTest(false);
    }
  };

  // Xóa bài test đầu vào
  const handleDeleteTest = async () => {
    if (!existingTest?._id) return;
    setDeletingTest(true);
    try {
      await apiService.delete(`/baitest/${existingTest._id}`);
      message.success('Đã xóa bài test thành công');
      testForm.resetFields();
      setExistingTest(null);
      setTestSuccess(null);
      loadTeacherTopics();

      const msgText = `Đã xóa bài test đầu vào của đề tài. [Xem trang Quản lý đề tài](/teacher/topics)`;
      setMessages(prev => [...prev, { sender: 'ai', text: msgText, time: new Date() }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      message.error(`Không thể xóa bài test: ${errMsg}`);
    } finally {
      setDeletingTest(false);
    }
  };

  if (!currentUser) return null;

  const drawerWidth = isMobile ? '100%' : (activeSideForm ? 980 : 480);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar style={{ backgroundColor: '#722ed1' }} icon={<Bot size={18} />} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {isStudent ? 'AI STEM Mentor' : 'AI Trợ Giảng Chuyên Môn'}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                  {activeSideForm ? 'Chế độ làm việc song song (Chat + Form)' : 'Hỗ trợ học tập K-12 & Web3 Credentials'}
                </div>
              </div>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={drawerWidth}
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
          background: '#f9f9fb',
          overflow: 'hidden'
        }}
      >
        {/* Thanh công cụ Bật / Tắt Khung Form song song (dành cho Giáo viên & Admin) */}
        {canManage && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '8px 16px', 
            background: '#ffffff', 
            borderBottom: '1px solid #f0f0f0' 
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#595959' }}>
              Mở rộng form song song:
            </div>
            <Space size="small">
              <Button
                size="small"
                type={activeSideForm === 'topic' ? 'primary' : 'default'}
                onClick={() => setActiveSideForm(activeSideForm === 'topic' ? null : 'topic')}
                style={activeSideForm === 'topic' ? { background: '#722ed1', borderColor: '#722ed1' } : {}}
              >
                {activeSideForm === 'topic' ? 'Thu gọn form đề tài' : 'Mở form tạo đề tài'}
              </Button>
              <Button
                size="small"
                type={activeSideForm === 'test' ? 'primary' : 'default'}
                onClick={() => setActiveSideForm(activeSideForm === 'test' ? null : 'test')}
                style={activeSideForm === 'test' ? { background: '#722ed1', borderColor: '#722ed1' } : {}}
              >
                {activeSideForm === 'test' ? 'Thu gọn form bài test' : 'Mở form tạo bài test'}
              </Button>
            </Space>
          </div>
        )}

        {/* Thân Drawer: Bố cục Chia đôi (Split-Screen) khi bật Form song song */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          flex: 1, 
          height: '100%', 
          overflow: 'hidden' 
        }}>
          {/* KHUNG BÊN TRÁI: TRÒ CHUYỆN AI */}
          <div style={{ 
            flex: 1, 
            minWidth: isMobile ? '100%' : (activeSideForm ? 480 : '100%'),
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: activeSideForm && !isMobile ? '1px solid #e8e8e8' : 'none',
            background: '#f9f9fb'
          }}>
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
                        <div>
                          <MarkdownViewer content={m.text} />
                          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                              type="text" 
                              size="small" 
                              style={{ fontSize: 11, color: '#8c8c8c', padding: '0 4px', height: 22 }}
                              onClick={() => {
                                navigator.clipboard.writeText(m.text);
                                message.success('Đã sao chép nội dung vào clipboard');
                              }}
                            >
                              Sao chép nội dung
                            </Button>
                          </div>
                        </div>
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
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6 }}>
                Gợi ý câu hỏi nhanh:
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
                  placeholder={isStudent ? "Hỏi về phương pháp nghiên cứu, Web3..." : "Hỏi gợi ý đề tài, hoặc ra lệnh AI tạo đề tài tự động..."}
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
          </div>

          {/* KHUNG BÊN PHẢI: FORM THAO TÁC SONG SONG (BẬT / TẮT) */}
          {activeSideForm && (
            <div style={{ 
              flex: 1, 
              minWidth: isMobile ? '100%' : 460, 
              height: '100%', 
              overflowY: 'auto', 
              background: '#ffffff',
              padding: 20
            }}>
              {/* Tiêu đề & Nút thu gọn Form */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingBottom: 14, 
                marginBottom: 16, 
                borderBottom: '1px solid #f0f0f0' 
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {activeSideForm === 'topic' 
                      ? (topicMode === 'edit' ? 'Chỉnh Sửa & Xóa Đề Tài STEM' : 'Tạo Đề Tài STEM K-12')
                      : (existingTest ? 'Chỉnh Sửa & Xóa Bài Test Đầu Vào' : 'Tạo Bài Test Đầu Vào')}
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    Trao đổi với AI bên trái, sao chép và dán trực tiếp vào các ô dưới đây.
                  </div>
                </div>
                <Button size="small" onClick={() => setActiveSideForm(null)}>
                  Thu gọn
                </Button>
              </div>

              {/* FORM 1: TẠO & SỬA ĐỀ TÀI STEM */}
              {activeSideForm === 'topic' && (
                <div>
                  {/* Chuyển đổi chế độ: Tạo mới vs Chỉnh sửa / Xóa */}
                  <Segmented
                    block
                    value={topicMode}
                    onChange={val => {
                      setTopicMode(val);
                      setTopicSuccess(null);
                      if (val === 'create') {
                        setSelectedTopicToEdit(null);
                        topicForm.resetFields();
                      }
                    }}
                    options={[
                      { label: 'Tạo mới đề tài', value: 'create' },
                      { label: 'Chỉnh sửa & Xóa đề tài', value: 'edit' }
                    ]}
                    style={{ marginBottom: 16 }}
                  />

                  {/* Khi ở chế độ Sửa / Xóa: Chọn đề tài cần xử lý */}
                  {topicMode === 'edit' && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f5f5f7', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#262626' }}>
                        Chọn đề tài cần chỉnh sửa hoặc xóa:
                      </div>
                      <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="Tìm theo tên hoặc mã đề tài..."
                        value={selectedTopicToEdit}
                        onChange={handleSelectTopicToEdit}
                        loading={loadingTopics}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={teacherTopics.map(t => ({
                          value: t._id,
                          label: `[${t.MaDeTai}] ${t.TenDeTai}`
                        }))}
                      />
                    </div>
                  )}

                  {topicSuccess ? (
                    <div>
                      <Alert
                        type="success"
                        showIcon={false}
                        message={topicSuccess.isEdit ? "Cập nhật đề tài thành công" : "Tạo đề tài STEM thành công"}
                        description={
                          <div style={{ marginTop: 8, lineHeight: 1.8 }}>
                            <div>Tên đề tài: <b>{topicSuccess.TenDeTai}</b></div>
                            <div>Mã đề tài: <code>{topicSuccess.MaDeTai}</code></div>
                            <div>Trạng thái: {topicSuccess.TrangThai || 'Mở tiếp nhận đăng ký'}</div>
                            <div>Thời hạn: {new Date(topicSuccess.Deadline).toLocaleDateString('vi-VN')}</div>
                          </div>
                        }
                        style={{ marginBottom: 20 }}
                      />
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Button
                          type="primary"
                          size="large"
                          block
                          onClick={() => {
                            setOpen(false);
                            navigate('/teacher/topics');
                          }}
                        >
                          Đi tới trang Quản lý đề tài
                        </Button>
                        <Button
                          block
                          onClick={() => {
                            topicForm.resetFields();
                            setSelectedTopicToEdit(null);
                            setTopicSuccess(null);
                          }}
                        >
                          Tiếp tục thao tác đề tài khác
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <Form
                      form={topicForm}
                      layout="vertical"
                      onFinish={handleTopicSubmit}
                      initialValues={{
                        KhoiLopYeuCau: [10, 11, 12],
                        SoLuongHocSinh: 3,
                        Deadline: dayjs().add(60, 'day')
                      }}
                    >
                      <Form.Item
                        label="Tên đề tài STEM"
                        name="TenDeTai"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đề tài' }]}
                      >
                        <Input placeholder="Ví dụ: Hệ thống lọc nước thông minh sử dụng năng lượng mặt trời" />
                      </Form.Item>

                      <Form.Item
                        label="Khối lớp áp dụng"
                        name="KhoiLopYeuCau"
                        rules={[{ required: true, message: 'Vui lòng chọn khối lớp' }]}
                      >
                        <Select
                          mode="multiple"
                          options={[
                            { label: 'Khối 10', value: 10 },
                            { label: 'Khối 11', value: 11 },
                            { label: 'Khối 12', value: 12 }
                          ]}
                        />
                      </Form.Item>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <Form.Item
                          label="Số học sinh / nhóm"
                          name="SoLuongHocSinh"
                          style={{ flex: 1 }}
                        >
                          <InputNumber min={1} max={5} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                          label="Hạn hoàn thành"
                          name="Deadline"
                          style={{ flex: 1 }}
                          rules={[{ required: true, message: 'Vui lòng chọn hạn hoàn thành' }]}
                        >
                          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                      </div>

                      <Form.Item
                        label="Mô tả tóm tắt"
                        name="MoTa"
                        rules={[{ required: true, message: 'Vui lòng nhập mô tả tóm tắt' }]}
                      >
                        <TextArea rows={4} placeholder="Dán mục tiêu nghiên cứu, sản phẩm dự kiến từ đoạn chat AI..." />
                      </Form.Item>

                      <Form.Item
                        label="Yêu cầu đối với học sinh (mỗi dòng một yêu cầu)"
                        name="YeuCau"
                      >
                        <TextArea rows={3} placeholder="Dán các yêu cầu kiến thức / kỹ năng lập trình từ AI..." />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={submittingTopic}
                        style={{ background: '#722ed1', borderColor: '#722ed1', marginTop: 8 }}
                      >
                        {topicMode === 'edit' ? 'Lưu thay đổi đề tài' : 'Xác nhận tạo đề tài'}
                      </Button>

                      {topicMode === 'edit' && selectedTopicToEdit && (
                        <Popconfirm
                          title="Xác nhận xóa đề tài vĩnh viễn"
                          description="Bạn có chắc chắn muốn xóa đề tài này? Thao tác không thể hoàn tác."
                          onConfirm={handleDeleteTopic}
                          okText="Xác nhận xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true, loading: deletingTopic }}
                        >
                          <Button
                            danger
                            block
                            size="large"
                            loading={deletingTopic}
                            style={{ marginTop: 10 }}
                          >
                            Xóa đề tài này
                          </Button>
                        </Popconfirm>
                      )}
                    </Form>
                  )}
                </div>
              )}

              {/* FORM 2: TẠO & SỬA BÀI TEST */}
              {activeSideForm === 'test' && (
                <div>
                  {testSuccess ? (
                    <div>
                      <Alert
                        type="success"
                        showIcon={false}
                        message="Lưu bài test đầu vào thành công"
                        description={
                          <div style={{ marginTop: 8, lineHeight: 1.8 }}>
                            <div>Tiêu đề: <b>{testSuccess.TieuDe || testSuccess.data?.TieuDe}</b></div>
                            <div>Thời gian làm bài: {testSuccess.ThoiGianLam || testSuccess.data?.ThoiGianLam} phút</div>
                            <div>Ngưỡng điểm đạt: {testSuccess.NguongDat != null ? testSuccess.NguongDat : testSuccess.data?.NguongDat}%</div>
                            <div>Chế độ: Giám sát AI 1 màn hình duy nhất</div>
                          </div>
                        }
                        style={{ marginBottom: 20 }}
                      />
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Button
                          type="primary"
                          size="large"
                          block
                          onClick={() => {
                            setOpen(false);
                            navigate('/teacher/topics');
                          }}
                        >
                          Đi tới trang Quản lý đề tài
                        </Button>
                        <Button
                          block
                          onClick={() => {
                            testForm.resetFields();
                            setExistingTest(null);
                            setTestSuccess(null);
                          }}
                        >
                          Tiếp tục thao tác bài test khác
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <Form
                      form={testForm}
                      layout="vertical"
                      onFinish={handleCreateTestSubmit}
                      initialValues={{
                        ThoiGianLam: 30,
                        NguongDat: 75
                      }}
                    >
                      <Form.Item
                        label="Chọn đề tài áp dụng bài test"
                        name="DeTai"
                        rules={[{ required: true, message: 'Vui lòng chọn đề tài' }]}
                      >
                        <Select
                          loading={loadingTopics}
                          placeholder="Chọn đề tài STEM của Thầy/Cô"
                          onChange={handleSelectTopicForTest}
                          options={teacherTopics.map(t => ({
                            label: `${t.TenDeTai} (${t.MaDeTai})${t.CoBaiTest ? ' - Đã có test' : ''}`,
                            value: t._id
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        label="Tiêu đề bài test"
                        name="TieuDe"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề bài test' }]}
                      >
                        <Input placeholder="Ví dụ: Đánh giá năng lực đầu vào - Dự án STEM" />
                      </Form.Item>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <Form.Item
                          label="Thời gian làm bài"
                          name="ThoiGianLam"
                          style={{ flex: 1 }}
                          rules={[{ required: true, message: 'Nhập thời gian' }]}
                        >
                          <InputNumber min={5} max={180} addonAfter="phút" style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                          label="Ngưỡng điểm đạt"
                          name="NguongDat"
                          style={{ flex: 1 }}
                          rules={[{ required: true, message: 'Nhập ngưỡng đạt' }]}
                        >
                          <InputNumber min={1} max={100} addonAfter="%" style={{ width: '100%' }} />
                        </Form.Item>
                      </div>

                      <Form.Item
                        label="Nội dung câu hỏi trắc nghiệm (Dán từ AI)"
                        name="CauHoiTracNghiem"
                      >
                        <TextArea rows={2} placeholder="Dán nội dung câu hỏi trắc nghiệm do AI gợi ý..." />
                      </Form.Item>

                      <Form.Item
                        label="Nội dung bài tập lập trình (Dán từ AI)"
                        name="CauHoiCode"
                      >
                        <TextArea rows={2} placeholder="Dán đề bài lập trình Python từ AI..." />
                      </Form.Item>

                      <Form.Item
                        label="Mã nguồn code mẫu đáp án"
                        name="CodeMau"
                      >
                        <TextArea rows={2} placeholder="def xu_ly_du_lieu(x):&#10;    return x * 1.0" />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={submittingTest}
                        style={{ background: '#722ed1', borderColor: '#722ed1', marginTop: 8 }}
                      >
                        {existingTest ? 'Lưu cập nhật bài test' : 'Xác nhận tạo bài test'}
                      </Button>

                      {existingTest && (
                        <Popconfirm
                          title="Xác nhận xóa bài test"
                          description="Bạn có chắc chắn muốn xóa bài test này? Toàn bộ kết quả thi của học sinh cho bài test này sẽ bị xóa."
                          onConfirm={handleDeleteTest}
                          okText="Xác nhận xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true, loading: deletingTest }}
                        >
                          <Button
                            danger
                            block
                            size="large"
                            loading={deletingTest}
                            style={{ marginTop: 10 }}
                          >
                            Xóa bài test này
                          </Button>
                        </Popconfirm>
                      )}
                    </Form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default AiCopilotWidget;
