
export interface TimelineState {
    time: number;
    deltaTime: number;
    frame: number;
    progress: number;
    finished: boolean;
}

export class Timeline {
    private startTime: number | null = null;
    private previousTime = 0;
    private frame = 0;

    constructor(
        private readonly duration: number,
        private readonly fps: number,
        private readonly loop = false,
    ) { }

    update(elapsedSeconds: number): TimelineState {
        const safeElapsed = Math.max(0, elapsedSeconds);

        if (this.startTime === null) {
            this.startTime = safeElapsed;
        }

        const elapsed = safeElapsed - this.startTime;
        const safeDuration = Math.max(0, this.duration);

        let time: number;
        let finished = false;

        if (safeDuration === 0) {
            time = 0;
            finished = true;
        } else if (this.loop) {
            time = elapsed % safeDuration;
        } else {
            time = Math.min(elapsed, safeDuration);
            finished = elapsed >= safeDuration;
        }

        const deltaTime = Math.max(0, time - this.previousTime);

        this.previousTime = time;
        this.frame = Math.floor(time * Math.max(1, this.fps));

        return {
            time,
            deltaTime,
            frame: this.frame,
            progress: safeDuration === 0 ? 1 : time / safeDuration,
            finished,
        };
    }

    reset(): void {
        this.startTime = null;
        this.previousTime = 0;
        this.frame = 0;
    }
}
