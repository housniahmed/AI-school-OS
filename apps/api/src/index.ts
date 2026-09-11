import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.PORT, () => console.log(`AI School OS API listening on http://localhost:${env.PORT}`));
