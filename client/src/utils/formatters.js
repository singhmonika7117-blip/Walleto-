/**
 * Format a number as currency (supports INR, USD, EUR, etc.)
 * @param {number} amount
 * @param {string} currency
 * @returns {string} e.g. "₹124.50" or "$124.50"
 */
export const formatCurrency = (amount = 0, currency = 'INR') => {
  const num = Number(amount);
  const validNum = isNaN(num) ? 0 : num;

  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(validNum);
  } catch (err) {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${validNum.toFixed(2)}`;
  }
};

/**
 * Format date to human readable string (e.g. "Oct 18, 2026")
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

/**
 * Format relative time (e.g. "5m ago", "2h ago", "yesterday")
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return formatDate(dateString);
};

/**
 * Truncate long text with ellipsis
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};
