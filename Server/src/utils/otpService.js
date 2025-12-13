import crypto from 'crypto';
import logger from '../config/logger.js';

class OtpService {
  /**
   * Generate a 6-digit OTP code
   * @returns {string} 6-digit OTP code
   */
  generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP code for secure storage
   * @param {string} otpCode - Plain text OTP code
   * @returns {string} Hashed OTP code
   */
  hashOtp(otpCode) {
    return crypto
      .createHash('sha256')
      .update(otpCode)
      .digest('hex');
  }

  /**
   * Verify OTP code against hashed stored code
   * @param {string} enteredOtp - OTP code entered by user
   * @param {string} hashedOtp - Hashed OTP stored in database
   * @returns {boolean} True if OTP matches
   */
  verifyOtp(enteredOtp, hashedOtp) {
    const hashedEntered = this.hashOtp(enteredOtp);
    return hashedEntered === hashedOtp;
  }

  /**
   * Check if OTP has expired
   * @param {Date} otpExpire - OTP expiration timestamp
   * @returns {boolean} True if expired
   */
  isOtpExpired(otpExpire) {
    if (!otpExpire) return true;
    return Date.now() > otpExpire.getTime();
  }

  /**
   * Get OTP expiration time in minutes
   * @param {Date} otpExpire - OTP expiration timestamp
   * @returns {number} Minutes remaining (0 if expired)
   */
  getOtpTimeRemaining(otpExpire) {
    if (!otpExpire) return 0;
    const remaining = Math.max(0, otpExpire.getTime() - Date.now());
    return Math.ceil(remaining / 60000); // Convert to minutes
  }

  /**
   * Check if user has exceeded OTP attempt limits
   * @param {number} otpAttempts - Current number of failed attempts
   * @param {number} maxAttempts - Maximum allowed attempts (default: 3)
   * @returns {boolean} True if attempts exceeded
   */
  isOtpAttemptsExceeded(otpAttempts, maxAttempts = 3) {
    return otpAttempts >= maxAttempts;
  }

  /**
   * Calculate cooldown period for OTP resend
   * @param {Date} lastOtpSentAt - Timestamp of last OTP sent
   * @param {number} cooldownSeconds - Cooldown period in seconds (default: 30)
   * @returns {object} { canResend: boolean, remainingSeconds: number }
   */
  checkResendCooldown(lastOtpSentAt, cooldownSeconds = 30) {
    if (!lastOtpSentAt) {
      return { canResend: true, remainingSeconds: 0 };
    }

    const elapsedSeconds = Math.floor((Date.now() - lastOtpSentAt.getTime()) / 1000);
    const remaining = Math.max(0, cooldownSeconds - elapsedSeconds);

    return {
      canResend: remaining === 0,
      remainingSeconds: remaining,
    };
  }

  /**
   * Log OTP activity for security audit
   * @param {string} userId - User ID
   * @param {string} action - Action type (sent, verified, failed, etc.)
   * @param {object} metadata - Additional metadata
   */
  logOtpActivity(userId, action, metadata = {}) {
    logger.info(`OTP Activity - User: ${userId}, Action: ${action}`, {
      userId,
      action,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}

export default new OtpService();
