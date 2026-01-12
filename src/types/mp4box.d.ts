/**
 * Type definitions for mp4box.js v2.x
 * @see https://github.com/gpac/mp4box.js
 */

declare module 'mp4box' {
    export interface MP4ArrayBuffer extends ArrayBuffer {
        fileStart: number
    }

    export interface Sample {
        number: number
        track_id: number
        cts: number
        dts: number
        duration: number
        is_sync: boolean
        data: Uint8Array
        size: number
        offset: number
        timescale: number
    }

    export interface VideoInfo {
        width: number
        height: number
    }

    export interface AudioInfo {
        sample_rate: number
        channel_count: number
    }

    export interface MP4VideoTrack {
        id: number
        type: string
        codec: string
        timescale: number
        duration: number
        nb_samples: number
        video: VideoInfo
    }

    export interface MP4AudioTrack {
        id: number
        type: string
        codec: string
        timescale: number
        duration: number
        nb_samples: number
        audio: AudioInfo
    }

    export interface MP4Info {
        duration: number
        timescale: number
        isFragmented: boolean
        isProgressive: boolean
        hasIOD: boolean
        brands: string[]
        created: Date
        modified: Date
        tracks: (MP4VideoTrack | MP4AudioTrack)[]
        videoTracks: MP4VideoTrack[]
        audioTracks: MP4AudioTrack[]
    }

    export interface TrackOptions {
        nbSamples?: number
    }

    export interface Trak {
        mdia?: {
            minf?: {
                stbl?: {
                    stsd?: {
                        entries?: Array<{
                            avcC?: { data: Uint8Array }
                            hvcC?: { data: Uint8Array }
                            esds?: { data: Uint8Array }
                        }>
                    }
                }
            }
        }
    }

    export interface MP4File {
        onReady: (info: MP4Info) => void
        onError: (error: string) => void
        onSamples: (id: number, user: unknown, samples: Sample[]) => void

        appendBuffer(buffer: MP4ArrayBuffer): number
        flush(): void
        start(): void
        stop(): void

        setExtractionOptions(
            trackId: number,
            user: unknown,
            options?: TrackOptions
        ): void

        getTrackById(trackId: number): Trak | undefined
    }

    // v2.x exports createFile as a named export
    export function createFile(): MP4File
}
