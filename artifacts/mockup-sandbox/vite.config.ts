// TypeScript (vite.config.ts)
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Provide a default port and only apply server.port for dev (serve)
  const port = process.env.PORT ?? '5173';

  if (command === 'serve') {
    return {
      server: {
        port: Number(port),
      },
      // ...other dev-only config
    };
  }

  return {
    // production build config — do NOT require PORT here
    // ...other build config
  };
});
