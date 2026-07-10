const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPacketPlan, validateCampaignConfig } = require('../services/campaignService');
const { describe } = require('node:test');

describe('Campaign Service Tests', () => {
  describe('validateCampaignConfig', () => {
    test('should reject packet size less than 5', () => {
      assert.throws(() => validateCampaignConfig({ minPacketSize: 4, maxPacketSize: 10, minDelay: 10, maxDelay: 20 }), /Invalid packet size/);
    });

    test('should reject packet size range difference less than 5', () => {
      assert.throws(() => validateCampaignConfig({ minPacketSize: 5, maxPacketSize: 9, minDelay: 10, maxDelay: 20 }), /Invalid packet size/);
    });

    test('should reject non-positive delay values', () => {
      assert.throws(() => validateCampaignConfig({ minPacketSize: 5, maxPacketSize: 10, minDelay: 0, maxDelay: 20 }), /Invalid delay/);
    });

    test('should accept a valid configuration without throwing', () => {
      assert.doesNotThrow(() => validateCampaignConfig({ minPacketSize: 5, maxPacketSize: 10, minDelay: 10, maxDelay: 20 }));
    });
  });

  describe('buildPacketPlan', () => {
    test('should build packets with random sizes and delays within configured bounds', () => {
      const recipients = Array.from({ length: 30 }, (_, i) => ({ name: `User ${i}`, phone: `999${i}` }));
      const config = { minPacketSize: 5, maxPacketSize: 10, minDelay: 90, maxDelay: 120 };
      const plan = buildPacketPlan(recipients, config);

      assert.ok(plan.length > 0, 'Plan should not be empty');
      assert.ok(plan.every(p => p.size > 0), 'Each packet should contain at least one recipient');
      assert.ok(plan.every(p => p.size <= config.maxPacketSize), 'Packet sizes should not exceed the max');
      assert.ok(plan.every(p => p.delay >= config.minDelay && p.delay <= config.maxDelay), 'Delays should be within range');
    });

    test('should ensure all recipients are included exactly once', () => {
      const recipients = Array.from({ length: 100 }, (_, i) => ({ name: `User ${i}`, phone: `999${i}` }));
      const config = { minPacketSize: 7, maxPacketSize: 15, minDelay: 1, maxDelay: 5 };
      const plan = buildPacketPlan(recipients, config);
      
      const totalRecipientsInPlan = plan.reduce((sum, packet) => sum + packet.recipients.length, 0);
      assert.strictEqual(totalRecipientsInPlan, 100, 'Total recipients in packets must match original list size');
    });

    test('should assign sessionIndex and ipIndex in a round-robin fashion', () => {
      const recipients = Array.from({ length: 50 }, (_, i) => ({ name: `User ${i}`, phone: `999${i}` }));
      const config = { minPacketSize: 8, maxPacketSize: 12, minDelay: 1, maxDelay: 5, roundRobinSessions: 3 };
      process.env.PROVIDER_IP_POOL = 'ip1,ip2';
      const plan = buildPacketPlan(recipients, config);

      // The plan will have 5 packets for 50 recipients with size 8-12.
      plan.forEach((packet, i) => {
        assert.strictEqual(packet.sessionIndex, i % config.roundRobinSessions, `Packet ${i} should have sessionIndex ${i % config.roundRobinSessions}`);
        assert.strictEqual(packet.ipIndex, i % 2, `Packet ${i} should have ipIndex ${i % 2}`);
        assert.ok(packet.proxyUrl === null || packet.proxyUrl === undefined || typeof packet.proxyUrl === 'string', 'Proxy URL should be null, undefined, or a string');
      });
    });

    test('should handle a recipient list smaller than the minimum packet size', () => {
      const recipients = Array.from({ length: 3 }, (_, i) => ({ name: `User ${i}`, phone: `999${i}` }));
      const plan = buildPacketPlan(recipients, { minPacketSize: 5, maxPacketSize: 10, minDelay: 90, maxDelay: 120 });

      assert.strictEqual(plan.length, 1, 'Should create a single packet for a small list');
      assert.strictEqual(plan[0].recipients.length, 3, 'The single packet should contain all remaining recipients');
    });
  });
});
