/**
 * @fileoverview WebGPU Hardware-Accelerated Video Rendering & Transform Engine.
 * Executes zero-copy WGSL shaders with optimized memory pooling and accurate rotation.
 */

import { debug, warn } from '../logger'

export interface WebGPUTransformParams {
    cropX?: number
    cropY?: number
    cropWidth?: number
    cropHeight?: number
    rotation?: 0 | 90 | 180 | 270
    flipH?: boolean
    flipV?: boolean
    brightness?: number // -1.0 to 1.0 (default 0)
    contrast?: number   // 0.0 to 2.0 (default 1)
    saturation?: number // 0.0 to 2.0 (default 1)
}

/**
 * Check if WebGPU is supported in the current environment
 */
export async function isWebGPUSupported(): Promise<boolean> {
    try {
        if (typeof navigator === 'undefined' || !navigator.gpu) return false
        const adapter = await navigator.gpu.requestAdapter()
        return !!adapter
    } catch {
        return false
    }
}

const WGSL_SHADER_CODE = `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct TransformUniforms {
    crop: vec4f,       // x, y, width, height (normalized 0..1)
    colorParams: vec4f,// brightness, contrast, saturation, unused
    transform: vec4f,  // rotation (deg), flipH (0/1), flipV (0/1), unused
};

@group(0) @binding(0) var<uniform> uniforms: TransformUniforms;
@group(0) @binding(1) var videoTex: texture_external;
@group(0) @binding(2) var videoSampler: sampler;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2f, 6>(
        vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0)
    );
    var texCoords = array<vec2f, 6>(
        vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0)
    );

    var out: VertexOutput;
    out.position = vec4f(positions[vertexIndex], 0.0, 1.0);
    out.uv = texCoords[vertexIndex];
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    var uv = in.uv;

    // Correct Inverse Rotation Mapping (Clockwise)
    let rot = uniforms.transform.x;
    if (rot > 85.0 && rot < 95.0) {
        uv = vec2f(uv.y, 1.0 - uv.x);
    } else if (rot > 175.0 && rot < 185.0) {
        uv = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (rot > 265.0 && rot < 275.0) {
        uv = vec2f(1.0 - uv.y, uv.x);
    }

    // Apply Flip
    if (uniforms.transform.y > 0.5) {
        uv.x = 1.0 - uv.x;
    }
    if (uniforms.transform.z > 0.5) {
        uv.y = 1.0 - uv.y;
    }

    // Apply Crop Mapping (normalized source space)
    let cropX = uniforms.crop.x;
    let cropY = uniforms.crop.y;
    let cropW = uniforms.crop.z;
    let cropH = uniforms.crop.w;
    let mappedUV = vec2f(cropX + uv.x * cropW, cropY + uv.y * cropH);

    var color = textureSampleBaseClampToEdge(videoTex, videoSampler, mappedUV);

    // Apply Color Corrections
    let brightness = uniforms.colorParams.x;
    var rgb = color.rgb + vec3f(brightness);

    let contrast = uniforms.colorParams.y;
    rgb = (rgb - vec3f(0.5)) * contrast + vec3f(0.5);

    let saturation = uniforms.colorParams.z;
    let luminance = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3f(luminance), rgb, saturation);

    return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), color.a);
}
`

export class WebGPURenderer {
    private device: GPUDevice | null = null
    private context: GPUCanvasContext | null = null
    private pipeline: GPURenderPipeline | null = null
    private sampler: GPUSampler | null = null
    private uniformBuffer: GPUBuffer | null = null
    private cachedUniformData = new Float32Array(12) // Reusable memory pool to avoid GC churn

    async initialize(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<boolean> {
        try {
            if (!navigator.gpu) return false
            const adapter = await navigator.gpu.requestAdapter()
            if (!adapter) return false

            this.device = await adapter.requestDevice()
            this.device.lost.then((info) => {
                warn('WebGPU', `Device lost: ${info.reason} - ${info.message}`)
                this.destroy()
            })
            this.device.onuncapturederror = (event) => {
                warn('WebGPU', `Uncaptured GPU error: ${event.error.message}`)
            }

            this.context = canvas.getContext('webgpu') as GPUCanvasContext | null
            if (!this.context) return false

            const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
            this.context.configure({
                device: this.device,
                format: presentationFormat,
                alphaMode: 'premultiplied',
            })

            const shaderModule = this.device.createShaderModule({
                code: WGSL_SHADER_CODE,
            })

            this.pipeline = this.device.createRenderPipeline({
                layout: 'auto',
                vertex: {
                    module: shaderModule,
                    entryPoint: 'vs_main',
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: 'fs_main',
                    targets: [{ format: presentationFormat }],
                },
                primitive: {
                    topology: 'triangle-list',
                },
            })

            this.sampler = this.device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear',
            })

            this.uniformBuffer = this.device.createBuffer({
                size: 48,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            })

            debug('WebGPU', 'WebGPU render engine initialized successfully')
            return true
        } catch (err) {
            warn('WebGPU', 'Failed to initialize WebGPU renderer:', err)
            return false
        }
    }

    renderFrame(
        source: HTMLVideoElement | VideoFrame,
        params: WebGPUTransformParams = {}
    ): void {
        if (!this.device || !this.context || !this.pipeline || !this.sampler || !this.uniformBuffer) {
            return
        }

        if (source instanceof HTMLVideoElement && source.readyState < 2) return
        if (source instanceof VideoFrame && (source.format === null || source.codedWidth === 0)) return

        try {
            const externalTexture = this.device.importExternalTexture({ source })

            // Reuse pre-allocated array
            this.cachedUniformData[0] = params.cropX ?? 0
            this.cachedUniformData[1] = params.cropY ?? 0
            this.cachedUniformData[2] = params.cropWidth ?? 1
            this.cachedUniformData[3] = params.cropHeight ?? 1
            this.cachedUniformData[4] = params.brightness ?? 0
            this.cachedUniformData[5] = params.contrast ?? 1
            this.cachedUniformData[6] = params.saturation ?? 1
            this.cachedUniformData[7] = 0
            this.cachedUniformData[8] = params.rotation ?? 0
            this.cachedUniformData[9] = params.flipH ? 1 : 0
            this.cachedUniformData[10] = params.flipV ? 1 : 0
            this.cachedUniformData[11] = 0

            this.device.queue.writeBuffer(this.uniformBuffer, 0, this.cachedUniformData)

            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: externalTexture },
                    { binding: 2, resource: this.sampler },
                ],
            })

            const commandEncoder = this.device.createCommandEncoder()
            const textureView = this.context.getCurrentTexture().createView()

            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: textureView,
                        clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1.0 },
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            })

            renderPass.setPipeline(this.pipeline)
            renderPass.setBindGroup(0, bindGroup)
            renderPass.draw(6, 1, 0, 0)
            renderPass.end()

            this.device.queue.submit([commandEncoder.finish()])
        } catch (err) {
            warn('WebGPU', 'Render error in WebGPU frame pass:', err)
        }
    }

    destroy(): void {
        this.uniformBuffer?.destroy()
        this.device?.destroy()
        this.device = null
        this.context = null
        this.pipeline = null
        this.sampler = null
        this.uniformBuffer = null
    }
}
