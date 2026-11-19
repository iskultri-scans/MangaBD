'use client';

import React, { useState } from 'react';
import { Facebook, MessageCircle, Copy, Check, Send, Share2, Link as LinkIcon } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

interface ShareButtonsProps {
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
}

export function ShareButtons({ title, slug, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showUrlField, setShowUrlField] = useState(false);
  const pageUrl = `${SITE_CONFIG.url}/manga/${slug}`;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const facebookShareUrl = `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} — ${pageUrl}`)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(title + (description ? `\n\n${description.slice(0, 200)}` : ''))}`;

  const copyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pageUrl);
        setCopied(true);
        showToast('Link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // Clipboard API fallback below
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = pageUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, pageUrl.length);
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        showToast('Link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        setShowUrlField(true);
        showToast('Please copy the link below.', 'error');
      }
    } catch {
      setShowUrlField(true);
      showToast('Please copy the link below.', 'error');
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || `Read ${title} on MangaBD`,
          url: pageUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') {
          setShowUrlField(true);
        }
      }
    } else {
      setShowUrlField(!showUrlField);
    }
  };

  const iconBtnStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mr-1">
          Share
        </span>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={nativeShare}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            style={iconBtnStyle}
            aria-label="Share via native menu"
          >
            <Share2 size={16} />
          </button>
        )}

        <a
          href={facebookShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          style={iconBtnStyle}
          aria-label="Share on Facebook"
        >
          <Facebook size={16} />
        </a>

        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          style={iconBtnStyle}
          aria-label="Share on WhatsApp"
        >
          <MessageCircle size={16} />
        </a>

        <a
          href={telegramShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          style={iconBtnStyle}
          aria-label="Share on Telegram"
        >
          <Send size={16} />
        </a>

        <button
          type="button"
          onClick={copyLink}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          style={iconBtnStyle}
          aria-label="Copy link"
        >
          {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>

        <a
          href={SITE_CONFIG.social.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Send size={13} />
          Telegram Channel
        </a>
      </div>

      {showUrlField && (
        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <LinkIcon size={14} className="text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            readOnly
            value={pageUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-transparent text-xs text-[var(--text-secondary)] outline-none min-w-0"
          />
        </div>
      )}

      {toastMsg && (
        <p className={`text-xs font-medium ${toastType === 'success' ? 'text-emerald-500' : 'text-[var(--accent)]'}`}>
          {toastMsg}
        </p>
      )}
    </div>
  );
}
