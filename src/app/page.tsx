'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';

// ユニークなユーザーIDを生成する関数
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export default function Home() {
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    // sessionStorageからユーザーIDとユーザー名を取得、なければ生成
    let storedUserId = sessionStorage.getItem('userId');
    let storedUserName = sessionStorage.getItem('userName');
    
    if (!storedUserId) {
      storedUserId = generateUserId();
      sessionStorage.setItem('userId', storedUserId);
    }
    
    if (!storedUserName) {
      storedUserName = `User-${Math.random().toString(36).substr(2, 5)}`;
      sessionStorage.setItem('userName', storedUserName);
    }
    
    setUserId(storedUserId);
    setUserName(storedUserName);
    
    // サーバーに接続
    if (!socket.connected) {
      socket.connect();
    }

    // 接続時にユーザーIDを送信
    const handleConnect = () => {
      socket.emit('setUserInfo', { userId: storedUserId, userName: storedUserName });
    };

    // ルーム作成と参加のイベントハンドラ
    const handleRoomCreated = ( data: { password: string} ) => {
      console.log('ルームを作成しました。遷移先は...', `/room/${encodeURIComponent(data.password)}`);
      // URLエンコーディングを使用
      router.push(`/room/${encodeURIComponent(data.password)}`);
    };

    const handleRoomJoined = ( data: { password: string} ) => {
      console.log('ルームに参加しました。遷移先は...', `/room/${encodeURIComponent(data.password)}`);
      // URLエンコーディングを使用
      router.push(`/room/${encodeURIComponent(data.password)}`);
    };

    const handleError = ( data: { message: string, [key: string]: any } ) => {
      console.error('Socketエラー：', data);
      alert(data.message);
    };

    // イベントリスナーを登録
    socket.on('roomCreated', handleRoomCreated);
    socket.on('roomJoined', handleRoomJoined);
    socket.on('error', handleError);

    // ユーザーIdとユーザーネームの登録
    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    // コンポーネントのアンマウント時に全てのイベントリスナーをクリーンアップ
    return () => {
      socket.off('connect', handleConnect);
      socket.off('roomCreated', handleRoomCreated);
      socket.off('roomJoined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [router]);

  const handleCreateRoom = () => {
    if (password.trim() && userName.trim()) {
      console.log('以下の内容を使って、ルームを作成します：', { password, userId, userName });
      socket.emit('createRoom', { password, user: { id: userId, name: userName } });
    }
  };

  const handleJoinRoom = () => {
    if (password.trim() && userName.trim()) {
      console.log('以下の内容を使って、ルームに参加します：', { password, userId, userName });
      socket.emit('joinRoom', { password, user: { id: userId, name: userName } });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>ルームを作成または参加</h1>
      <div>
        <input
          type="text"
          placeholder="ユーザー名"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={{ marginBottom: '10px', display: 'block' }}
          readOnly
        />
        <input
          type="text"
          placeholder="合言葉"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: '10px', display: 'block' }}
          className="border px-2 py-1"
        />
        <button onClick={handleCreateRoom} style={{ marginRight: '10px'}} className='border-1'>
          ルームを作成
        </button>
        <button onClick={handleJoinRoom} className='border-1'>
          ルームに参加
        </button>
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        ユーザーID: {userId}
      </div>
    </div>
  );
}