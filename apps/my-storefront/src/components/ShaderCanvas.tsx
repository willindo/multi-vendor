
"use client";

import { useEffect, useRef } from "react";

function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
): WebGLShader {
    const shader = gl.createShader(type);

    if (!shader) {
        throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message ?? "Shader compilation failed");
    }

    return shader;
}

export default function ShaderCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let frame = 0;
        let program: WebGLProgram | null = null;
        let buffer: WebGLBuffer | null = null;
        let vertexShader: WebGLShader | null = null;
        let fragmentShader: WebGLShader | null = null;

        let cleanupGL: (() => void) | undefined;

        async function init(canvas: HTMLCanvasElement) {
            const gl = canvas!.getContext("webgl2");

            if (!gl) {
                console.error("WebGL2 is not supported");
                return;
            }

            try {
                const [vertexSource, fragmentSource] = await Promise.all([
                    fetch("/shaders/canvas.vert").then((r) => {
                        if (!r.ok) throw new Error("Failed to load canvas.vert");
                        return r.text();
                    }),
                    fetch("/shaders/canvas.frag").then((r) => {
                        if (!r.ok) throw new Error("Failed to load canvas.frag");
                        return r.text();
                    }),
                ]);

                if (!canvas.isConnected) return;

                vertexShader = compileShader(
                    gl,
                    gl.VERTEX_SHADER,
                    vertexSource
                );

                fragmentShader = compileShader(
                    gl,
                    gl.FRAGMENT_SHADER,
                    fragmentSource
                );

                program = gl.createProgram();

                if (!program) throw new Error("Failed to create program");

                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);

                if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                    throw new Error(
                        gl.getProgramInfoLog(program) ?? "Program link failed"
                    );
                }

                gl.useProgram(program);

                buffer = gl.createBuffer();
                if (!buffer) throw new Error("Failed to create buffer");

                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(
                    gl.ARRAY_BUFFER,
                    new Float32Array([
                        -1, -1,
                        1, -1,
                        -1, 1,
                        1, 1,
                    ]),
                    gl.STATIC_DRAW
                );

                const position = gl.getAttribLocation(program, "aPosition");

                if (position < 0) {
                    throw new Error("aPosition attribute not found");
                }

                gl.enableVertexAttribArray(position);
                gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

                const resolution = gl.getUniformLocation(program, "u_resolution");
                const time = gl.getUniformLocation(program, "u_time");
                const mouse = gl.getUniformLocation(program, "u_mouse");

                const start = performance.now();

                function render(now: number) {
                    const gl = canvas.getContext("webgl2");
                    if (!canvas.isConnected || !gl) return;


                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
                    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

                    if (canvas.width !== width || canvas.height !== height) {
                        canvas.width = width;
                        canvas.height = height;
                    }

                    gl.viewport(0, 0, width, height);

                    if (resolution) {
                        gl.uniform2f(resolution, width, height);
                    }

                    if (time) {
                        gl.uniform1f(time, (now - start) * 0.001);
                    }

                    if (mouse) {
                        gl.uniform2f(mouse, 0, 0);
                    }

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    frame = requestAnimationFrame(render);
                }

                frame = requestAnimationFrame(render);
            } catch (error) {
                console.error("Shader initialization failed:", error);
            }
        }

        void init(canvas);

        return () => {
            cancelAnimationFrame(frame);
            cleanupGL?.();

            const gl = canvas.getContext("webgl2");

            if (gl) {
                if (buffer) gl.deleteBuffer(buffer);
                if (program) gl.deleteProgram(program);
                if (vertexShader) gl.deleteShader(vertexShader);
                if (fragmentShader) gl.deleteShader(fragmentShader);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                display: "block",
                width: "100%",
                height: "400px",
            }}
        />
    );
}
