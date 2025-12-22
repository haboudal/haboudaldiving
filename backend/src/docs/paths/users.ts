/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Ahmed"
 *               lastName:
 *                 type: string
 *                 example: "Al-Rashid"
 *               phone:
 *                 type: string
 *                 example: "+966501234567"
 *               preferredLanguage:
 *                 type: string
 *                 enum: [en, ar]
 *                 example: "ar"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change password
 *     description: Change the authenticated user's password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass456!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or new password too weak
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /divers/{id}/profile:
 *   get:
 *     tags: [Divers]
 *     summary: Get diver profile
 *     description: Retrieve a diver's detailed profile including experience and medical info
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Diver profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DiverProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     tags: [Divers]
 *     summary: Update diver profile
 *     description: Update a diver's profile information
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               experienceLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, professional]
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               medicalConditions:
 *                 type: string
 *               insuranceProvider:
 *                 type: string
 *               insurancePolicyNumber:
 *                 type: string
 *               insuranceExpiryDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /divers/{id}/certifications:
 *   get:
 *     tags: [Divers]
 *     summary: List diver certifications
 *     description: Retrieve all certifications for a diver
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Certifications retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certification'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags: [Divers]
 *     summary: Add certification
 *     description: Add a new certification to a diver's profile
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agency, level, certificationNumber, issueDate]
 *             properties:
 *               agency:
 *                 type: string
 *                 enum: [PADI, SSI, NAUI, CMAS, BSAC, SDI, TDI]
 *                 example: "PADI"
 *               level:
 *                 type: string
 *                 example: "Advanced Open Water"
 *               certificationNumber:
 *                 type: string
 *                 example: "PADI-12345678"
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               documentUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Certification added (pending verification)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /instructors/{id}/profile:
 *   get:
 *     tags: [Instructors]
 *     summary: Get instructor profile
 *     description: Retrieve an instructor's detailed profile
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Instructor profile retrieved
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
 *                     id:
 *                       $ref: '#/components/schemas/UUID'
 *                     userId:
 *                       $ref: '#/components/schemas/UUID'
 *                     instructorNumber:
 *                       type: string
 *                     specialties:
 *                       type: array
 *                       items:
 *                         type: string
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     yearsExperience:
 *                       type: integer
 *                     bio:
 *                       type: string
 *                     rating:
 *                       type: number
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /guardians/consent:
 *   post:
 *     tags: [Guardians]
 *     summary: Provide consent for minor
 *     description: Parent/guardian provides consent for a minor to use the platform
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
 *                 description: Consent token from email
 *     responses:
 *       200:
 *         description: Consent provided successfully
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
 *                   example: "Consent provided. Minor can now login."
 *       400:
 *         description: Invalid or expired token
 *
 * /guardians/minors:
 *   get:
 *     tags: [Guardians]
 *     summary: List linked minors
 *     description: Get all minors linked to the authenticated guardian
 *     responses:
 *       200:
 *         description: Minors retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

export {};
