import { decodePacket } from './wire.ts';
import type { WireExample } from './wire';

export type Category = 'Core' | 'Application' | 'Security';
export type NodeId = 'client' | 'router' | 'dns' | 'server' | 'internet';
export type PacketKind = 'dns' | 'tcp' | 'request' | 'response';
export interface Packet {
  source: NodeId;
  destination: NodeId;
  protocol: string;
  info: string;
  size: number;
  kind: PacketKind;
  step: number;
  payload: string;
  wire?: WireExample;
}
export interface LessonStep { title: string; explanation: string }
export interface Protocol {
  id: string;
  name: string;
  longName: string;
  category: Category;
  layer: number;
  port: string;
  transport: string;
  format: string;
  methods: string;
  standard: string;
  description: string;
  server: string;
  steps: LessonStep[];
  packets: Packet[];
}
type Event = [label: string, explanation: string, reply?: boolean, wire?: string, payload?: string, endpoint?: NodeId];
type Definition = [name: string, longName: string, category: Category, layer: number, port: string, transport: string, format: string, methods: string, standard: string, description: string, server: string, events: Event[]];
const definitions: Definition[] = [
  ['HTTP', 'Hypertext Transfer Protocol', 'Application', 7, '80', 'TCP', 'Text headers + body', 'GET, POST, PUT, DELETE, HEAD', 'RFC 9110 / RFC 9112', 'A browser asks for a resource, and a web server returns a status, headers, and content. HTTP makes the web readable, but does not encrypt the conversation on its own.', 'Web Server', [
    ['Client request', 'The browser turns a URL into a request for a resource. Before sending it, it needs the address of the host.'],
    ['DNS resolution', 'The resolver translates example.test into an IP address. A cached answer can skip this round trip.'],
    ['TCP connection', 'SYN, SYN-ACK, and ACK establish a reliable connection before the HTTP bytes travel.'],
    ['HTTP exchange', 'The browser sends GET /. The server answers with 200 OK and a small HTML document.'],
    ['Page rendering', 'The browser parses HTML and may fetch additional resources. This example finishes with a single response.'],
  ]],
  ['HTTPS', 'HTTP over Transport Layer Security', 'Security', 7, '443', 'TCP + TLS (HTTP/1.1, HTTP/2)', 'Encrypted HTTP', 'GET, POST, PUT, DELETE', 'RFC 9110 / RFC 8446', 'HTTPS protects an HTTP exchange with TLS. A certificate authenticates the server; negotiated keys keep requests and responses private while in transit.', 'Secure Web Server', [
    ['ClientHello', 'The client proposes TLS versions, cipher suites, and a key share.', false, 'TLS', 'TLS 1.3 ClientHello; SNI=example.test'],
    ['ServerHello + certificate', 'The server chooses parameters and proves its identity with a certificate.', true, 'TLS', 'ServerHello; Certificate; CertificateVerify'],
    ['Finished', 'Both endpoints confirm that they derived matching session keys.', false, 'TLS'],
    ['Encrypted GET /', 'An HTTP request travels inside encrypted TLS records.', false, 'HTTPS'],
    ['Encrypted 200 OK', 'Only the authenticated endpoints can read the response.', true, 'HTTPS'],
  ]],
  ['WebSocket', 'WebSocket Protocol', 'Application', 7, '80 / 443', 'TCP / TLS', 'Binary-framed messages', 'Upgrade, message, close', 'RFC 6455', 'WebSocket upgrades an HTTP connection into a two-way message channel. After the handshake, either endpoint can send a message without starting a new request.', 'Message Server', [
    ['Upgrade request', 'The client asks the HTTP server to switch protocols.', false, 'HTTP', 'GET /chat; Upgrade: websocket'],
    ['101 Switching Protocols', 'The server accepts the upgrade and validates the WebSocket key.', true, 'HTTP'],
    ['Client message', 'A masked text frame carries a message from the browser.', false, 'WS', 'Hello from the client'],
    ['Server message', 'The server can push a frame at any time.', true, 'WS', 'Hello from the server'],
  ]],
  ['WebRTC', 'Web Real-Time Communication', 'Application', 7, 'Negotiated; STUN 3478', 'UDP / DTLS / SRTP', 'Encrypted media + data', 'ICE, DTLS, SRTP', 'RFC 8825', 'WebRTC connects browsers for real-time media or data. ICE finds a usable route, DTLS negotiates security, and SRTP carries encrypted audio or video. Signaling is application-defined.', 'Remote Peer', [
    ['STUN binding request', 'A peer discovers the public-facing address of its NAT mapping.', false, 'STUN'],
    ['Mapped address', 'The STUN server reports the observed source address.', true, 'STUN'],
    ['ICE connectivity check', 'Candidate pairs are tested to find a path between peers.', false, 'STUN'],
    ['DTLS handshake', 'Peers establish keys after negotiating fingerprints through signaling.', true, 'DTLS'],
    ['Protected media', 'SRTP transports media with encryption and replay protection.', false, 'SRTP'],
  ]],
  ['SIP', 'Session Initiation Protocol', 'Application', 7, '5060 / 5061', 'UDP / TCP / TLS', 'Text messages', 'INVITE, ACK, BYE', 'RFC 3261', 'SIP negotiates and manages calls; it does not carry the audio itself. A separate media protocol such as RTP transports the conversation after the call is accepted.', 'SIP Endpoint', [
    ['INVITE', 'The caller offers session details, usually as an SDP body.', false, 'SIP'],
    ['180 Ringing', 'The destination reports that it is alerting the recipient.', true, 'SIP'],
    ['200 OK', 'The recipient accepts and returns its media parameters.', true, 'SIP'],
    ['ACK', 'The caller acknowledges the accepted session.', false, 'SIP'],
    ['BYE', 'An endpoint ends the session when the call is finished.', false, 'SIP'],
  ]],
  ['RTSP', 'Real Time Streaming Protocol', 'Application', 7, '554', 'TCP; media often RTP/UDP', 'Text control messages', 'DESCRIBE, SETUP, PLAY', 'RFC 7826', 'RTSP is a remote control for a media stream. It describes a presentation, negotiates transport, and starts playback; RTP usually carries the media separately.', 'Streaming Server', [
    ['DESCRIBE', 'Ask for a description of the available media.', false, 'RTSP'],
    ['Session description', 'The server returns tracks and codec details.', true, 'RTSP'],
    ['SETUP', 'Negotiate the transport and allocate a session.', false, 'RTSP'],
    ['PLAY', 'Start delivery using the negotiated session.', false, 'RTSP'],
    ['RTP media', 'Media packets arrive on the chosen transport.', true, 'RTP'],
  ]],
  ['RTMP', 'Real-Time Messaging Protocol', 'Application', 7, '1935', 'TCP', 'Chunks + AMF commands', 'connect, publish, play', 'Adobe RTMP specification', 'RTMP carries a persistent stream of audio, video, and commands. It remains common for sending a live broadcast from an encoder to a streaming service.', 'Ingest Server', [
    ['C0 + C1', 'The client starts the version and timing handshake.', false, 'RTMP'],
    ['S0 + S1 + S2', 'The server returns its handshake information.', true, 'RTMP'],
    ['connect + createStream', 'The client opens an application and allocates a stream.', false, 'RTMP'],
    ['publish', 'The encoder announces the stream it will send.', false, 'RTMP'],
    ['Audio/video chunks', 'Media is divided into chunks for multiplexed delivery.', false, 'RTMP'],
  ]],
  ['QUIC', 'QUIC Transport Protocol', 'Application', 4, 'Usually 443', 'UDP + TLS 1.3', 'Encrypted frames', 'Initial, Handshake, STREAM', 'RFC 9000', 'QUIC combines secure connection setup with independent reliable streams. One lost packet need not block unrelated streams, and connection IDs allow a connection to survive an address change.', 'QUIC Server', [
    ['Initial + ClientHello', 'The first QUIC packet carries the start of the TLS handshake.', false, 'QUIC'],
    ['Initial + Handshake', 'The server returns handshake messages and key material.', true, 'QUIC'],
    ['Handshake confirmation', 'The client completes TLS authentication and key agreement.', false, 'QUIC'],
    ['STREAM data', 'Reliable application data travels on an independent stream.', false, 'QUIC'],
    ['ACK + STREAM response', 'The peer acknowledges received packets and returns stream data.', true, 'QUIC'],
  ]],
  ['TCP', 'Transmission Control Protocol', 'Core', 4, 'Application-defined', 'IP', 'Segments', 'SYN, ACK, FIN', 'RFC 9293', 'TCP offers an ordered, reliable byte stream. Sequence numbers, acknowledgments, retransmission, and flow control make applications less dependent on individual packet delivery.', 'TCP Server', [
    ['SYN', 'The client proposes an initial sequence number.', false, 'TCP', 'Flags=SYN; Seq=1000'],
    ['SYN-ACK', 'The server acknowledges and proposes its own sequence number.', true, 'TCP', 'Flags=SYN,ACK; Seq=5000; Ack=1001'],
    ['ACK', 'The client completes the three-way handshake.', false, 'TCP', 'Flags=ACK; Seq=1001; Ack=5001'],
    ['Data segment', 'Application bytes are numbered so loss can be detected.', false, 'TCP'],
    ['Acknowledgment', 'The receiver reports the next byte it expects.', true, 'TCP'],
  ]],
  ['UDP', 'User Datagram Protocol', 'Core', 4, 'Application-defined', 'IP', 'Datagrams', 'Send, receive', 'RFC 768', 'UDP sends individual datagrams without a connection handshake. It preserves message boundaries, but applications must handle loss, ordering, and congestion when needed.', 'UDP Service', [
    ['Send datagram', 'The application sends one message with source and destination ports.', false, 'UDP', 'Message=temperature:21'],
    ['Receive datagram', 'The destination processes the independent message.', true, 'UDP', 'Message=received'],
    ['Next datagram', 'Another message can travel without waiting for an acknowledgment.', false, 'UDP', 'Message=temperature:22'],
  ]],
  ['IP', 'Internet Protocol version 4', 'Core', 3, 'Not applicable', 'Link-layer networks', 'IPv4 packets', 'Address, route, forward', 'RFC 791', 'IPv4 supplies addresses and best-effort delivery across networks. Routers examine the destination address and send each packet toward its next hop.', 'Destination Host', [
    ['Create IPv4 packet', 'The sender sets source, destination, and a time-to-live limit.', false, 'IPv4', 'Version=4; TTL=64; Destination=203.0.113.10', 'router'],
    ['Forward at router', 'The router reduces TTL and chooses an outgoing route.', false, 'IPv4', 'TTL=63; Next hop selected'],
    ['Deliver to host', 'The destination passes the payload to the indicated upper-layer protocol.', true, 'IPv4'],
  ]],
  ['BGP', 'Border Gateway Protocol', 'Core', 3, '179', 'TCP', 'Binary messages', 'OPEN, UPDATE, KEEPALIVE', 'RFC 4271', 'BGP exchanges reachability between autonomous systems. A route includes path information, allowing networks to apply routing policy rather than simply choosing the shortest distance.', 'BGP Peer', [
    ['OPEN', 'Peers negotiate BGP version, autonomous-system number, and timers.', false, 'BGP'],
    ['KEEPALIVE', 'The peer accepts the session parameters.', true, 'BGP'],
    ['UPDATE announcement', 'A router advertises a prefix and its AS path.', false, 'BGP', 'Prefix=203.0.113.0/24; AS_PATH=64500 64501'],
    ['UPDATE withdrawal', 'An unavailable route is removed from the peer table.', true, 'BGP'],
  ]],
  ['IPv6', 'Internet Protocol version 6', 'Core', 3, 'Not applicable', 'Link-layer networks', 'IPv6 packets', 'Address, route, forward', 'RFC 8200', 'IPv6 expands addressing to 128 bits and uses a streamlined fixed header. Neighbor Discovery replaces several IPv4 mechanisms; routers do not fragment packets in transit.', 'IPv6 Host', [
    ['Neighbor solicitation', 'A host resolves the link-layer address of a neighbor.', false, 'ICMPv6', 'Target=2001:db8::1', 'router'],
    ['Neighbor advertisement', 'The neighbor returns link-layer reachability information.', true, 'ICMPv6', 'Target=2001:db8::1', 'router'],
    ['IPv6 delivery', 'A packet follows its route using the IPv6 destination address.', false, 'IPv6', 'Source=2001:db8::10; Destination=2001:db8:1::20'],
  ]],
  ['DNS', 'Domain Name System', 'Core', 7, '53', 'UDP / TCP', 'Binary records', 'QUERY, response', 'RFC 1034 / RFC 1035', 'DNS maps names to records such as IP addresses. Resolvers cache answers for their time-to-live, reducing repeated lookups and the work done by authoritative servers.', 'Authoritative DNS', [
    ['A-record query', 'Ask a recursive resolver for the IPv4 address of example.test.', false, 'DNS', 'QNAME=example.test; QTYPE=A', 'dns'],
    ['Recursive lookup', 'On a cache miss, the resolver follows delegations to an authority.', false, 'DNS', 'QNAME=example.test; recursion path simplified'],
    ['Authoritative answer', 'The authority answers the resolver with an A record. Root and TLD referrals are summarized in this example.', true, 'DNS', 'A=203.0.113.10; TTL=300'],
    ['A-record answer', 'The resolver returns an address and cache lifetime.', true, 'DNS', 'A=203.0.113.10; TTL=300', 'dns'],
  ]],
  ['DNS over HTTPS', 'DNS over HTTPS', 'Security', 7, '443', 'HTTPS', 'DNS wire format / HTTPS', 'GET, POST', 'RFC 8484', 'DoH puts a DNS query inside an HTTPS request. Encryption hides the query from observers on the local path, but the chosen resolver can still see the names being requested.', 'DoH Resolver', [
    ['Secure connection', 'TLS authenticates the HTTPS resolver.', false, 'TLS'],
    ['POST /dns-query', 'A DNS wire-format query is sent as an HTTP body.', false, 'DoH', 'Content-Type=application/dns-message; QNAME=example.test'],
    ['HTTPS DNS response', 'The encrypted response carries the requested DNS records.', true, 'DoH', 'A=203.0.113.10; TTL=300'],
  ]],
  ['DNSSEC', 'DNS Security Extensions', 'Security', 7, '53', 'UDP / TCP', 'Signed DNS records', 'DNSKEY, DS, RRSIG', 'RFC 4033 / RFC 4034 / RFC 4035', 'DNSSEC authenticates DNS data using signatures and a chain of trust. It helps detect forged answers; it does not encrypt DNS queries or prevent all availability failures.', 'Signed DNS Authority', [
    ['Query with DO flag', 'The resolver asks for DNSSEC records along with the answer.', false, 'DNSSEC'],
    ['Answer + RRSIG', 'The authority returns the record set and its signature.', true, 'DNSSEC'],
    ['Fetch DNSKEY / DS', 'The resolver checks keys against the parent delegation.', false, 'DNSSEC'],
    ['Validate chain of trust', 'A validating resolver accepts the answer only if the signatures verify.', true, 'DNSSEC'],
  ]],
  ['DHCP', 'Dynamic Host Configuration Protocol', 'Core', 7, '67 server / 68 client', 'UDP', 'Binary options', 'DISCOVER, OFFER, REQUEST, ACK', 'RFC 2131', 'DHCP lends a host an IP address and network configuration. The lease has a lifetime and can include a gateway, DNS servers, and subnet information.', 'DHCP Server', [
    ['DHCPDISCOVER', 'An unconfigured client broadcasts to find a DHCP server.', false, 'DHCP', 'Source=0.0.0.0; Destination=255.255.255.255'],
    ['DHCPOFFER', 'A server proposes an address and lease parameters.', true, 'DHCP'],
    ['DHCPREQUEST', 'The client selects an offer and requests that lease.', false, 'DHCP'],
    ['DHCPACK', 'The server confirms the configuration and lease duration.', true, 'DHCP', 'Address=192.168.1.10; Lease=3600s'],
  ]],
  ['ICMP', 'Internet Control Message Protocol', 'Core', 3, 'Not applicable', 'IPv4', 'Control messages', 'Echo, unreachable, time exceeded', 'RFC 792', 'ICMP reports network conditions and supports diagnostics. Ping uses echo messages; traceroute relies on time-exceeded messages when a packet reaches its hop limit.', 'Remote Host', [
    ['Echo request', 'The sender issues a diagnostic request with an identifier.', false, 'ICMP', 'Type=8; Code=0; Identifier=42'],
    ['Echo reply', 'The destination returns the matching identifier and data.', true, 'ICMP', 'Type=0; Code=0; Identifier=42'],
    ['Time exceeded', 'A router reports a packet whose TTL expired; shown as a separate diagnostic example.', true, 'ICMP', 'Type=11; Code=0', 'router'],
  ]],
  ['IGMP', 'Internet Group Management Protocol', 'Core', 3, 'Not applicable', 'IPv4', 'Membership messages', 'Query, report, leave', 'RFC 3376', 'IGMP lets IPv4 hosts tell their local router which multicast groups they want to receive. It manages local membership, not routing between distant multicast networks.', 'Multicast Sender', [
    ['General query', 'The local router asks which multicast groups have listeners.', true, 'IGMP', 'Group=0.0.0.0', 'router'],
    ['Membership report', 'The host announces interest in a multicast group.', false, 'IGMP', 'Group=239.1.2.3', 'router'],
    ['Multicast traffic', 'The router forwards matching traffic to the subscribed link.', true, 'IPv4', 'Destination=239.1.2.3', 'router'],
  ]],
  ['NTP', 'Network Time Protocol', 'Application', 7, '123', 'UDP', 'Binary timestamps', 'Time request, response', 'RFC 5905', 'NTP estimates clock offset and network delay from timestamp exchanges. Multiple samples and sources help a host discipline its clock instead of trusting one arrival time.', 'Time Server', [
    ['Time request', 'The client records the instant it sends its query.', false, 'NTP', 'Mode=3; T1=client transmit time'],
    ['Time response', 'The server includes receive and transmit timestamps.', true, 'NTP', 'Mode=4; Stratum=2; T2,T3=server timestamps'],
    ['Clock calculation', 'The client uses T1 through T4 to estimate delay and offset; the final row illustrates a later sample.', false, 'NTP'],
  ]],
  ['Ethernet', 'Ethernet Local Area Networking', 'Core', 2, 'Not applicable', 'Physical link', 'MAC frames', 'Frame, switch, forward', 'IEEE 802.3', 'Ethernet carries frames between devices on a local link. Switches learn source MAC addresses and forward frames toward the destination port; IP packets can ride inside these frames.', 'Local Host', [
    ['ARP request', 'For IPv4, a host first resolves a local IP address into a MAC address.', false, 'ARP', 'Who has 192.168.1.1?', 'router'],
    ['ARP reply', 'The neighbor provides its hardware address.', true, 'ARP', '192.168.1.1 is at 02:00:00:00:00:01', 'router'],
    ['Ethernet frame', 'The sender wraps an IP packet in a frame addressed to the next hop.', false, 'Ethernet', 'EtherType=0x0800', 'router'],
  ]],
  ['PPPoE', 'Point-to-Point Protocol over Ethernet', 'Application', 2, 'Not applicable', 'Ethernet', 'Discovery + session frames', 'PADI, PADO, PADR, PADS', 'RFC 2516', 'PPPoE creates a point-to-point session across an Ethernet network. Broadband access concentrators use discovery to identify clients before carrying PPP traffic.', 'Access Concentrator', [
    ['PADI', 'The client broadcasts a discovery initiation.', false, 'PPPoE'],
    ['PADO', 'An access concentrator offers a service.', true, 'PPPoE'],
    ['PADR', 'The client requests the selected service.', false, 'PPPoE'],
    ['PADS', 'The concentrator assigns a session identifier.', true, 'PPPoE'],
    ['PPP session', 'PPP negotiation and user traffic use the established session.', false, 'PPP'],
  ]],
  ['Wi-Fi', 'Wireless Local Area Networking', 'Core', 2, 'Not applicable', 'Radio', '802.11 frames', 'Probe, authenticate, associate', 'IEEE 802.11', 'Wi-Fi shares a radio channel between stations and access points. Discovery and association establish a local link; contention and acknowledgments coordinate frame delivery.', 'Access Point', [
    ['Probe request', 'A station searches for an available wireless network.', false, '802.11'],
    ['Probe response', 'An access point advertises its capabilities and network name.', true, '802.11'],
    ['Authentication', 'The station performs the authentication required by the chosen network.', false, '802.11'],
    ['Association response', 'The access point admits the station to the network.', true, '802.11'],
    ['Data frame', 'Application traffic travels on the associated wireless link.', false, '802.11'],
  ]],
  ['WPA3', 'Wi-Fi Protected Access 3', 'Security', 2, 'Not applicable', '802.11 / EAPOL', 'Authentication + encrypted frames', 'SAE, key handshake', 'Wi-Fi Alliance WPA3', 'WPA3-Personal uses Simultaneous Authentication of Equals to establish a shared secret. A subsequent key handshake derives traffic keys; protected management frames strengthen the link.', 'WPA3 Access Point', [
    ['SAE commit', 'The station contributes password-authenticated key exchange material.', false, 'SAE'],
    ['SAE commit response', 'The access point contributes its own key material.', true, 'SAE'],
    ['SAE confirm', 'Both sides confirm the shared secret without sending the password.', false, 'SAE'],
    ['Four-way handshake', 'EAPOL messages derive and install traffic keys; summarized as one event.', true, 'EAPOL'],
    ['Encrypted frame', 'Protected data travels across the wireless link.', false, '802.11'],
  ]],
  ['RADIUS', 'Remote Authentication Dial-In User Service', 'Security', 7, '1812 / 1813', 'UDP; TLS variants exist', 'Attribute-value pairs', 'Access-Request, Accept, Reject', 'RFC 2865 / RFC 2866', 'A network access server asks RADIUS to authenticate and authorize a user. Accounting can record session usage; classic RADIUS has limited protection compared with a TLS-protected deployment.', 'RADIUS Server', [
    ['Access-Request', 'A network access server submits identity and authentication attributes.', false, 'RADIUS'],
    ['Access-Challenge', 'The server requests additional authentication information.', true, 'RADIUS'],
    ['Challenge response', 'The access server forwards the user response.', false, 'RADIUS'],
    ['Access-Accept', 'The server grants access and returns policy attributes.', true, 'RADIUS'],
  ]],
  ['Captive Portal', 'Network Access Captive Portal', 'Application', 7, '80 / 443; API 443', 'HTTP / HTTPS', 'HTML + JSON API', 'Discover, sign in, authorize', 'RFC 8908 / RFC 8910', 'A captive portal asks a user to complete an access step before opening normal network connectivity. Modern networks can advertise a portal API rather than relying only on HTTP interception.', 'Portal Server', [
    ['Portal discovery', 'The network advertises a captive-portal API location.', true, 'DHCP', 'Captive portal option'],
    ['Read portal status', 'The client checks whether access is currently restricted.', false, 'HTTPS', 'GET /captive-portal'],
    ['Complete access step', 'The user accepts terms or authenticates through a secure page.', false, 'HTTPS'],
    ['Network access granted', 'The portal status reports that the session is no longer captive.', true, 'HTTPS', 'captive=false'],
  ]],
  ['SMTP', 'Simple Mail Transfer Protocol', 'Application', 7, '25 / 587 / 465', 'TCP; TLS supported', 'Text commands + MIME', 'EHLO, MAIL, RCPT, DATA', 'RFC 5321', 'SMTP moves outgoing mail between clients and mail servers. The envelope identifies delivery addresses, while the message body carries headers and content such as MIME attachments.', 'Mail Server', [
    ['220 greeting', 'The mail server announces that it is ready.', true, 'SMTP'],
    ['EHLO', 'The sender identifies itself and discovers extensions.', false, 'SMTP'],
    ['MAIL FROM + RCPT TO', 'The sender supplies the envelope addresses; two commands are summarized.', false, 'SMTP'],
    ['DATA', 'The message body is transmitted after the server permits it.', false, 'SMTP'],
    ['250 queued', 'The server accepts responsibility for the message.', true, 'SMTP'],
  ]],
  ['POP3', 'Post Office Protocol version 3', 'Application', 7, '110 / 995', 'TCP / TLS', 'Text commands', 'USER, PASS, LIST, RETR', 'RFC 1939', 'POP3 retrieves messages from a mailbox using a simple session. Clients often download mail for local storage; deletion is explicitly requested and committed when the session ends successfully.', 'Mailbox Server', [
    ['+OK greeting', 'The server opens the authorization phase.', true, 'POP3'],
    ['Authenticate', 'The client authenticates; real deployments should protect credentials with TLS.', false, 'POP3', 'USER learner; PASS [redacted]'],
    ['LIST', 'The client requests message numbers and sizes.', false, 'POP3'],
    ['RETR 1', 'The client retrieves a selected message.', false, 'POP3'],
    ['Message content', 'The server streams the message to the client.', true, 'POP3'],
  ]],
  ['IMAP', 'Internet Message Access Protocol', 'Application', 7, '143 / 993', 'TCP / TLS', 'Tagged commands + MIME', 'SELECT, FETCH, STORE', 'RFC 9051', 'IMAP lets clients work with a mailbox that stays on the server. Folders, flags, and selective fetching allow multiple devices to maintain a shared view of messages.', 'IMAP Server', [
    ['Authenticate', 'A secure client session establishes the account identity.', false, 'IMAP'],
    ['SELECT INBOX', 'The client opens a mailbox and reads its current state.', false, 'IMAP'],
    ['Mailbox status', 'The server reports message counts and supported flags.', true, 'IMAP'],
    ['FETCH 1 BODY[]', 'The client requests the content of one message.', false, 'IMAP'],
    ['Message + completion', 'The server returns the data and a tagged completion.', true, 'IMAP'],
  ]],
  ['FTP', 'File Transfer Protocol', 'Application', 7, '21 control / negotiated data', 'TCP', 'Text control + data stream', 'USER, PASV, RETR, STOR', 'RFC 959', 'FTP separates commands from file data into two connections. Passive mode lets the client initiate the data connection. Plain FTP does not protect passwords or file contents.', 'FTP Server', [
    ['Login', 'The client authenticates over the control channel.', false, 'FTP', 'USER learner; PASS [redacted]'],
    ['PASV', 'The client asks the server to listen for a data connection.', false, 'FTP'],
    ['Passive endpoint', 'The server returns the address and port for data transfer.', true, 'FTP'],
    ['RETR notes.txt', 'The control channel requests the desired file.', false, 'FTP'],
    ['File data', 'A separate TCP connection carries the file bytes.', true, 'FTP-DATA'],
  ]],
  ['SMB', 'Server Message Block', 'Application', 7, '445', 'TCP', 'Binary messages', 'NEGOTIATE, CREATE, READ', 'Microsoft SMB2 specification', 'SMB exposes shared files and other resources over a network. Modern SMB negotiates dialects, authenticates a session, and can sign or encrypt messages depending on configuration.', 'File Server', [
    ['NEGOTIATE', 'The client offers supported SMB dialects.', false, 'SMB2'],
    ['SESSION_SETUP', 'Authentication establishes a session with the server.', true, 'SMB2'],
    ['TREE_CONNECT', 'The client connects to a named share.', false, 'SMB2'],
    ['CREATE + READ', 'The client opens a file and requests bytes; summarized here.', false, 'SMB2'],
    ['File response', 'The server returns requested data and access status.', true, 'SMB2'],
  ]],
  ['SSH', 'Secure Shell', 'Security', 7, '22', 'TCP', 'Encrypted binary messages', 'Key exchange, authenticate, channel', 'RFC 4251', 'SSH provides authenticated, encrypted channels for remote access. Host keys identify the server, user authentication grants access, and multiple channels can share one connection.', 'SSH Server', [
    ['Version exchange', 'Both endpoints announce their SSH protocol version.', false, 'SSH'],
    ['Key exchange', 'The server proves its host-key identity and both sides derive session keys.', true, 'SSH'],
    ['User authentication', 'The client proves access, for example using a public key.', false, 'SSH'],
    ['Open channel', 'The client requests a shell or another channel type.', false, 'SSH'],
    ['Encrypted output', 'Terminal output travels inside the protected connection.', true, 'SSH'],
  ]],
  ['TLS/SSL', 'Transport Layer Security', 'Security', 6, 'Application-defined', 'Usually TCP; DTLS uses UDP', 'Encrypted records', 'ClientHello, Finished, application data', 'RFC 8446', 'TLS authenticates peers and protects application data in transit. This lesson uses TLS 1.3. SSL is its obsolete predecessor and should not be used for secure deployments.', 'TLS Server', [
    ['ClientHello', 'The client offers algorithms and a key share.', false, 'TLS'],
    ['ServerHello', 'The server selects the parameters for the connection.', true, 'TLS'],
    ['Certificate + proof', 'A signature demonstrates possession of the certificate private key.', true, 'TLS'],
    ['Finished', 'The handshake transcript is authenticated with derived secrets.', false, 'TLS'],
    ['Application data', 'Symmetric encryption protects subsequent records.', false, 'TLS'],
  ]],
  ['HTTP Proxy', 'Forward HTTP Proxy', 'Application', 7, 'Commonly 3128 / 8080', 'TCP / HTTP', 'HTTP messages', 'Absolute-form GET, CONNECT', 'RFC 9110', 'A forward proxy makes requests on behalf of a client. For HTTPS, CONNECT commonly establishes a byte tunnel so TLS can still run between the client and the destination.', 'Forward Proxy', [
    ['CONNECT example.test:443', 'The client asks the proxy to open a tunnel to a destination.', false, 'HTTP'],
    ['200 Connection Established', 'The proxy confirms that the tunnel is ready.', true, 'HTTP'],
    ['TLS through tunnel', 'The client authenticates the destination across the byte tunnel.', false, 'TLS'],
    ['Encrypted response', 'The proxy relays bytes without necessarily decrypting them.', true, 'TLS'],
  ]],
  ['SOCKS5', 'SOCKS Protocol version 5', 'Application', 5, '1080', 'TCP; UDP relay supported', 'Binary requests', 'CONNECT, BIND, UDP ASSOCIATE', 'RFC 1928', 'SOCKS5 relays traffic without needing to understand the application protocol. Clients negotiate authentication and ask the proxy to connect to an address or domain name.', 'SOCKS Proxy', [
    ['Method negotiation', 'The client lists supported authentication methods.', false, 'SOCKS5'],
    ['Method selected', 'The proxy chooses an acceptable method.', true, 'SOCKS5'],
    ['CONNECT request', 'The client supplies a destination address and port.', false, 'SOCKS5', 'ATYP=domain; Host=example.test; Port=443'],
    ['Connection granted', 'The proxy reports success and its bound endpoint.', true, 'SOCKS5'],
    ['Relayed bytes', 'Application data travels through the established relay.', false, 'TCP'],
  ]],
  ['Reverse Proxy', 'Reverse HTTP Proxy', 'Application', 7, '80 / 443', 'HTTP / HTTPS', 'HTTP messages', 'Route, balance, cache', 'RFC 9110', 'A reverse proxy receives requests for a service and forwards them to an upstream server. It can terminate TLS, route requests, and cache responses without exposing internal server details.', 'Reverse Proxy', [
    ['Client GET /', 'The client addresses the public-facing proxy.', false, 'HTTP'],
    ['Upstream request', 'The proxy chooses a backend and forwards the request; upstream hop simplified.', false, 'HTTP'],
    ['Backend response', 'The upstream returns the resource to the proxy.', true, 'HTTP'],
    ['Client response', 'The proxy sends the result back, possibly adding caching or routing headers.', true, 'HTTP'],
  ]],
  ['WireGuard', 'WireGuard VPN', 'Security', 3, 'Usually 51820', 'UDP', 'Encrypted tunnel packets', 'Initiation, response, transport', 'WireGuard protocol specification', 'WireGuard builds an encrypted IP tunnel from configured peer public keys. A compact authenticated handshake derives keys, and transport messages carry protected inner IP packets.', 'VPN Peer', [
    ['Handshake initiation', 'The initiator sends an ephemeral key and encrypted identity material.', false, 'WireGuard'],
    ['Handshake response', 'The responder authenticates the peer and contributes key material.', true, 'WireGuard'],
    ['Encrypted transport', 'An inner IP packet is encrypted and sent in a UDP message.', false, 'WireGuard'],
    ['Transport reply', 'The peer returns protected tunnel traffic.', true, 'WireGuard'],
  ]],
  ['IPsec', 'Internet Protocol Security', 'Security', 3, 'IKE 500 / NAT-T 4500', 'IP / UDP (NAT traversal)', 'IKE + ESP', 'IKE_SA_INIT, IKE_AUTH, ESP', 'RFC 4301 / RFC 7296', 'IPsec protects IP traffic using negotiated security associations. IKE authenticates peers and manages keys; ESP can encrypt and authenticate packets in tunnel or transport mode.', 'IPsec Gateway', [
    ['IKE_SA_INIT', 'Peers exchange cryptographic proposals, nonces, and Diffie-Hellman material.', false, 'IKEv2'],
    ['IKE_SA_INIT response', 'The responder selects parameters and returns its key contribution.', true, 'IKEv2'],
    ['IKE_AUTH', 'Peers authenticate identities and establish a child security association.', false, 'IKEv2'],
    ['Protected ESP packet', 'An IP packet is carried under the agreed security association.', false, 'ESP'],
    ['ESP response', 'The gateway returns authenticated, encrypted traffic.', true, 'ESP'],
  ]],
  ['Modbus', 'Modbus Application Protocol', 'Application', 7, '502 (Modbus TCP)', 'TCP; serial variants exist', 'Binary function codes', 'Read coils, read/write registers', 'Modbus application specification', 'Modbus uses simple requests to read and write device data. This example uses Modbus TCP, whose transaction identifier pairs responses with requests. Classic Modbus has no built-in authentication.', 'Industrial Controller', [
    ['Read holding registers', 'The client requests two registers starting at address zero.', false, 'Modbus', 'Transaction=1; Unit=1; Function=03; Start=0; Quantity=2'],
    ['Register values', 'The controller returns a byte count and register values.', true, 'Modbus', 'Transaction=1; Function=03; Values=21,42'],
    ['Write single register', 'The client writes one value using function code 06.', false, 'Modbus', 'Transaction=2; Function=06; Address=1; Value=43'],
    ['Write acknowledgment', 'The device echoes the address and value for a successful write.', true, 'Modbus'],
  ]],
];

