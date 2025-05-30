'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  const password = params.password as string;
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    // ルーム情報の取得のみを行い、joinRoomは行わない
    // 既にルーム作成時やルーム参加時にjoinRoomが実行されているため
    socket.emit('getRoomInfo', { password });

    socket.on('updateRoom', (data: RoomInfo) => {
      setRoomInfo(data);
      setIsHost(socket.id === data.host);
    });
    
    socket.on('gameStarted', () => {
        alert('ゲームスタート！');
        // ここでゲーム画面に遷移するなどの処理を行う
    });
    
    socket.on('error', (data) => {
        alert(data.message);
    });

    return () => {
      socket.off('updateRoom');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, [password]);

  const handleStartGame = () => {
      socket.emit('startGame', { password });
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
      
      {isHost && (
        <button 
          onClick={handleStartGame}
          disabled={roomInfo.members.length < 2 || roomInfo.status === 'playing'}
        >
          {roomInfo.members.length < 2 ? '2人以上で開始できます' : 'ゲームスタート！'}
        </button>
      )}
    </div>
  );
}