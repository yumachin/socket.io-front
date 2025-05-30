'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';

export default function Home() {
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    // ユーザー名をランダムに生成（サンプル）
    setUserName(`User-${Math.random().toString(36).substr(2, 5)}`);
    
    // サーバーに接続
    socket.connect();

    // イベントリスナーを登録
    socket.on('roomCreated', (data) => {
      router.push(`/room/${data.password}`);
    });

    socket.on('roomJoined', (data) => {
      router.push(`/room/${data.password}`);
    });

    socket.on('error', (data) => {
      alert(data.message);
    });

    // コンポーネントがアンマウントされるときにリスナーをクリーンアップ
    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('error');
      socket.disconnect();
    };
  }, [router]);

  const handleCreateRoom = () => {
    if (password.trim() && userName.trim()) {
      socket.emit('createRoom', { password, user: { name: userName } });
    }
  };

  const handleJoinRoom = () => {
    if (password.trim() && userName.trim()) {
      socket.emit('joinRoom', { password, user: { name: userName } });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>ルームを作成または参加</h1>
      <div>
        <input
          type="text"
          placeholder="ユーザー名 (自動生成)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          readOnly // サンプルのため編集不可
          style={{ marginBottom: '10px', display: 'block' }}
        />
        <input
          type="text"
          placeholder="合言葉"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: '10px', display: 'block' }}
        />
        <button onClick={handleCreateRoom} style={{ marginRight: '10px' }}>
          ルームを作成
        </button>
        <button onClick={handleJoinRoom}>
          ルームに参加
        </button>
      </div>
    </div>
  );
}