export const protocols: Protocol[] = definitions.map(([name, longName, category, layer, port, transport, format, methods, standard, description, server, events]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
  name, longName, category, layer, port, transport, format, methods, standard, description, server,
  steps: events.map(([title, explanation]) => ({ title, explanation })),
  packets: events.map(([info, , reply = false, wire = name, payload = info, endpoint = 'server'], step) => ({
    source: reply ? endpoint : 'client',
    destination: reply ? 'client' : endpoint,
    protocol: wire, info, size: wire === 'TCP' ? 66 : 80 + payload.length,
    kind: wire.startsWith('DNS') ? 'dns' : wire === 'TCP' ? 'tcp' : reply ? 'response' : 'request',
    step, payload,
  })),
}));

const http = protocols[0];
http.packets = [
  { source: 'client', destination: 'dns', protocol: 'DNS', info: 'Standard query A example.test', size: 72, kind: 'dns', step: 1, payload: 'QNAME=example.test; QTYPE=A; ID=0x4a2b' },
  { source: 'dns', destination: 'client', protocol: 'DNS', info: 'Standard query response A 203.0.113.10', size: 88, kind: 'dns', step: 1, payload: 'ID=0x4a2b; A=203.0.113.10; TTL=300' },
  { source: 'client', destination: 'server', protocol: 'TCP', info: '51432 → 80 [SYN] Seq=0', size: 66, kind: 'tcp', step: 2, payload: 'Flags=SYN; Seq=0; Window=65535; MSS=1460' },
  { source: 'server', destination: 'client', protocol: 'TCP', info: '80 → 51432 [SYN, ACK] Seq=0 Ack=1', size: 66, kind: 'tcp', step: 2, payload: 'Flags=SYN,ACK; Seq=0; Ack=1; Window=65535' },
  { source: 'client', destination: 'server', protocol: 'TCP', info: '51432 → 80 [ACK] Seq=1 Ack=1', size: 60, kind: 'tcp', step: 2, payload: 'Flags=ACK; Seq=1; Ack=1' },
  { source: 'client', destination: 'server', protocol: 'HTTP', info: 'GET / HTTP/1.1', size: 132, kind: 'request', step: 3, payload: 'GET / HTTP/1.1\r\nHost: example.test\r\nAccept: text/html\r\n\r\n' },
  { source: 'server', destination: 'client', protocol: 'HTTP', info: 'HTTP/1.1 200 OK (text/html)', size: 248, kind: 'response', step: 3, payload: 'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 25\r\n\r\n<h1>Hello, internet.</h1>' },
];

