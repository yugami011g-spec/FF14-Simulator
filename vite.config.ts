import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages(プロジェクトページ: <user>.github.io/FF14-Simulator/)配信のため、
  // アセットの参照パスをリポジトリ名配下に固定する。
  base: '/FF14-Simulator/',
  plugins: [react()],
})
