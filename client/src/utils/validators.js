/**
 * Form input validators
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'Invalid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};

export const validateAmount = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 'Amount must be greater than zero';
  return null;
};

export const validateInviteCode = (code) => {
  if (!code || !code.trim()) return 'Invite code is required';
  if (code.trim().length !== 6) return 'Invite code must be 6 characters';
  return null;
};
