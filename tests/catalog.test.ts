import { test } from 'node:test';
import assert from 'node:assert/strict';
import { protocols, addressFor, packetTime } from '../src/catalog.ts';
import { advanceTimeline, packetDuration, packetRoute, routePosition } from '../src/playback.ts';
import { decodePacket, internetChecksum } from '../src/wire.ts';

test('catalog contains 39 unique original lessons with accurate category totals', () => {
  assert.equal(protocols.length, 39);
  assert.equal(new Set(protocols.map(p => p.id)).size, 39);
  assert.equal(protocols.filter(p => p.category === 'Core').length, 11);
  assert.equal(protocols.filter(p => p.category === 'Application').length, 19);
  assert.equal(protocols.filter(p => p.category === 'Security').length, 9);
  for (const p of protocols) {
    assert.ok(p.description.length > 80, p.name);
    assert.ok(p.packets.length >= 3, p.name);
    assert.ok(p.layer >= 1 && p.layer <= 7, p.name);
    for (const packet of p.packets) {
      assert.ok(p.steps[packet.step], `${p.name}: invalid lesson step`);
      assert.ok(packet.size > 0);
      assert.notEqual(packet.source, packet.destination);
      assert.ok(packet.payload);
    }
  }
});

test('HTTP starts with DNS, establishes TCP, then exchanges an HTTP resource', () => {
  const http = protocols[0];
  assert.equal(http.name, 'HTTP');
  assert.deepEqual(http.packets.map(p => p.protocol), ['DNS', 'DNS', 'TCP', 'TCP', 'TCP', 'HTTP', 'HTTP']);
  assert.equal(http.packets[0].destination, 'dns');
  assert.equal(http.packets[1].source, 'dns');
  assert.equal(http.packets.at(-1)?.step, 3);
  assert.ok(!http.packets.some(packet => packet.step === 4), 'Rendering is a local action, not a packet');
});

test('protocols do not reuse HTTP flows and IPv6 uses documentation addresses', () => {
  assert.equal(protocols.find(p => p.name === 'DHCP')?.packets[0].protocol, 'DHCP');
  assert.equal(protocols.find(p => p.name === 'WireGuard')?.packets[0].protocol, 'WireGuard');
  assert.equal(protocols.find(p => p.name === 'Modbus')?.packets[0].protocol, 'Modbus');
  const ipv6 = protocols.find(p => p.name === 'IPv6')!;
  assert.match(addressFor('client', ipv6), /^2001:db8:/);
  assert.ok(Number(packetTime(6)) > Number(packetTime(0)));
});

test('playback advances continuously, carries frame overshoot, and completes only after final arrival', () => {
  assert.deepEqual(advanceTimeline({ cursor: 0, progress: 0 }, packetDuration / 4, 1, 7), { cursor: 0, progress: .25 });
  assert.deepEqual(advanceTimeline({ cursor: 0, progress: .75 }, packetDuration / 4, 2, 7), { cursor: 1, progress: .25 });
  assert.deepEqual(advanceTimeline({ cursor: 6, progress: 0 }, packetDuration / 2, 1, 7), { cursor: 6, progress: .5 });
  assert.deepEqual(advanceTimeline({ cursor: 6, progress: .5 }, packetDuration, 1, 7), { cursor: 6, progress: 1 });
});

test('routes follow actual endpoints, reverse replies, and keep link-layer traffic local', () => {
  const http = protocols[0];
  assert.deepEqual(packetRoute(http.packets[0], http), ['client', 'router', 'dns']);
  assert.deepEqual(packetRoute(http.packets[1], http), ['dns', 'router', 'client']);
  assert.deepEqual(packetRoute(http.packets[5], http), ['client', 'router', 'internet', 'server']);
  assert.deepEqual(packetRoute(http.packets[6], http), ['server', 'internet', 'router', 'client']);
  const wifi = protocols.find(p => p.name === 'Wi-Fi')!;
  assert.deepEqual(packetRoute(wifi.packets[0], wifi), ['client', 'server']);
  const proxy = protocols.find(p => p.name === 'Reverse Proxy')!;
  assert.deepEqual(packetRoute(proxy.packets[1], proxy), ['server', 'internet']);
});

test('marker positions use route distance and arrive at the real destination', () => {
  const points: [number, number][] = [[0, 0], [30, 0], [30, 90]];
  assert.deepEqual(routePosition(points, 0).point, [0, 0]);
  assert.deepEqual(routePosition(points, .5).point, [30, 30]);
  assert.deepEqual(routePosition(points, 1).point, [30, 90]);
  assert.deepEqual(routePosition(points, .5).trail, [[0, 0], [30, 0], [30, 30]]);
});

test('DNS examples serialize UDP and DNS fields rather than descriptive prose', () => {
  const http = protocols[0];
  const query = decodePacket(http.packets[0], '192.168.1.10', '8.8.8.8', 0)!;
  assert.equal(query.transport, 'UDP');
  assert.equal(query.bytes.length, 72);
  assert.equal(query.bytes[23], 17);
  assert.deepEqual(query.bytes.slice(36, 38), [0, 53]);
  assert.deepEqual(query.bytes.slice(42, 46), [0x4a, 0x2b, 1, 0]);
  assert.deepEqual(query.bytes.slice(54, 68), [7, ...new TextEncoder().encode('example'), 4, ...new TextEncoder().encode('test'), 0]);
  assert.equal(internetChecksum(query.bytes.slice(14, 34)), 0);
  assert.equal(internetChecksum([...query.bytes.slice(26, 34), 0, 17, 0, 38, ...query.bytes.slice(34)]), 0);
  const answer = decodePacket(http.packets[1], '8.8.8.8', '192.168.1.10', 1)!;
  assert.equal(answer.bytes.length, 88);
  assert.deepEqual(answer.bytes.slice(-4), [203, 0, 113, 10]);
  assert.ok(answer.layers.at(-1)?.fields.some(field => field.label === 'TTL' && field.value === '300 seconds'));
});

test('TCP wire examples contain real flags, header length, sequence fields and checksums', () => {
  const syn = decodePacket(protocols[0].packets[2], '192.168.1.10', '203.0.113.10', 2)!;
  assert.equal(syn.bytes.length, 66);
  assert.equal(syn.bytes[23], 6);
  assert.equal(syn.bytes[46], 0x80);
  assert.equal(syn.bytes[47], 2);
  assert.deepEqual(syn.bytes.slice(38, 42), [0, 0, 0, 0]);
  assert.equal(internetChecksum([...syn.bytes.slice(26, 34), 0, 6, 0, 32, ...syn.bytes.slice(34)]), 0);
  const ack = decodePacket(protocols[0].packets[4], '192.168.1.10', '203.0.113.10', 4)!;
  assert.equal(ack.bytes.length, 60);
  assert.equal(ack.bytes[47], 16);
  assert.deepEqual(ack.bytes.slice(-6), [0, 0, 0, 0, 0, 0]);
  assert.equal(decodePacket(protocols.find(p => p.name === 'WPA3')!.packets[0], '192.168.1.10', '203.0.113.10', 0), null);
});

test('DNS cache-miss example includes an authoritative reply before returning to the client', () => {
  const dns = protocols.find(p => p.name === 'DNS')!;
  assert.deepEqual(dns.packets.map(packet => [packet.source, packet.destination]), [['client', 'dns'], ['dns', 'server'], ['server', 'dns'], ['dns', 'client']]);
});
