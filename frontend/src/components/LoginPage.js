import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper, Alert,
  CircularProgress, Fade, Grow, Avatar, Chip, Link,
  useTheme, useMediaQuery, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  HelpOutline as HelpIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import MetaMaskGuideModal from './MetaMaskGuideModal';
import QrScanner from './QrScanner';
import RoleSelection from './RoleSelection';
import authService from '../services/authService';

// Role constants
const STUDENT_ROLE = 'STUDENT_ROLE';
const TEACHER_ROLE = 'TEACHER_ROLE';
const ADMIN_ROLE = 'ADMIN_ROLE';

// --- Animated Gradient Text Component ---
function AnimatedGradientText({ children, sx }) {
  return (
    <Typography
      sx={{
        background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.success.main}, ${theme.palette.secondary.light})`,
        backgroundSize: '200% 200%',
        animation: 'gradientAnimation 5s ease infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        '@keyframes gradientAnimation': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// --- Main LoginPage Component ---
function LoginPage() {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(400));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // QR Login State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  // Role Selection State
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [tempWallet, setTempWallet] = useState(null);
  const [rejectedCountToday, setRejectedCountToday] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      if (currentUser) {
        setConnectedWallet(currentUser.walletAddress);
      }
    };
    checkAuth();

    authService.onAccountChange((account) => {
      if (!account) {
        setIsAuthenticated(false);
        setUser(null);
        setError('VÃ­ Ä‘Ã£ bá»‹ ngáº¯t káº¿t ná»‘i. Vui lÃ²ng káº¿t ná»‘i láº¡i.');
      }
    });

    authService.onChainChange(() => window.location.reload());
  }, []);

  // QR Scan handler â€” quÃ©t QR trÃªn PC, rá»“i xÃ¡c thá»±c MetaMask trÃªn PC (giá»‘ng frontend cÅ©)
  const handleQrScan = async (qrData) => {
    setScanningQr(true);
    setError('');
    setSuccess('');
    try {
      // Parse QR data â€” QR chá»©a JSON vá»›i thÃ´ng tin vÃ­/ngÆ°á»i dÃ¹ng
      let qrInfo;
      try {
        qrInfo = JSON.parse(qrData);
      } catch {
        // Náº¿u QR khÃ´ng pháº£i JSON, coi nhÆ° lÃ  wallet address thuáº§n
        if (qrData.startsWith('0x') && qrData.length === 42) {
          qrInfo = { walletAddress: qrData };
        } else {
          throw new Error('MÃ£ QR khÃ´ng há»£p lá»‡. Vui lÃ²ng quÃ©t mÃ£ QR tá»« há»‡ thá»‘ng Web3 GiÃ¡o Dá»¥c Phá»• ThÃ´ng.');
        }
      }

      // Validate QR data â€” cáº§n cÃ³ thÃ´ng tin Ä‘á»§ Ä‘á»ƒ xÃ¡c thá»±c
      if (!qrInfo.walletAddress && !qrInfo.wallet_address) {
        throw new Error('QR code khÃ´ng chá»©a thÃ´ng tin vÃ­. Vui lÃ²ng kiá»ƒm tra láº¡i mÃ£ QR.');
      }

      const qrWallet = (qrInfo.walletAddress || qrInfo.wallet_address).toLowerCase();


      // Kiá»ƒm tra MetaMask
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lÃ²ng cÃ i Ä‘áº·t vÃ­ MetaMask Ä‘á»ƒ tiáº¿p tá»¥c.');
        setGuideModalOpen(true);
        return;
      }

      // Káº¿t ná»‘i MetaMask trÃªn PC

      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();

      setConnectedWallet(walletAddress);

      // Kiá»ƒm tra vÃ­ MetaMask khá»›p vá»›i QR
      if (walletAddress.toLowerCase() !== qrWallet) {
        throw new Error(
          `VÃ­ MetaMask Ä‘ang káº¿t ná»‘i (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) ` +
          `khÃ´ng khá»›p vá»›i vÃ­ trong QR (${qrWallet.slice(0, 6)}...${qrWallet.slice(-4)}). ` +
          `Vui lÃ²ng chuyá»ƒn sang Ä‘Ãºng vÃ­ hoáº·c quÃ©t láº¡i mÃ£ QR.`
        );
      }

      // XÃ¡c thá»±c MetaMask (kÃ½ challenge)

      const result = await authService.authenticate();
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Báº¡n Ä‘ang cÃ³ yÃªu cáº§u chá» duyá»‡t. Äang chuyá»ƒn hÆ°á»›ng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lÃ²ng chá»n vai trÃ² Ä‘á»ƒ tiáº¿p tá»¥c.');
        return;
      }

      setSuccess('ÄÄƒng nháº­p báº±ng QR thÃ nh cÃ´ng! Äang chuyá»ƒn hÆ°á»›ng...');
      setIsAuthenticated(true);
      setUser(result.user);

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'CÃ³ lá»—i xáº£y ra khi quÃ©t QR.';
      if (err.code === 4001) {
        setError('Báº¡n Ä‘Ã£ tá»« chá»‘i káº¿t ná»‘i MetaMask.');
      } else {
        setError(message);
      }
    } finally {
      setScanningQr(false);
      setQrScannerOpen(false);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lÃ²ng cÃ i Ä‘áº·t vÃ­ MetaMask Ä‘á»ƒ tiáº¿p tá»¥c.');
        setGuideModalOpen(true);
        return;
      }

      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      setConnectedWallet(walletAddress);

      const result = await authService.authenticate();
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Báº¡n Ä‘ang cÃ³ yÃªu cáº§u chá» duyá»‡t. Äang chuyá»ƒn hÆ°á»›ng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lÃ²ng chá»n vai trÃ² Ä‘á»ƒ tiáº¿p tá»¥c.');
        return;
      }

      setSuccess('ÄÄƒng nháº­p thÃ nh cÃ´ng! Äang chuyá»ƒn hÆ°á»›ng Ä‘áº¿n dashboard...');
      setIsAuthenticated(true);
      setUser(result.user);

      // Redirect to dashboard after success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'CÃ³ lá»—i xáº£y ra, vui lÃ²ng thá»­ láº¡i.';
      if (message.includes('user rejected')) {
        setError('Báº¡n Ä‘Ã£ tá»« chá»‘i yÃªu cáº§u káº¿t ná»‘i.');
      } else if (message.includes('wallet not registered')) {
        setError('VÃ­ nÃ y chÆ°a Ä‘Æ°á»£c Ä‘Äƒng kÃ½ trong há»‡ thá»‘ng. Vui lÃ²ng liÃªn há»‡ Ban quáº£n trá»‹ nhÃ  trÆ°á»ng hoáº·c GiÃ¡o viÃªn Ä‘á»ƒ Ä‘Æ°á»£c há»— trá»£.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleSelectStudent = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, STUDENT_ROLE);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lá»—i khi Ä‘Äƒng kÃ½ Há»c sinh');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLecturer = async (formData) => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, TEACHER_ROLE, formData);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lá»—i khi Ä‘Äƒng kÃ½ GiÃ¡o viÃªn');
    } finally {
      setLoading(false);
    }
  };

  // --- Responsive styles ---
  const getResponsiveStyles = () => {
    if (isVerySmall || isMobile) {
      return {
        containerPadding: 2,
        paperPadding: 2.5,
        avatarSize: 64,
        iconSize: 48,
        titleVariant: "h4",
        subtitleVariant: "body1",
        subtitleFontSize: '0.95rem',
        buttonPadding: 1.5,
        buttonFontSize: '0.95rem',
        chipSize: "small",
        spacing: 2
      };
    } else {
      return {
        containerPadding: 4,
        paperPadding: 3.5,
        avatarSize: 80,
        iconSize: 60,
        titleVariant: "h3",
        subtitleVariant: "h6",
        subtitleFontSize: '1.2rem',
        buttonPadding: 2,
        buttonFontSize: '1.1rem',
        chipSize: "medium",
        spacing: 4
      };
    }
  };

  const styles = getResponsiveStyles();

  // --- Logged In View ---
  if (isAuthenticated && user) {
    const isLecturer = user.role_id === TEACHER_ROLE;
    const isAdmin = user.role_id === ADMIN_ROLE;
    
    const roleDisplayName = isAdmin ? 'Ban Quáº£n Trá»‹' : (isLecturer ? 'GiÃ¡o viÃªn' : 'Há»c sinh');
    
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          minHeight="100vh"
          justifyContent="center"
          alignItems="center"
          py={styles.containerPadding}
        >
          <Grow in={true}>
            <Paper
              elevation={4}
              sx={{
                p: styles.paperPadding,
                textAlign: 'center',
                width: '100%',
                borderRadius: 4,
                maxWidth: '420px'
              }}
            >
              <Avatar
                sx={{
                  width: styles.avatarSize,
                  height: styles.avatarSize,
                  mx: 'auto',
                  mb: styles.spacing,
                  background: (theme) => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: styles.iconSize * 0.6 }} />
              </Avatar>
              <AnimatedGradientText
                variant={isMobile ? "h5" : "h4"}
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                ChÃ o má»«ng {roleDisplayName}
              </AnimatedGradientText>
              <Typography
                variant="h5"
                sx={{
                  mb: 1,
                  fontWeight: 'bold'
                }}
              >
                {user.name || user.HoTen || 'NgÆ°á»i dÃ¹ng'}
              </Typography>
              
              {user.Email && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user.Email}
                </Typography>
              )}

              <Box
                display="flex"
                flexDirection="column"
                gap={1.5}
                mb={styles.spacing}
                sx={{ width: '100%', mt: 2 }}
              >
                <Chip
                  label={`VÃ­: ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`}
                  variant="outlined"
                  size={styles.chipSize}
                  sx={{
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    color: 'white',
                    border: 'none',
                    '& .MuiChip-label': {
                      fontWeight: 'bold'
                    }
                  }}
                />
                
                <Chip
                  label={`Vai trÃ²: ${roleDisplayName}`}
                  variant="outlined"
                  size={styles.chipSize}
                  color="primary"
                />

                {!isLecturer && !isAdmin && user.MaHS && (
                  <Chip
                    label={`MÃ£ SV: ${user.MaHS}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {isLecturer && user.MaGV && (
                  <Chip
                    label={`MÃ£ GV: ${user.MaGV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {user.ChuyenNganh && (
                  <Chip
                    label={`ChuyÃªn ngÃ nh: ${user.ChuyenNganh}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {!isLecturer && !isAdmin && typeof user.GPA === 'number' && (
                  <Chip
                    label={`GPA tÃ­ch lÅ©y: ${user.GPA.toFixed(2)}`}
                    variant="outlined"
                    size={styles.chipSize}
                    color="success"
                  />
                )}
              </Box>

              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                mt={3}
                mb={2}
              >
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Äang chuyá»ƒn hÆ°á»›ng vÃ o cá»•ng Ä‘Ã o táº¡o...
                </Typography>
              </Box>

              <Box mt={3} display="flex" justifyContent="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    authService.logout();
                    setIsAuthenticated(false);
                    setUser(null);
                    setConnectedWallet(null);
                    setError('');
                    setSuccess('');
                  }}
                  color="error"
                >
                  ÄÄƒng xuáº¥t
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Box>
      </Container>
    );
  }

  // --- Login View ---
  return (
    <Container maxWidth={needsRoleSelection ? "md" : "sm"}>
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        justifyContent="center"
        alignItems="center"
        py={styles.containerPadding}
      >
        <Fade in={true} timeout={1000}>
          <Box
            textAlign="center"
            mb={styles.spacing}
          >
            <Avatar
              sx={{
                width: styles.avatarSize,
                height: styles.avatarSize,
                mx: 'auto',
                mb: styles.spacing,
                background: 'transparent'
              }}
            >
              <LanguageIcon
                color="primary"
                sx={{
                  fontSize: styles.iconSize,
                  filter: `drop-shadow(0 0 10px ${theme.palette.primary.main})`
                }}
              />
            </Avatar>
            <AnimatedGradientText
              variant={styles.titleVariant}
              component="h1"
              sx={{
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Web3 & AI - GiÃ¡o Dá»¥c Phá»• ThÃ´ng
            </AnimatedGradientText>
            <Typography
              variant={styles.subtitleVariant}
              color="text.secondary"
              sx={{
                fontWeight: 400,
                fontSize: styles.subtitleFontSize,
                maxWidth: '480px',
                mx: 'auto',
                lineHeight: 1.4
              }}
            >
              Há»‡ thá»‘ng quáº£n lÃ½ dá»± Ã¡n há»c táº­p, cháº¥m Ä‘iá»ƒm tiáº¿n Ä‘á»™ báº±ng AI & xÃ¡c thá»±c báº¥t biáº¿n Web3
            </Typography>
          </Box>
        </Fade>

        {needsRoleSelection ? (
          <Grow in={true} timeout={1500}>
            <Box width="100%">
              {error && (
                <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {success}
                </Alert>
              )}
              <RoleSelection
                walletAddress={tempWallet}
                rejectedCountToday={rejectedCountToday}
                onSelectStudent={handleSelectStudent}
                onSelectLecturer={handleSelectLecturer}
                loading={loading}
              />
            </Box>
          </Grow>
        ) : (
          <Grow in={true} timeout={1500}>
          <Paper
            elevation={3}
            sx={{
              p: styles.paperPadding,
              width: '100%',
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: '420px'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab label="VÃ­ MetaMask" />
                <Tab label="QuÃ©t QR Code" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left' }}>
                {success}
              </Alert>
            )}

            {tabValue === 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Káº¿t ná»‘i vÃ­ MetaMask
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  ÄÄƒng nháº­p thÃ´ng qua tiá»‡n Ã­ch má»Ÿ rá»™ng vÃ­ MetaMask trÃªn trÃ¬nh duyá»‡t cá»§a báº¡n.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleConnectWallet}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (
                    <Box
                      component="img"
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                      alt="MetaMask"
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    boxShadow: '0 4px 12px rgba(246, 133, 27, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6750f 0%, #e8850f 100%)',
                      boxShadow: '0 6px 16px rgba(246, 133, 27, 0.5)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Äang xÃ¡c thá»±c...' : 'ÄÄƒng Nháº­p Báº±ng MetaMask'}
                </Button>

                <Box mt={3}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setGuideModalOpen(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary'
                    }}
                  >
                    <HelpIcon fontSize="small" />
                    ChÆ°a cÃ i Ä‘áº·t vÃ­? Xem hÆ°á»›ng dáº«n
                  </Link>
                </Box>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  ÄÄƒng nháº­p báº±ng QR
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  QuÃ©t mÃ£ QR tá»« tháº» xÃ¡c thá»±c Web3 cá»§a báº¡n Ä‘á»ƒ Ä‘Äƒng nháº­p nhanh chÃ³ng vÃ  an toÃ n.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setQrScannerOpen(true)}
                  disabled={scanningQr}
                  startIcon={scanningQr ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {scanningQr ? 'Äang xá»­ lÃ½...' : 'QuÃ©t MÃ£ QR'}
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 3, fontSize: '0.85rem' }}
                >
                  Sá»­ dá»¥ng camera hoáº·c áº£nh chá»©a mÃ£ QR tá»« tháº» xÃ¡c thá»±c blockchain cá»§a báº¡n.
                </Typography>
              </>
            )}
          </Paper>
        </Grow>
        )}

        {/* QR Scanner Dialog */}
        <Dialog
          open={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>QuÃ©t MÃ£ QR XÃ¡c Thá»±c</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <QrScanner
                onScan={handleQrScan}
                onError={(error) => {
                  console.error('QR scan error:', error);
                  setError(error.message || 'Lá»—i quÃ©t QR');
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              HÆ°á»›ng camera vá» phÃ­a mÃ£ QR hoáº·c upload áº£nh chá»©a mÃ£ QR Ä‘á»ƒ quÃ©t
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrScannerOpen(false)}>ÄÃ³ng</Button>
          </DialogActions>
        </Dialog>

        <Fade in={true} timeout={2000}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: styles.spacing,
              textAlign: 'center',
              fontSize: '0.85rem'
            }}
          >
            Â© {new Date().getFullYear()} - Ná»n táº£ng dá»± Ã¡n há»c táº­p Web3 & AI - GiÃ¡o Dá»¥c Phá»• ThÃ´ng.
          </Typography>
        </Fade>
      </Box>
      <MetaMaskGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </Container>
  );
}

export default LoginPage;
