import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Radio, Space, Typography, Tag, Alert, Spin, Progress, Statistic, Result, Descriptions, message, Modal } from 'antd';
import { Clock, Send, Code2, CheckCircle, ShieldCheck, Trophy, AlertTriangle, Camera } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import aiApiService from '../../services/aiService';
import nhomService from '../../services/nhomService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title, Text, Paragraph } = Typography;
const { Countdown } = Statistic;

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000');

const EntranceTest = () => {
  const isMobile = useIsMobile();
  const { deTaiId } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [baiTest, setBaiTest] = useState(null);
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [myNhom, setMyNhom] = useState(null);
  const [competitionResult, setCompetitionResult] = useState(null); // 'winner' | 'waiting' | 'lost' | 'rejected'
  const [competitionStopped, setCompetitionStopped] = useState(false); // Bị dừng do nhóm khác thắng
  const socketRef = useRef(null);
  const submittedRef = useRef(false);
  const startedRef = useRef(false);

  // === GIÁM SÁT TOÀN MÀN HÌNH & CHỐNG GIAN LẬN AI ===
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [blurCount, setBlurCount] = useState(0);
  const [f12AttemptCount, setF12AttemptCount] = useState(0);
  const [mouseLeaveCount, setMouseLeaveCount] = useState(0);
  const [isMultiScreen, setIsMultiScreen] = useState(false);
  const [activeViolationReason, setActiveViolationReason] = useState('YÊU CẦU 1 MÀN HÌNH DUY NHẤT');
  const [preTestDevToolsDetected, setPreTestDevToolsDetected] = useState(false);
  const [isTampered, setIsTampered] = useState(false);

  const violationHistoryRef = useRef([]);
  const tabSwitchCountRef = useRef(0);
  const fullscreenExitCountRef = useRef(0);
  const blurCountRef = useRef(0);
  const f12AttemptCountRef = useRef(0);
  const mouseLeaveCountRef = useRef(0);
  const [violationHistory, setViolationHistory] = useState([]);

  // === WEBCAM AI PROCTORING ===
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState('valid');
  const faceLostCountRef = useRef(0);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  const currentUserId = user?.id || user?._id;

  const { data: testData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['entrance-test', deTaiId, currentUserId],
    queryFn: async () => {
      let data = {
        myNhom: null,
        submitted: false,
        result: null,
        baiTest: null
      };

      if (currentUserId) {
        try {
          const nhomRes = await nhomService.getNhomByHocSinh(currentUserId);
          data.myNhom = nhomRes.nhom;
        } catch (e) { /* ignore */ }
      }

      if (currentUserId) {
        try {
          const check = await aiApiService.checkTestSubmitted(deTaiId, currentUserId);
          if (check?.submitted) {
            data.submitted = true;
            data.result = check.result;
            return data;
          }
        } catch (e) {
          console.warn('Không kiểm tra được submit test:', e);
        }
      }
      
      const test = await aiApiService.getBaiTestForStudent(deTaiId);
      data.baiTest = test;
      return data;
    },
    enabled: !!deTaiId,
  });

  useEffect(() => {
    if (testData) {
      if (testData.myNhom) setMyNhom(testData.myNhom);
      if (testData.submitted) {
        setSubmitted(true);
        setResult(testData.result);
      }
      if (testData.baiTest) {
        setBaiTest(testData.baiTest);
      }
    }
  }, [testData]);

  // Socket.IO connection
  useEffect(() => {
    if (!deTaiId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      // Join competition room nếu có nhóm
      if (myNhom) {
        socket.emit('competition:join', { deTaiId, nhomId: myNhom._id });
      }
    });

    // Nhận thông báo có nhóm thắng
    socket.on('competition:winner', ({ winnerNhomId, winnerName }) => {
      if (myNhom && winnerNhomId === myNhom._id) {
        // Nhóm mình thắng!
        setCompetitionResult('winner');
        if (!submittedRef.current) {
          message.success({ key: 'win_topic_toast', content: '🏆 Chúc mừng! Nhóm bạn giành được đề tài!', duration: 10 });
        }
      } else {
        // Nhóm khác thắng → dừng
        setCompetitionStopped(true);
        setCompetitionResult('lost');
        Modal.warning({
          title: '⚠️ Đã có nhóm khác hoàn thành trước!',
          content: `Nhóm "${winnerName}" đã hoàn thành bài test trước. Bài test đã kết thúc.`,
          okText: 'Quay lại đăng ký đề tài',
          onOk: () => navigate('/student/register')
        });
      }
    });

    // Nhận cập nhật trạng thái
    socket.on('competition:status', ({ nhomId, status }) => {
      console.log(`[SOCKET] Competition status: nhom=${nhomId} status=${status}`);
    });

    return () => {
      socket.emit('competition:leave', { deTaiId });
      socket.disconnect();
    };
  }, [deTaiId, myNhom?._id]);

  // Join room khi có nhóm
  useEffect(() => {
    if (myNhom && socketRef.current?.connected) {
      socketRef.current.emit('competition:join', { deTaiId, nhomId: myNhom._id });
    }
  }, [myNhom?._id]);


  const isLeader = !myNhom || String(myNhom.TruongNhom?._id || myNhom.TruongNhom) === String(user?.id || user?._id);

  // === CÒI BÁO ĐỘNG GIAN LẬN (WEB AUDIO SYNTHESIZER) ===
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  // Kiểm tra thiết bị có nhiều màn hình không (Multi-screen / Dual monitor detection)
  useEffect(() => {
    const checkScreens = () => {
      try {
        if (window.screen && window.screen.isExtended) {
          setIsMultiScreen(true);
        } else {
          setIsMultiScreen(false);
        }
      } catch (e) {
        setIsMultiScreen(false);
      }
    };
    checkScreens();
    if (window.screen && 'onchange' in window.screen) {
      window.screen.addEventListener('change', checkScreens);
      return () => window.screen.removeEventListener('change', checkScreens);
    }
  }, []);

  // Kiểm tra can thiệp prototype (Anti-tamper / Userscripts) & DevTools trước khi thi
  useEffect(() => {
    try {
      const isNative = (fn) => typeof fn === 'function' && fn.toString().includes('[native code]');
      if (!isNative(window.addEventListener) || !isNative(EventTarget.prototype.addEventListener)) {
        setIsTampered(true);
      }
    } catch (e) {}

    const preCheckTimer = setInterval(() => {
      if (startedRef.current) return;
      const isDocked = (window.outerWidth - window.innerWidth > 160) || (window.outerHeight - window.innerHeight > 160);
      setPreTestDevToolsDetected(isDocked);
    }, 1000);

    return () => clearInterval(preCheckTimer);
  }, []);

  // === WEBCAM PROCTORING CONTROL ===
  const startWebcam = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setFaceStatus('valid');
      }
    } catch (err) {
      console.warn('Webcam permission not granted or device not found:', err);
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Giám sát camera định kỳ (kiểm tra camera bị che / tối đen)
  useEffect(() => {
    if (!started || submitted || !cameraActive) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    const faceCheckTimer = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        ctx.drawImage(videoRef.current, 0, 0, 64, 48);
        const imgData = ctx.getImageData(0, 0, 64, 48);
        const data = imgData.data;
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        if (avgBrightness < 18) {
          setFaceStatus('lost');
          faceLostCountRef.current += 1;
          if (faceLostCountRef.current === 2) {
            playAlarmSound();
            recordViolation('CheCamera', 'Phát hiện camera thi bị che khuất hoặc quá tối (Lần 1)');
            message.warning({
              key: 'cam_dark_toast',
              content: '⚠️ CẢNH BÁO CAMERA: Camera đang bị che tối! Đảm bảo khuôn mặt luôn hiện rõ.',
              duration: 4
            });
          } else if (faceLostCountRef.current >= 5) {
            recordViolation('CheCameraLienTuc', 'Camera thi bị che tối liên tục quá 12 giây');
            handleAutoSubmitViolation('Camera thi bị che tối / vô hiệu hóa liên tục quá 12 giây (Đình chỉ thi ngay)');
          }
        } else {
          setFaceStatus('valid');
          if (faceLostCountRef.current > 0 && faceLostCountRef.current < 5) {
            faceLostCountRef.current = 0;
          }
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(faceCheckTimer);
  }, [started, submitted, cameraActive]);

  // === ĐẾM NGƯỢC 5S KHẨN CẤP QUAY LẠI TOÀN MÀN HÌNH ===
  const [graceCountdown, setGraceCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);

  const startGraceCountdown = (reason = 'YÊU CẦU 1 MÀN HÌNH DUY NHẤT') => {
    setActiveViolationReason(reason);
    setGraceCountdown(5);
    playAlarmSound();
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    let remaining = 5;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setGraceCountdown(remaining);
      playAlarmSound();
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        handleAutoSubmitViolation(reason || 'Không quay lại toàn màn hình trong 5 giây khẩn cấp');
      }
    }, 1000);
  };

  const stopGraceCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const requestFullscreen = () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const recordViolation = (loai, chiTiet) => {
    const record = {
      LoaiViPham: loai,
      ThoiDiem: new Date(),
      ChiTiet: chiTiet
    };
    const updated = [...violationHistoryRef.current, record];
    violationHistoryRef.current = updated;
    setViolationHistory(updated);
  };

  const handleAutoSubmitViolation = (reason) => {
    stopGraceCountdown();
    playAlarmSound();
    message.error({
      key: 'cheat_violation_toast',
      content: `🛑 ĐÌNH CHỈ THI & HỦY KẾT QUẢ: ${reason}`,
      duration: 10
    });
    recordViolation('ViPhamNghiemTrong', reason);
    handleSubmit(true, reason);
  };

  // === GIÁM SÁT SỰ KIỆN TOÀN MÀN HÌNH & CHỐNG GIAN LẬN SIÊU GẮT GAO ===
  useEffect(() => {
    if (!started || submitted) return;

    // 1. Theo dõi thoát toàn màn hình (Fullscreen Exit)
    const onFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && startedRef.current && !submittedRef.current) {
        fullscreenExitCountRef.current += 1;
        setFullscreenExitCount(fullscreenExitCountRef.current);
        recordViolation('ThoatFullscreen', `Thoát chế độ toàn màn hình lần ${fullscreenExitCountRef.current}`);

        // Tối đa 2 lần vi phạm (Lần 1: Cảnh báo 5s, Lần 2: Hủy bài ngay lập tức)
        if (fullscreenExitCountRef.current >= 2) {
          handleAutoSubmitViolation('Thoát toàn màn hình lần 2 (Đình chỉ thi ngay lập tức)');
        } else {
          startGraceCountdown('CẢNH BÁO: THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH');
        }
      } else if (isFull) {
        stopGraceCountdown();
      }
    };

    // 2. Theo dõi rời Tab / Ẩn trang (Visibility Change)
    const onVisibilityChange = () => {
      if (document.hidden && startedRef.current && !submittedRef.current) {
        playAlarmSound();
        tabSwitchCountRef.current += 1;
        setTabSwitchCount(tabSwitchCountRef.current);
        recordViolation('ChuyenTab', `Rời tab làm bài lần ${tabSwitchCountRef.current}`);

        if (tabSwitchCountRef.current >= 2) {
          handleAutoSubmitViolation('Rời khỏi tab thi lần 2 (Vi phạm nghiêm trọng quy chế)');
        } else {
          setIsFullscreen(false);
          startGraceCountdown('CẢNH BÁO: RỜI KHỎI TAB THI - CẤM MỞ TAB KHÁC');
          message.error({
            key: 'tab_switch_warn',
            content: `🚨 CẢNH BÁO GIAN LẬN: Bạn vừa rời tab thi (Lần 1/2)! Cấm mở tab song song.`,
            duration: 5
          });
        }
      }
    };

    // 3. Mất tiêu điểm cửa sổ (Blur) - BẮT TRIỆT ĐỂ HÀNH VI DÙNG 2 MÀN HÌNH / CLICK ỨNG DỤNG KHÁC!
    const onWindowBlur = () => {
      if (startedRef.current && !submittedRef.current) {
        playAlarmSound();
        blurCountRef.current += 1;
        setBlurCount(blurCountRef.current);
        const reason = `Mất tiêu điểm cửa sổ thi lần ${blurCountRef.current} (Click chuột sang màn hình thứ 2 hoặc ứng dụng ngoài)`;
        recordViolation('MatFocus', reason);

        // Kích hoạt màn hình đỏ khẩn cấp che toàn bộ đề thi!
        setIsFullscreen(false);

        if (blurCountRef.current >= 2) {
          handleAutoSubmitViolation('Mất tiêu điểm màn hình thi lần 2 (Click sang màn hình thứ 2 hoặc ứng dụng ngoài)');
        } else {
          startGraceCountdown('CẢNH BÁO: MẤT TIÊU ĐIỂM CỬA SỔ (NGHI VẤN SỬ DỤNG 2 MÀN HÌNH)');
          message.error({
            key: 'blur_warn',
            content: `🚨 CẢNH BÁO: Mất tiêu điểm phòng thi (Lần 1/2)! Tuyệt đối không click chuột sang màn hình thứ 2.`,
            duration: 5
          });
        }
      }
    };

    // 4. Quay lại tiêu điểm cửa sổ (Focus)
    const onWindowFocus = () => {
      if (startedRef.current && !submittedRef.current) {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (isFull) {
          stopGraceCountdown();
          setIsFullscreen(true);
        }
      }
    };

    // 5. Rê chuột ra khỏi màn hình thi (Mouse Leave)
    const onMouseLeave = () => {
      if (startedRef.current && !submittedRef.current) {
        playAlarmSound();
        mouseLeaveCountRef.current += 1;
        setMouseLeaveCount(mouseLeaveCountRef.current);
        recordViolation('ReChuotRaNgoai', `Con trỏ chuột di chuyển ra ngoài cửa sổ thi lần ${mouseLeaveCountRef.current} (Nghi vấn rê chuột sang màn hình thứ 2)`);
        message.warning({
          key: 'mouse_leave_toast',
          content: '⚠️ CẢNH BÁO: Chuột đã rời khỏi cửa sổ thi! Tuyệt đối không di chuyển chuột sang màn hình thứ 2.',
          duration: 3
        });
      }
    };

    // 6. Phát hiện co nhỏ cửa sổ hoặc chia đôi màn hình (Split screen)
    const onWindowResize = () => {
      if (startedRef.current && !submittedRef.current) {
        if (window.innerWidth < window.screen.availWidth * 0.85 || window.innerHeight < window.screen.availHeight * 0.8) {
          setIsFullscreen(false);
          startGraceCountdown('CẢNH BÁO: PHÁT HIỆN CHIA ĐÔI MÀN HÌNH (SPLIT-SCREEN)');
          recordViolation('SplitScreen', 'Phát hiện chia đôi màn hình hoặc co nhỏ cửa sổ');
        }
      }
    };

    // 7. Chặn dán nội dung dài (Copy/Paste từ ChatGPT)
    const onPaste = (e) => {
      const pasteText = e.clipboardData?.getData('text') || '';
      if (pasteText.length > 20) {
        e.preventDefault();
        playAlarmSound();
        recordViolation('CopyPaste', `Nghi vấn dán lời giải ChatGPT (${pasteText.length} ký tự)`);
        message.error({
          key: 'paste_block_toast',
          content: '🚫 CẤM DÁN ĐÁP ÁN: Hệ thống phát hiện văn bản dài từ bên ngoài. Hãy tự gõ lời giải!',
          duration: 5
        });
      }
    };

    // 8. BẮT & KHÓA TRIỆT ĐỂ F12 VÀ PHÍM TẮT DEVTOOLS Ở PHA CAPTURING (useCapture: true)
    const onKeyDown = (e) => {
      const isF12 = e.keyCode === 123 || e.key === 'F12' || e.code === 'F12';
      const isDevToolsCombo = e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key);
      const isSourceCombo = (e.ctrlKey || e.metaKey) && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key);
      const isRefreshOrF11 = e.keyCode === 116 || e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) || e.keyCode === 122 || e.key === 'F11';

      if (isF12 || isDevToolsCombo || isSourceCombo) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        playAlarmSound();

        f12AttemptCountRef.current += 1;
        setF12AttemptCount(f12AttemptCountRef.current);
        const detail = `Cố tình bấm phím tắt F12/DevTools (${e.key || e.code}) lần ${f12AttemptCountRef.current}`;
        recordViolation('PhimTatDevTools', detail);

        if (f12AttemptCountRef.current >= 2) {
          handleAutoSubmitViolation('Cố tình bấm phím tắt F12 / DevTools nhiều lần để soi mã nguồn (Đình chỉ thi ngay)');
        } else {
          message.error({
            key: 'devtools_warn',
            content: `🚫 CẤM F12 & DEVTOOLS (Lần ${f12AttemptCountRef.current}/2): Nghiêm cấm soi mã nguồn! Lần sau sẽ hủy bài thi ngay lập tức.`,
            duration: 5
          });
        }
        return false;
      }

      if (isRefreshOrF11) {
        e.preventDefault();
        e.stopPropagation();
        message.warning({
          key: 'refresh_block',
          content: 'Phím làm mới trang và F11 bị vô hiệu hóa trong phòng thi.',
          duration: 3
        });
        return false;
      }
    };

    // 9. Khóa menu chuột phải ở pha Capturing
    const onContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      message.warning({
        key: 'context_block',
        content: 'Chuột phải và menu kiểm tra bị vô hiệu hóa trong phòng thi.',
        duration: 3
      });
      return false;
    };

    // 10. BẪY DEVTOOLS CHỦ ĐỘNG: KIỂM TRA ĐỊNH KỲ (DEBUGGER TIMING TRAP + DOCKED DEVTOOLS CHECK)
    const devToolsInterval = setInterval(() => {
      if (!startedRef.current || submittedRef.current) return;

      // A. Kiểm tra cửa sổ DevTools gắn liền (Docked DevTools)
      const isDocked = (window.outerWidth - window.innerWidth > 160) || (window.outerHeight - window.innerHeight > 160);
      if (isDocked) {
        clearInterval(devToolsInterval);
        handleAutoSubmitViolation('Phát hiện cửa sổ DevTools/F12 thanh tra mã nguồn (Đình chỉ thi ngay)');
        return;
      }

      // B. Bẫy Debugger Timing Trap: Khi DevTools mở, lệnh debugger sẽ dừng luồng JS > 100ms
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const t1 = performance.now();
      if (t1 - t0 > 100) {
        clearInterval(devToolsInterval);
        handleAutoSubmitViolation('Phát hiện bẻ khóa và mở DevTools/F12 bằng Debugger Timing Trap (Đình chỉ thi ngay)');
      }
    }, 1000);

    // ĐĂNG KÝ EVENT LISTENERS VỚI CAPTURING PHASE (true) CHO CÁC SỰ KIỆN PHÍM VÀ CHUỘT
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('paste', onPaste, true);

    return () => {
      clearInterval(devToolsInterval);
      stopGraceCountdown();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('paste', onPaste, true);
    };
  }, [started, submitted]);

  const handleStart = async () => {
    // #13: chỉ trưởng nhóm được làm bài test đại diện nhóm
    if (!isLeader) {
      message.warning('Chỉ trưởng nhóm được làm bài test đại diện cho nhóm.');
      return;
    }
    try {
      await aiApiService.startBaiTest(baiTest._id, myNhom?._id || null);
    } catch (e) {
      message.error(e.response?.data?.error || 'Không thể bắt đầu làm bài test.');
      return;
    }
    setStarted(true);
    setStartTime(new Date());
    // Kích hoạt toàn màn hình ngay lập tức
    requestFullscreen();
    setIsFullscreen(true);
    // Bật camera giám sát AI
    await startWebcam();
  };

  const handleAnswer = (idx, value) => {
    setAnswers({ ...answers, [idx]: value });
  };

  const handleSubmit = async (isViolation = false, violationNote = '') => {
    if (competitionStopped) {
      message.warning('Bài test đã kết thúc do nhóm khác đã thắng.');
      return;
    }
    setSubmitting(true);
    try {
      stopWebcam();
      const traLoi = [];
      for (let i = 0; i < baiTest.CauHoi.length; i++) {
        traLoi.push(answers[i] || '');
      }

      // Thoát toàn màn hình an toàn sau khi nộp
      if (document.fullscreenElement) {
        try { document.exitFullscreen().catch(() => {}); } catch (e) {}
      }

      const res = await aiApiService.submitBaiTest(baiTest._id, {
        hocSinhId: currentUserId,
        nhomId: myNhom?._id || null,
        traLoi,
        thoiGianBatDau: startTime?.toISOString(),
        soLanChuyenTab: tabSwitchCountRef.current,
        soLanThoatFullscreen: fullscreenExitCountRef.current + blurCountRef.current,
        lichSuViPham: violationHistoryRef.current,
        violationReason: violationNote
      });

      setSubmitted(true);
      setCompetitionResult(res.competitionResult || res.autoResult);
      setResult({
        ...res.data,
        isDat: res.isDat,
        phanTram: res.phanTram,
        nguongDat: res.nguongDat,
        autoResult: res.autoResult,
        competitionResult: res.competitionResult
      });

      if (res.competitionResult === 'winner') {
        message.success({ key: 'win_topic_toast', content: '🏆 Chúc mừng! Nhóm bạn giành được đề tài!', duration: 10 });
      } else if (res.competitionResult === 'waiting') {
        message.info('⏳ Đạt ngưỡng! Đang chờ kết quả nhóm submit trước...');
      } else if (res.competitionResult === 'lost') {
        message.warning('Đạt ngưỡng nhưng đã có nhóm khác thắng trước.');
      } else if (!res.isDat) {
        message.warning('Bạn chưa đạt ngưỡng yêu cầu bài test.');
      }
      queryClient.invalidateQueries({ queryKey: ['entrance-test'] });
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (!competitionStopped) {
      message.warning('Hết thời gian! Bài test sẽ được nộp tự động.');
      handleSubmit();
    }
  };

  const handleRetakeTest = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/baitest/${deTaiId}/reset-student-test`, {
        hocSinhId: currentUserId
      }, {
        headers: { Authorization: `Bearer ${authService.getToken()}` }
      });
      message.success('Đã xóa kết quả thi cũ! Bạn có thể làm lại bài thi ngay.');
      setSubmitted(false);
      setResult(null);
      setStarted(false);
      setAnswers({});
      setIsFullscreen(true);
      stopWebcam();
      setBlurCount(0);
      setF12AttemptCount(0);
      setMouseLeaveCount(0);
      setFullscreenExitCount(0);
      setTabSwitchCount(0);
      setViolationHistory([]);
      blurCountRef.current = 0;
      f12AttemptCountRef.current = 0;
      mouseLeaveCountRef.current = 0;
      fullscreenExitCountRef.current = 0;
      tabSwitchCountRef.current = 0;
      faceLostCountRef.current = 0;
      violationHistoryRef.current = [];
      refetch();
    } catch (e) {
      window.location.reload();
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  // Đã nộp → hiển thị kết quả
  if (submitted && result) {
    const percent = result.DiemToiDa > 0 ? Math.round((result.TongDiem / result.DiemToiDa) * 100) : 0;
    const isDat = result.isDat != null ? result.isDat : percent >= 75;
    const cr = competitionResult || result.competitionResult;

    const statusMap = {
      winner: { status: 'success', title: `🏆 THẮNG! ${result.TongDiem} / ${result.DiemToiDa} điểm (${percent}%)`, sub: 'Nhóm bạn giành được đề tài! Đề tài đã được duyệt tự động.' },
      waiting: { status: 'info', title: `⏳ Đạt ngưỡng! ${result.TongDiem} / ${result.DiemToiDa} (${percent}%)`, sub: 'Đang chờ kết quả nhóm đã submit trước bạn...' },
      lost: { status: 'warning', title: `Thua! ${result.TongDiem} / ${result.DiemToiDa} (${percent}%)`, sub: 'Đạt ngưỡng nhưng đã có nhóm khác thắng trước.' },
      rejected: { status: 'error', title: `Chưa đạt! ${result.TongDiem} / ${result.DiemToiDa} (${percent}%)`, sub: `Ngưỡng yêu cầu: ${result.nguongDat || 75}%.` }
    };
    const info = statusMap[cr] || (isDat
      ? { status: 'success', title: `Đạt! ${percent}%`, sub: 'Đề tài đã được duyệt.' }
      : { status: 'warning', title: `Chưa đạt! ${percent}%`, sub: `Ngưỡng: ${result.nguongDat || 75}%` });

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '0 12px' : 0 }}>
        <Result status={info.status} title={info.title} subTitle={info.sub} />
        <Card>
          {result.BiHuyKetQua && (
            <Alert
              message="🛑 BÀI THI ĐÃ BỊ HỦY BỎ & ĐÌNH CHỈ THI (0 ĐIỂM)"
              description={
                <div>
                  <div style={{ fontWeight: 700, color: '#cf1322', fontSize: 15, marginBottom: 4 }}>
                    Lý do đình chỉ: {result.LyDoHuy || 'Vi phạm nghiêm trọng quy chế phòng thi AI.'}
                  </div>
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    Hệ thống AI Proctoring phát hiện hành vi gian lận (soi mã nguồn DevTools/F12, click sang màn hình phụ hoặc mất tiêu điểm). Toàn bộ điểm số bài thi bị hủy và quyền đăng ký đề tài của nhóm bị từ chối tự động.
                  </div>
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: 16, border: '2px solid #ff4d4f', background: '#fff1f0' }}
            />
          )}

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tổng điểm">
              <Text strong style={{ fontSize: 18, color: result.BiHuyKetQua ? '#f5222d' : '#eb2f96' }}>
                {result.TongDiem} / {result.DiemToiDa} {result.BiHuyKetQua ? '(Đã hủy)' : ''}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian nộp">{new Date(result.ThoiGianNop).toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Kết quả cạnh tranh">
              <Tag color={cr === 'winner' ? 'gold' : cr === 'waiting' ? 'blue' : cr === 'lost' ? 'orange' : 'red'}>
                {cr === 'winner' ? '🏆 Thắng' : cr === 'waiting' ? '⏳ Đang chờ' : cr === 'lost' ? '😞 Thua' : '❌ Không đạt'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Giám sát AI & Liêm chính">
              <Tag color={result.BiHuyKetQua ? 'red' : (result.AI_CheatAssessment === 'Liêm chính' ? 'green' : 'orange')}>
                {result.AI_CheatAssessment || (result.BiHuyKetQua ? 'Vi phạm quy chế' : 'Liêm chính')} (Cheat Score: {result.AI_CheatScore || 0}%)
              </Tag>
            </Descriptions.Item>
            {result.TxHash && (
              <Descriptions.Item label="Blockchain">
                <Tag color="green" icon={<ShieldCheck size={10} />} style={{ cursor: 'pointer' }}
                  onClick={() => { if (!result.TxHash.startsWith('0xMock')) window.open(`https://sepolia.etherscan.io/tx/${result.TxHash}`, '_blank'); }}>
                  {result.TxHash.substring(0, 18)}...
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {result.LichSuViPham && result.LichSuViPham.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <Title level={5} style={{ color: '#cf1322' }}>
                🚨 Nhật ký ghi nhận vi phạm AI ({result.LichSuViPham.length} lần):
              </Title>
              <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fafafa', border: '1px solid #ffccc7', borderRadius: 8, padding: 8 }}>
                {result.LichSuViPham.map((vp, vIdx) => (
                  <div key={vIdx} style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="danger" strong>[{vp.LoaiViPham}] {vp.ChiTiet}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{new Date(vp.ThoiDiem).toLocaleTimeString('vi-VN')}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Title level={5} style={{ marginTop: 16 }}>Chi tiết từng câu</Title>
          {(result.TraLoi || []).map((tl, i) => (
            <div key={i} style={{ padding: '8px 12px', marginBottom: 4, background: tl.DungSai ? '#f6ffed' : (tl.AI_Similarity >= 0.65 ? '#e6f7ff' : '#fff2f0'), borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Space>
                <Tag color={tl.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>{tl.LoaiCauHoi}</Tag>
                <Text>Câu {i + 1}:</Text>
                <Text strong style={{ color: tl.Diem > 0 ? '#52c41a' : '#f5222d' }}>{tl.Diem} / {tl.DiemToiDa}</Text>
                {tl.AI_Similarity != null && <Text type="secondary">Similarity: {Math.round(tl.AI_Similarity * 100)}%</Text>}
              </Space>
            </div>
          ))}

          <Space style={{ marginTop: 16 }} wrap>
            <Button type="primary" onClick={() => navigate('/student/challenges')}>
              Quay lại Đề Tài
            </Button>
            <Button
              danger
              style={{ fontWeight: 600 }}
              onClick={handleRetakeTest}
            >
              🔄 Xóa kết quả & Làm lại bài thi ngay
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (!baiTest) {
    const isAuthError = queryError?.response?.status === 401 || queryError?.response?.status === 403;
    return (
      <div style={{ maxWidth: 650, margin: '40px auto', padding: 20 }}>
        <Card style={{ borderRadius: 12, borderTop: '4px solid #ff4d4f' }}>
          <Alert
            message="Chưa thể tải bài kiểm tra"
            description={
              <div>
                <p>{queryError?.response?.data?.error || queryError?.message || 'Không tìm thấy bài test hoặc phiên đăng nhập của bạn đã hết hạn.'}</p>
                {isAuthError && (
                  <p style={{ color: '#fa8c16' }}>
                    ⚠️ Phiên làm việc của ví hoặc token đã hết hạn. Vui lòng bấm nút bên dưới để làm mới phiên đăng nhập ngay.
                  </p>
                )}
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              type="primary"
              onClick={() => navigate('/')}
            >
              🔑 Đăng nhập lại
            </Button>
            <Button onClick={() => refetch()}>
              Thử tải lại
            </Button>
            <Button onClick={() => navigate('/student/challenges')}>
              Về trang chủ
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Chưa bắt đầu
  if (!started) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: isMobile ? '0 12px' : 0 }}>
        <Card style={{ borderTop: '4px solid #722ed1', textAlign: 'center' }} styles={{ body: { padding: isMobile ? 16 : 24 } }}>
          <Title level={3}>{baiTest.TieuDe}</Title>
          {baiTest.MoTa && <Paragraph type="secondary">{baiTest.MoTa}</Paragraph>}

          <Descriptions column={1} bordered size="small" style={{ textAlign: 'left', marginBottom: 24 }}>
            <Descriptions.Item label="Đề tài">{baiTest.DeTai?.TenDeTai || deTaiId}</Descriptions.Item>
            <Descriptions.Item label="Số câu hỏi">{baiTest.soCauHoi || baiTest.CauHoi?.length} câu</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{baiTest.ThoiGianLam} phút</Descriptions.Item>
            <Descriptions.Item label="Ngưỡng đạt">{baiTest.NguongDat || 75}%</Descriptions.Item>
          </Descriptions>

          <Alert 
            message="QUY CHẾ PHÒNG THI AI & 1 MÀN HÌNH DUY NHẤT (SIÊU GẮT GAO)" 
            description={
              <div style={{ lineHeight: 1.7 }}>
                <div>• <b>Chế độ 1 màn hình duy nhất:</b> Hệ thống tự động kích hoạt <b>Toàn Màn Hình (Fullscreen)</b>. Tuyệt đối cấm sử dụng 2 màn hình, mở ứng dụng song song hoặc chia đôi màn hình (split-screen).</div>
                <div>• <b>Giám sát mất tiêu điểm (Blur & Dual-screen):</b> Mọi hành vi click chuột ra ngoài cửa sổ thi, rê chuột sang màn hình thứ 2 hoặc chuyển tab đều bị còi hú báo động và kích hoạt đếm ngược 5 giây. Vi phạm lần 2 sẽ bị <b>ĐÌNH CHỈ THI VÀ ĐẠT ĐIỂM 0</b>.</div>
                <div>• <b>Chặn và Bẫy DevTools / F12:</b> Khóa hoàn toàn phím F12, chuột phải, phím tắt soi mã nguồn (Ctrl+Shift+I/J/C, Ctrl+U). Bất kỳ hành vi cố tình mở DevTools (bẫy Debugger Timing Trap & Docked Inspection) đều bị tự động thu bài và hủy kết quả thi ngay lập tức.</div>
                {isMultiScreen && (
                  <div style={{ marginTop: 8, padding: '6px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, color: '#cf1322', fontWeight: 600 }}>
                    🖥️ CẢNH BÁO: Hệ thống phát hiện thiết bị đang kết nối nhiều màn hình. Bạn phải giữ chuột và thao tác 100% trong màn hình thi chính!
                  </div>
                )}
              </div>
            }
            type="warning" 
            showIcon 
            style={{ marginBottom: 16, textAlign: 'left' }} 
          />

          {preTestDevToolsDetected && (
            <Alert
              message="🛑 PHÁT HIỆN DEVTOOLS / F12 ĐANG MỞ TRÊN TRÌNH DUYỆT!"
              description="Quy chế phòng thi nghiêm cấm mở thanh tra mã nguồn (DevTools / F12). Vui lòng ĐÓNG DevTools để kích hoạt nút bắt đầu làm bài."
              type="error"
              showIcon
              style={{ marginBottom: 16, border: '2px solid #ff4d4f', textAlign: 'left' }}
            />
          )}

          {isTampered && (
            <Alert
              message="⚠️ CẢNH BÁO: PHÁT HIỆN TIỆN ÍCH MỞ RỘNG CAN THIỆP MÃ NGUỒN!"
              description="Hệ thống phát hiện có UserScript / Extension đang can thiệp vào các API gốc của trình duyệt. Vui lòng tắt các tiện ích can thiệp để làm bài."
              type="error"
              showIcon
              style={{ marginBottom: 16, border: '2px solid #fa8c16', textAlign: 'left' }}
            />
          )}

          {!isLeader && (
            <Alert
              message="Chỉ trưởng nhóm được làm bài test đại diện cho cả nhóm."
              type="info" showIcon style={{ marginBottom: 16, textAlign: 'left' }}
            />
          )}

          <Button type="primary" size="large" onClick={handleStart} 
            disabled={!isLeader || preTestDevToolsDetected || isTampered}
            style={{ 
              width: '100%', height: 50, fontSize: 16, 
              background: (isLeader && !preTestDevToolsDetected && !isTampered) ? '#722ed1' : undefined, 
              borderColor: (isLeader && !preTestDevToolsDetected && !isTampered) ? '#722ed1' : undefined 
            }}>
            {preTestDevToolsDetected ? '⚠️ Vui lòng đóng DevTools / F12 để bắt đầu' : (isLeader ? 'Bắt Đầu Làm Bài' : 'Chờ trưởng nhóm làm bài')}
          </Button>
        </Card>
      </div>
    );
  }

  // Đang làm bài
  const deadline = startTime ? new Date(startTime.getTime() + baiTest.ThoiGianLam * 60000).getTime() : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '0 12px' : 0, userSelect: 'none' }}>
      {/* LỚP WATERMARK BẢO MẬT CHỐNG CHỤP MÀN HÌNH */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.04,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignContent: 'space-around',
        userSelect: 'none',
        overflow: 'hidden'
      }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{ transform: 'rotate(-25deg)', fontSize: 16, fontWeight: 900, color: '#000', margin: '40px' }}>
            {user?.name || 'HỌC SINH'} • {user?.walletAddress?.substring(0, 10)} • STRICT AI PROCTORING
          </div>
        ))}
      </div>

      {/* KHUNG WEBCAM GIÁM SÁT AI CỐ ĐỊNH GÓC DƯỚI BÊN PHẢI */}
      {cameraActive && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: isMobile ? 130 : 180,
          zIndex: 99999,
          background: '#141414',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
          border: faceStatus === 'valid' ? '2px solid #52c41a' : '2px solid #ff4d4f',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            position: 'absolute',
            top: 6,
            left: 8,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: faceStatus === 'valid' ? '#52c41a' : '#ff4d4f',
              boxShadow: faceStatus === 'valid' ? '0 0 8px #52c41a' : '0 0 8px #ff4d4f'
            }} />
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AI WEBCAM
            </span>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: isMobile ? 95 : 135, objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
          />
          <div style={{
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.85)',
            textAlign: 'center',
            fontSize: 10,
            color: faceStatus === 'valid' ? '#73d13d' : '#ff7875',
            fontWeight: 600
          }}>
            {faceStatus === 'valid' ? '🟢 Khuôn mặt: Hợp lệ' : '🔴 Cảnh báo: Camera bị che'}
          </div>
        </div>
      )}

      {/* OVERLAY CHẶN KHI THOÁT TOÀN MÀN HÌNH HOẶC CHIA ĐÔI CỬA SỔ VỚI ĐẾM NGƯỢC 5S */}
      {!isFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(20, 0, 0, 0.98)',
          zIndex: 9999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          textAlign: 'center'
        }}>
          <AlertTriangle size={80} color="#ff4d4f" style={{ marginBottom: 16, animation: 'pulse 0.8s infinite' }} />
          <Title level={1} style={{ color: '#ff4d4f', margin: '0 0 12px 0', textTransform: 'uppercase', fontSize: 26 }}>
            🚨 {activeViolationReason || 'CẢNH BÁO VI PHẠM: YÊU CẦU 1 MÀN HÌNH DUY NHẤT!'}
          </Title>
          <div style={{
            fontSize: 42,
            fontWeight: 900,
            color: '#fff',
            background: '#cf1322',
            padding: '8px 28px',
            borderRadius: 8,
            marginBottom: 16,
            boxShadow: '0 0 25px rgba(207, 19, 34, 0.8)'
          }}>
            TỰ ĐỘNG THU BÀI SAU: {graceCountdown}s
          </div>
          <Paragraph style={{ color: '#ffd591', fontSize: 16, maxWidth: 640, lineHeight: 1.6 }}>
            Quy chế phòng thi trực tuyến <b>nghiêm cấm tuyệt đối</b> hành vi click sang màn hình thứ 2, mở song song tab, chia đôi màn hình hoặc chuyển sang ứng dụng khác. 
            Mọi thao tác vi phạm đều được hệ thống AI ghi hình & lưu vết để kỷ luật.
          </Paragraph>
          <div style={{ margin: '12px 0', padding: '10px 24px', background: 'rgba(255, 77, 79, 0.25)', border: '2px dashed #ff4d4f', borderRadius: 8 }}>
            <Text style={{ color: '#ff7875', fontSize: 16, fontWeight: 700, display: 'block' }}>
              Thoát FS: {fullscreenExitCount}/2 &nbsp;|&nbsp; Mất focus (2 màn hình): {blurCount}/2 &nbsp;|&nbsp; Đổi tab: {tabSwitchCount}/2 &nbsp;|&nbsp; Bấm F12: {f12AttemptCount}/2
            </Text>
            <Text style={{ color: '#ffd591', fontSize: 13, marginTop: 4, display: 'block' }}>
              (Bất kỳ chỉ số vi phạm nào đạt 2 lần sẽ tự động đình chỉ thi và nộp điểm 0 ngay lập tức)
            </Text>
          </div>
          <Button 
            type="primary" 
            danger 
            size="large" 
            style={{ height: 56, fontSize: 18, fontWeight: 800, padding: '0 40px', borderRadius: 8, boxShadow: '0 0 20px rgba(255, 77, 79, 0.8)' }}
            onClick={() => {
              requestFullscreen();
              stopGraceCountdown();
              setIsFullscreen(true);
              if (window.focus) window.focus();
            }}
          >
            QUAY LẠI TOÀN MÀN HÌNH NGAY ({graceCountdown}s)
          </Button>
        </div>
      )}

      {/* Alert khi bị dừng do nhóm khác thắng */}
      {competitionStopped && (
        <Alert
          message="⚠️ Bài test đã kết thúc"
          description="Đã có nhóm khác hoàn thành trước. Bạn không thể nộp bài nữa."
          type="error" showIcon closable={false}
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => navigate('/student/register')}>Quay lại</Button>}
        />
      )}

      {/* Header cố định có thông tin Giám sát AI */}
      <Card size="small" style={{ marginBottom: 16, position: 'sticky', top: 0, zIndex: 10, borderTop: '3px solid #722ed1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            <Title level={4} style={{ margin: 0 }}>{baiTest.TieuDe}</Title>
            <Tag color="blue">{answeredCount} / {baiTest.CauHoi.length} đã trả lời</Tag>
            <Tag color="cyan" icon={<ShieldCheck size={12} />}>Giám sát AI: 1 Màn hình duy nhất</Tag>
            <Tag color="purple">Chặn F12 & DevTools Trap</Tag>
            <Tag color={cameraActive ? 'green' : 'default'} icon={<Camera size={12} />}>
              {cameraActive ? (faceStatus === 'valid' ? 'Webcam AI: Live' : 'Webcam: Cảnh báo') : 'Webcam: Tắt'}
            </Tag>
            {isMultiScreen && <Tag color="warning">Phát hiện 2 Màn hình</Tag>}
            {(fullscreenExitCount > 0 || tabSwitchCount > 0 || blurCount > 0 || f12AttemptCount > 0) && (
              <Tag color="error">
                Cảnh báo: {fullscreenExitCount} thoát FS | {blurCount} mất focus | {tabSwitchCount} đổi tab | {f12AttemptCount} F12
              </Tag>
            )}
          </Space>
          <Space>
            <Clock size={16} />
            <Countdown value={deadline} onFinish={handleTimeUp} format="mm:ss" valueStyle={{ fontSize: 20, color: '#f5222d', fontWeight: 700 }} />
          </Space>
        </div>
        <Progress percent={Math.round((answeredCount / baiTest.CauHoi.length) * 100)} size="small" style={{ marginTop: 8 }} />
      </Card>

      {/* Câu hỏi */}
      {baiTest.CauHoi.map((q, idx) => (
        <Card key={idx} style={{ marginBottom: 12, borderLeft: answers[idx] ? '4px solid #52c41a' : '4px solid #d9d9d9', opacity: competitionStopped ? 0.5 : 1, pointerEvents: competitionStopped ? 'none' : 'auto' }} styles={{ body: { padding: isMobile ? 12 : 24 } }}>
          <Space style={{ marginBottom: 8 }}>
            <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>
              {q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}
            </Tag>
            <Text strong>Câu {idx + 1}</Text>
            <Text type="secondary">({q.Diem} điểm)</Text>
          </Space>

          <Paragraph style={{ fontSize: 15, marginBottom: 12 }}>{q.NoiDung}</Paragraph>

          {q.LoaiCauHoi === 'TracNghiem' && (
            <Radio.Group value={answers[idx]} onChange={e => handleAnswer(idx, e.target.value)} disabled={competitionStopped}>
              <Space direction="vertical">
                {(q.LuaChon || []).map((choice, cIdx) => (
                  <Radio key={cIdx} value={String.fromCharCode(65 + cIdx)}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0', width: '100%' }}>
                    {choice || `Lựa chọn ${String.fromCharCode(65 + cIdx)}`}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          )}

          {q.LoaiCauHoi === 'Code' && (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Code2 size={14} />
                <Text type="secondary">Ngôn ngữ: {q.NgonNgu || 'python'}</Text>
              </Space>
              <Editor
                height={isMobile ? '300px' : '500px'} language={q.NgonNgu || 'python'}
                value={answers[idx] || ''} onChange={v => handleAnswer(idx, v || '')}
                theme="vs-dark"
                options={{ minimap: { enabled: !isMobile }, fontSize: isMobile ? 12 : 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on', readOnly: competitionStopped }}
              />
            </div>
          )}
        </Card>
      ))}

      {/* Nút nộp bài */}
      <Card style={{ borderTop: '3px solid #eb2f96' }}>
        <Alert message={`Bạn đã trả lời ${answeredCount} / ${baiTest.CauHoi.length} câu`}
          type={answeredCount === baiTest.CauHoi.length ? 'success' : 'warning'} showIcon style={{ marginBottom: 16 }} />
        <Button type="primary" size="large" icon={<Send size={16} />} onClick={handleSubmit}
          loading={submitting} disabled={competitionStopped}
          style={{ width: '100%', height: 50, fontSize: 16 }}>
          {competitionStopped ? 'Bài test đã kết thúc' : submitting ? 'Đang chấm điểm & ghi Blockchain...' : 'Nộp Bài Test'}
        </Button>
      </Card>
    </div>
  );
};

export default EntranceTest;
