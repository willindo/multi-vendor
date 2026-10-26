
import { shaderRegistry } from "./ShaderRegistry";

export function registerDefaultShaders(): void {
    if (!shaderRegistry.has("gradient-2d")) {
        shaderRegistry.register({
            id: "gradient-2d",
            name: "Gradient Flow",
            description: "A starter procedural 2D shader.",
            backend: "webgl2-2d",
            category: "gradient",
            fragmentShader: "/shaders/2d/gradient.frag",
            vertexShader: "/shaders/shared/fullscreen.vert",
            uniforms: [
                "time",
                "resolution",
            ],
            animated: true,
        });
    }

    if (!shaderRegistry.has("video-effect")) {
        shaderRegistry.register({
            id: "video-effect",
            name: "Video Wave",
            description: "Animated wave distortion on a video input.",
            backend: "webgl2-2d",
            category: "distortion",
            fragmentShader: "/shaders/2d/video-effect.frag",
            vertexShader: "/shaders/shared/fullscreen.vert",
            uniforms: ["time", "resolution", "mouse"],
            animated: true,
        });
    }
    if (!shaderRegistry.has("video-studio-effect")) {
        shaderRegistry.register({
            id: "video-studio-effect",
            name: "Video Wave Studio",
            description: "Animated wave distortion on a video input.",
            backend: "webgl2-2d",
            category: "distortion",
            shaderInterface: "shadertoy",
            fragmentShader: "/shaders/2d/video-studio-effect.frag",
            vertexShader: "/shaders/shared/fullscreen.vert",
            uniforms: ["time", "resolution", "mouse"],
            animated: true,
        });
    }
    if (!shaderRegistry.has("wave-3d")) {
        shaderRegistry.register({
            id: "wave-3d",
            name: "Wave Surface",
            description: "A 3D surface deformation shader.",
            backend: "r3f-3d",
            category: "geometry",
            fragmentShader: "/shaders/3d/wave.frag",
            vertexShader: "/shaders/3d/wave.vert",
            uniforms: [
                "time",
                "resolution",
            ],
            animated: true,
        });
    }

    if (!shaderRegistry.has("shadertoy-wave")) {
        shaderRegistry.register({
            id: "shadertoy-wave",
            name: "Shadertoy Wave",
            description: "A Shadertoy-style animated wave.",
            backend: "webgl2-2d",
            category: "procedural",
            shaderInterface: "shadertoy",
            fragmentShader: "/shaders/2d/shadertoy-wave.frag",
            vertexShader: "/shaders/shared/fullscreen.vert",
            uniforms: ["time", "resolution"],
            animated: true,
        });
    }
}