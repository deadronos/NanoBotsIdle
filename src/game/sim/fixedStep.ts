export type FixedStepResult = {
  accumulator: number;
  steps: number;
  alpha: number;
};

export function advanceFixedStep(
  accumulator: number,
  deltaSeconds: number,
  stepSeconds: number,
  maxSteps: number,
  onStep: (dt: number) => void,
): FixedStepResult {
  if (stepSeconds <= 0) {
    return { accumulator: 0, steps: 0, alpha: 0 };
  }

  const clampedDelta = Math.min(Math.max(deltaSeconds, 0), stepSeconds * maxSteps);
  let acc = Math.min(accumulator + clampedDelta, stepSeconds * maxSteps);
  let steps = 0;

  while (acc >= stepSeconds && steps < maxSteps) {
    onStep(stepSeconds);
    acc -= stepSeconds;
    steps += 1;
  }

  const alpha = Math.min(Math.max(acc / stepSeconds, 0), 1);
  return { accumulator: acc, steps, alpha };
}
