'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '../../../lib/socket';

interface Member {
  id: string;
  name: string;
}

interface RoomInfo {
  host: string;
  members: Member[];
  status: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  // URLデコーディングを使用してパスワードを取得
  const encodedPassword = params.password as string;
  const password = decodeURIComponent(encodedPassword);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // sessionStorageからユーザー情報を取得
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    
    console.log('Room page - Password:', password, 'Encoded:', encodedPassword);
    
    if (!userId || !userName) {
      // ユーザー情報がない場合はホームページにリダイレクト
      window.location.href = '/';
      return;
    }

    // 接続が確立されていることを確認
    if (!socket.connected) {
      socket.connect();
    }
    
    // socket.idが確定してからルーム情報を取得
    const handleConnect = () => {
      socket.emit('setUserId', { userId, userName });
      // デコードされたパスワードを使用
      socket.emit('getRoomInfo', { password, userId });
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    socket.on('updateRoom', (data: RoomInfo) => {
      setRoomInfo(data);
      setIsHost(userId === data.host);
    });
    
    socket.on('gameStarted', () => {
        console.log('Game started, navigating to game page');
        // ゲームページに遷移
        router.push(`/game/${encodeURIComponent(password)}`);
    });
    
    socket.on('error', (data) => {
        alert(data.message);
    });

    // ルーム退出完了時の処理
    socket.on('roomLeft', () => {
      router.push('/');
    });

    // ルームが削除された時の処理（ホストが退出した場合など）
    socket.on('roomDeleted', () => {
      alert('ルームが削除されました。');
      router.push('/');
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('updateRoom');
      socket.off('gameStarted');
      socket.off('error');
      socket.off('roomLeft');
      socket.off('roomDeleted');
    };
  }, [password, router, encodedPassword]);

  const handleStartGame = () => {
      // デコードされたパスワードを使用
      socket.emit('startGame', { password });
  };

  const handleLeaveRoom = () => {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      // デコードされたパスワードを使用
      socket.emit('leaveRoom', { password, userId });
    }
  };
  
  if (!roomInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>ルーム: {password}</h1>
      <h2>参加者 ({roomInfo.members.length} / 6)</h2>
      <ul>
        {roomInfo.members.map((member) => (
          <li key={member.id}>
            {member.name} {member.id === roomInfo.host ? '👑 (ホスト)' : ''}
          </li>
        ))}
      </ul>
      
      <div style={{ marginTop: '20px' }}>
        {isHost && (
          <button 
            onClick={handleStartGame}
            disabled={roomInfo.members.length < 2 || roomInfo.status === 'playing'}
            style={{ marginRight: '10px' }}
          >
            {roomInfo.members.length < 2 ? '2人以上で開始できます' : 'ゲームスタート！'}
          </button>
        )}
        
        <button 
          onClick={handleLeaveRoom}
          style={{ 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            cursor: 'pointer' 
          }}
        >
          ルームを退出
        </button>
      </div>
    </div>
  );
}