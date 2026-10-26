
export class TextureManager {
    private readonly texture: WebGLTexture;

    constructor(private readonly gl: WebGL2RenderingContext) {
        const texture = gl.createTexture();

        if (!texture) {
            throw new Error("Failed to create video texture.");
        }

        this.texture = texture;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR,
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.LINEAR,
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.CLAMP_TO_EDGE,
        );
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE,
        );

        // Valid fallback texture before a video is selected.
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255]),
        );

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    updateFromVideo(video: HTMLVideoElement): void {
        const { gl } = this;

        if (
            video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {
            return;
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Flip the uploaded video so its orientation matches
        // the usual bottom-left-origin shader UV coordinates.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
        );

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    bind(program: WebGLProgram, uniformName: string, unit = 0): void {
        const { gl } = this;

        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        const location = gl.getUniformLocation(program, uniformName);

        if (location !== null) {
            gl.uniform1i(location, unit);
        }
    }

    dispose(): void {
        this.gl.deleteTexture(this.texture);
    }
}
