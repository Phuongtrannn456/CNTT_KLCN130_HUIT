import re
import logging

logger = logging.getLogger('ml-service')

INJECTION_PATTERNS = [
    r'(hãy|please|vui lòng).{0,50}(chấm|cho|give|grade|score|đánh giá).{0,50}(10|100|max|cao nhất|tối đa|full mark)',
    r'(bỏ qua|ignore|disregard|forget).{0,40}(rubric|tiêu chí|hướng dẫn|instruction|previous)',
    r'(điểm|score)\s*(=|:)\s*(10|100|tối đa|maximum)',
    r'system\s*(prompt|instruction)',
    r'<\s*/?[a-z]+[^>]*>',  # HTML/XML tags (có thể là injection)
    r'\[\[.{0,50}\]\]',     # Potential template injection
]

# Zero-PII Regex Patterns phục vụ cơ chế "Rọc phách" văn bản báo cáo
PII_PATTERNS = [
    # 1. Khai báo họ tên học sinh / sinh viên / tác giả
    (r'(?i)\b(họ\s*(?:và|&)?\s*tên|họ\s*tên|sinh\s*viên\s*(?:thực\s*hiện)?|học\s*sinh\s*(?:thực\s*hiện)?|người\s*thực\s*hiện|tác\s*giả)\s*[:：\-]\s*([^\n\r,;.]+)', r'\1: [REDACTED_STUDENT_DID]'),
    # 2. Khai báo giáo viên / giảng viên hướng dẫn
    (r'(?i)\b(giáo\s*viên\s*hướng\s*dẫn|giảng\s*viên\s*hướng\s*dẫn|gvhd)\s*[:：\-]\s*([^\n\r,;.]+)', r'\1: [REDACTED_TEACHER_DID]'),
    # 3. Mã số học sinh / mã số sinh viên
    (r'(?i)\b(mssv|mshs|mã\s*số\s*(?:học\s*sinh|sinh\s*viên)|mã\s*(?:học\s*sinh|sinh\s*viên))\s*[:：\-]?\s*([a-zA-Z0-9_\-]+)', r'\1: [REDACTED_DID_CODE]'),
    # 4. Số điện thoại di động
    (r'(?i)\b(?:sđt|số\s*điện\s*thoại|tel|phone)\s*[:：\-]?\s*(?:\+84|0)[0-9]{8,10}\b', r'[REDACTED_PHONE]'),
    # 5. Email cá nhân (ngoại trừ domain k12.did)
    (r'\b[A-Za-z0-9._%+-]+@(?!k12\.did)[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', r'[REDACTED_EMAIL]')
]

def redact_pii(text: str) -> tuple[str, list[str]]:
    """
    Rọc phách tự động - Loại bỏ PII (Họ tên thật, MSSV/MSHS, Email cá nhân, SĐT)
    thay thế bằng [REDACTED_DID] để bảo đảm cơ chế Web3 Zero-PII / Pure Pseudonymity.
    Trả về (redacted_text, alerts).
    """
    alerts = []
    redacted_text = text
    found_pii = False
    for pattern, replacement in PII_PATTERNS:
        if re.search(pattern, redacted_text):
            found_pii = True
            redacted_text = re.sub(pattern, replacement, redacted_text)
    
    if found_pii:
        alerts.append("Hệ thống đã tự động 'rọc phách' (Zero-PII Redaction): Đã ẩn danh Họ tên thật, MSSV/MSHS, SĐT, Email trong nội dung bài nộp.")
    
    return redacted_text, alerts

def scan_injection(text: str) -> list[str]:
    """Trả về danh sách cảnh báo injection, rỗng nếu sạch."""
    alerts = []
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            alerts.append(f'Phát hiện nội dung có thể là prompt injection: pattern={pattern[:40]}...')
            break
    return alerts

def check_repetition(text: str, threshold: float = 0.20) -> dict:
    """
    Kiểm tra nội dung lặp lại quá ngưỡng.
    Ngưỡng 20% (giảm từ 30%).
    """
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 20]
    if len(sentences) < 5:
        return {'repetition_rate': 0.0, 'trigram_repetition_rate': 0.0, 'flagged': False}
    
    unique = set(sentences)
    repetition_rate = 1 - len(unique) / len(sentences)
    
    # 3-gram repetition check
    words = text.split()
    trigrams = [' '.join(words[i:i+3]) for i in range(len(words)-2)]
    unique_trigrams = set(trigrams)
    trigram_rep = 1 - len(unique_trigrams) / len(trigrams) if trigrams else 0
    
    flagged = repetition_rate > threshold or trigram_rep > 0.35
    
    return {
        'repetition_rate': round(repetition_rate, 3),
        'trigram_repetition_rate': round(trigram_rep, 3),
        'flagged': flagged
    }

def check_type_token_ratio(text: str, threshold: float = 0.25) -> bool:
    """Type-Token Ratio thấp = từ vựng nghèo = có thể keyword stuffing."""
    words = re.findall(r'\b\w+\b', text.lower())
    if len(words) < 50:
        return False
    ttr = len(set(words)) / len(words)
    return ttr < threshold
