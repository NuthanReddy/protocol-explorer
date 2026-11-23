import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { addressFor, packetTime } from './catalog';
import type { Packet, Protocol } from './catalog';
import { decodePacket } from './wire';
import type { WireField } from './wire';

export default function PacketInspector({ packet, index, protocol, onClose, onSelect }: {
  packet: Packet; index: number; protocol: Protocol; onClose: () => void; onSelect: (index: number) => void;
}) {
  const decoded = useMemo(() => decodePacket(packet, addressFor(packet.source, protocol), addressFor(packet.destination, protocol), index), [packet, protocol, index]);
  const [selected, setSelected] = useState<WireField | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const bytePanel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 700px)').matches) heading.current?.scrollIntoView({ block: 'start' });
  }, []);
  useEffect(() => { setSelected(null); }, [packet]);
  function selectField(field: WireField) {
    setSelected(field);
    if (bytePanel.current) bytePanel.current.open = true;
    window.requestAnimationFrame(() => bytePanel.current?.scrollIntoView({ block: 'nearest' }));
  }
  return <section className="inspector" aria-label="Packet inspector">
    <div className="section-heading"><h2 tabIndex={-1} ref={heading}>PACKET INSPECTOR</h2><button className="icon-button" aria-label="Close packet inspector" onClick={onClose}><X size={16} /></button></div>
    <div className="inspector-navigation">
      <button className="icon-button" aria-label="Previous inspected packet" disabled={index === 0} onClick={() => onSelect(index - 1)}><ChevronLeft size={16} /></button>
      <span>Packet {index + 1} of {protocol.packets.length}</span>
      <button className="icon-button" aria-label="Next inspected packet" disabled={index === protocol.packets.length - 1} onClick={() => onSelect(index + 1)}><ChevronRight size={16} /></button>
    </div>
    <div className="inspector-title"><span className={`packet-dot ${packet.kind}`} />Packet {String(index + 1).padStart(2, '0')} <span>{packet.protocol}</span></div>
    <p className="packet-info">{packet.info}</p>
    <dl className="decode-fields">
      <div><dt>Source</dt><dd>{addressFor(packet.source, protocol)}</dd></div>
      <div><dt>Destination</dt><dd>{addressFor(packet.destination, protocol)}</dd></div>
      <div><dt>Transport</dt><dd>{decoded?.transport ?? 'Not modeled for this event'}</dd></div>
      <div><dt>{decoded ? 'Frame length' : 'Illustrative size'}</dt><dd>{packet.size} bytes</dd></div>
      <div><dt>Time</dt><dd>{packetTime(index)} s (synthetic)</dd></div>
    </dl>
    {decoded ? <>
      <p className="wire-note">SYNTHETIC WIRE EXAMPLE</p>
      <p className="fine-print inspector-explanation">Select a field to highlight its bytes in the frame.</p>
      {decoded.layers.map(layer => <details className="wire-layer" key={layer.name} open={layer.name === decoded.transport || layer.name === 'DNS' || layer.name === 'HTTP/1.1'}>
        <summary>{layer.name}<span>{layer.length} B</span></summary>
        <div className="wire-fields">{layer.fields.map(field => <button key={`${field.offset}-${field.label}`} className={`wire-field ${selected === field ? 'selected-field' : ''}`} onClick={() => selectField(field)} aria-pressed={selected === field}>
          <span>{field.label}</span><strong>{field.value}</strong><small>bytes {field.offset}–{field.offset + field.length - 1}</small>
        </button>)}</div>
      </details>)}
      <details ref={bytePanel} className="byte-panel"><summary>Hexadecimal / ASCII</summary>
        <p className="fine-print">{selected ? `${selected.label}: bytes ${selected.offset}–${selected.offset + selected.length - 1}` : `${decoded.bytes.length} frame bytes. Offsets are decimal in fields, hexadecimal in the dump.`}</p>
        <div className="hex-dump">{Array.from({ length: Math.ceil(decoded.bytes.length / 8) }, (_, row) => {
          const slice = decoded.bytes.slice(row * 8, row * 8 + 8);
          return <div key={row}><span>{(row * 8).toString(16).padStart(4, '0')}</span><code className="hex-bytes">{slice.map((byte, column) => {
            const offset = row * 8 + column;
            const highlight = selected && offset >= selected.offset && offset < selected.offset + selected.length;
            return <span key={column} data-offset={offset} className={highlight ? 'byte-highlight' : ''}>{byte.toString(16).padStart(2, '0')}</span>;
          })}</code><code className="ascii-bytes">{slice.map((byte, column) => <span key={column} className={selected && row * 8 + column >= selected.offset && row * 8 + column < selected.offset + selected.length ? 'byte-highlight' : ''}>{byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.'}</span>)}</code></div>;
        })}</div>
      </details>
      <p className="fine-print">{decoded.note}</p>
    </> : <><details open><summary>Illustrative message summary</summary><pre>{packet.payload}</pre></details><p className="fine-print">Wire bytes and transport fields are unavailable for this summarized event. The description is not a serialized packet or decrypted ciphertext.</p></>}
  </section>;
}
