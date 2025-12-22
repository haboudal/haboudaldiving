/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: |
 *       Create a new user account. For minors (under 18), a parent email is required
 *       and the minor cannot login until the parent provides consent.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           examples:
 *             adult:
 *               summary: Adult registration
 *               value:
 *                 email: "diver@example.com"
 *                 password: "SecurePass123!"
 *                 firstName: "Ahmed"
 *                 lastName: "Al-Rashid"
 *                 role: "diver"
 *                 dateOfBirth: "1990-01-15"
 *                 phone: "+966501234567"
 *             minor:
 *               summary: Minor registration (requires parent)
 *               value:
 *                 email: "youngdiver@example.com"
 *                 password: "SecurePass123!"
 *                 firstName: "Youssef"
 *                 lastName: "Al-Rashid"
 *                 role: "diver"
 *                 dateOfBirth: "2012-05-20"
 *                 parentEmail: "parent@example.com"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     message:
 *                       type: string
 *                       example: "Verification email sent"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login to account
 *     description: |
 *       Authenticate with email and password. Returns access token (15 min) and
 *       sets refresh token as HTTP-only cookie (7 days).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HTTP-only refresh token cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account not verified or minor without consent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from account
 *     description: Invalidate refresh token and clear cookie
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: |
 *       Exchange a valid refresh token for a new access token.
 *       The refresh token is read from the HTTP-only cookie.
 *     security: []
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 900
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email address
 *     description: Confirm email ownership using the token sent via email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Verification token from email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: |
 *       Send password reset email. For security, always returns success
 *       even if the email doesn't exist.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If an account exists, a reset email has been sent"
 *
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     description: Set a new password using the reset token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     description: Request a new verification email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       429:
 *         description: Too many requests
 */

export {};
