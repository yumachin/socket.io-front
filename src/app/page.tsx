'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '../lib/socket';

// ユニークなユーザーIDを生成する関数
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      socket.emit('setUserId', { userId: storedUserId, userName: storedUserName });
    };

    // イベントリスナーを先に登録
    interface RoomEventData {
      password: string;
    }

    const handleRoomCreated = (data: RoomEventData) => {
      console.log('Room created, navigating to:', `/room/${encodeURIComponent(data.password)}`);
      // URLエンコーディングを使用
      router.push(`/room/${encodeURIComponent(data.password)}`);
    };

    interface RoomJoinedEventData {
      password: string;
    }

    const handleRoomJoined = (data: RoomJoinedEventData) => {
      console.log('Room joined, navigating to:', `/room/${encodeURIComponent(data.password)}`);
      // URLエンコーディングを使用
      router.push(`/room/${encodeURIComponent(data.password)}`);
    };

    interface SocketErrorData {
      message: string;
      [key: string]: any;
    }

    const handleError = (data: SocketErrorData) => {
      console.error('Socket error:', data);
      alert(data.message);
    };

    // イベントリスナーを登録
    socket.on('roomCreated', handleRoomCreated);
    socket.on('roomJoined', handleRoomJoined);
    socket.on('error', handleError);

    // 接続処理
    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('roomCreated', handleRoomCreated);
      socket.off('roomJoined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [router]);

  const handleCreateRoom = () => {
    if (password.trim() && userName.trim()) {
      console.log('Creating room with:', { password, userId, userName });
      // ユーザー名が変更された場合はsessionStorageを更新
      sessionStorage.setItem('userName', userName);
      socket.emit('createRoom', { password, user: { id: userId, name: userName } });
    }
  };

  const handleJoinRoom = () => {
    if (password.trim() && userName.trim()) {
      console.log('Joining room with:', { password, userId, userName });
      // ユーザー名が変更された場合はsessionStorageを更新
      sessionStorage.setItem('userName', userName);
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
        />
        <input
          type="text"
          placeholder="合言葉 (ひらがな、記号も使用可能)"
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
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        ユーザーID: {userId}
      </div>
    </div>
  );
}