
import {
    createDefaultUniforms,
    type ShaderMouse,
    type ShaderResolution,
    type ShaderUniforms,
} from "../contracts/ShaderUniforms";

export class UniformManager {
    private uniforms: ShaderUniforms = createDefaultUniforms();

    getSnapshot(): ShaderUniforms {
        return {
            ...this.uniforms,
            resolution: { ...this.uniforms.resolution },
            mouse: { ...this.uniforms.mouse },
        };
    }

    setTime(time: number): void {
        this.uniforms.time = Math.max(0, time);
    }

    setFrame(frame: number, fps: number): void {
        this.uniforms.frame = Math.max(0, Math.floor(frame));
        this.uniforms.time = this.uniforms.frame / Math.max(1, fps);
    }

    setDeltaTime(deltaTime: number): void {
        this.uniforms.deltaTime = Math.max(0, deltaTime);
    }

    setResolution(resolution: Partial<ShaderResolution>): void {
        this.uniforms.resolution = {
            ...this.uniforms.resolution,
            ...resolution,
        };

        this.uniforms.resolution.width = Math.max(
            1,
            this.uniforms.resolution.width,
        );
        this.uniforms.resolution.height = Math.max(
            1,
            this.uniforms.resolution.height,
        );
        this.uniforms.resolution.pixelRatio = Math.max(
            0.1,
            this.uniforms.resolution.pixelRatio,
        );
    }

    setMouse(mouse: Partial<ShaderMouse>): void {
        this.uniforms.mouse = {
            ...this.uniforms.mouse,
            ...mouse,
        };
    }

    reset(): void {
        this.uniforms = createDefaultUniforms();
    }
}
