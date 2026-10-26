
import type { RenderBackend } from "../contracts/RenderConfig";

export type ShaderId = string;


export type ShaderInterface =
    | "native-webgl2"
    | "shadertoy";

export type ShaderCategory =
    | "procedural"
    | "gradient"
    | "noise"
    | "distortion"
    | "geometry"
    | "custom";

export interface ShaderDefinition {
    id: ShaderId;
    name: string;
    description: string;
    backend: RenderBackend;
    category: ShaderCategory;
    shaderInterface?: ShaderInterface;
    /** Paths relative to the public directory */
    fragmentShader: string;
    vertexShader?: string;

    /** Shared engine inputs required by this shader */
    uniforms: string[];

    /** Whether the shader is intended for animated rendering */
    animated: boolean;
}

export class ShaderRegistry {
    private readonly shaders = new Map<ShaderId, ShaderDefinition>();

    register(definition: ShaderDefinition): void {
        if (!definition.id.trim()) {
            throw new Error("Shader ID cannot be empty.");
        }

        if (this.shaders.has(definition.id)) {
            throw new Error(`Shader "${definition.id}" is already registered.`);
        }

        this.shaders.set(definition.id, {
            ...definition,
            uniforms: [...definition.uniforms],
        });
    }

    get(id: ShaderId): ShaderDefinition | undefined {
        const shader = this.shaders.get(id);

        if (!shader) {
            return undefined;
        }

        return {
            ...shader,
            uniforms: [...shader.uniforms],
        };
    }

    getAll(): ShaderDefinition[] {
        return [...this.shaders.values()].map((shader) => ({
            ...shader,
            uniforms: [...shader.uniforms],
        }));
    }

    getByBackend(backend: RenderBackend): ShaderDefinition[] {
        return this.getAll().filter(
            (shader) => shader.backend === backend,
        );
    }

    has(id: ShaderId): boolean {
        return this.shaders.has(id);
    }

    unregister(id: ShaderId): boolean {
        return this.shaders.delete(id);
    }

    clear(): void {
        this.shaders.clear();
    }
}

/** Shared registry instance for the application */
export const shaderRegistry = new ShaderRegistry();
