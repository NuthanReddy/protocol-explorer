import type { NodeId, Packet, Protocol } from './catalog';

export interface Timeline { cursor: number; progress: number }
export const packetDuration = 1200;

export function advanceTimeline(timeline: Timeline, elapsed: number, speed: number, count: number): Timeline {
  const position = Math.max(0, timeline.cursor) + timeline.progress + elapsed * speed / packetDuration;
  if (position >= count) return { cursor: count - 1, progress: 1 };
  return { cursor: Math.floor(position), progress: position % 1 };
}

export function packetRoute(packet: Packet, protocol: Protocol): NodeId[] {
  const localLink = protocol.layer === 2;
  const routes: Record<NodeId, NodeId[]> = {
    client: ['client'],
    router: ['client', 'router'],
    dns: ['client', 'router', 'dns'],
    internet: ['client', 'router', 'internet'],
    server: localLink ? ['client', 'server'] : ['client', 'router', 'internet', 'server'],
  };
  const from = routes[packet.source], to = routes[packet.destination];
  let common = 0;
  while (common < Math.min(from.length, to.length) && from[common] === to[common]) common++;
  return [...from.slice(common - 1).reverse(), ...to.slice(common)];
}

export function routePosition(points: [number, number][], progress: number) {
  if (progress <= 0) return { point: points[0], trail: [points[0]] };
  if (progress >= 1) return { point: points[points.length - 1], trail: points };
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, progress));
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const fraction = lengths[index] ? remaining / lengths[index] : 1;
      const point: [number, number] = [
        points[index][0] + (points[index + 1][0] - points[index][0]) * fraction,
        points[index][1] + (points[index + 1][1] - points[index][1]) * fraction,
      ];
      return { point, trail: [...points.slice(0, index + 1), point] };
    }
    remaining -= lengths[index];
  }
  return { point: points[0], trail: points };
}
