import { connectToDatabase } from './config/db';
import { env } from './config/env';
import { createApp } from './app';
import { registerEventListeners } from './events/registerListeners';

async function main() {
  await connectToDatabase();
  registerEventListeners();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    console.log(`Docs available on http://localhost:${env.PORT}/docs`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

