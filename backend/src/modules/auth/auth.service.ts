import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { config } from '../../config';
import { UnauthorizedError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { generateToken, hashToken, calculateAge, isMinor } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { JwtPayload, User, UserRole } from '../../types';
import { RegisterDto, LoginDto } from './auth.validation';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResult> {
    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [dto.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Check if minor and validate parent email
    let userIsMinor = false;
    if (dto.dateOfBirth) {
      userIsMinor = isMinor(dto.dateOfBirth);
      if (userIsMinor && !dto.parentEmail) {
        throw new ValidationError('Parent/guardian email is required for users under 18');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user in transaction
    const result = await db.transaction(async (client) => {
      // Insert user
      const userResult = await client.query<{ id: string; email: string; role: UserRole; status: string; preferred_language: string; created_at: Date }>(
        `INSERT INTO users (email, phone_number, password_hash, role, preferred_language, status)
         VALUES ($1, $2, $3, $4, $5, 'pending_verification')
         RETURNING id, email, role, status, preferred_language, created_at`,
        [dto.email.toLowerCase(), dto.phoneNumber, passwordHash, dto.role, dto.preferredLanguage]
      );

      const user = userResult.rows[0];

      // Create profile based on role
      if (dto.role === 'diver' || dto.role === 'parent') {
        await client.query(
          `INSERT INTO diver_profiles (user_id, first_name_en, last_name_en, date_of_birth, is_minor)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, dto.firstName, dto.lastName, dto.dateOfBirth, userIsMinor]
        );
      } else if (dto.role === 'instructor') {
        await client.query(
          `INSERT INTO instructor_profiles (user_id, certification_agency, instructor_level)
           VALUES ($1, 'PENDING', 'PENDING')`,
          [user.id]
        );
        await client.query(
          `INSERT INTO diver_profiles (user_id, first_name_en, last_name_en, date_of_birth, is_minor)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, dto.firstName, dto.lastName, dto.dateOfBirth, false]
        );
      }

      return user;
    });

    // Generate verification token
    const verificationToken = generateToken();
    await db.query(
      `INSERT INTO verification_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'email_verification', NOW() + INTERVAL '24 hours')`,
      [result.id, hashToken(verificationToken)]
    );

    // TODO: Send verification email
    logger.info('Verification token generated', { userId: result.id, token: verificationToken });

    // Handle minor parent linking
    if (userIsMinor && dto.parentEmail) {
      // TODO: Send parent invitation email
      logger.info('Parent linking required', { userId: result.id, parentEmail: dto.parentEmail });
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      userId: result.id,
      role: result.role as UserRole,
      email: result.email,
      isMinor: userIsMinor,
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        phoneNumber: dto.phoneNumber,
        role: result.role as UserRole,
        status: result.status as 'pending_verification',
        preferredLanguage: result.preferred_language,
        createdAt: result.created_at,
        updatedAt: result.created_at,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    // Find user
    const result = await db.query<{
      id: string;
      email: string;
      password_hash: string;
      role: UserRole;
      status: string;
      preferred_language: string;
      phone_number: string;
      failed_login_attempts: number;
      locked_until: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, email, password_hash, role, status, preferred_language, phone_number,
              failed_login_attempts, locked_until, created_at, updated_at
       FROM users WHERE email = $1`,
      [dto.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new UnauthorizedError('Account temporarily locked. Please try again later.');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      // Increment failed attempts
      await db.query(
        `UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
         WHERE id = $1`,
        [user.id]
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account suspended. Please contact support.');
    }

    if (user.status === 'deactivated') {
      throw new UnauthorizedError('Account deactivated');
    }

    // Check if minor needs parent consent
    const profileResult = await db.query<{ is_minor: boolean }>(
      'SELECT is_minor FROM diver_profiles WHERE user_id = $1',
      [user.id]
    );
    const isMinorUser = profileResult.rows[0]?.is_minor || false;

    if (isMinorUser) {
      const consentResult = await db.query(
        `SELECT id FROM parent_guardian_links
         WHERE minor_user_id = $1 AND consent_given_at IS NOT NULL AND is_active = true`,
        [user.id]
      );
      if (consentResult.rows.length === 0) {
        throw new UnauthorizedError('Parent consent required. Please ask your parent/guardian to approve your account.');
      }
    }

    // Reset failed attempts and update last login
    await db.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate tokens
    const tokens = await this.generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
      isMinor: isMinorUser,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        status: user.status as 'active' | 'pending_verification' | 'suspended' | 'deactivated',
        preferredLanguage: user.preferred_language,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in database and not revoked
    const tokenHash = hashToken(refreshToken);
    const tokenResult = await db.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const userResult = await db.query<{ id: string; email: string; role: UserRole; status: string }>(
      'SELECT id, email, role, status FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      throw new UnauthorizedError('User not found or inactive');
    }

    const user = userResult.rows[0];

    // Revoke old refresh token
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [tokenResult.rows[0].id]);

    // Get minor status
    const profileResult = await db.query<{ is_minor: boolean }>(
      'SELECT is_minor FROM diver_profiles WHERE user_id = $1',
      [user.id]
    );

    // Generate new tokens
    return this.generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
      isMinor: profileResult.rows[0]?.is_minor || false,
    });
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [userId]);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const result = await db.query<{ user_id: string }>(
      `SELECT user_id FROM verification_tokens
       WHERE token_hash = $1 AND token_type = 'email_verification'
       AND expires_at > NOW() AND used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    await db.transaction(async (client) => {
      await client.query(
        'UPDATE users SET email_verified_at = NOW(), status = $1 WHERE id = $2',
        ['active', result.rows[0].user_id]
      );
      await client.query(
        'UPDATE verification_tokens SET used_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const result = await db.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    const resetToken = generateToken();
    await db.query(
      `INSERT INTO verification_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '1 hour')`,
      [result.rows[0].id, hashToken(resetToken)]
    );

    // TODO: Send password reset email
    logger.info('Password reset token generated', { userId: result.rows[0].id, token: resetToken });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const result = await db.query<{ user_id: string }>(
      `SELECT user_id FROM verification_tokens
       WHERE token_hash = $1 AND token_type = 'password_reset'
       AND expires_at > NOW() AND used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.transaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, result.rows[0].user_id]);
      await client.query('UPDATE verification_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);
      // Revoke all refresh tokens
      await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [result.rows[0].user_id]);
    });
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresInMs / 1000,
    });

    const refreshToken = jwt.sign({ userId: payload.userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresInMs / 1000,
    });

    // Store refresh token in database
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [payload.userId, hashToken(refreshToken)]
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiresInMs / 1000,
    };
  }
}

export const authService = new AuthService();
