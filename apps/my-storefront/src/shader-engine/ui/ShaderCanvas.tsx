
"use client";

import { useEffect, useRef, useState } from "react";
import { UniformManager } from "../core/UniformManager";
import { shaderRegistry } from "../core/ShaderRegistry";
import { registerDefaultShaders } from "../core/registerDefaultShaders";
import { WebGL2Renderer } from "../backends/webgl2-2d/WebGL2Renderer";
import { adaptShadertoyFragment } from "../core/adapters/ShadertoyAdapter";

interface ShaderCanvasProps {
    shaderId?: string;
}

export default function ShaderCanvas({
    shaderId = "gradient-2d",
}: ShaderCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uniformManagerRef = useRef<UniformManager | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [exportResolution, setExportResolution] =
        useState("1920x1080");

    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);

    const exportResolutionRef = useRef<{
        width: number;
        height: number;
    } | null>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            throw new Error("Shader canvas element was not found.");
        }

        let renderer: WebGL2Renderer | null = null;
        let animationId = 0;
        let disposed = false;
        let startTime = 0;
        let previousTime = 0;

        setError(null);

        async function initialize() {
            try {
                registerDefaultShaders();

                // 1. Get the selected shader from the registry.
                const definition = shaderRegistry.get(shaderId);

                if (!definition) {
                    throw new Error(`Shader "${shaderId}" is not registered.`);
                }

                if (definition.backend !== "webgl2-2d") {
                    throw new Error(
                        `Shader "${shaderId}" requires the ${definition.backend} backend.`,
                    );
                }

                if (!definition.vertexShader) {
                    throw new Error("The selected shader has no vertex shader.");
                }

                // 2. Create the WebGL2 context.
                const gl = canvas!.getContext("webgl2", {
                    alpha: false,
                    antialias: true,
                });
                if (gl) {
                    gl.clearColor(0, 0, 0, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
                if (!gl) {
                    throw new Error("WebGL2 is not supported by this browser.");
                }

                // 3. Load paths provided by the registry.
                const [vertexResponse, fragmentResponse] = await Promise.all([
                    fetch(definition.vertexShader),
                    fetch(definition.fragmentShader),
                ]);

                if (!vertexResponse.ok || !fragmentResponse.ok) {
                    throw new Error(
                        `Failed to load shader files for "${definition.name}".`,
                    );
                }

                const [vertexSource, fragmentSource] = await Promise.all([
                    vertexResponse.text(),
                    fragmentResponse.text(),
                ]);

                if (disposed) return;

                const finalFragmentSource =
                    definition.shaderInterface === "shadertoy"
                        ? adaptShadertoyFragment(fragmentSource)
                        : fragmentSource;

                // 4. Create the renderer using its existing API.
                renderer = new WebGL2Renderer(
                    gl,
                    vertexSource,
                    finalFragmentSource,
                );

                // 5. Centralized management of animation uniforms.
                const uniformManager = new UniformManager();
                uniformManagerRef.current = uniformManager;

                function render(now: number) {
                    if (disposed || !renderer) return;

                    if (startTime === 0) {
                        startTime = now;
                    }

                    const elapsed = (now - startTime) / 1000;
                    const deltaTime =
                        previousTime === 0
                            ? 0
                            : (now - previousTime) / 1000;

                    previousTime = now;

                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    const width = Math.max(
                        1,
                        Math.floor(canvas!.clientWidth * dpr),
                    );
                    const height = Math.max(
                        1,
                        Math.floor(canvas!.clientHeight * dpr),
                    );

                    if (canvas!.width !== width || canvas!.height !== height) {
                        canvas!.width = width;
                        canvas!.height = height;
                    }

                    uniformManager.setTime(elapsed);
                    uniformManager.setDeltaTime(deltaTime);
                    uniformManager.setResolution({
                        width,
                        height,
                        pixelRatio: dpr,
                    });

                    renderer.render(uniformManager.getSnapshot(), videoRef.current,);

                    animationId = requestAnimationFrame(render);
                }

                animationId = requestAnimationFrame(render);
            } catch (err) {
                if (!disposed) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Shader initialization failed.",
                    );
                }
            }
        }

        void initialize();
        return () => {
            disposed = true;
            cancelAnimationFrame(animationId);
            renderer?.dispose();

            if (uniformManagerRef.current) {
                uniformManagerRef.current = null;
            }
        };
    }, [shaderId]);

    useEffect(() => {
        if (!videoUrl) return;

        return () => {
            URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    function handleVideoUpload(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("video/")) {
            setVideoError("ഒരു video file തിരഞ്ഞെടുക്കുക.");
            event.target.value = "";
            return;
        }

        setVideoError(null);
        const nextUrl = URL.createObjectURL(file);

        setVideoUrl((previousUrl) => {
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            return nextUrl;
        });

        // ഒരേ file വീണ്ടും തിരഞ്ഞെടുക്കാനും അനുവദിക്കുന്നു.
        event.target.value = "";
    }
    return (
        <div className="w-full space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950">

                <div className="space-y-3">
                    <label className="block text-sm font-medium">
                        Video input
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                        />
                    </label>

                    {videoError && <p role="alert">{videoError}</p>}
                    <video
                        ref={videoRef}
                        src={videoUrl ?? undefined}
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onLoadedData={() => {
                            const video = videoRef.current;
                            if (video) {
                                void video.play().catch((error) => {
                                    console.error("Video playback failed:", error);
                                    setVideoError(
                                        "വീഡിയോ പ്ലേ ചെയ്യാനായില്ല. മറ്റൊരു വീഡിയോ പരീക്ഷിക്കുക.",
                                    );
                                });
                            }
                        }}
                        onError={() => {
                            setVideoError("വീഡിയോ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല.");
                        }}
                        style={{ display: "none" }}
                    />
                </div>

                <canvas
                    ref={canvasRef}
                    data-shader-canvas
                    className="block h-full w-full"
                    onPointerMove={(event) => {
                        const canvas = event.currentTarget;
                        const rect = canvas.getBoundingClientRect();
                        const dpr = Math.min(window.devicePixelRatio || 1, 2);

                        const x = (event.clientX - rect.left) * dpr;
                        const y = (rect.bottom - event.clientY) * dpr;

                        uniformManagerRef.current?.setMouse({
                            x,
                            y,
                            normalizedX: x / Math.max(1, rect.width * dpr),
                            normalizedY: y / Math.max(1, rect.height * dpr),
                        });
                    }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        uniformManagerRef.current?.setMouse({ isDown: true });
                    }}
                    onPointerUp={() => {
                        uniformManagerRef.current?.setMouse({ isDown: false });
                    }}
                    onPointerCancel={() => {
                        uniformManagerRef.current?.setMouse({ isDown: false });
                    }}
                />

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-300">
                        {error}
                    </div>
                )}
            </div>

            <p className="text-sm text-slate-500">
                WebGL2 · {shaderId} · Real-time preview
            </p>
            <p className="text-sm text-slate-500">
                Active shader: {shaderId}
            </p>
        </div>
    );
}
