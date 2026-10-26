
export class FullscreenQuad {
    readonly buffer: WebGLBuffer;

    constructor(private readonly gl: WebGL2RenderingContext) {
        const buffer = gl.createBuffer();

        if (!buffer) {
            throw new Error("Failed to create fullscreen quad buffer.");
        }

        this.buffer = buffer;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        // Two triangles covering the full screen.
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,

            -1, 1,
            1, -1,
            1, 1,
        ]);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.STATIC_DRAW,
        );
    }

    bind(program: WebGLProgram): void {
        const { gl } = this;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        const location = gl.getAttribLocation(program, "aPosition");

        if (location < 0) {
            throw new Error('Attribute "aPosition" was not found.');
        }

        gl.enableVertexAttribArray(location);

        gl.vertexAttribPointer(
            location,
            2,
            gl.FLOAT,
            false,
            0,
            0,
        );
    }

    draw(): void {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    dispose(): void {
        this.gl.deleteBuffer(this.buffer);
    }
}
