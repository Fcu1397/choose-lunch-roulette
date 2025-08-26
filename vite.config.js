import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

export default defineConfig({
    plugins: [
        vue(),
        // 自定義插件：複製 manifest.json 和 images 資料夾
        {
            name: 'copy-extension-files',
            writeBundle() {
                // 確保 dist 目錄存在
                if (!existsSync('dist')) {
                    mkdirSync('dist', { recursive: true })
                }

                // 複製 manifest.json
                try {
                    copyFileSync('manifest.json', 'dist/manifest.json')
                    console.log('✓ 已複製 manifest.json 到 dist/')
                } catch (error) {
                    console.error('複製 manifest.json 失敗:', error)
                }

                // 複製 images 資料夾
                try {
                    if (!existsSync('dist/images')) {
                        mkdirSync('dist/images', { recursive: true })
                    }

                    if (existsSync('images/icon.svg')) {
                        copyFileSync('images/icon.svg', 'dist/images/icon.svg')
                        console.log('✓ 已複製 images/icon.svg 到 dist/images/')
                    }
                } catch (error) {
                    console.error('複製 images 資料夾失敗:', error)
                }
            }
        }
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html'),
                options: resolve(__dirname, 'options.html')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        }
    }
})