import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/helpers';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './auth.validation';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterDto;
    const result = await authService.register(dto);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginDto;
    const result = await authService.login(dto);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (req.user && refreshToken) {
      await authService.logout(req.user.userId, refreshToken);
    }

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (req.user) {
      await authService.logoutAllDevices(req.user.userId);
    }

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken || (req.body as RefreshTokenDto).refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token required' },
      });
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);

    // Set new refresh token as cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as VerifyEmailDto;
    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as ForgotPasswordDto;
    await authService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body as ResetPasswordDto;
    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  });

  me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        userId: req.user?.userId,
        email: req.user?.email,
        role: req.user?.role,
        isMinor: req.user?.isMinor,
      },
    });
  });
}

export const authController = new AuthController();
