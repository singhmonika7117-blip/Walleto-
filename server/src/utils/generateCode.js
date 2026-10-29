const crypto = require('crypto');

/**
 * Generates a unique, readable shareable invitation code (e.g., 'SPLT-8X2A')
 * @param {string} prefix - Optional code prefix (default: 'SPLT')
 * @param {number} randomLength - Length of random characters (default: 4)
 * @returns {string} - Formatted shareable invitation code
 */
const generateCode = (prefix = 'SPLT', randomLength = 4) => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes ambiguous characters (0, O, 1, I)
  let randomPart = '';
  const bytes = crypto.randomBytes(randomLength);

  for (let i = 0; i < randomLength; i++) {
    randomPart += chars[bytes[i] % chars.length];
  }

  return `${prefix}-${randomPart}`;
};

module.exports = generateCode;
