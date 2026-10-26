
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
                const [vertexSource, fragmentCoreSource] = await Promise.all([
                    fetch("/shaders/canvas.vert").then((r) => {
                        if (!r.ok) throw new Error("Failed to load canvas.vert");
                        return r.text();
                    }),
                    fetch("/shaders/canvas.frag").then((r) => {

                        if (!r.ok) throw new Error("Failed to load canvas.frag");
                        return r.text();
                    }),

                ]);
                // const vertexSource = `#version 300 es
                // in vec2 aPosition;

                // ${vertexCoreSource}

                // void main() {
                //     gl_Position = getVertexPosition(aPosition);
                //     }
                //     `;
                // Browser-specific fragment shader wrapper
                const fragmentSource = `#version 300 es
                precision highp float;
                
                uniform vec3 iResolution;
                uniform float iTime;
                uniform vec4 iMouse;
                
                out vec4 fragColor;
                
                ${fragmentCoreSource}
                
                void main() {
                    mainImage(fragColor, gl_FragCoord.xy);
                    }
                    `;
                if (!canvas.isConnected) return;
                console.log(vertexSource, "vertexSource")
                // console.log(fragmentSource, "fragmentSource")
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

                if (!program) throw new Error("Failed to create WebGL program");

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

                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                // gl.bufferData(
                //     gl.ARRAY_BUFFER,
                //     new Float32Array([
                //         -1, -1,
                //         1, -1,
                //         -1, 1,
                //         1, 1,
                //     ]),
                //     gl.STATIC_DRAW
                // );
                const identity = new Float32Array([
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ]);
                const vertices = [
                    -1, -1, 0,
                    1, -1, 0,
                    -1, 1, 0,
                    1, 1, 0,
                ];
                const positionLocation = gl.getAttribLocation(program, "aPosition");
                const normalLocation = gl.getAttribLocation(program, "aNormal");

                if (positionLocation < 0 || normalLocation < 0) {
                    throw new Error("aPosition attribute or aNormal attribute not found");
                }

                gl.enableVertexAttribArray(positionLocation);
                gl.enableVertexAttribArray(normalLocation);
                gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
                gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

                const resolution = gl.getUniformLocation(program, "iResolution");
                const time = gl.getUniformLocation(program, "iTime");
                const mouse = gl.getUniformLocation(program, "iMouse");
                const modelViewLocation = gl.getUniformLocation(program, "uModelViewMatrix");
                const projectionLocation = gl.getUniformLocation(program, "uProjectionMatrix");
                if (modelViewLocation) {
                    gl.uniformMatrix4fv(modelViewLocation, false, identity);
                }

                if (projectionLocation) {
                    gl.uniformMatrix4fv(projectionLocation, false, identity);
                }
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
                        gl.uniform3f(resolution, width, height, 1);
                    }

                    if (time) {
                        gl.uniform1f(time, (now - start) * 0.001);
                    }

                    if (mouse) {
                        gl.uniform4f(mouse, 0, 0, 0, 0);
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
