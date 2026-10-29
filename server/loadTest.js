/**
 * DevFest 2026 Concurrency Benchmark & Load Tester
 * Spawns up to 1,000 real WebSocket clients to stress-test your server.
 * Usage: node server/loadTest.js [pin] [count]
 */

const path = require('path');
const { io } = require(path.join(__dirname, '..', 'client', 'node_modules', 'socket.io-client'));

const serverUrl = process.env.SERVER_URL || 'http://localhost:4000';
const pin = process.argv[2];
const count = parseInt(process.argv[3] || '200', 10);

if (!pin) {
  console.error('Usage: node server/loadTest.js <PIN> [CLIENT_COUNT]');
  console.error('Example: node server/loadTest.js 482913 500');
  process.exit(1);
}

console.log(`=======================================================`);
console.log(`🚀 Starting Concurrency Test for DevFest 2026`);
console.log(`Connecting ${count} virtual participants to PIN: ${pin}`);
console.log(`Target Server: ${serverUrl}`);
console.log(`=======================================================\n`);

let connected = 0;
let joined = 0;
let answersSubmitted = 0;
const sockets = [];

const devNames = ['Gopher', 'FlutterDev', 'CloudNinja', 'ByteCrafter', 'TensorPro', 'BugSlayer', 'ReactRuler'];

for (let i = 1; i <= count; i++) {
  // Stagger connections slightly over 2-3 seconds to simulate realistic audience entry
  setTimeout(() => {
    const s = io(serverUrl, { transports: ['websocket'] });
    const name = `${devNames[i % devNames.length]}_${i}`;

    s.on('connect', () => {
      connected++;
      s.emit('player:join', { pin, nickname: name, avatar: '⚡' }, (res) => {
        if (res?.success) {
          joined++;
          if (joined % 50 === 0 || joined === count) {
            console.log(`[Status] ${joined} / ${count} players joined lobby!`);
          }
        }
      });
    });

    s.on('player:question-active', (data) => {
      // Simulate human reaction time between 500ms and 4500ms
      const delay = Math.floor(500 + Math.random() * 4000);
      setTimeout(() => {
        const pick = Math.floor(Math.random() * (data.optionsCount || 4));
        s.emit('player:submit-answer', { answerIndex: pick }, () => {
          answersSubmitted++;
        });
      }, delay);
    });

    s.on('disconnect', () => {
      connected--;
    });

    sockets.push(s);
  }, i * 3);
}

setInterval(() => {
  console.log(`[Live Health] Connected: ${connected} | In Lobby: ${joined} | Answers Submitted: ${answersSubmitted}`);
}, 5000);

process.on('SIGINT', () => {
  console.log('\nClosing all client sockets...');
  sockets.forEach(s => s.disconnect());
  process.exit(0);
});
