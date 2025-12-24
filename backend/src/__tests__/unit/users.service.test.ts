import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { UsersService } from '../../modules/users/users.service';
import { db } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(() => {
    usersService = new UsersService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    const mockUserRow = {
      id: 'user-123',
      email: 'test@example.com',
      phone_number: '+966500000000',
      role: 'diver',
      status: 'active',
      preferred_language: 'en',
      email_verified_at: new Date(),
      last_login_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      profile_id: 'profile-123',
      first_name_en: 'John',
      first_name_ar: 'جون',
      last_name_en: 'Doe',
      last_name_ar: 'دو',
      date_of_birth: new Date('1990-01-15'),
      nationality: 'SA',
      experience_level: 'intermediate',
      total_logged_dives: 50,
      is_minor: false,
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '+966500000001',
    };

    it('should throw NotFoundError when user does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(usersService.findById('non-existent-id')).rejects.toThrow('not found');
    });

    it('should return user with profile when found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockUserRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.findById('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('diver');
      expect(result.profile).toBeDefined();
      expect(result.profile?.firstNameEn).toBe('John');
      expect(result.profile?.lastNameEn).toBe('Doe');
    });

    it('should return user without profile when profile is null', async () => {
      const userWithoutProfile = {
        ...mockUserRow,
        profile_id: null,
        first_name_en: null,
        last_name_en: null,
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [userWithoutProfile],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.findById('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.profile).toBeUndefined();
    });
  });

  describe('findByEmail', () => {
    it('should return null when user does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return user when found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          phone_number: '+966500000000',
          role: 'diver',
          status: 'active',
          preferred_language: 'en',
          created_at: new Date(),
          updated_at: new Date(),
          profile_id: 'profile-123',
          first_name_en: 'John',
          last_name_en: 'Doe',
          is_minor: false,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await usersService.findByEmail('TEST@EXAMPLE.COM');

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });
  });

  describe('update', () => {
    const existingUser = {
      id: 'user-123',
      email: 'test@example.com',
      phone_number: '+966500000000',
      role: 'diver',
      status: 'active',
      preferred_language: 'en',
      created_at: new Date(),
      updated_at: new Date(),
      profile_id: null,
    };

    it('should return existing user when no updates provided', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [existingUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.update('user-123', {});

      expect(result.id).toBe('user-123');
      // Only one query (findById), no update query
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should update phone number', async () => {
      // Mock update query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Mock findById after update
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...existingUser, phone_number: '+966500000001' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.update('user-123', {
        phoneNumber: '+966500000001',
      });

      expect(result.phoneNumber).toBe('+966500000001');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should update preferred language', async () => {
      // Mock update query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Mock findById after update
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...existingUser, preferred_language: 'ar' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.update('user-123', {
        preferredLanguage: 'ar',
      });

      expect(result.preferredLanguage).toBe('ar');
    });

    it('should update multiple fields', async () => {
      // Mock update query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Mock findById after update
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...existingUser, phone_number: '+966500000002', preferred_language: 'ar' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await usersService.update('user-123', {
        phoneNumber: '+966500000002',
        preferredLanguage: 'ar',
      });

      expect(result.phoneNumber).toBe('+966500000002');
      expect(result.preferredLanguage).toBe('ar');
    });
  });

  describe('deactivate', () => {
    it('should update user status to deactivated', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await usersService.deactivate('user-123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'deactivated'"),
        ['user-123']
      );
    });
  });
});
