
"use client";

import { useState } from "react";
import ShaderCanvas from "@/shader-engine/ui/ShaderCanvas";
import { shaderRegistry } from "@/shader-engine/core/ShaderRegistry";
import { registerDefaultShaders } from "@/shader-engine/core/registerDefaultShaders";

export default function ShaderLabPage() {
    const [shaders] = useState(() => {
        registerDefaultShaders();
        return shaderRegistry.getByBackend("webgl2-2d");
    });

    const [shaderId, setShaderId] = useState(
        () => shaders[0]?.id ?? "",
    );

    const selectedShader = shaders.find(
        (shader) => shader.id === shaderId,
    );

    return (
        <main className="mx-auto max-w-6xl space-y-6 p-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold">Shader Lab</h1>
                <p className="text-sm text-slate-500">
                    Select a shader and preview it using the shared renderer.
                </p>
            </header>

            <div className="max-w-sm space-y-2">
                <label
                    htmlFor="shader-select"
                    className="block text-sm font-medium"
                >
                    Select effect
                </label>

                <select
                    id="shader-select"
                    value={shaderId}
                    onChange={(event) => setShaderId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-transparent p-3"
                >
                    {shaders.map((shader) => (
                        <option key={shader.id} value={shader.id}>
                            {shader.name}
                        </option>
                    ))}
                </select>

                {selectedShader && (
                    <p className="text-sm text-slate-500">
                        {selectedShader.description}
                    </p>
                )}
            </div>

            {shaderId ? (
                <ShaderCanvas shaderId={shaderId} />
            ) : (
                <p>No 2D shaders are registered yet.</p>
            )}
        </main>
    );
}
