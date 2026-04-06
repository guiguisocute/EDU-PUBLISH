export type TimeWindowState = 'none' | 'upcoming' | 'active' | 'expired';

export const getTimeWindowState = (
  startAt?: string,
  endAt?: string,
  nowTs = Date.now()
): { state: TimeWindowState; progress: number } => {
  if (!startAt || !endAt) return { state: 'none', progress: 0 };
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { state: 'none', progress: 0 };
  if (nowTs < start) return { state: 'upcoming', progress: 0 };
  if (nowTs > end) return { state: 'expired', progress: 100 };
  const progress = Math.max(0, Math.min(100, ((nowTs - start) / (end - start)) * 100));
  return { state: 'active', progress };
};

export const formatTimestamp = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const getCountdownText = (endAt?: string, nowTs = Date.now()): string => {
  if (!endAt) return '';
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(end)) return '';
  const remain = Math.max(0, end - nowTs);
  const totalSeconds = Math.floor(remain / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分`;
  if (totalSeconds < 600) {
    if (minutes > 0) return `${minutes}分${seconds}秒`;
    return `${seconds}秒`;
  }
  return `${Math.max(1, minutes)}分钟`;
};
