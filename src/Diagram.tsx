import type { KeyboardEvent } from 'react';
import { addressFor, packetTime } from './catalog';
import type { NodeId, Protocol } from './catalog';

interface Props {
  protocol: Protocol;
  cursor: number;
  playing: boolean;
  speed: number;
  reducedMotion: boolean;
  view: 'network' | 'sequence';
  onSelect: (index: number) => void;
}
const positions: Record<NodeId, [number, number]> = {
  client: [230, 385], router: [455, 280], dns: [555, 125], server: [790, 225], internet: [695, 440],
};
const colors = { dns: 'var(--dns)', tcp: 'var(--tcp)', request: 'var(--request)', response: 'var(--response)' };

function Device({ id, title, subtitle, active }: { id: NodeId; title: string; subtitle: string; active: boolean }) {
  const [x, y] = positions[id];
  return <g transform={`translate(${x} ${y})`} className={`device ${active ? 'device-active' : ''}`}>
    <ellipse cx="0" cy="29" rx={id === 'internet' ? 65 : 61} ry="19" className="device-shadow" />
    {id === 'client' ? <g className="device-art">
      <path d="M-56,-16 -55,-83 9,-115 13,-46Z" className="device-face" />
      <path d="M-49,-22 -49,-78 3,-104 6,-49Z" className="device-screen" />
      <path d="M-56,-16 13,-46 68,-16 0,18Z" className="device-top" />
      <path d="M0,18 68,-16 68,-10 0,25 -56,-10 -56,-16Z" className="device-face" />
      <path d="M-36,-15 13,-37 48,-17 0,8ZM-20,-11 26,-32M-9,-5 36,-26M-1,-27 35,-7M-14,-21 22,-1" fill="none" />
      <path d="M-19,-61 -10,-65M-19,-51 0,-60M-19,-41 -5,-47" className="screen-code" />
    </g> : id === 'router' ? <g className="device-art">
      <path d="M-64,-3 0,-34 68,-2 3,30Z" className="device-top" />
      <path d="M-64,-3 3,30 3,43 -64,10ZM3,30 68,-2 68,11 3,43" className="device-face" />
      <path d="M-43,-16 -43,-62M-17,-29 -17,-76M39,-15 39,-60" strokeWidth="5" strokeLinecap="round" />
      <path d="M-43,-16 -43,-62M-17,-29 -17,-76M39,-15 39,-60" stroke="var(--panel)" strokeWidth="2" />
      <path d="m17 27 10-5v7l-10 5zm17-8 10-5v7l-10 5zm17-8 10-5v7l-10 5z" />
      <circle cx="-40" cy="14" r="2.5" fill="#6ed5af" stroke="none" /><circle cx="-30" cy="19" r="2.5" fill="#6ed5af" stroke="none" />
    </g> : id === 'internet' ? <g className="device-art">
      <path d="M-53,8C-83,-5 -69,-39 -43,-37C-48,-68 -3,-86 14,-56C34,-67 59,-49 56,-29C83,-27 84,7 57,18L5,43Z" className="device-face" />
      <path d="M-53,8 -3,-17C-32,-31 -22,-64 -1,-67M-3,-17 5,43M-3,-17C17,-38 29,-40 56,-29" fill="none" />
      <path d="M-24,7 0,-5 27,10M0,-5 1,19M-24,7 -23,24 1,37 27,24 27,10" fill="none" opacity=".7" />
    </g> : <g className="device-art">
      <path d="M-38,-82 1,-103 40,-82 1,-61Z" className="device-top" />
      <path d="M-38,-82 1,-61 1,29 -38,8Z" className="device-face" />
      <path d="M1,-61 40,-82 40,8 1,29Z" className="device-side" />
      {[-60, -36, -12].map(offset => <g key={offset}><path d={`M-31,${offset} -7,${offset + 13} -7,${offset + 25} -31,${offset + 12}Z`} fill="var(--panel)" /><path d={`M-26,${offset + 7} -15,${offset + 13}`} /><circle cx="-12" cy={offset + 20} r="1.8" fill={id === 'dns' ? colors.dns : colors.tcp} stroke="none" /></g>)}
      <path d="M12,-53 29,-62M12,-46 29,-55M12,-39 29,-48" opacity=".5" />
    </g>}
    <text y={id === 'router' ? 76 : 65} className="device-title">{title}</text>
    <text y={id === 'router' ? 96 : 85} className="device-address">{subtitle}</text>
  </g>;
}

