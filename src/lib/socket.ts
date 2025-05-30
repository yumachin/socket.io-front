import { io } from 'socket.io-client';

// バックエンドサーバーのURL
const URL = 'http://localhost:4000'; 

export const socket = io(URL, {
  autoConnect: false, // 自動接続をオフにする
});