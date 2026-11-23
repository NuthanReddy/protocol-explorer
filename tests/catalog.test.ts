import { test } from 'node:test';
import assert from 'node:assert/strict';
import { protocols, addressFor, packetTime } from '../src/catalog.ts';

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
  assert.equal(http.packets.at(-1)?.step, 4);
});

test('protocols do not reuse HTTP flows and IPv6 uses documentation addresses', () => {
  assert.equal(protocols.find(p => p.name === 'DHCP')?.packets[0].protocol, 'DHCP');
  assert.equal(protocols.find(p => p.name === 'WireGuard')?.packets[0].protocol, 'WireGuard');
  assert.equal(protocols.find(p => p.name === 'Modbus')?.packets[0].protocol, 'Modbus');
  const ipv6 = protocols.find(p => p.name === 'IPv6')!;
  assert.match(addressFor('client', ipv6), /^2001:db8:/);
  assert.ok(Number(packetTime(6)) > Number(packetTime(0)));
});
