/**
 * Deterministic fixed-step clock for simulation systems.
 *
 * This utility only schedules updates; it does not define any gameplay physics.
 * Consumers should keep simulation units explicit and avoid coupling updates to
 * the display refresh rate.
 */
export interface FixedStepClockOptions {
  stepSeconds?: number;
  maxFrameSeconds?: number;
  maxStepsPerFrame?: number;
}

export interface FrameAdvance {
  steps: number;
  interpolationAlpha: number;
  droppedSeconds: number;
}

export class FixedStepClock {
  readonly stepSeconds: number;
  readonly maxFrameSeconds: number;
  readonly maxStepsPerFrame: number;

  private accumulator = 0;

  constructor(options: FixedStepClockOptions = {}) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxFrameSeconds = options.maxFrameSeconds ?? 0.25;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 8;

    if (!Number.isFinite(this.stepSeconds) || this.stepSeconds <= 0) {
      throw new RangeError("stepSeconds must be a finite positive number.");
    }
    if (!Number.isFinite(this.maxFrameSeconds) || this.maxFrameSeconds <= 0) {
      throw new RangeError("maxFrameSeconds must be a finite positive number.");
    }
    if (!Number.isInteger(this.maxStepsPerFrame) || this.maxStepsPerFrame < 1) {
      throw new RangeError("maxStepsPerFrame must be a positive integer.");
    }
  }

  advance(frameSeconds: number, update: (stepSeconds: number) => void): FrameAdvance {
    if (!Number.isFinite(frameSeconds) || frameSeconds < 0) {
      throw new RangeError("frameSeconds must be a finite non-negative number.");
    }

    const acceptedSeconds = Math.min(frameSeconds, this.maxFrameSeconds);
    let droppedSeconds = frameSeconds - acceptedSeconds;
    this.accumulator += acceptedSeconds;

    let steps = 0;
    while (
      this.accumulator >= this.stepSeconds &&
      steps < this.maxStepsPerFrame
    ) {
      update(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }

    if (this.accumulator >= this.stepSeconds) {
      const retained = this.accumulator % this.stepSeconds;
      droppedSeconds += this.accumulator - retained;
      this.accumulator = retained;
    }

    return {
      steps,
      interpolationAlpha: this.accumulator / this.stepSeconds,
      droppedSeconds,
    };
  }

  reset(): void {
    this.accumulator = 0;
  }
}
