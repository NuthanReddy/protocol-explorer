import { useEffect, useRef, useState } from 'react';
import { Box, Search, PanelLeft, Maximize, Keyboard, Sun, Moon, ChevronRight, ChevronDown, Play, Pause, SkipBack, RotateCcw, StepForward, X, Network, ListOrdered, ArrowUpRight, Globe, Check, Minus, Plus } from 'lucide-react';
import Diagram from './Diagram';
import { protocols, layerNames, addressFor, packetTime } from './catalog';
import type { Category, Packet, Protocol } from './catalog';

type Modal = 'search' | 'shortcuts' | 'language' | null;
const categories = ['All', 'Core', 'Application', 'Security'] as const;
const legend = [{ kind: 'dns', name: 'DNS' }, { kind: 'tcp', name: 'TCP' }, { kind: 'request', name: 'Request' }, { kind: 'response', name: 'Response' }];

function PacketInspector({ packet, index, protocol, onClose }: { packet: Packet; index: number; protocol: Protocol; onClose: () => void }) {
  const bytes = Array.from(new TextEncoder().encode(packet.payload));
  const carrier = protocol.name === 'IPv6' ? 'IPv6' : protocol.layer >= 3 ? 'IPv4 (illustrative)' : 'Local link frame';
  return <section className="inspector">
    <div className="section-heading"><h2>PACKET INSPECTOR</h2><button className="icon-button" aria-label="Close packet inspector" onClick={onClose}><X size={15} /></button></div>
    <div className="inspector-title"><span className={`packet-dot ${packet.kind}`} />Packet {String(index + 1).padStart(2, '0')} <span>{packet.protocol}</span></div>
    <p className="packet-info">{packet.info}</p>
    <dl className="decode-fields">
      <div><dt>Source</dt><dd>{addressFor(packet.source, protocol)}</dd></div>
      <div><dt>Destination</dt><dd>{addressFor(packet.destination, protocol)}</dd></div>
      <div><dt>Example size</dt><dd>{packet.size} bytes</dd></div>
      <div><dt>Time</dt><dd>{packetTime(index)} s</dd></div>
    </dl>
    <details><summary>Encapsulation layers</summary><dl className="decode-fields">
      <div><dt>Link</dt><dd>{protocol.name === 'Wi-Fi' || protocol.name === 'WPA3' ? 'IEEE 802.11' : 'Ethernet (illustrative)'}</dd></div>
      <div><dt>Network</dt><dd>{carrier}</dd></div>
      <div><dt>Transport / carrier</dt><dd>{protocol.transport}</dd></div>
      <div><dt>Message type</dt><dd>{packet.protocol}</dd></div>
    </dl></details>
    <details open><summary>Decoded example fields</summary><pre>{packet.payload}</pre></details>
    <details><summary>Hexadecimal / ASCII</summary><p className="fine-print">UTF-8 encoding of the illustrative fields below, not a serialized packet capture.</p><div className="hex-dump">{Array.from({ length: Math.ceil(bytes.length / 8) }, (_, row) => {
      const slice = bytes.slice(row * 8, row * 8 + 8);
      return <div key={row}><span>{(row * 8).toString(16).padStart(4, '0')}</span><code>{slice.map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(23, ' ')}</code><code>{slice.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('')}</code></div>;
    })}</div></details>
    <p className="fine-print">Educational illustration. Timings and sizes are synthetic; handshakes and intermediate hops may be summarized.</p>
  </section>;
}

function readTheme(): 'dark' | 'light' {
  try { return localStorage.getItem('protocol-explorer-theme') === 'light' ? 'light' : 'dark'; }
  catch (error) { console.warn('Theme storage is unavailable. Using dark mode.', error); return 'dark'; }
}

