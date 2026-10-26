
export interface ShaderResolution {
    width: number;
    height: number;
    pixelRatio: number;
}

export interface ShaderMouse {
    x: number;
    y: number;
    normalizedX: number;
    normalizedY: number;
    isDown: boolean;
}

export interface ShaderUniforms {
    /** Animation time in seconds */
    time: number;

    /** Time elapsed since the previous frame, in seconds */
    deltaTime: number;

    /** Frame index; useful for deterministic rendering */
    frame: number;

    resolution: ShaderResolution;
    mouse: ShaderMouse;
}

/** Create a predictable initial state for the shader engine. */
export function createDefaultUniforms(): ShaderUniforms {
    return {
        time: 0,
        deltaTime: 0,
        frame: 0,

        resolution: {
            width: 1280,
            height: 720,
            pixelRatio: 1,
        },

        mouse: {
            x: 0,
            y: 0,
            normalizedX: 0,
            normalizedY: 0,
            isDown: false,
        },
    };
}
