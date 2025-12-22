/**
 * @openapi
 * /centers:
 *   get:
 *     tags: [Centers]
 *     summary: List diving centers
 *     description: Get a paginated list of diving centers with optional filters
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: city
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - name: region
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by region
 *       - name: verified
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - name: rating
 *         in: query
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by name
 *       - name: lat
 *         in: query
 *         schema:
 *           type: number
 *         description: Latitude for distance-based search
 *       - name: lng
 *         in: query
 *         schema:
 *           type: number
 *         description: Longitude for distance-based search
 *       - name: radius
 *         in: query
 *         schema:
 *           type: number
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Centers retrieved
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
 *                     $ref: '#/components/schemas/DivingCenter'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *
 *   post:
 *     tags: [Centers]
 *     summary: Create diving center
 *     description: Register a new diving center (requires center_owner role)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, address, city, region, srsaLicenseNumber]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Red Sea Divers"
 *               nameAr:
 *                 type: string
 *                 example: "غواصي البحر الأحمر"
 *               description:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *                 example: "Jeddah"
 *               region:
 *                 type: string
 *                 example: "Makkah"
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               srsaLicenseNumber:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Center created (pending verification)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DivingCenter'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /centers/{id}:
 *   get:
 *     tags: [Centers]
 *     summary: Get center details
 *     description: Retrieve detailed information about a diving center
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Center details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/DivingCenter'
 *                     - type: object
 *                       properties:
 *                         vessels:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Vessel'
 *                         upcomingTrips:
 *                           type: integer
 *                         services:
 *                           type: array
 *                           items:
 *                             type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     tags: [Centers]
 *     summary: Update center
 *     description: Update diving center information (owner only)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Center updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DivingCenter'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /centers/{centerId}/vessels:
 *   get:
 *     tags: [Centers]
 *     summary: List center vessels
 *     description: Get all vessels registered to a diving center
 *     parameters:
 *       - name: centerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vessels retrieved
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
 *                     $ref: '#/components/schemas/Vessel'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   post:
 *     tags: [Centers]
 *     summary: Add vessel
 *     description: Register a new vessel to the diving center
 *     parameters:
 *       - name: centerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, registrationNumber, capacity, vesselType]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sea Explorer"
 *               registrationNumber:
 *                 type: string
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 20
 *               vesselType:
 *                 type: string
 *                 example: "speedboat"
 *               hasOxygen:
 *                 type: boolean
 *                 default: true
 *               hasFirstAid:
 *                 type: boolean
 *                 default: true
 *               hasRadio:
 *                 type: boolean
 *                 default: true
 *               lastInspectionDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Vessel added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vessel'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /centers/{centerId}/staff:
 *   get:
 *     tags: [Centers]
 *     summary: List center staff
 *     description: Get all staff members of a diving center
 *     parameters:
 *       - name: centerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff retrieved
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         $ref: '#/components/schemas/UUID'
 *                       userId:
 *                         $ref: '#/components/schemas/UUID'
 *                       role:
 *                         type: string
 *                         enum: [instructor, divemaster, captain, staff]
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *
 *   post:
 *     tags: [Centers]
 *     summary: Add staff member
 *     description: Add a user as staff to the diving center
 *     parameters:
 *       - name: centerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, role]
 *             properties:
 *               userId:
 *                 $ref: '#/components/schemas/UUID'
 *               role:
 *                 type: string
 *                 enum: [instructor, divemaster, captain, staff]
 *     responses:
 *       201:
 *         description: Staff member added
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /sites:
 *   get:
 *     tags: [Sites]
 *     summary: List dive sites
 *     description: Get all available dive sites
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: regionId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by region
 *       - name: difficulty
 *         in: query
 *         schema:
 *           type: string
 *           enum: [easy, moderate, difficult, expert]
 *       - name: maxDepth
 *         in: query
 *         schema:
 *           type: number
 *         description: Maximum depth filter
 *     responses:
 *       200:
 *         description: Sites retrieved
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
 *                     $ref: '#/components/schemas/DiveSite'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *
 * /sites/{id}:
 *   get:
 *     tags: [Sites]
 *     summary: Get site details
 *     description: Retrieve detailed information about a dive site
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Site details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/DiveSite'
 *                     - type: object
 *                       properties:
 *                         photos:
 *                           type: array
 *                           items:
 *                             type: string
 *                         marineLife:
 *                           type: array
 *                           items:
 *                             type: string
 *                         currentConditions:
 *                           type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /regions:
 *   get:
 *     tags: [Sites]
 *     summary: List regions
 *     description: Get all diving regions
 *     security: []
 *     responses:
 *       200:
 *         description: Regions retrieved
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         $ref: '#/components/schemas/UUID'
 *                       name:
 *                         type: string
 *                         example: "Red Sea - Jeddah"
 *                       nameAr:
 *                         type: string
 *                       siteCount:
 *                         type: integer
 */

export {};
