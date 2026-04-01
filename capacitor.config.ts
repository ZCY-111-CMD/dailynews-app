import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailynews.app',
  appName: '远望日报',
  webDir: 'dist',
  server: {
    // APP 直接加载线上网站，所有 /api 请求自动走 Nginx 代理到后端
    url: 'http://121.43.231.87',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f43f5e',
    },
  },
};

export default config;
