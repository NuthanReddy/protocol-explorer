import type { Packet } from './catalog';

interface Ports { sourcePort: number; destinationPort: number }
interface TCPFields extends Ports { sequence: number; acknowledgment: number; flags: number; synOptions?: boolean }
export type WireExample =
  | (Ports & { type: 'dns'; id: number; name: string; answer?: string; ttl?: number; recursive: boolean; authoritative?: boolean })
  | (TCPFields & { type: 'tcp' | 'http' });
export interface WireField { label: string; value: string; offset: number; length: number }
export interface WireLayer { name: string; offset: number; length: number; fields: WireField[] }
export interface DecodedPacket { bytes: number[]; layers: WireLayer[]; transport: string; note: string }

function u16(value: number) { return [value >>> 8 & 255, value & 255]; }
function u32(value: number) { return [value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255]; }
function ipv4(value: string) { return value.split('.').map(Number); }
function hex(value: number) { return `0x${value.toString(16).padStart(4, '0')}`; }
export function internetChecksum(bytes: number[]) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) + (bytes[i + 1] ?? 0);
  while (sum >>> 16) sum = (sum & 65535) + (sum >>> 16);
  return ~sum & 65535;
}

export function decodePacket(packet: Packet, source: string, destination: string, index: number): DecodedPacket | null {
  const wire = packet.wire;
  if (!wire) return null;
  const layers: WireLayer[] = [];
  const application: number[] = [];
  const applicationFields: WireField[] = [];
  let transport: number[];
  const transportFields: WireField[] = [];
  const sourceIP = ipv4(source), destinationIP = ipv4(destination);
  const ipProtocol = wire.type === 'dns' ? 17 : 6;
  const applicationOffset = wire.type === 'dns' ? 42 : 34 + (wire.synOptions ? 32 : 20);
  const add = (target: number[], fields: WireField[], offset: number, label: string, value: string, bytes: number[]) => {
    fields.push({ label, value, offset: offset + target.length, length: bytes.length });
    target.push(...bytes);
  };
  if (wire.type === 'dns') {
    const answer = wire.answer;
    const flags = answer ? 0x8000 | (wire.authoritative ? 0x0400 : 0) | (wire.recursive ? 0x0180 : 0) : wire.recursive ? 0x0100 : 0;
    add(application, applicationFields, 42, 'Transaction ID', hex(wire.id), u16(wire.id));
    add(application, applicationFields, 42, 'DNS flags', `${hex(flags)} · ${answer ? 'Response' : 'Query'}${wire.recursive ? ' · recursion requested' : ''}`, u16(flags));
    add(application, applicationFields, 42, 'Questions', '1', u16(1));
    add(application, applicationFields, 42, 'Answers', answer ? '1' : '0', u16(answer ? 1 : 0));
    add(application, applicationFields, 42, 'Authority records', '0', u16(0));
    add(application, applicationFields, 42, 'Additional records', '0', u16(0));
    const qname = wire.name.split('.').flatMap(label => [label.length, ...new TextEncoder().encode(label)]);
    add(application, applicationFields, 42, 'Question name', wire.name, [...qname, 0]);
    add(application, applicationFields, 42, 'Question type', 'A (1)', u16(1));
    add(application, applicationFields, 42, 'Question class', 'IN (1)', u16(1));
    if (answer) {
      add(application, applicationFields, 42, 'Answer name', 'Pointer to question at DNS offset 12', [0xc0, 0x0c]);
      add(application, applicationFields, 42, 'Answer type / class', 'A / IN', [...u16(1), ...u16(1)]);
      add(application, applicationFields, 42, 'TTL', `${wire.ttl ?? 300} seconds`, u32(wire.ttl ?? 300));
      add(application, applicationFields, 42, 'RDATA length', '4 bytes', u16(4));
      add(application, applicationFields, 42, 'IPv4 answer', answer, ipv4(answer));
    }
    transport = [...u16(wire.sourcePort), ...u16(wire.destinationPort), ...u16(application.length + 8), 0, 0];
    transportFields.push(
      { label: 'Source port', value: String(wire.sourcePort), offset: 34, length: 2 },
      { label: 'Destination port', value: String(wire.destinationPort), offset: 36, length: 2 },
      { label: 'UDP length', value: `${application.length + 8} bytes`, offset: 38, length: 2 },
    );
  } else {
    const options = wire.synOptions ? [2, 4, 5, 180, 1, 3, 3, 7, 1, 1, 4, 2] : [];
    transport = [...u16(wire.sourcePort), ...u16(wire.destinationPort), ...u32(wire.sequence), ...u32(wire.acknowledgment), (20 + options.length) / 4 << 4, wire.flags, 255, 255, 0, 0, 0, 0, ...options];
    const flags = [[2, 'SYN'], [16, 'ACK'], [8, 'PSH']].filter(([mask]) => wire.flags & Number(mask)).map(([, name]) => name).join(', ');
    transportFields.push(
      { label: 'Source port', value: String(wire.sourcePort), offset: 34, length: 2 },
      { label: 'Destination port', value: String(wire.destinationPort), offset: 36, length: 2 },
      { label: 'Sequence number', value: `${wire.sequence} (synthetic absolute value)`, offset: 38, length: 4 },
      { label: 'Acknowledgment number', value: String(wire.acknowledgment), offset: 42, length: 4 },
      { label: 'TCP header length', value: `${20 + options.length} bytes`, offset: 46, length: 1 },
      { label: 'TCP flags', value: flags, offset: 47, length: 1 },
      { label: 'Receive window', value: '65535 bytes', offset: 48, length: 2 },
      { label: 'Urgent pointer', value: '0', offset: 52, length: 2 },
    );
    if (options.length) transportFields.push({ label: 'TCP options', value: 'MSS 1460 · window scale 7 · SACK permitted · NOP padding', offset: 54, length: 12 });
    if (wire.type === 'http') {
      application.push(...new TextEncoder().encode(packet.payload));
      const lines = packet.payload.split('\r\n');
      let offset = applicationOffset;
      for (const line of lines) {
        const length = new TextEncoder().encode(line).length;
        if (length) applicationFields.push({ label: offset === applicationOffset ? 'Start line' : line.includes(':') ? line.split(':')[0] : 'Body', value: line, offset, length });
        offset += length + 2;
      }
    }
  }
  const transportLength = transport.length + application.length;
  const checksum = internetChecksum([...sourceIP, ...destinationIP, 0, ipProtocol, ...u16(transportLength), ...transport, ...application]);
  const checksumOffset = wire.type === 'dns' ? 6 : 16;
  transport.splice(checksumOffset, 2, ...u16(checksum || (wire.type === 'dns' ? 65535 : 0)));
  transportFields.push({ label: `${wire.type === 'dns' ? 'UDP' : 'TCP'} checksum`, value: `${hex(checksum || (wire.type === 'dns' ? 65535 : 0))} · computed with IPv4 pseudo-header`, offset: 34 + checksumOffset, length: 2 });
  const ip = [0x45, 0, ...u16(20 + transportLength), ...u16(0x1200 + index), 0x40, 0, 64, ipProtocol, 0, 0, ...sourceIP, ...destinationIP];
  const ipChecksum = internetChecksum(ip);
  ip.splice(10, 2, ...u16(ipChecksum));
  const clientMAC = [2, 0, 0, 0, 0, 16], gatewayMAC = [2, 0, 0, 0, 0, 1];
  const sourceMAC = packet.source === 'client' ? clientMAC : packet.destination === 'client' ? gatewayMAC : [2, 0, 0, 0, 0, 53];
  const destinationMAC = packet.destination === 'client' ? clientMAC : gatewayMAC;
  const mac = (value: number[]) => value.map(byte => byte.toString(16).padStart(2, '0')).join(':');
  layers.push({ name: 'Ethernet II', offset: 0, length: 14, fields: [
    { label: 'Destination MAC', value: mac(destinationMAC), offset: 0, length: 6 },
    { label: 'Source MAC', value: mac(sourceMAC), offset: 6, length: 6 },
    { label: 'EtherType', value: 'IPv4 (0x0800)', offset: 12, length: 2 },
  ] });
  layers.push({ name: 'IPv4', offset: 14, length: 20, fields: [
    { label: 'Version / header length', value: 'IPv4 / 20 bytes', offset: 14, length: 1 },
    { label: 'Total IP length', value: `${ip.length + transportLength} bytes`, offset: 16, length: 2 },
    { label: 'Identification', value: hex(0x1200 + index), offset: 18, length: 2 },
    { label: 'Flags / fragment offset', value: 'Do not fragment / 0', offset: 20, length: 2 },
    { label: 'Time to live', value: '64 hops', offset: 22, length: 1 },
    { label: 'IP protocol', value: `${ipProtocol === 17 ? 'UDP' : 'TCP'} (${ipProtocol})`, offset: 23, length: 1 },
    { label: 'IPv4 checksum', value: `${hex(ipChecksum)} · computed`, offset: 24, length: 2 },
    { label: 'Source address', value: source, offset: 26, length: 4 },
    { label: 'Destination address', value: destination, offset: 30, length: 4 },
  ] });
  layers.push({ name: wire.type === 'dns' ? 'UDP' : 'TCP', offset: 34, length: transport.length, fields: transportFields });
  if (application.length) layers.push({ name: wire.type === 'dns' ? 'DNS' : 'HTTP/1.1', offset: applicationOffset, length: application.length, fields: applicationFields });
  const bytes = [...destinationMAC, ...sourceMAC, 8, 0, ...ip, ...transport, ...application];
  if (bytes.length < 60) {
    const length = 60 - bytes.length;
    layers.push({ name: 'Ethernet padding', offset: bytes.length, length, fields: [{ label: 'Padding', value: `${length} zero bytes to reach minimum frame length`, offset: bytes.length, length }] });
    bytes.push(...Array<number>(length).fill(0));
  }
  return {
    bytes, layers, transport: wire.type === 'dns' ? 'UDP' : 'TCP',
    note: 'Constructed synthetic Ethernet/IPv4 frame, not a capture. Addresses, sequence values, TTL and link headers are illustrative. Checksums are computed; Ethernet FCS and preamble are omitted.',
  };
}
