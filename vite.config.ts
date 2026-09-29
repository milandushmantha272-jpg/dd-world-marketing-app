import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig,loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),''); const target=env.VITE_APP_TARGET||'';
 const roots={agent:'apps/agent-app',management:'apps/management-app',audit:'apps/audit-app'} as Record<string,string>;
 return {root:roots[target]?path.resolve(__dirname,roots[target]):__dirname,base:'./',publicDir:path.resolve(__dirname,'public'),
 plugins:[react(),tailwindcss(),VitePWA({registerType:'autoUpdate',includeAssets:['favicon.ico','apple-touch-icon.png','icon.svg','pwa-192x192.png','pwa-512x512.png','pwa-maskable-512x512.png'],manifest:{id:target||'ddworld',name:target==='agent'?'DD WORLD Agent App':target==='management'?'DD WORLD Management App':target==='audit'?'DD WORLD Audit Portal':'DD WORLD MARKETING',short_name:target==='agent'?'DD Agent':target==='management'?'DD Management':target==='audit'?'DD Audit':'DDWorld',description:'DD WORLD secure institutional mobile platform',theme_color:'#14213d',background_color:'#f5f8fc',display:'standalone',start_url:'./',scope:'./',icons:[{src:'/pwa-192x192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/pwa-512x512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/pwa-maskable-512x512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},workbox:{maximumFileSizeToCacheInBytes:15*1024*1024,globPatterns:['**/*.{js,css,html,ico,png,svg,woff,woff2,json}']}})],
 define:{'process.env.GOOGLE_MAPS_PLATFORM_KEY':JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY||'')},resolve:{alias:{'@':path.resolve(__dirname,'.')}}
 };
});