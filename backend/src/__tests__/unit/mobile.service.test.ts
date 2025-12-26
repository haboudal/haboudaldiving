import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Use correct relative path for the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { DevicesService } from '../../modules/mobile/devices/devices.service';
import { db } from '../../config/database';

describe('DevicesService', () => {
  let devicesService: DevicesService;

  beforeEach(() => {
    devicesService = new DevicesService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should register a new device', async () => {
      const mockDevice = {
        id: 'device-123',
        user_id: 'user-123',
        device_identifier: 'iPhone-ABC123',
        device_type: 'ios',
        device_name: 'John\'s iPhone',
        os_version: '17.2',
        app_version: '1.0.0',
        model: 'iPhone 15 Pro',
        push_token: 'fcm-token-123',
        push_token_type: 'fcm',
        push_enabled: true,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockDevice],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.register('user-123', {
        deviceIdentifier: 'iPhone-ABC123',
        deviceType: 'ios',
        deviceName: 'John\'s iPhone',
        osVersion: '17.2',
        appVersion: '1.0.0',
        model: 'iPhone 15 Pro',
        pushToken: 'fcm-token-123',
        pushTokenType: 'fcm',
      });

      expect(result.id).toBe('device-123');
      expect(result.deviceType).toBe('ios');
      expect(result.pushToken).toBe('fcm-token-123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });

    it('should update existing device on conflict', async () => {
      const mockDevice = {
        id: 'device-123',
        user_id: 'user-123',
        device_identifier: 'iPhone-ABC123',
        device_type: 'ios',
        app_version: '1.1.0',
        push_token: 'new-fcm-token',
        push_token_type: 'fcm',
        push_enabled: true,
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockDevice],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.register('user-123', {
        deviceIdentifier: 'iPhone-ABC123',
        deviceType: 'ios',
        appVersion: '1.1.0',
        pushToken: 'new-fcm-token',
        pushTokenType: 'fcm',
      });

      expect(result.appVersion).toBe('1.1.0');
      expect(result.pushToken).toBe('new-fcm-token');
    });
  });

  describe('findByUser', () => {
    it('should return all active devices for user', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          user_id: 'user-123',
          device_identifier: 'iPhone-ABC123',
          device_type: 'ios',
          is_active: true,
          push_enabled: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'device-2',
          user_id: 'user-123',
          device_identifier: 'Pixel-XYZ789',
          device_type: 'android',
          is_active: true,
          push_enabled: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockDevices,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.findByUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].deviceType).toBe('ios');
      expect(result[1].deviceType).toBe('android');
    });
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      const mockDevice = {
        id: 'device-123',
        user_id: 'user-123',
        device_identifier: 'iPhone-ABC123',
        device_type: 'ios',
        is_active: true,
        push_enabled: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockDevice],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.findById('device-123');

      expect(result.id).toBe('device-123');
    });

    it('should throw NotFoundError when device does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(devicesService.findById('non-existent')).rejects.toThrow('Device');
    });
  });

  describe('update', () => {
    it('should throw ForbiddenError if user does not own device', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        devicesService.update('device-123', 'user-123', { pushEnabled: false })
      ).rejects.toThrow('Not authorized');
    });

    it('should update device properties', async () => {
      // Verify ownership
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'device-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Find by ID (for return)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'device-123',
          user_id: 'user-123',
          device_identifier: 'iPhone-ABC123',
          device_type: 'ios',
          app_version: '1.2.0',
          push_enabled: false,
          is_active: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.update('device-123', 'user-123', {
        appVersion: '1.2.0',
        pushEnabled: false,
      });

      expect(result.appVersion).toBe('1.2.0');
      expect(result.pushEnabled).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should deactivate device and clear push token', async () => {
      // Verify ownership
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'device-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Deactivate query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(devicesService.deactivate('device-123', 'user-123')).resolves.toBeUndefined();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = FALSE'),
        expect.any(Array)
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('push_token = NULL'),
        expect.any(Array)
      );
    });
  });

  describe('recordActivity', () => {
    it('should update last_used_at timestamp', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await devicesService.recordActivity('device-123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('last_used_at = NOW()'),
        ['device-123']
      );
    });
  });

  describe('getActiveDevicesWithPush', () => {
    it('should return only devices with active push notifications', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          user_id: 'user-123',
          device_identifier: 'iPhone-ABC123',
          device_type: 'ios',
          push_token: 'token-1',
          push_token_type: 'apn',
          push_enabled: true,
          is_active: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockDevices,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await devicesService.getActiveDevicesWithPush('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].pushToken).toBe('token-1');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('push_enabled = TRUE'),
        expect.any(Array)
      );
    });
  });
});
