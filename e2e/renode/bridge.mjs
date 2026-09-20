// WebSocket <-> TCP bridge.
//
// The browser cannot open a raw TCP socket, so this tiny Node process is the
// single TCP client of renode_serve.py's Studio relay (RPC_PORT) -- which
// carries the DUT's raw Studio USB-CDC byte stream -- and relays those bytes,
// transparently and unframed, over a WebSocket that the injected
// `navigator.serial` shim in the page connects to.
//
// It opens the TCP connection ONCE at startup and buffers any device->host
// bytes until a browser WebSocket attaches.
import net from "node:net";
import { WebSocketServer } from "ws";

const RPC_PORT = Number(process.env.RPC_PORT);
const WS_PORT = Number(process.env.WS_PORT || 8788);
const DEBUG = !!process.env.E2E_DEBUG;
if (!RPC_PORT) {
  console.error("RPC_PORT env var required");
  process.exit(1);
}

let ws = null; // current browser socket (single browser client)
const pending = []; // device->host bytes buffered until a browser attaches

const tcp = net.createConnection({ host: "127.0.0.1", port: RPC_PORT }, () => {
  console.error(`bridge: TCP connected to Studio relay :${RPC_PORT}`);
});
tcp.on("data", (buf) => {
  if (DEBUG)
    console.error(
      `bridge: device->host ${buf.length}B ${buf.subarray(0, 16).toString("hex")}`,
    );
  if (ws && ws.readyState === ws.OPEN) ws.send(buf);
  else pending.push(buf);
});
tcp.on("error", (e) => console.error("bridge: TCP error", e.message));
tcp.on("close", () => {
  console.error("bridge: TCP closed");
  if (ws) ws.close();
});

const wss = new WebSocketServer({ port: WS_PORT }, () => {
  console.error(`BRIDGE_READY ws://127.0.0.1:${WS_PORT} -> tcp :${RPC_PORT}`);
});
wss.on("connection", (sock) => {
  console.error("bridge: browser WebSocket attached");
  ws = sock;
  sock.binaryType = "nodebuffer";
  while (pending.length) sock.send(pending.shift());
  sock.on("message", (data) => {
    if (DEBUG)
      console.error(
        `bridge: host->device ${data.length}B ${data.subarray(0, 16).toString("hex")}`,
      );
    tcp.write(data);
  });
  sock.on("close", () => {
    console.error("bridge: browser WebSocket detached");
    if (ws === sock) ws = null;
  });
  sock.on("error", (e) => console.error("bridge: ws error", e.message));
});
