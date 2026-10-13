import os
import hmac
from fastapi import Request
import logging

logger = logging.getLogger(__name__)

def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    internal_token = request.headers.get("X-Internal-Token", "")
    
    TRUST_PROXY_HOPS = 0
    try:
        TRUST_PROXY_HOPS = int(os.getenv('ML_TRUST_PROXY_HOPS', '1'))
    except ValueError:
        TRUST_PROXY_HOPS = 0
        
    INTERNAL_TOKEN = os.getenv('INTERNAL_TOKEN')
    is_trusted = False
    
    if INTERNAL_TOKEN and internal_token:
        is_trusted = hmac.compare_digest(internal_token.encode('utf-8'), INTERNAL_TOKEN.encode('utf-8'))
        
    if is_trusted and forwarded and TRUST_PROXY_HOPS > 0:
        ips = [ip.strip() for ip in forwarded.split(',')]
        if len(ips) >= TRUST_PROXY_HOPS:
            ip = ips[-TRUST_PROXY_HOPS]
            if ip.startswith("::ffff:"):
                return ip[7:]
            return ip
            
    # Fallback if not trusted, no header, or not enough hops
    ip = request.client.host if request.client else "127.0.0.1"
    if ip.startswith("::ffff:"):
        return ip[7:]
    return ip
