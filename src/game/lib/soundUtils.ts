// 사운드 재생을 위한 유틸리티 함수들

let audioContext: AudioContext | null = null;

/**
 * AudioContext를 안전하게 초기화합니다.
 */
function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.log("AudioContext 초기화 실패:", error);
      return null;
    }
  }

  // AudioContext가 suspended 상태라면 resume
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(console.error);
  }

  return audioContext;
}

/**
 * 타일 클릭 시 재생할 사운드
 */
export function playTileClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.log("타일 클릭 사운드 재생 실패:", error);
  }
}

/**
 * 매칭 성공 시 재생할 사운드
 */
export function playMatchSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const duration = 0.5;

    // 메인 톤
    const oscillator1 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();
    oscillator1.connect(gainNode1);
    gainNode1.connect(ctx.destination);

    oscillator1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator1.type = "sine";
    gainNode1.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    // 하모닉스
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    oscillator2.type = "sine";
    gainNode2.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    // 마지막 톤
    const oscillator3 = ctx.createOscillator();
    const gainNode3 = ctx.createGain();
    oscillator3.connect(gainNode3);
    gainNode3.connect(ctx.destination);

    oscillator3.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
    oscillator3.type = "sine";
    gainNode3.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode3.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    oscillator1.start(ctx.currentTime);
    oscillator2.start(ctx.currentTime);
    oscillator3.start(ctx.currentTime);

    oscillator1.stop(ctx.currentTime + duration);
    oscillator2.stop(ctx.currentTime + duration);
    oscillator3.stop(ctx.currentTime + duration);
  } catch (error) {
    console.log("매칭 성공 사운드 재생 실패:", error);
  }
}
