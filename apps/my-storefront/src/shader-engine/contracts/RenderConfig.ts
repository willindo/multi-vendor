
export type RenderBackend = "webgl2-2d" | "r3f-3d";

export type RenderMode = "realtime" | "deterministic";

export type ExportFormat = "png" | "webm" | "mp4";

export interface RenderSize {
    width: number;
    height: number;
}

export interface RenderConfig {
    backend: RenderBackend;
    mode: RenderMode;

    size: RenderSize;

    /** Device pixel ratio used by the renderer */
    pixelRatio: number;

    /** Target frames per second */
    fps: number;

    /** Duration for timeline-based rendering, in seconds */
    duration: number;

    /** Export output format */
    exportFormat: ExportFormat;

    /** Whether animation should loop */
    loop: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
    backend: "webgl2-2d",
    mode: "realtime",

    size: {
        width: 1280,
        height: 720,
    },

    pixelRatio: 1,
    fps: 30,
    duration: 5,
    exportFormat: "png",
    loop: true,
};
