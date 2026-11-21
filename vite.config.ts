import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // The pinned Lightning CSS ESM entry fails to import on the workspace's Node version.
    cssMinify: false,
  },
});
