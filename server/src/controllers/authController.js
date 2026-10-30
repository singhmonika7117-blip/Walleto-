const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'split_app_super_secret_jwt_key_2026_xyz', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

/**
 * Send Token via httpOnly Cookie + JSON response (Dual Auth Mode)
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        defaultCurrency: user.defaultCurrency || 'INR'
      }
    });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw Object.assign(new Error('Password reset email is not configured on the server.'), {
      statusCode: 503
    });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Reset your Walleto password',
      html: `<p>We received a request to reset your Walleto password.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
    })
  });

  if (!response.ok) {
    throw Object.assign(new Error('The password reset email could not be sent. Check the email service configuration.'), {
      statusCode: 502
    });
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, defaultCurrency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email address' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      defaultCurrency: defaultCurrency || 'INR'
    });

    // Keep demo funds in local development; production accounts start at zero.
    await Wallet.create({
      userId: user._id,
      totalBalance: process.env.NODE_ENV === 'production' ? 0 : 2000,
      currency: user.defaultCurrency || 'INR'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'No Walleto account is registered with that email. Check the address or create an account.'
      });
    }

    const isMatch = await user.matchPassword(String(password));
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        message: 'That password does not match this account. Try again or use Forgot password.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/** Request a one-time password reset email without revealing whether an account exists. */
const forgotPassword = async (req, res, next) => {
  try {
    const cleanEmail = String(req.body.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Please provide your email address.' });
    }

    const user = await User.findOne({ email: cleanEmail }).select('+passwordResetToken +passwordResetExpires');
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const appOrigin = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
        .split(',')[0].trim().replace(/\/$/, '');
      if (!appOrigin) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        throw Object.assign(new Error('The website URL is not configured on the server.'), { statusCode: 503 });
      }

      const resetUrl = new URL('/auth/reset-password', appOrigin);
      resetUrl.searchParams.set('token', rawToken);
      try {
        await sendPasswordResetEmail(user.email, resetUrl.toString());
      } catch (emailError) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        throw emailError;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

/** Set a new password using a single-use, expiring reset token. */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Use a valid reset link and a password of at least 6 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired. Request a new one.' });
    }

    user.password = String(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user & token verification
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const personalWallet = await Wallet.findOne({ userId: req.user.id });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        defaultCurrency: user.defaultCurrency || 'INR',
        personalBalance: personalWallet ? personalWallet.totalBalance : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, defaultCurrency } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (defaultCurrency) user.defaultCurrency = defaultCurrency;

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        defaultCurrency: user.defaultCurrency
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  updateProfile
};
