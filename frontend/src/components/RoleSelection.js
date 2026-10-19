import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert
} from '@mui/material';
import { School as SchoolIcon, AccountBox as TeacherIcon, ArrowForward as ArrowForwardIcon, Security as SecurityIcon } from '@mui/icons-material';

const RoleSelection = ({ walletAddress, onSelectStudent, onSelectLecturer, loading, rejectedCountToday = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    schoolToken: '', 
    chuyenNganh: 'Tổ Toán - Tin học & STEM' 
  });

  const shortAddr = walletAddress ? walletAddress.slice(2, 8).toLowerCase() : 'k12';
  const didPseudonym = `Teacher_DID#${shortAddr}`;
  const didEmail = `did_${shortAddr}@k12.did`;

  const handleLecturerSubmit = () => {
    if (!formData.chuyenNganh) return;
    onSelectLecturer({
      hoTen: didPseudonym,
      email: didEmail,
      chuyenNganh: formData.chuyenNganh,
      schoolToken: formData.schoolToken
    });
  };

  return (
    <Box mt={4} width="100%" maxWidth={800} mx="auto">
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        Vui lòng chọn vai trò của bạn
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" mb={4}>
        Ví <strong>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</strong> chưa được liên kết với tài khoản nào.
      </Typography>

      <Grid container spacing={4}>
        {/* Học Sinh Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <SchoolIcon color="primary" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Học Sinh</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Đăng ký tham gia dự án học tập / STEM</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nộp báo cáo dự án và cập nhật tiến độ</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nhận gợi ý dự án học tập bằng AI</Typography>
            </Box>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
              onClick={onSelectStudent}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Học Sinh
            </Button>
          </Paper>
        </Grid>

        {/* Giáo Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <TeacherIcon color="success" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Giáo Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Quản lý và tạo dự án học tập</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Đánh giá AI và chấm điểm thủ công</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Ghi nhận kết quả lên Blockchain</Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color="success"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setModalOpen(true)}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Giáo Viên
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal Xác thực vai trò Giáo viên (Zero-PII Token / Invite Code) */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Xác thực Vai trò Giáo Viên</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" icon={<SecurityIcon />} sx={{ mb: 2 }}>
            <strong>Cơ chế Zero-PII:</strong> Bạn không cần cung cấp Họ tên thật. Danh tính đại diện trên hệ thống sẽ tự động gán là: <code>{didPseudonym}</code>.
          </Alert>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Vui lòng nhập Mã xác thực trường cấp và Tổ chuyên môn để kích hoạt quyền Giáo viên:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Mã xác thực trường cấp (School Invite Token / Code)"
            placeholder="Ví dụ: STEM_TEACHER_2026 hoặc mã token trường cấp"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.schoolToken}
            onChange={(e) => setFormData({ ...formData, schoolToken: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Tổ Chuyên Môn / Môn Giảng Dạy"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.chuyenNganh}
            onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Định danh hiển thị ẩn danh (DID Pseudonym)"
            type="text"
            fullWidth
            disabled
            variant="filled"
            value={didPseudonym}
            helperText="Được mã hóa tự động từ địa chỉ ví MetaMask"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Hủy</Button>
          <Button
            onClick={handleLecturerSubmit}
            variant="contained"
            color="success"
            disabled={!formData.chuyenNganh || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Kích hoạt quyền Giáo Viên
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleSelection;
