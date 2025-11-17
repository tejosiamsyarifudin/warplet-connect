import { EMPTY } from "../CONST";
import type { Point } from "../type";
import { findPath } from "./pathFinder";
import { playTileClickSound, playMatchSuccessSound } from "./soundUtils";

/**
 * 캔버스 클릭 이벤트를 처리합니다.
 * @param event 마우스 이벤트
 * @param board 현재 게임 보드
 * @param selected 현재 선택된 타일
 * @param setSelected 선택된 타일 설정 함수
 * @param setPath 경로 설정 함수
 * @param setBoard 보드 설정 함수
 * @param getGridPosition 격자 위치 구하는 함수
 */
export function handleCanvasClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  board: number[][],
  selected: Point | null,
  setSelected: (point: Point | null) => void,
  setPath: (path: Point[] | null) => void,
  setBoard: (board: number[][]) => void,
  getGridPosition: (clientX: number, clientY: number) => Point | null
): void {
  const gridPos = getGridPosition(event.clientX, event.clientY);
  if (!gridPos) return;

  const { x: row, y: col } = gridPos;

  if (board[row][col] === EMPTY) return;

  // 타일 클릭 사운드 재생
  playTileClickSound();

  if (!selected) {
    setSelected({ x: row, y: col });
    setPath(null);
  } else {
    if (selected.x === row && selected.y === col) {
      setSelected(null);
      setPath(null);
      return;
    }

    if (board[selected.x][selected.y] !== board[row][col]) {
      setSelected(null);
      setPath(null);
      return;
    }

    // 경로 찾기
    const foundPath = findPath(board, selected, { x: row, y: col });
    if (foundPath) {
      setPath(foundPath);
      // 매칭 성공 사운드 재생
      playMatchSuccessSound();
      // 잠시 후 타일 제거
      setTimeout(() => {
        const newBoard = board.map((row) => [...row]);
        newBoard[selected.x][selected.y] = EMPTY;
        newBoard[row][col] = EMPTY;
        setBoard(newBoard);
        setSelected(null);
        setPath(null);
      }, 500);
    } else {
      setSelected(null);
      setPath(null);
    }
  }
}
