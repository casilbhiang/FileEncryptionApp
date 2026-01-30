import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storage } from './storage';
import Cookies from 'js-cookie';

// Mock CryptoJS to have predictable output or just rely on the real one?
// Real one is better for integration testing the util.
// js-cookie needs to be mocked if we are not in a browser env, 
// BUT jsdom should handle document.cookie.
// However, js-cookie might need setup.
// Let's mock js-cookie to be safe and test the wrapper logic.

vi.mock('js-cookie', () => {
    return {
        default: {
            set: vi.fn(),
            get: vi.fn(),
            remove: vi.fn()
        }
    };
});

describe('storage utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should encrypt value when setting item', () => {
        const key = 'test-key';
        const value = 'test-value';

        storage.setItem(key, value);

        expect(Cookies.set).toHaveBeenCalledTimes(1);
        const [calledKey, calledValue] = vi.mocked(Cookies.set).mock.calls[0];

        expect(calledKey).toBe(key);
        expect(calledValue).not.toBe(value); // Should be encrypted
        expect(calledValue.length).toBeGreaterThan(0);
    });

    it('should decrypt value when getting item', () => {
        const key = 'test-key';
        // We need a valid encrypted string for "test-value". 
        // Since we are using real AES in storage.ts, let's just spy on the methods 
        // OR better: use the real implementation of encrypt/decrypt via the storage object 
        // by setting it first and seeing if we can get it back if we weren't mocking Cookies.

        // Since we mocked Cookies, we have to simulate what Cookies.get returns.
        // We can cheat: we know storage.setItem(key, 'secret') calls Cookies.set(key, encrypted).
        // Let's grab that encrypted value.

        // 1. Call setItem to generate encrypted string
        storage.setItem(key, 'secret-data');
        const encryptedValue = vi.mocked(Cookies.set).mock.calls[0][1];

        // 2. Mock Cookies.get to return that encrypted string
        vi.mocked(Cookies.get).mockReturnValue(encryptedValue);

        // 3. Call getItem
        const result = storage.getItem(key);

        expect(result).toBe('secret-data');
    });

    it('should return null if item does not exist', () => {
        vi.mocked(Cookies.get).mockReturnValue(undefined);
        expect(storage.getItem('non-existent')).toBeNull();
    });

    it('should remove item', () => {
        storage.removeItem('key-to-remove');
        expect(Cookies.remove).toHaveBeenCalledWith('key-to-remove', undefined);
    });
});
