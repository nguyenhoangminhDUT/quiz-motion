export interface HoldResult {
  readonly candidateOptionId: string | null;
  readonly confirmedOptionId: string | null;
  readonly holdProgress: number;
  // Chỉ true tại frame vừa đạt đủ thời gian.
  readonly justConfirmed: boolean;
}

interface HoldDetectorOptions {
  readonly holdDurationMs?: number;
  readonly maxFrameGapMs: number;
}

export function createHoldDetector({
  holdDurationMs = 1500,
  maxFrameGapMs,
}: HoldDetectorOptions) {
  for (const value of [holdDurationMs, maxFrameGapMs]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Timing values must be finite and positive.');
    }
  }

  let candidateOptionId: string | null = null;
  let confirmedOptionId: string | null = null;
  let startedAtMs: number | null = null;
  let lastTimestampMs: number | null = null;
  let holdProgress = 0;

  function snapshot(justConfirmed = false): HoldResult {
    return {
      candidateOptionId,
      confirmedOptionId,
      holdProgress,
      justConfirmed,
    };
  }

  function reset(): HoldResult {
    candidateOptionId = null;
    confirmedOptionId = null;
    startedAtMs = null;
    lastTimestampMs = null;
    holdProgress = 0;

    return snapshot();
  }

  function update(optionId: string | null, timestampMs: number): HoldResult {
    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      throw new Error('Timestamp must be finite and nonnegative.');
    }

    if (optionId !== null && optionId.trim().length === 0) {
      throw new Error('Option ID must not be blank.');
    }

    // Frame cũ hoặc trùng không được làm thay đổi tiến độ.
    if (lastTimestampMs !== null && timestampMs <= lastTimestampMs) {
      return snapshot();
    }

    // Đã chốt thì khóa cho tới khi ứng dụng gọi reset().
    if (confirmedOptionId !== null) {
      return snapshot();
    }

    const hasFrameGap =
      lastTimestampMs !== null && timestampMs - lastTimestampMs > maxFrameGapMs;

    lastTimestampMs = timestampMs;

    // null biểu thị không có đáp án hợp lệ hoặc mất tracking.
    if (optionId === null) {
      candidateOptionId = null;
      startedAtMs = null;
      holdProgress = 0;

      return snapshot();
    }

    if (optionId !== candidateOptionId || startedAtMs === null || hasFrameGap) {
      candidateOptionId = optionId;
      startedAtMs = timestampMs;
      holdProgress = 0;

      return snapshot();
    }

    holdProgress = Math.min(1, (timestampMs - startedAtMs) / holdDurationMs);

    if (holdProgress === 1) {
      confirmedOptionId = optionId;
      return snapshot(true);
    }

    return snapshot();
  }

  return { update, reset };
}
