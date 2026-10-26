import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Chip, Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  AccountBox as TeacherIcon,
  ArrowBack as ArrowBackIcon,
  VpnKey as KeyIcon,
  VerifiedUser as VerifiedIcon,
  LightbulbOutlined as LightbulbIcon,
  LockOutlined as LockIcon
} from '@mui/icons-material';

const RoleSelection = ({
  walletAddress,
  onSelectStudent,
  onSelectLecturer,
  onCancel,
  loading,
  errorMessage,
  successMessage
}) => {
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);

  // Student form state
  const [maHS, setMaHS] = useState('');
  const [pin, setPin] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');

  // Teacher form state
  const [teacherMaGV, setTeacherMaGV] = useState('');
  const [teacherPin, setTeacherPin] = useState('');
  const [teacherHoTen, setTeacherHoTen] = useState('');
  const [teacherError, setTeacherError] = useState('');

  const sampleStudentCodes = [
    { code: 'HS1001', name: 'Trần Thị Phương (K10)', pin: '123456' },
    { code: 'HS1002', name: 'Nguyễn Gia Bảo (K10)', pin: '123456' },
    { code: 'HS1003', name: 'Lê Bảo Châu (K10)', pin: '123456' },
    { code: 'HS1101', name: 'Võ Minh Trí (K11)', pin: '123456' },
    { code: 'HS1201', name: 'Đặng Hoàng Nam (K12)', pin: '123456' },
  ];

  const sampleTeacherCodes = [
    { code: 'GV_TOAN_01', name: 'Thầy Nguyễn Văn Toàn (Toán)', pin: '888888' },
    { code: 'GV_STEM_02', name: 'Cô Trần Thị Mai (STEM)', pin: '888888' },
  ];

  const handleStudentSubmit = (e) => {
    e?.preventDefault();
    setLocalError('');
    if (!maHS.trim()) {
      setLocalError('Vui lòng nhập Mã Học Sinh (Mã HS) do nhà trường cấp.');
      return;
    }
    if (!pin.trim()) {
      setLocalError('Vui lòng nhập Mã PIN kích hoạt 6 số được cấp.');
      return;
    }
    onSelectStudent({
      maHS: maHS.trim().toUpperCase(),
      pin: pin.trim(),
      hoTen: hoTen.trim(),
      email: email.trim()
    });
  };

  const handleTeacherSubmit = (e) => {
    e?.preventDefault();
    setTeacherError('');
    if (!teacherMaGV.trim()) {
      setTeacherError('Vui lòng nhập Mã Cán bộ / Giáo viên (Mã GV).');
      return;
    }
    if (!teacherPin.trim()) {
      setTeacherError('Vui lòng nhập Mã PIN bảo mật 6 số do trường cấp.');
      return;
    }
    onSelectLecturer({
      maGV: teacherMaGV.trim().toUpperCase(),
      pin: teacherPin.trim(),
      hoTen: teacherHoTen.trim()
    });
  };

  const activeError = localError || errorMessage;

  return (
    <Box mt={2} width="100%" maxWidth={580} mx="auto">
      <Paper
        elevation={4}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: '1px solid rgba(25, 118, 210, 0.2)',
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.08)'
        }}
      >
        {/* Header */}
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: '50%',
              bgcolor: 'primary.lighter',
              color: 'primary.main',
              mb: 1.5
            }}
          >
            <SchoolIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Kích Hoạt Ví Học Sinh
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ví <strong>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</strong> chưa được liên kết.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Xác thực 2 lớp bảo mật: <strong>Mã Học Sinh</strong> + <strong>Mã PIN 6 số</strong> do nhà trường cấp nhằm chống tài khoản ảo và chống cướp định danh.
          </Typography>
        </Box>

        {activeError && (
          <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
            {activeError}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left' }}>
            {successMessage}
          </Alert>
        )}

        {/* Form kích hoạt Học sinh */}
        <Box component="form" onSubmit={handleStudentSubmit}>
          <TextField
            autoFocus
            label="Mã Học Sinh (Mã HS) *"
            placeholder="Ví dụ: HS1001"
            fullWidth
            required
            variant="outlined"
            value={maHS}
            onChange={(e) => {
              setMaHS(e.target.value.toUpperCase());
              setLocalError('');
            }}
            inputProps={{ style: { textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' } }}
            helperText="Mã số được in trên Thẻ học sinh hoặc Sổ liên lạc điện tử"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Mã PIN Kích Hoạt (6 chữ số) *"
            placeholder="Ví dụ: 123456"
            fullWidth
            required
            type="password"
            variant="outlined"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setLocalError('');
            }}
            inputProps={{ maxLength: 6, style: { letterSpacing: '4px', fontWeight: 'bold' } }}
            helperText="Mã PIN bí mật chỉ dùng 1 lần do GVCN hoặc Ban Giám Hiệu cung cấp"
            sx={{ mb: 2.5 }}
          />

          {/* Quick-fill sample chips */}
          <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Box display="flex" alignItems="center" gap={0.5} mb={1}>
              <LightbulbIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                Mã học sinh & PIN thử nghiệm:
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {sampleStudentCodes.map((s) => (
                <Chip
                  key={s.code}
                  label={`${s.code} - ${s.name} (PIN: ${s.pin})`}
                  size="small"
                  clickable
                  variant={maHS === s.code ? 'filled' : 'outlined'}
                  color={maHS === s.code ? 'primary' : 'default'}
                  onClick={() => {
                    setMaHS(s.code);
                    setPin(s.pin);
                    setLocalError('');
                  }}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>

          <TextField
            label="Họ và Tên Học Sinh (Tùy chọn)"
            placeholder="Để trống nếu muốn giữ nguyên theo danh sách trường"
            fullWidth
            variant="outlined"
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Email Liên Hệ (Tùy chọn)"
            placeholder="Email học sinh hoặc phụ huynh"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            color="primary"
            disabled={!maHS.trim() || !pin.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <VerifiedIcon />}
            sx={{
              py: 1.4,
              borderRadius: 3,
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(25, 118, 210, 0.35)'
            }}
          >
            {loading ? 'Đang xác thực định danh...' : 'Xác Thực & Liên Kết Ví'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Teacher Activation Section (Discreet / Anti-spam) */}
        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
            Dành cho Thầy/Cô Bộ môn hoặc Quản lý lớp:
          </Typography>
          <Button
            variant="text"
            size="small"
            color="success"
            startIcon={<TeacherIcon fontSize="small" />}
            onClick={() => {
              setTeacherError('');
              setTeacherModalOpen(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Kích hoạt ví Cán bộ / Giáo viên (Yêu cầu Mã GV & PIN)
          </Button>
        </Box>

        {onCancel && (
          <Box textAlign="center" mt={2}>
            <Button
              variant="text"
              color="inherit"
              size="small"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={onCancel}
              disabled={loading}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              Quay lại / Đổi ví MetaMask khác
            </Button>
          </Box>
        )}
      </Paper>

      {/* Modal Kích hoạt Giáo viên */}
      <Dialog
        open={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TeacherIcon color="success" />
          Kích Hoạt Ví Giáo Viên
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Chỉ dành cho Cán bộ / Giáo viên đã có tên trong danh sách phân công chính thức của nhà trường.
          </Typography>

          {teacherError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {teacherError}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Mã Cán Bộ / Giáo Viên (Mã GV) *"
            placeholder="Ví dụ: GV_TOAN_01"
            type="text"
            fullWidth
            required
            variant="outlined"
            value={teacherMaGV}
            onChange={(e) => {
              setTeacherMaGV(e.target.value.toUpperCase());
              setTeacherError('');
            }}
            inputProps={{ style: { textTransform: 'uppercase', fontWeight: 600 } }}
            helperText="Nhập Mã GV do Ban Giám Hiệu cung cấp"
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Mã PIN Bảo Mật (6 số) *"
            placeholder="Ví dụ: 888888"
            type="password"
            fullWidth
            required
            variant="outlined"
            value={teacherPin}
            onChange={(e) => {
              setTeacherPin(e.target.value);
              setTeacherError('');
            }}
            inputProps={{ maxLength: 6, style: { letterSpacing: '4px', fontWeight: 'bold' } }}
            helperText="Mã PIN bảo mật do Ban Giám Hiệu bàn giao"
            sx={{ mb: 2 }}
          />

          {/* Quick-fill sample chips for teachers */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.8}>
              <LightbulbIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                Mã Giáo viên & PIN thử nghiệm:
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {sampleTeacherCodes.map((t) => (
                <Chip
                  key={t.code}
                  label={`${t.code} (${t.name}) - PIN: ${t.pin}`}
                  size="small"
                  clickable
                  variant={teacherMaGV === t.code ? 'filled' : 'outlined'}
                  color={teacherMaGV === t.code ? 'success' : 'default'}
                  onClick={() => {
                    setTeacherMaGV(t.code);
                    setTeacherPin(t.pin);
                    setTeacherError('');
                  }}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>

          <TextField
            margin="dense"
            label="Họ và Tên (Tùy chọn)"
            type="text"
            fullWidth
            variant="outlined"
            value={teacherHoTen}
            onChange={(e) => setTeacherHoTen(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTeacherModalOpen(false)} color="inherit" disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleTeacherSubmit}
            variant="contained"
            color="success"
            disabled={!teacherMaGV.trim() || !teacherPin.trim() || loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <KeyIcon />}
          >
            {loading ? 'Đang kích hoạt...' : 'Kích Hoạt Ví'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleSelection;