function Network({ protocol, cursor, playing, speed, reducedMotion }: Omit<Props, 'view' | 'onSelect'>) {
  const packet = protocol.packets[cursor];
  const activeNodes = packet ? [packet.source, packet.destination] : [];
  const showDns = protocol.packets.some(p => p.source === 'dns' || p.destination === 'dns');
  const localLink = protocol.layer === 2 || protocol.name === 'IGMP';
  const showInternet = !localLink;
  const line = (a: NodeId, b: NodeId) => `M${positions[a].join(',')} L${positions[b].join(',')}`;
  const path = packet ? packet.source === 'router' || packet.destination === 'router'
    ? line(packet.source, packet.destination)
    : `M${positions[packet.source].join(',')} L${positions.router.join(',')} L${positions[packet.destination].join(',')}` : '';
  return <svg viewBox="0 0 1000 580" className="network-svg" role="img" aria-label={`${protocol.name} network diagram${packet ? `: ${packet.info}` : ''}`}>
    <defs>
      <pattern id="iso-grid" width="80" height="46" patternUnits="userSpaceOnUse">
        <path d="M-40 0 40 46 120 0M-40 46 40 0 120 46" fill="none" stroke="var(--grid)" strokeWidth=".6" />
      </pattern>
      <marker id="network-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m2 1 5 4-5 4" fill="none" stroke="var(--line)" strokeWidth="1.5" /></marker>
    </defs>
    <rect x="30" y="20" width="940" height="525" fill="url(#iso-grid)" opacity=".7" />
    <path d="m100 385 360-180 415 207-359 181Z" fill="var(--panel)" fillOpacity=".3" stroke="var(--grid)" />
    {(['client', ...(showDns ? ['dns'] : []), 'server', ...(showInternet ? ['internet'] : [])] as NodeId[]).map(id => <path key={id} d={line('router', id)} stroke="var(--line)" strokeWidth="1.4" strokeDasharray="5 7" fill="none" markerEnd="url(#network-arrow)" />)}
    {packet && <g key={`${protocol.id}-${cursor}`}>
      <path d={path} fill="none" stroke={colors[packet.kind]} strokeWidth="2" strokeDasharray="5 7" opacity=".85" />
      {playing && !reducedMotion ? <circle r="5" fill={colors[packet.kind]} stroke="var(--panel)" strokeWidth="2"><animateMotion dur={`${.9 / speed}s`} path={path} repeatCount="indefinite" /></circle> : <circle cx={(positions[packet.source][0] + positions.router[0]) / 2} cy={(positions[packet.source][1] + positions.router[1]) / 2} r="5" fill={colors[packet.kind]} />}
    </g>}
    {showDns && <Device id="dns" title="DNS Resolver" subtitle={addressFor('dns', protocol)} active={activeNodes.includes('dns')} />}
    <Device id="server" title={protocol.server} subtitle={addressFor('server', protocol)} active={activeNodes.includes('server')} />
    {showInternet && <Device id="internet" title={protocol.name === 'Reverse Proxy' ? 'Upstream service' : 'Internet'} subtitle="External network" active={activeNodes.includes('internet')} />}
    <Device id="router" title="Router" subtitle={addressFor('router', protocol)} active={activeNodes.includes('router')} />
    <Device id="client" title={protocol.name === 'RADIUS' ? 'Access Server' : 'Client'} subtitle={addressFor('client', protocol)} active={activeNodes.includes('client')} />
    <text x="47" y="52" className="map-coordinate">TOPOLOGY / 01</text>
    <path d="M42 555h25M54 542v25" stroke="var(--muted)" opacity=".5" />
    <text x="80" y="559" className="map-coordinate">ILLUSTRATIVE NETWORK · NOT LIVE TRAFFIC</text>
  </svg>;
}

function Sequence({ protocol, cursor, onSelect }: Pick<Props, 'protocol' | 'cursor' | 'onSelect'>) {
  const participants = (['client', 'router', 'dns', 'server', 'internet'] as NodeId[]).filter(id => id === 'client' || protocol.packets.some(p => p.source === id || p.destination === id));
  const x = (id: NodeId) => 120 + participants.indexOf(id) * (760 / Math.max(1, participants.length - 1));
  const height = Math.max(420, 130 + protocol.packets.length * 62);
  const activate = (event: KeyboardEvent<SVGGElement>, i: number) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); }
  };
  return <svg viewBox={`0 0 1000 ${height}`} className="sequence-svg" aria-label={`${protocol.name} sequence diagram`}>
    <defs>{Object.entries(colors).map(([kind, color]) => <marker key={kind} id={`sequence-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="m1 1 8 4-8 4" fill="none" stroke={color} strokeWidth="1.5" /></marker>)}</defs>
    {participants.map(id => <g key={id}>
      <rect x={x(id) - 95} y="22" width="190" height="57" rx="3" fill="var(--raised)" stroke="var(--border)" />
      <text x={x(id)} y="44" textAnchor="middle" className="sequence-title">{id === 'server' ? protocol.server : id === 'dns' ? 'DNS Resolver' : id === 'router' ? 'Router' : id === 'internet' ? 'Upstream service' : 'Client'}</text>
      <text x={x(id)} y="64" textAnchor="middle" className="device-address">{addressFor(id, protocol)}</text>
      <path d={`M${x(id)} 79V${height - 20}`} stroke="var(--line)" strokeDasharray="5 7" />
    </g>)}
    {protocol.packets.map((packet, index) => {
      const y = 120 + index * 62;
      const from = x(packet.source), to = x(packet.destination);
      return <g key={index} role="button" tabIndex={0} aria-label={`Inspect packet ${index + 1}: ${packet.info}`} onClick={() => onSelect(index)} onKeyDown={event => activate(event, index)} className={`sequence-packet ${cursor === index ? 'selected' : ''}`}>
        <rect x="30" y={y - 25} width="940" height="54" rx="3" fill={cursor === index ? 'var(--selection)' : 'transparent'} />
        <text x="37" y={y + 16} className="map-coordinate">{packetTime(index)}s</text>
        <path d={`M${from} ${y + 10}H${to}`} fill="none" stroke={colors[packet.kind]} strokeWidth="1.6" markerEnd={`url(#sequence-${packet.kind})`} />
        <text x={(from + to) / 2} y={y - 2} textAnchor="middle" fill={colors[packet.kind]} className="sequence-label">{packet.info.length > 43 ? `${packet.info.slice(0, 40)}…` : packet.info}</text>
        <circle cx={from} cy={y + 10} r="3" fill={colors[packet.kind]} />
      </g>;
    })}
  </svg>;
}

export default function Diagram(props: Props) {
  return props.view === 'network' ? <Network protocol={props.protocol} cursor={props.cursor} playing={props.playing} speed={props.speed} reducedMotion={props.reducedMotion} /> : <Sequence protocol={props.protocol} cursor={props.cursor} onSelect={props.onSelect} />;
}
