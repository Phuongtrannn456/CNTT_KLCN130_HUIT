import React, { useState } from 'react';
import { Typography, Tag, Button, message } from 'antd';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

/**
 * Lightweight, zero-dependency Markdown & Code Viewer for AI Copilot
 * Supports: Headings, Bold, Italic, Code blocks with Copy, Lists, Blockquotes, Action Links
 */
const MarkdownViewer = ({ content }) => {
  const navigate = useNavigate();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!content) return null;

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    message.success('Đã sao chép đoạn mã!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Tách nội dung thành các khối (code blocks vs regular paragraphs)
  const blocks = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = '';
  let textBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Kết thúc code block
        blocks.push({
          type: 'code',
          language: codeLanguage || 'text',
          content: codeBuffer.join('\n')
        });
        codeBuffer = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Bắt đầu code block
        if (textBuffer.length > 0) {
          blocks.push({ type: 'text', content: textBuffer.join('\n') });
          textBuffer = [];
        }
        codeLanguage = line.replace('```', '').trim();
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  if (textBuffer.length > 0) {
    blocks.push({ type: 'text', content: textBuffer.join('\n') });
  }
  if (codeBuffer.length > 0) {
    blocks.push({ type: 'code', language: codeLanguage || 'text', content: codeBuffer.join('\n') });
  }

  // Hàm render inline format: **in đậm**, *nghiêng*, `code`, [Link](/path)
  const renderInline = (str) => {
    const parts = [];
    let remaining = str;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Link / Action button: [Text](url)
      const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);
      // 2. Bold: **text**
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      // 3. Inline code: `code`
      const codeMatch = remaining.match(/`(.*?)`/);

      // Tìm vị trí khớp đầu tiên
      const matches = [
        linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index } : null,
        codeMatch ? { type: 'inline-code', match: codeMatch, index: codeMatch.index } : null
      ].filter(Boolean).sort((a, b) => a.index - b.index);

      if (matches.length === 0) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      const first = matches[0];
      if (first.index > 0) {
        parts.push(<span key={keyIdx++}>{remaining.substring(0, first.index)}</span>);
      }

      if (first.type === 'link') {
        const linkText = first.match[1];
        const linkUrl = first.match[2];
        const isInternal = linkUrl.startsWith('/');
        parts.push(
          <Tag
            key={keyIdx++}
            color="purple"
            style={{
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 8px',
              borderRadius: 6,
              margin: '2px 3px'
            }}
            onClick={() => {
              if (isInternal) {
                navigate(linkUrl);
              } else {
                window.open(linkUrl, '_blank');
              }
            }}
          >
            {linkText}
            <ExternalLink size={11} />
          </Tag>
        );
      } else if (first.type === 'bold') {
        parts.push(<strong key={keyIdx++} style={{ fontWeight: 700, color: '#141414' }}>{first.match[1]}</strong>);
      } else if (first.type === 'inline-code') {
        parts.push(
          <code
            key={keyIdx++}
            style={{
              background: '#f0f0f5',
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '0.9em',
              color: '#d4380d',
              border: '1px solid #e8e8e8'
            }}
          >
            {first.match[1]}
          </code>
        );
      }

      remaining = remaining.substring(first.index + first.match[0].length);
    }

    return parts;
  };

  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#262626' }}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <div
              key={bIdx}
              style={{
                background: '#1e1e1e',
                borderRadius: 8,
                margin: '10px 0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#2d2d2d',
                  padding: '4px 12px',
                  fontSize: 11,
                  color: '#aaa',
                  borderBottom: '1px solid #333'
                }}
              >
                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{block.language || 'code'}</span>
                <Button
                  type="text"
                  size="small"
                  icon={copiedIndex === bIdx ? <Check size={12} color="#52c41a" /> : <Copy size={12} color="#ddd" />}
                  onClick={() => handleCopyCode(block.content, bIdx)}
                  style={{ color: '#ddd', fontSize: 11, height: 22, padding: '0 6px' }}
                >
                  {copiedIndex === bIdx ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 14px',
                  color: '#e6edf3',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  fontSize: 12.5,
                  overflowX: 'auto',
                  lineHeight: 1.5
                }}
              >
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        // Render regular lines
        const linesOfText = block.content.split('\n');
        return (
          <div key={bIdx}>
            {linesOfText.map((line, lIdx) => {
              const trimmed = line.trim();

              if (!trimmed) {
                return <div key={lIdx} style={{ height: 6 }} />;
              }

              // Heading 3
              if (trimmed.startsWith('### ')) {
                return (
                  <div
                    key={lIdx}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#722ed1',
                      marginTop: 10,
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {renderInline(trimmed.replace('### ', ''))}
                  </div>
                );
              }

              // Heading 2
              if (trimmed.startsWith('## ')) {
                return (
                  <div
                    key={lIdx}
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#1d39c4',
                      marginTop: 12,
                      marginBottom: 6
                    }}
                  >
                    {renderInline(trimmed.replace('## ', ''))}
                  </div>
                );
              }

              // Bullet item: * hoặc -
              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                  <div key={lIdx} style={{ display: 'flex', gap: 6, margin: '3px 0', paddingLeft: 6 }}>
                    <span style={{ color: '#722ed1', fontWeight: 'bold' }}>•</span>
                    <div style={{ flex: 1 }}>{renderInline(trimmed.substring(2))}</div>
                  </div>
                );
              }

              // Numbered list item: 1. 2. 3.
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} style={{ display: 'flex', gap: 6, margin: '3px 0', paddingLeft: 6 }}>
                    <span style={{ color: '#1677ff', fontWeight: 700, minWidth: 18 }}>{numMatch[1]}.</span>
                    <div style={{ flex: 1 }}>{renderInline(numMatch[2])}</div>
                  </div>
                );
              }

              // Blockquote: >
              if (trimmed.startsWith('> ')) {
                return (
                  <div
                    key={lIdx}
                    style={{
                      borderLeft: '3px solid #722ed1',
                      paddingLeft: 10,
                      margin: '6px 0',
                      color: '#595959',
                      background: '#f9f0ff',
                      padding: '4px 10px',
                      borderRadius: '0 6px 6px 0'
                    }}
                  >
                    {renderInline(trimmed.substring(2))}
                  </div>
                );
              }

              return (
                <div key={lIdx} style={{ margin: '2px 0' }}>
                  {renderInline(line)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownViewer;