const dns = protocols.find(p => p.name === 'DNS')!;
dns.packets[1].source = 'dns';
dns.packets[2].destination = 'dns';
const dnsWire = (reply: boolean, recursive = true): WireExample => ({ type: 'dns', id: 0x4a2b, name: 'example.test', sourcePort: reply ? 53 : 51432, destinationPort: reply ? 51432 : 53, recursive, ...(reply ? { answer: '203.0.113.10', ttl: 300, authoritative: !recursive } : {}) });
http.packets[0].wire = dnsWire(false);
http.packets[1].wire = dnsWire(true);
dns.packets.forEach((packet, index) => { packet.wire = dnsWire(index >= 2, index === 0 || index === 3); });
const tcpWire = (sourcePort: number, destinationPort: number, sequence: number, acknowledgment: number, flags: number, synOptions = false): WireExample => ({ type: 'tcp', sourcePort, destinationPort, sequence, acknowledgment, flags, synOptions });
http.packets[2].wire = tcpWire(51432, 80, 0, 0, 2, true);
http.packets[3].wire = tcpWire(80, 51432, 0, 1, 18, true);
http.packets[4].wire = tcpWire(51432, 80, 1, 1, 16);
http.packets[5].wire = { type: 'http', sourcePort: 51432, destinationPort: 80, sequence: 1, acknowledgment: 1, flags: 24 };
http.packets[6].wire = { type: 'http', sourcePort: 80, destinationPort: 51432, sequence: 1, acknowledgment: 1 + new TextEncoder().encode(http.packets[5].payload).length, flags: 24 };
const tcp = protocols.find(p => p.name === 'TCP')!;
tcp.packets[0].wire = tcpWire(51432, 80, 1000, 0, 2, true);
tcp.packets[1].wire = tcpWire(80, 51432, 5000, 1001, 18, true);
tcp.packets[2].wire = tcpWire(51432, 80, 1001, 5001, 16);
const ip = protocols.find(p => p.name === 'IP')!;
ip.packets[1].source = 'router';
const reverseProxy = protocols.find(p => p.name === 'Reverse Proxy')!;
reverseProxy.packets[1].source = 'server';
reverseProxy.packets[1].destination = 'internet';
reverseProxy.packets[2].source = 'internet';
reverseProxy.packets[2].destination = 'server';

export const layerNames = ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'];
export const nodeAddresses: Record<NodeId, string> = { client: '192.168.1.10', router: '192.168.1.1', dns: '8.8.8.8', server: '203.0.113.10', internet: 'Wide area network' };
export function addressFor(id: NodeId, protocol: Protocol): string {
  if (protocol.name === 'IPv6') return { client: '2001:db8::10', router: '2001:db8::1', server: '2001:db8:1::20', dns: '2001:db8::53', internet: 'IPv6 network' }[id];
  if (protocol.name === 'DHCP' && id === 'client') return '0.0.0.0 → leased address';
  return nodeAddresses[id];
}
export function packetTime(index: number): string { return (index * 0.028 + (index > 1 ? 0.012 : 0)).toFixed(3); }

for (const protocol of protocols) {
  for (const [index, packet] of protocol.packets.entries()) {
    const decoded = decodePacket(packet, addressFor(packet.source, protocol), addressFor(packet.destination, protocol), index);
    if (decoded) packet.size = decoded.bytes.length;
  }
}
