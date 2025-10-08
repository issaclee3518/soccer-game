import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  StatusBar,
  PanResponder
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: number;
  position: Position;
  color: string;
  score: number;
}

interface Ball {
  position: Position;
  velocity: Position;
}

const FIELD_WIDTH = screenWidth - 40;
const FIELD_HEIGHT = screenHeight - 250;
const GOAL_WIDTH = 100;
const GOAL_HEIGHT = 60;
const PLAYER_SIZE = 30;
const BALL_SIZE = 20;

export default function SoccerGame() {
  const [player1, setPlayer1] = useState<Player>({
    id: 1,
    position: { x: FIELD_WIDTH / 2 - 100, y: FIELD_HEIGHT / 2 },
    color: '#4CAF50',
    score: 0
  });

  const [player2, setPlayer2] = useState<Player>({
    id: 2,
    position: { x: FIELD_WIDTH / 2 + 100, y: FIELD_HEIGHT / 2 },
    color: '#2196F3',
    score: 0
  });

  const [ball, setBall] = useState<Ball>({
    position: { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 },
    velocity: { x: 0, y: 0 }
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // 키보드 입력 상태
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const playerSpeed = 5; // 플레이어 이동 속도

  // 플레이어 1 조작
  const player1PanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => gameStarted,
    onMoveShouldSetPanResponder: () => gameStarted,
    onPanResponderMove: (evt) => {
      if (gameStarted) {
        movePlayer(1, {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY
        });
      }
    },
  });

  // 플레이어 2 조작
  const player2PanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => gameStarted,
    onMoveShouldSetPanResponder: () => gameStarted,
    onPanResponderMove: (evt) => {
      if (gameStarted) {
        movePlayer(2, {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY
        });
      }
    },
  });

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(event.key.toLowerCase()));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.key.toLowerCase());
        return newSet;
      });
    };

    // 웹 환경에서만 키보드 이벤트 추가
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }
    };
  }, []);

  // 게임 루프
  useEffect(() => {
    if (gameStarted && !winner) {
      gameLoopRef.current = setInterval(() => {
        updateBall();
        checkCollisions();
        checkGoals();
        updatePlayerMovement();
      }, 16); // 60 FPS
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, winner, ball, player1, player2, keysPressed]);

  const updateBall = () => {
    setBall(prevBall => {
      let newX = prevBall.position.x + prevBall.velocity.x;
      let newY = prevBall.position.y + prevBall.velocity.y;
      let newVelX = prevBall.velocity.x * 0.98; // 마찰
      let newVelY = prevBall.velocity.y * 0.98;

      // 벽 충돌
      if (newX <= BALL_SIZE / 2 || newX >= FIELD_WIDTH - BALL_SIZE / 2) {
        newVelX *= -0.8;
        newX = newX <= BALL_SIZE / 2 ? BALL_SIZE / 2 : FIELD_WIDTH - BALL_SIZE / 2;
      }
      if (newY <= BALL_SIZE / 2 || newY >= FIELD_HEIGHT - BALL_SIZE / 2) {
        newVelY *= -0.8;
        newY = newY <= BALL_SIZE / 2 ? BALL_SIZE / 2 : FIELD_HEIGHT - BALL_SIZE / 2;
      }

      return {
        position: { x: newX, y: newY },
        velocity: { x: newVelX, y: newVelY }
      };
    });
  };

  const checkCollisions = () => {
    const checkPlayerCollision = (player: Player) => {
      const dx = ball.position.x - player.position.x;
      const dy = ball.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (PLAYER_SIZE + BALL_SIZE) / 2) {
        const angle = Math.atan2(dy, dx);
        const force = 8;
        setBall(prevBall => ({
          ...prevBall,
          velocity: {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
          }
        }));
      }
    };

    checkPlayerCollision(player1);
    checkPlayerCollision(player2);
  };

  const checkGoals = () => {
    const ballX = ball.position.x;
    const ballY = ball.position.y;

    // 플레이어 1 골 (오른쪽 골대)
    if (ballX > FIELD_WIDTH - GOAL_WIDTH && 
        ballY > (FIELD_HEIGHT - GOAL_HEIGHT) / 2 && 
        ballY < (FIELD_HEIGHT + GOAL_HEIGHT) / 2) {
      setPlayer1(prev => ({ ...prev, score: prev.score + 1 }));
      resetBall();
    }

    // 플레이어 2 골 (왼쪽 골대)
    if (ballX < GOAL_WIDTH && 
        ballY > (FIELD_HEIGHT - GOAL_HEIGHT) / 2 && 
        ballY < (FIELD_HEIGHT + GOAL_HEIGHT) / 2) {
      setPlayer2(prev => ({ ...prev, score: prev.score + 1 }));
      resetBall();
    }
  };

  const resetBall = () => {
    setBall({
      position: { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 },
      velocity: { x: 0, y: 0 }
    });
  };

  const movePlayer = (playerId: number, newPosition: Position) => {
    // 경계 체크
    const clampedX = Math.max(PLAYER_SIZE / 2, Math.min(FIELD_WIDTH - PLAYER_SIZE / 2, newPosition.x));
    const clampedY = Math.max(PLAYER_SIZE / 2, Math.min(FIELD_HEIGHT - PLAYER_SIZE / 2, newPosition.y));

    if (playerId === 1) {
      setPlayer1(prev => ({ ...prev, position: { x: clampedX, y: clampedY } }));
    } else {
      setPlayer2(prev => ({ ...prev, position: { x: clampedX, y: clampedY } }));
    }
  };

  const updatePlayerMovement = () => {
    if (!gameStarted) return;

    // 플레이어 1 이동 (WASD)
    let player1NewX = player1.position.x;
    let player1NewY = player1.position.y;

    if (keysPressed.has('w')) player1NewY -= playerSpeed; // W: 위로
    if (keysPressed.has('a')) player1NewX -= playerSpeed; // A: 왼쪽으로
    if (keysPressed.has('s')) player1NewY += playerSpeed; // S: 아래로
    if (keysPressed.has('d')) player1NewX += playerSpeed; // D: 오른쪽으로

    if (player1NewX !== player1.position.x || player1NewY !== player1.position.y) {
      movePlayer(1, { x: player1NewX, y: player1NewY });
    }

    // 플레이어 2 이동 (방향키)
    let player2NewX = player2.position.x;
    let player2NewY = player2.position.y;

    if (keysPressed.has('arrowup')) player2NewY -= playerSpeed;    // ↑: 위로
    if (keysPressed.has('arrowleft')) player2NewX -= playerSpeed;  // ←: 왼쪽으로
    if (keysPressed.has('arrowdown')) player2NewY += playerSpeed;  // ↓: 아래로
    if (keysPressed.has('arrowright')) player2NewX += playerSpeed; // →: 오른쪽으로

    if (player2NewX !== player2.position.x || player2NewY !== player2.position.y) {
      movePlayer(2, { x: player2NewX, y: player2NewY });
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setWinner(null);
    setPlayer1(prev => ({ ...prev, score: 0 }));
    setPlayer2(prev => ({ ...prev, score: 0 }));
    resetBall();
  };

  const resetGame = () => {
    setGameStarted(false);
    setWinner(null);
    setPlayer1(prev => ({ ...prev, position: { x: FIELD_WIDTH / 2 - 100, y: FIELD_HEIGHT / 2 }, score: 0 }));
    setPlayer2(prev => ({ ...prev, position: { x: FIELD_WIDTH / 2 + 100, y: FIELD_HEIGHT / 2 }, score: 0 }));
    resetBall();
  };

  // 승자 체크 (2점으로 변경)
  useEffect(() => {
    if (player1.score >= 2) {
      setWinner('player1');
      setGameStarted(false);
    } else if (player2.score >= 2) {
      setWinner('player2');
      setGameStarted(false);
    }
  }, [player1.score, player2.score]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 점수 표시 */}
      <View style={styles.scoreContainer}>
        <View style={styles.playerScoreContainer}>
          <Text style={[styles.scoreText, winner === 'player1' ? styles.winnerText : winner === 'player2' ? styles.loserText : styles.normalText]}>
            플레이어 1: {player1.score}
          </Text>
          {winner === 'player1' && <Text style={styles.resultText}>🏆 승리!</Text>}
          {winner === 'player2' && <Text style={styles.resultText}>😞 패배</Text>}
        </View>
        <View style={styles.playerScoreContainer}>
          <Text style={[styles.scoreText, winner === 'player2' ? styles.winnerText : winner === 'player1' ? styles.loserText : styles.normalText]}>
            플레이어 2: {player2.score}
          </Text>
          {winner === 'player2' && <Text style={styles.resultText}>🏆 승리!</Text>}
          {winner === 'player1' && <Text style={styles.resultText}>😞 패배</Text>}
        </View>
      </View>

      {/* 게임 필드 */}
      <View style={styles.field}>
        {/* 골대 */}
        <View style={[styles.goal, styles.leftGoal]} />
        <View style={[styles.goal, styles.rightGoal]} />
        
        {/* 중앙선 */}
        <View style={styles.centerLine} />
        <View style={styles.centerCircle} />

        {/* 플레이어 1 */}
        <View
          {...player1PanResponder.panHandlers}
          style={[
            styles.player,
            {
              backgroundColor: player1.color,
              left: player1.position.x - PLAYER_SIZE / 2,
              top: player1.position.y - PLAYER_SIZE / 2,
            }
          ]}
        />

        {/* 플레이어 2 */}
        <View
          {...player2PanResponder.panHandlers}
          style={[
            styles.player,
            {
              backgroundColor: player2.color,
              left: player2.position.x - PLAYER_SIZE / 2,
              top: player2.position.y - PLAYER_SIZE / 2,
            }
          ]}
        />

        {/* 공 */}
        <View
          style={[
            styles.ball,
            {
              left: ball.position.x - BALL_SIZE / 2,
              top: ball.position.y - BALL_SIZE / 2,
            }
          ]}
        />
      </View>

      {/* 게임 컨트롤 */}
      <View style={styles.controls}>
        {!gameStarted && !winner && (
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>게임 시작</Text>
          </TouchableOpacity>
        )}
        
        {winner && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>게임 종료!</Text>
            <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
              <Text style={styles.buttonText}>🔄 다시 시작</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameStarted && !winner && (
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.buttonText}>게임 리셋</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 조작법 안내 */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          🎮 플레이어1: WASD | 플레이어2: 방향키 | 드래그도 가능 | 2점 달성하면 승리!
        </Text>
      </View>

      {/* 게임 설명 콘텐츠 */}
      {!gameStarted && !winner && (
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>🏆 2인 축구 게임에 오신 것을 환영합니다!</Text>
          <Text style={styles.contentText}>
            친구와 함께 즐기는 무료 온라인 멀티플레이어 축구 게임입니다. 
            빠른 반응속도와 전략이 필요한 스포츠 게임으로, 누구나 쉽게 배우고 즐길 수 있습니다.
          </Text>
          <Text style={styles.contentSubtitle}>⚽ 게임 방법</Text>
          <Text style={styles.contentText}>
            • 플레이어 1은 WASD 키로 움직입니다{'\n'}
            • 플레이어 2는 방향키로 움직입니다{'\n'}
            • 상대편 골대에 공을 넣어 점수를 획득하세요{'\n'}
            • 2점을 먼저 달성하는 플레이어가 승리합니다
          </Text>
          <Text style={styles.contentSubtitle}>🎯 게임 팁</Text>
          <Text style={styles.contentText}>
            • 공의 움직임을 예측하여 빠르게 위치를 선점하세요{'\n'}
            • 골대 수비도 중요합니다 - 공격과 수비의 균형을 유지하세요{'\n'}
            • 상대방의 움직임을 관찰하고 빈틈을 노리세요
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    paddingTop: 50,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: FIELD_WIDTH,
    marginBottom: 10,
  },
  playerScoreContainer: {
    alignItems: 'center',
    flex: 1,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  normalText: {
    color: 'white',
  },
  winnerText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loserText: {
    color: '#FF6B6B',
    opacity: 0.7,
  },
  resultText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  field: {
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: 'white',
    position: 'relative',
    marginBottom: 10,
  },
  goal: {
    position: 'absolute',
    width: GOAL_WIDTH,
    height: GOAL_HEIGHT,
    borderWidth: 3,
    borderColor: 'white',
    top: (FIELD_HEIGHT - GOAL_HEIGHT) / 2,
  },
  leftGoal: {
    left: -3,
  },
  rightGoal: {
    right: -3,
  },
  centerLine: {
    position: 'absolute',
    left: FIELD_WIDTH / 2,
    top: 0,
    width: 2,
    height: FIELD_HEIGHT,
    backgroundColor: 'white',
  },
  centerCircle: {
    position: 'absolute',
    left: FIELD_WIDTH / 2 - 50,
    top: FIELD_HEIGHT / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'white',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333',
  },
  controls: {
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 5,
  },
  resetButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 5,
  },
  restartButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 35,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameOverContainer: {
    alignItems: 'center',
  },
  gameOverText: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  instructions: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxWidth: 600,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
    textAlign: 'center',
  },
  contentSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
});
