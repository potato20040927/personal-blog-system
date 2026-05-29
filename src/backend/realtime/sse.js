const sseClients = new Set();

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.write(payload);
  });
}

function registerSseRoute(app) {
  app.get('/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.flushHeaders();
    res.write('retry: 10000\n\n');

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });
}

module.exports = {
  broadcastSSE,
  registerSseRoute,
};