export default function App() {
  const [protocolId, setProtocolId] = useState('http');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [view, setView] = useState<'network' | 'sequence'>('network');
  const [theme, setTheme] = useState(readTheme);
  const [sidebar, setSidebar] = useState(true);
  const [diagramOnly, setDiagramOnly] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [cursor, setCursor] = useState(-1);
  const [inspection, setInspection] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const selectedItem = useRef<HTMLDivElement>(null);
  const protocol = protocols.find(item => item.id === protocolId)!;
  const visible = protocols.filter(item => category === 'All' || item.category === category);
  const results = protocols.filter(item => `${item.name} ${item.longName} ${item.description} ${layerNames[item.layer - 1]} ${item.transport}`.toLowerCase().includes(query.toLowerCase()));
  const currentPacket = protocol.packets[cursor];
  const currentStep = currentPacket?.step ?? 0;

  function selectProtocol(id: string) {
    setProtocolId(id); setCursor(-1); setInspection(null); setPlaying(false); setModal(null);
    setZoom(1);
    const next = protocols.find(p => p.id === id)!;
    if (category !== 'All' && category !== next.category) setCategory('All');
  }
  function reset() { setPlaying(false); setCursor(-1); setInspection(null); }
  function selectPacket(index: number) { setCursor(index); setInspection(index); setPlaying(false); }
  function advance() { setPlaying(false); setCursor(value => Math.min(value + 1, protocol.packets.length - 1)); }
  function togglePlayback() {
    if (!playing && cursor === protocol.packets.length - 1) { setCursor(-1); setInspection(null); }
    setPlaying(value => !value);
  }
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('protocol-explorer-theme', next); }
    catch (error) { console.warn('Could not save theme preference.', error); setNotice('Theme changed, but this browser does not allow saving your preference.'); }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) { console.warn('Fullscreen is unavailable.', error); setNotice('Fullscreen is not available in this browser. Use the diagram-only view instead.'); }
  }

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCursor(value => Math.min(value + 1, protocol.packets.length - 1)), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, protocol]);
  useEffect(() => { if (cursor >= protocol.packets.length - 1) setPlaying(false); }, [cursor, protocol]);
  useEffect(() => {
    const container = table.current;
    const row = container?.querySelector(`[data-packet="${cursor}"]`);
    if (container && row) {
      const parentRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const headerHeight = container.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      if (rowRect.bottom > parentRect.bottom) container.scrollTop += rowRect.bottom - parentRect.bottom;
      if (rowRect.top < parentRect.top + headerHeight) container.scrollTop -= parentRect.top + headerHeight - rowRect.top;
    }
    setInspection(previous => previous === null || cursor < 0 ? null : cursor);
  }, [cursor]);
  useEffect(() => {
    dialog.current?.querySelector('.search-results .highlighted')?.scrollIntoView({ block: 'nearest' });
  }, [searchIndex, query]);
  useEffect(() => { selectedItem.current?.scrollIntoView({ block: 'nearest' }); }, [protocolId, category]);
  useEffect(() => {
    if (modal && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      if (modal === 'search') searchInput.current?.focus();
    } else if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);
  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setModal(previous => previous === 'search' ? null : 'search'); setQuery(''); setSearchIndex(0); return;
      }
      if (modal || event.target instanceof HTMLElement && (event.target.matches('input, textarea, select, button, a, summary') || event.target.isContentEditable) || event.ctrlKey || event.metaKey || event.altKey) return;
      switch (event.key.toLowerCase()) {
        case 'l': setSidebar(value => !value); break;
        case 'd': setDiagramOnly(value => !value); break;
        case 'f': void fullscreen(); break;
        case '?': setModal('shortcuts'); break;
        case ' ': event.preventDefault(); togglePlayback(); break;
        case 'arrowright': event.preventDefault(); advance(); break;
        case 'arrowleft': event.preventDefault(); setPlaying(false); setCursor(value => Math.max(-1, value - 1)); break;
        case 'r': reset(); break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return <div className={`app ${sidebar && !diagramOnly ? '' : 'without-sidebar'} ${diagramOnly ? 'diagram-only' : ''}`}>
    <header className="topbar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); selectProtocol('http'); setCategory('All'); }}>
        <span className="brand-mark"><Box size={31} strokeWidth={1.35} /></span>
        <span><span className="brand-title">PROTOCOL <i>EXPLORER</i></span><span className="brand-tagline">LEARN HOW THE INTERNET WORKS</span></span>
      </a>
      <div className="osi"><span className="small-label">OSI LAYER</span><div className="layers">{layerNames.map((name, index) => <span key={name} title={`Layer ${index + 1}: ${name}`} className={protocol.layer === index + 1 ? 'current' : ''}>{index + 1}</span>)}</div><span className="layer-name">{layerNames[protocol.layer - 1]}</span></div>
      <div className="header-actions">
        <button className="search-trigger" onClick={() => { setModal('search'); setQuery(''); setSearchIndex(0); }}><Search size={15} /><span>Search protocols</span><kbd>Ctrl K</kbd></button>
        <button className={`icon-button ${sidebar ? 'is-on' : ''}`} title="Protocol list (L)" aria-label="Toggle protocol list" aria-pressed={sidebar} onClick={() => setSidebar(value => !value)}><PanelLeft size={17} /></button>
        <button className={`icon-button ${diagramOnly ? 'is-on' : ''}`} title="Diagram only (D)" aria-label="Toggle diagram only" aria-pressed={diagramOnly} onClick={() => setDiagramOnly(value => !value)}><Network size={17} /></button>
        <button className="icon-button fullscreen-button" title="Fullscreen (F)" aria-label="Toggle fullscreen" onClick={() => void fullscreen()}><Maximize size={17} /></button>
        <button className="icon-button" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onClick={() => setModal('shortcuts')}><Keyboard size={17} /></button>
        <span className="header-divider" />
        <a href="https://protocol-explorer-alpha.vercel.app/" target="_blank" rel="noreferrer" className="inspiration">Inspired by the original<ArrowUpRight size={12} /></a>
        <button className="language-button" onClick={() => setModal('language')} aria-label="Language: English"><Globe size={13} />EN</button>
        <button className="icon-button" title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </header>

    <main className="workspace">
      {sidebar && !diagramOnly && <aside className="protocol-panel panel">
        <div className="section-heading"><h1>INTERNET PROTOCOLS</h1><span className="catalog-total">39</span></div>
        <nav className="category-tabs" aria-label="Protocol categories">{categories.map(item => <button key={item} aria-pressed={item === category} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item.toUpperCase()}<span>{item === 'All' ? protocols.length : protocols.filter(p => p.category === item).length}</span></button>)}</nav>
        <div className="protocol-list">{visible.map(item => <div key={item.id} ref={item.id === protocolId ? selectedItem : undefined} className={`protocol-entry ${item.id === protocolId ? 'selected' : ''}`}>
          <button className="protocol-button" aria-expanded={item.id === protocolId} onClick={() => selectProtocol(item.id)}><span className="protocol-symbol">{item.id === protocolId ? <Network size={15} /> : <span />}</span><span><strong>{item.name}</strong><small>{item.longName}</small></span>{item.id === protocolId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
          {item.id === protocolId && <div className="lesson-steps">{item.steps.map((step, index) => <button key={step.title} className={currentStep === index ? 'current-step' : ''} aria-current={currentStep === index ? 'step' : undefined} onClick={() => {
            setPlaying(false); setInspection(null);
            const firstPacket = item.packets.findIndex(p => p.step === index);
            setCursor(firstPacket);
          }}><span>{index + 1}</span>{step.title}{currentStep === index && <span className="step-active-dot" />}</button>)}</div>}
        </div>)}</div>
        <div className="catalog-footer"><span className="status-dot" />39 protocols. One connected world.</div>
      </aside>}

      <section className="diagram-panel panel">
        <div className="diagram-toolbar"><div className="view-tabs" role="tablist" aria-label="Diagram view"><button role="tab" aria-selected={view === 'network'} className={view === 'network' ? 'active' : ''} onClick={() => setView('network')}><Network size={14} />NETWORK</button><button role="tab" aria-selected={view === 'sequence'} className={view === 'sequence' ? 'active' : ''} onClick={() => setView('sequence')}><ListOrdered size={14} />SEQUENCE</button></div><span className="diagram-state"><span className={playing ? 'status-dot' : 'status-dot idle'} />{playing ? 'TRANSMITTING' : cursor < 0 ? 'READY TO EXPLORE' : cursor === protocol.packets.length - 1 ? 'FLOW COMPLETE' : 'PAUSED'}</span></div>
        <div className={`diagram-stage ${view}`}><div style={{ transform: `scale(${zoom})` }} className="diagram-content"><Diagram protocol={protocol} cursor={cursor} playing={playing} speed={speed} reducedMotion={reducedMotion} view={view} onSelect={selectPacket} /></div></div>
        <div className="diagram-bottom"><div className="step-narration"><span className="step-counter">{String(currentStep + 1).padStart(2, '0')}<small>/{String(protocol.steps.length).padStart(2, '0')}</small></span><div><h2>{protocol.steps[currentStep].title}</h2><p>{protocol.steps[currentStep].explanation}</p></div></div><div className="zoom-controls"><button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(value => Math.max(.8, value - .1))}><Minus size={12} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Zoom in" disabled={zoom >= 1.4} onClick={() => setZoom(value => Math.min(1.4, value + .1))}><Plus size={12} /></button></div></div>
      </section>

      {!diagramOnly && <aside className="overview-panel panel">
        <div className="section-heading"><h2>PROTOCOL OVERVIEW</h2><span className="tiny-square" /></div>
        {inspection !== null && <PacketInspector packet={protocol.packets[inspection]} index={inspection} protocol={protocol} onClose={() => setInspection(null)} />}
        <div className="overview-body"><div className="protocol-title"><h2>{protocol.name}</h2><span className="active-badge"><span />ACTIVE</span></div><p className="long-name">{protocol.longName}</p><p className="description">{protocol.description}</p>
          <dl className="metadata">
            <div><dt>Layer</dt><dd><span className="layer-badge">L{protocol.layer}</span> {layerNames[protocol.layer - 1]}</dd></div>
            <div><dt>Default port</dt><dd>{protocol.port}</dd></div>
            <div><dt>Transport</dt><dd>{protocol.transport}</dd></div>
            <div><dt>Data format</dt><dd>{protocol.format}</dd></div>
            <div><dt>Common methods</dt><dd>{protocol.methods}</dd></div>
            <div><dt>Defined in</dt><dd className="standard">{protocol.standard}</dd></div>
          </dl>
          <div className="learning-note"><Box size={16} /><p><strong>Follow the conversation.</strong>Select a packet to inspect its fields, or switch to Sequence to see who talks to whom.</p></div>
          <p className="fine-print osi-note">OSI layers are teaching approximations. Catalog groups are browsing categories, not formal protocol classifications.</p>
        </div>
      </aside>}

      <section className="flow-panel panel">
        <div className="flow-toolbar"><div className="flow-heading"><h2>PACKET FLOW</h2><div className="legend">{legend.map(item => <span key={item.kind}><i className={`packet-dot ${item.kind}`} />{item.name}</span>)}</div><span className="flow-note">{protocol.id === 'http' ? 'Data ACKs not shown' : 'Simplified educational exchange'}</span></div>
          <div className="playback-controls"><label className="speed-select"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option><option value={4}>4x</option></select></label><button className="icon-button" title="Previous packet (Left arrow)" aria-label="Previous packet" disabled={cursor < 0} onClick={() => { setPlaying(false); setCursor(value => Math.max(-1, value - 1)); }}><SkipBack size={14} /></button><button className="play-button" onClick={togglePlayback}>{playing ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}{playing ? 'PAUSE' : 'PLAY'}</button><button className="control-button" disabled={cursor === protocol.packets.length - 1} onClick={advance}><StepForward size={14} />STEP</button><button className="control-button" onClick={reset}><RotateCcw size={13} />RESET</button></div>
        </div>
        <div className="packet-table-scroll" ref={table}><table className="packet-table"><thead><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Protocol</th><th>Info</th><th>Size</th></tr></thead><tbody>{protocol.packets.map((packet, index) => <tr key={index} data-packet={index} className={`${cursor === index ? 'current-packet' : ''} ${cursor >= index ? 'transmitted' : ''} ${packet.kind}`} onClick={() => selectPacket(index)}>
          <td><button className="packet-select" aria-current={cursor === index ? 'true' : undefined} aria-label={`Inspect packet ${index + 1}: ${packet.info}`} onClick={event => { event.stopPropagation(); selectPacket(index); }}>{String(index + 1).padStart(2, '0')}</button></td><td>{packetTime(index)}<small>s</small></td><td>{addressFor(packet.source, protocol)}</td><td>{addressFor(packet.destination, protocol)}</td><td><span className={`wire-badge ${packet.kind}`}>{packet.protocol}</span></td><td className="info-cell">{packet.info}</td><td>{packet.size}<small> B</small></td>
        </tr>)}</tbody></table></div>
        <div className="flow-footer"><span>{String(Math.max(0, cursor + 1)).padStart(2, '0')} / {String(protocol.packets.length).padStart(2, '0')} PACKETS</span><div className="progress-track"><div style={{ transform: `scaleX(${(cursor + 1) / protocol.packets.length})` }} /></div><span>ILLUSTRATIVE DATA</span></div>
      </section>
    </main>
    <footer className="page-footer"><span>Understand the network. One packet at a time.</span><span>Original lessons & diagrams<span className="footer-separator">/</span><button onClick={() => setModal('shortcuts')}>Press <kbd>?</kbd> for shortcuts</button></span></footer>

    <dialog ref={dialog} onCancel={() => setModal(null)} onClick={event => { if (event.target === dialog.current) setModal(null); }} className="modal">
      <div className="modal-heading"><h2>{modal === 'search' ? 'Find a protocol' : modal === 'language' ? 'Language' : 'Keyboard shortcuts'}</h2><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={18} /></button></div>
      {modal === 'search' ? <><div className="search-field"><Search size={19} /><input ref={searchInput} value={query} placeholder="Search names, layers, or concepts…" aria-label="Search protocols" onChange={event => { setQuery(event.target.value); setSearchIndex(0); }} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSearchIndex(value => Math.min(value + 1, results.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setSearchIndex(value => Math.max(0, value - 1)); }
        if (event.key === 'Enter' && results[searchIndex]) {
          event.preventDefault();
          event.stopPropagation();
          selectProtocol(results[searchIndex].id);
        }
      }} /><kbd>ESC</kbd></div><div className="search-results">{results.length ? results.map((item, index) => <button key={item.id} className={index === searchIndex ? 'highlighted' : ''} onClick={() => selectProtocol(item.id)}><span><strong>{item.name}</strong><small>{item.longName}</small></span><span className="result-category">{item.category}</span><ChevronRight size={16} /></button>) : <div className="empty-state"><Search size={24} /><h3>No matching protocols</h3><p>Try a protocol name or a concept like encryption.</p></div>}</div><div className="modal-footer"><span>{results.length} protocols found</span><span>↑ ↓ navigate <kbd>Enter</kbd> select</span></div></>
      : modal === 'language' ? <div className="language-content"><div><Globe size={18} /><span>English</span><Check size={17} /></div><p>This independent recreation currently includes English lessons only.</p></div>
      : <div className="shortcut-list">{[['Search protocols', 'Ctrl / ⌘ K'], ['Toggle protocol list', 'L'], ['Diagram-only view', 'D'], ['Toggle fullscreen', 'F'], ['Play / pause', 'Space'], ['Next / previous packet', '← / →'], ['Reset flow', 'R'], ['Keyboard shortcuts', '?'], ['Close dialog', 'Esc']].map(([label, key]) => <div key={label}><span>{label}</span><kbd>{key}</kbd></div>)}<p className="fine-print">Shortcuts pause while you type or focus an interactive control.</p></div>}
    </dialog>
    {notice && <div className="notice" role="status">{notice}<button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={15} /></button></div>}
  </div>;
}
