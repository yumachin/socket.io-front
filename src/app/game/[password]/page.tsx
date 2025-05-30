'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '../../../lib/socket';

interface GameState {
  question: string;
  options: string[];
  timeLeft: number;
  waitingForUsers: string[];
  allUsersReady: boolean;
  gamePhase: 'waiting' | 'showQuestion' | 'answering' | 'results';
  questionNumber: number;
  totalQuestions: number;
  correctAnswer?: number;
  correctAnswerText?: string;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const encodedPassword = params.password as string;
  const password = decodeURIComponent(encodedPassword);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questionDisplayTime, setQuestionDisplayTime] = useState(5);
  const [canAnswer, setCanAnswer] = useState(false);
  const [currentTimeLeft, setCurrentTimeLeft] = useState(15);

  useEffect(() => {
    // sessionStorageからユーザー情報を取得
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    
    if (!userId || !userName) {
      window.location.href = '/';
      return;
    }

    // 接続が確立されていることを確認
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      socket.emit('setUserId', { userId, userName });
      // ゲームページに到達したことをサーバーに通知
      socket.emit('userReadyForGame', { password, userId });
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    // ゲーム状態の更新
    socket.on('gameStateUpdate', (data: GameState) => {
      setGameState(data);
      if (data.timeLeft !== undefined) {
        setCurrentTimeLeft(data.timeLeft);
      }
      
      if (data.gamePhase === 'showQuestion') {
        setSelectedAnswer(null);
        setCanAnswer(false);
        setQuestionDisplayTime(5);
        
        // 5秒間問題を表示してから回答可能にする
        const timer = setInterval(() => {
          setQuestionDisplayTime(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanAnswer(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      }
    });

    // 時間更新の受信
    socket.on('timeUpdate', (data: { timeLeft: number; totalTimeLeft: number }) => {
      setCurrentTimeLeft(data.timeLeft);
    });

    // エラーハンドリング
    socket.on('error', (data) => {
      alert(data.message);
      router.push('/');
    });

    // ゲーム終了
    socket.on('gameEnded', (results) => {
      alert('ゲーム終了！結果: ' + JSON.stringify(results));
      router.push(`/room/${encodeURIComponent(password)}`);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('gameStateUpdate');
      socket.off('timeUpdate');
      socket.off('error');
      socket.off('gameEnded');
    };
  }, [password, router]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (!canAnswer || selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    const userId = sessionStorage.getItem('userId');
    socket.emit('submitAnswer', { 
      password, 
      userId, 
      answerIndex,
      timeLeft: currentTimeLeft
    });
  };

  if (!gameState) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>ゲームを読み込み中...</h2>
        <div>少々お待ちください</div>
      </div>
    );
  }

  if (gameState.gamePhase === 'waiting') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>ユーザーを待っています...</h2>
        <div style={{ marginTop: '20px' }}>
          <p>準備完了: {gameState.waitingForUsers ? 
            gameState.waitingForUsers.length : 0} 人</p>
          {gameState.waitingForUsers && (
            <ul>
              {gameState.waitingForUsers.map((userName, index) => (
                <li key={index}>{userName}</li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ marginTop: '20px' }}>
          <div className="loading-spinner">⏳</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1>クイズゲーム</h1>
        <p>問題 {gameState.questionNumber} / {gameState.totalQuestions}</p>
        {canAnswer && currentTimeLeft > 0 && (
          <p style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            color: currentTimeLeft <= 10 ? '#dc3545' : '#007bff'
          }}>
            残り時間: {currentTimeLeft}秒
          </p>
        )}
      </div>

      {gameState.gamePhase === 'showQuestion' && !canAnswer && (
        <div style={{ 
          textAlign: 'center', 
          backgroundColor: '#f8f9fa', 
          padding: '30px', 
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h2>{gameState.question}</h2>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#007bff',
            marginTop: '20px'
          }}>
            問題表示中... {questionDisplayTime}秒
          </div>
          <p style={{ color: '#666' }}>
            問題をよく読んでください。まもなく回答できるようになります。
          </p>
        </div>
      )}

      {(gameState.gamePhase === 'showQuestion' && canAnswer) || gameState.gamePhase === 'answering' ? (
        <div>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h2>{gameState.question}</h2>
          </div>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            {gameState.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null || !canAnswer}
                style={{
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: selectedAnswer === index ? '#007bff' : '#fff',
                  color: selectedAnswer === index ? '#fff' : '#000',
                  cursor: selectedAnswer !== null || !canAnswer ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>

          {selectedAnswer !== null && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '20px',
              color: '#28a745',
              fontWeight: 'bold'
            }}>
              回答を送信しました！他のプレイヤーを待っています...
            </div>
          )}
        </div>
      ) : gameState.gamePhase === 'results' ? (
        <div style={{ textAlign: 'center' }}>
          <h2>結果発表</h2>
          {gameState.correctAnswer !== undefined && (
            <div style={{ 
              backgroundColor: '#d4edda', 
              padding: '20px', 
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h3>正解: {String.fromCharCode(65 + gameState.correctAnswer)}. {gameState.correctAnswerText}</h3>
              {selectedAnswer === gameState.correctAnswer ? (
                <p style={{ color: '#28a745', fontWeight: 'bold' }}>🎉 正解です！</p>
              ) : (
                <p style={{ color: '#dc3545', fontWeight: 'bold' }}>❌ 不正解</p>
              )}
            </div>
          )}
          <p>次の問題まで少々お待ちください...</p>
        </div>
      ) : null}
    </div>
  );
}