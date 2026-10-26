
import type { ShaderUniforms } from "../../contracts/ShaderUniforms";
import { FullscreenQuad } from "./FullscreenQuad";
import { TextureManager } from "./TextureManager";

function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
): WebGLShader {
    const shader = gl.createShader(type);

    if (!shader) {
        throw new Error("Failed to create shader.");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
        gl.deleteShader(shader);
        throw new Error(message);
    }

    return shader;
}

export class WebGL2Renderer {
    private program: WebGLProgram;
    private quad: FullscreenQuad;

    private readonly resolutionLocation: WebGLUniformLocation | null;
    private readonly timeLocation: WebGLUniformLocation | null;
    private readonly mouseLocation: WebGLUniformLocation | null;

    private readonly iResolutionLocation: WebGLUniformLocation | null;
    private readonly iTimeLocation: WebGLUniformLocation | null;
    private readonly textureManager: TextureManager;
    constructor(
        private readonly gl: WebGL2RenderingContext,
        vertexSource: string,
        fragmentSource: string,
    ) {
        const vertexShader = compileShader(
            gl,
            gl.VERTEX_SHADER,
            vertexSource,
        );

        let fragmentShader: WebGLShader | undefined;
        let program: WebGLProgram | null = null;

        try {
            fragmentShader = compileShader(
                gl,
                gl.FRAGMENT_SHADER,
                fragmentSource,
            );

            program = gl.createProgram();

            if (!program) {
                throw new Error("Failed to create WebGL program.");
            }

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(
                    gl.getProgramInfoLog(program) ?? "Program linking failed.",
                );
            }

            this.program = program;
        } catch (error) {
            if (program) gl.deleteProgram(program);
            throw error;
        } finally {
            gl.deleteShader(vertexShader);

            if (fragmentShader) {
                gl.deleteShader(fragmentShader);
            }
        }

        this.quad = new FullscreenQuad(gl);

        this.resolutionLocation = gl.getUniformLocation(
            this.program,
            "uResolution",
        );

        this.timeLocation = gl.getUniformLocation(
            this.program,
            "uTime",
        );
        this.mouseLocation = gl.getUniformLocation(
            this.program,
            "iMouse",
        );

        this.textureManager = new TextureManager(gl);

        this.iResolutionLocation =
            gl.getUniformLocation(this.program, "iResolution");

        this.iTimeLocation =
            gl.getUniformLocation(this.program, "iTime");
        // this.mouseLocation = gl.getUniformLocation(
        //     this.program,
        //     "iMouse",
        // );
    }

    render(uniforms: ShaderUniforms, video: HTMLVideoElement | null = null,): void {
        const { gl } = this;

        gl.useProgram(this.program);

        gl.viewport(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
        );

        const width = uniforms.resolution.width;
        const height = uniforms.resolution.height;
        const time = uniforms.time;

        if (this.resolutionLocation !== null) {
            gl.uniform2f(
                this.resolutionLocation,
                width,
                height,
            ); // for native-webgl2
        }

        if (this.timeLocation !== null) {
            gl.uniform1f(this.timeLocation, time); // for native-webgl2
        }
        if (this.mouseLocation !== null) {
            const mouse = uniforms.mouse;

            gl.uniform4f(
                this.mouseLocation,
                mouse.x,
                mouse.y,
                mouse.isDown ? mouse.x : 0,
                mouse.isDown ? mouse.y : 0,
            );
        }

        if (this.iResolutionLocation !== null) {
            gl.uniform3f(this.iResolutionLocation, width, height, 1.0); // for shadertoy
        }

        if (this.iTimeLocation !== null) {
            gl.uniform1f(this.iTimeLocation, time); // for shadertoy
        }

        if (video) {
            this.textureManager.updateFromVideo(video);
        }
        this.textureManager.bind(this.program, "uVideo", 0);
        this.textureManager.bind(this.program, "iChannel0", 0);

        this.quad.bind(this.program);
        this.quad.draw();
    }

    dispose(): void {
        this.quad.dispose();
        this.textureManager.dispose();
        this.gl.deleteProgram(this.program);
    }
}
