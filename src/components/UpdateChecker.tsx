'use client';

import { useEffect, useState } from 'react';

const APP_VERSION = '1.0.0';
const GITHUB_REPO = 'insushim/brainferry';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function UpdateChecker() {
  const [update, setUpdate] = useState<{
    version: string;
    url: string;
    apkUrl: string | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isStandaloneMode()) return;

    async function checkForUpdate() {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (!res.ok) return;

        const data: ReleaseInfo = await res.json();
        const latestVersion = data.tag_name;

        if (compareVersions(latestVersion, APP_VERSION) > 0) {
          const apkAsset = data.assets.find((a) => a.name.endsWith('.apk'));
          setUpdate({
            version: latestVersion,
            url: data.html_url,
            apkUrl: apkAsset?.browser_download_url ?? null,
          });
        }
      } catch {
        // Silently fail - update check is non-critical
      }
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!update || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1E293B, #334155)',
        border: '1px solid #475569',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        maxWidth: 'calc(100vw - 2rem)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#E2E8F0',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          새 버전 {update.version} 출시
        </div>
        <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
          업데이트하여 새로운 기능을 확인하세요
        </div>
      </div>
      <a
        href={update.apkUrl ?? update.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#3B82F6',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        업데이트 다운로드
      </a>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: '0.25rem',
          fontSize: '1.25rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="닫기"
      >
        &times;
      </button>
    </div>
  );
}
