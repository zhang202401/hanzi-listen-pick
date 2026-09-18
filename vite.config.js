import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径，方便部署到任意子目录（GitHub Pages / Netlify 子路径）
  base: './',
  server: {
    host: true, // 监听局域网，手机扫码真机调试
    port: 5273,
  },
  build: {
    target: 'es2018', // 兼容老 iOS Safari（可选链等 ES2020 语法会自动降级）
    assetsInlineLimit: 0, // 素材文件保持独立，便于热替换
  },
});
