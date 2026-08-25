import { isGPUExportSupported, exportVideoWithWebGPU } from '../../lib/webgpu/gpuExport'
import { Scissors, Link, RotateCcw, Download, Split, Rewind, Image, Music, Wand2, Sparkles, Captions } from 'lucide-react'
import { useEditorStore, type Clip } from '../../store/editorStore'
import { useSelectedClip, useHasClips, useCanMerge, useCanSplit, useSelectedClipHasModifications } from '../../store/selectors'
import { useExportStore } from '../../store/exportStore'
import { trimVideo, mergeVideos, splitVideo, transformVideo, reverseVideo, extractFrame, extractAudio, removeAudio, transcodeToH264 } from '../../lib/ffmpeg'
import { createClipFromFile } from '../../utils/clipCreation'
import { wrapError } from '../../lib/errors'
import { hasTransformsApplied } from '../../utils/videoTransforms'
import { sanitizeFilename } from '../../utils/validation'
import { type ExportPreset } from '../../store/exportPresets'
import { type ExportMode } from '../../App'
import { saveProject } from '../../lib/storage'
import { detectSilenceSplitPoints } from '../../lib/ai/silenceDetection'
import { generateSubtitlesWebGPU, formatAsSRT } from '../../lib/ai/subtitles'
import styles from './ActionBar.module.css'

interface ActionBarProps {
    onOpenExportModal: (mode: ExportMode, onExport: (preset: ExportPreset) => void) => void
}

export function ActionBar({ onOpenExportModal }: ActionBarProps) {
    const clips = useEditorStore((state) => state.clips)
    const reset = useEditorStore((state) => state.reset)
    const revertClip = useEditorStore((state) => state.revertClip)
    const addClip = useEditorStore((state) => state.addClip)
    const selectClip = useEditorStore((state) => state.selectClip)
    const setLoading = useEditorStore((state) => state.setLoading)
    const updateClipFile = useEditorStore((state) => state.updateClipFile)
    const addSplitPoint = useEditorStore((state) => state.addSplitPoint)
    const { startExport, setProcessing, setComplete, setError } = useExportStore()

    const selectedClip = useSelectedClip()
    const hasClips = useHasClips()
    const canMerge = useCanMerge()
    const canSplit = useCanSplit()
    const selectedClipHasModifications = useSelectedClipHasModifications()

    const handleTrim = () => {
        if (!selectedClip) return

        onOpenExportModal('trim', async (preset: ExportPreset) => {
            try {
                startExport()

                let blob: Blob

                // Determine if we need to apply transforms or just trim
                const needsTransform = hasTransformsApplied(selectedClip.transform) ||
                    (preset.aspectRatio !== 'original' && preset.resolution.width > 0)

                const gpuSupported = await isGPUExportSupported().catch(() => false)

                if (needsTransform) {
                    const { transform } = selectedClip
                    const aspectRatio = preset.aspectRatio !== 'original'
                        ? preset.aspectRatio
                        : transform.aspectRatio

                    if (gpuSupported && transform.speed === 1 && aspectRatio === 'original') {
                        // High-speed WebGPU shader pipeline
                        blob = await exportVideoWithWebGPU({
                            file: selectedClip.file,
                            startTime: selectedClip.trimStart,
                            endTime: selectedClip.trimEnd,
                            transform: {
                                rotation: transform.rotation,
                                flipH: transform.flipH,
                                flipV: transform.flipV,
                                cropX: transform.cropX,
                                cropY: transform.cropY,
                                cropWidth: transform.cropWidth,
                                cropHeight: transform.cropHeight,
                            },
                            width: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                            height: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            onProgress: (progress, message) => setProcessing(progress, message),
                        }).catch(async (gpuErr) => {
                            console.warn('[ActionBar] WebGPU export fallback to FFmpeg:', gpuErr)
                            return transformVideo(
                                selectedClip.file,
                                selectedClip.trimStart,
                                selectedClip.trimEnd,
                                {
                                    aspectRatio,
                                    rotation: transform.rotation,
                                    flipH: transform.flipH,
                                    flipV: transform.flipV,
                                    speed: transform.speed,
                                    crop: {
                                        x: transform.cropX,
                                        y: transform.cropY,
                                        width: transform.cropWidth,
                                        height: transform.cropHeight
                                    },
                                    targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                    targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                                },
                                (progress, message) => setProcessing(progress, message)
                            )
                        })
                    } else {
                        blob = await transformVideo(
                            selectedClip.file,
                            selectedClip.trimStart,
                            selectedClip.trimEnd,
                            {
                                aspectRatio,
                                rotation: transform.rotation,
                                flipH: transform.flipH,
                                flipV: transform.flipV,
                                speed: transform.speed,
                                crop: {
                                    x: transform.cropX,
                                    y: transform.cropY,
                                    width: transform.cropWidth,
                                    height: transform.cropHeight
                                },
                                targetWidth: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                                targetHeight: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            },
                            (progress, message) => setProcessing(progress, message)
                        )
                    }
                } else {
                    if (gpuSupported) {
                        blob = await exportVideoWithWebGPU({
                            file: selectedClip.file,
                            startTime: selectedClip.trimStart,
                            endTime: selectedClip.trimEnd,
                            width: preset.resolution.width > 0 ? preset.resolution.width : undefined,
                            height: preset.resolution.height > 0 ? preset.resolution.height : undefined,
                            onProgress: (progress, message) => setProcessing(progress, message),
                        }).catch(async () => {
                            return trimVideo(
                                selectedClip.file,
                                selectedClip.trimStart,
                                selectedClip.trimEnd,
                                (progress, message) => setProcessing(progress, message)
                            )
                        })
                    } else {
                        blob = await trimVideo(
                            selectedClip.file,
                            selectedClip.trimStart,
                            selectedClip.trimEnd,
                            (progress, message) => setProcessing(progress, message)
                        )
                    }
                }

                const url = URL.createObjectURL(blob)
                setComplete(url)
            } catch (err) {
                const error = wrapError(err, 'trim', { filename: selectedClip.name })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleMerge = () => {
        if (!canMerge) return

        onOpenExportModal('merge', async (_preset: ExportPreset) => {
            try {
                startExport()

                const blob = await mergeVideos(
                    clips.map((clip: Clip) => ({
                        file: clip.file,
                        trimStart: clip.trimStart,
                        trimEnd: clip.trimEnd
                    })),
                    (progress, message) => setProcessing(progress, message)
                )

                const url = URL.createObjectURL(blob)
                setComplete(url)
            } catch (err) {
                const error = wrapError(err, 'merge', { clipCount: clips.length })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleSplit = () => {
        if (!selectedClip || !canSplit) return

        onOpenExportModal('split', async (_preset: ExportPreset) => {
            try {
                startExport()

                const blobs = await splitVideo(
                    selectedClip.file,
                    selectedClip.trimStart,
                    selectedClip.trimEnd,
                    selectedClip.splitPoints,
                    (progress, message) => setProcessing(progress, message)
                )

                // Download all segments with sanitized filenames
                const baseName = sanitizeFilename(
                    selectedClip.name.replace(/\.[^/.]+$/, '')
                )
                blobs.forEach((blob, i) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${baseName}_part${i + 1}.mp4`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setTimeout(() => URL.revokeObjectURL(url), 15000)
                })

                setComplete('') // No single URL, files already downloaded
            } catch (err) {
                const error = wrapError(err, 'split', {
                    filename: selectedClip.name,
                    splitPoints: selectedClip.splitPoints.length
                })
                console.error('[ActionBar]', error.toJSON())
                setError(error.userMessage)
            }
        })
    }

    const handleExportSelected = () => {
        if (selectedClip) {
            handleTrim()
        }
    }

    const handleReverse = async () => {
        if (!selectedClip) return

        const activeClipId = selectedClip.id
        const duration = selectedClip.trimEnd - selectedClip.trimStart
        if (duration > 10) {
            if (!confirm(`This clip is ${Math.round(duration)}s long. Reversing long clips (>10s) may consume significant memory and crash the application. Do you want to proceed?`)) {
                return
            }
        }

        setLoading(true)
        try {
            const reversedBlob = await reverseVideo(selectedClip.file, selectedClip.trimStart, selectedClip.trimEnd)
            const currentSelected = useEditorStore.getState().selectedClipId
            const clipStillExists = useEditorStore.getState().clips.some((c) => c.id === activeClipId)
            if (!clipStillExists || currentSelected !== activeClipId) {
                return
            }

            // Create new file with meaningful name
            const nameParts = selectedClip.name.split('.')
            const ext = nameParts.pop()
            const baseName = nameParts.join('.')
            const newName = `${baseName} (Reversed).${ext || 'mp4'}`

            const newFile = new File([reversedBlob], newName, { type: selectedClip.file.type })
            const clip = await createClipFromFile(newFile)
            if (clip) {
                addClip(clip)
                selectClip(clip.id)
            }
        } catch (error) {
            console.error('[ActionBar] Failed to reverse clip:', error)
            alert('Failed to reverse clip. The browser might have run out of memory. Try using a shorter clip or lower resolution.')
        } finally {
            setLoading(false)
        }
    }

    const handleExtractFrame = async (mode: 'first' | 'last') => {
        if (!selectedClip) return

        setLoading(true)
        try {
            // For last frame, subtract a small amount to ensure we are within the video duration
            // and actually get a frame. 0.1s (100ms) is usually safe for >10fps video.
            const time = mode === 'first'
                ? selectedClip.trimStart
                : Math.max(selectedClip.trimStart, selectedClip.trimEnd - 0.1)
            const frameBlob = await extractFrame(selectedClip.file, time, (progress, message) => setProcessing(progress, message))

            // Download frame
            const url = URL.createObjectURL(frameBlob)
            const a = document.createElement('a')
            a.href = url
            const baseName = sanitizeFilename(selectedClip.name.replace(/\.[^/.]+$/, ''))
            a.download = `${baseName}_${mode}_frame.webp`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 15000)

            setComplete('')
        } catch (error) {
            console.error('[ActionBar] Failed to extract frame:', error)
            const err = wrapError(error, 'extractFrame', { filename: selectedClip.name })
            setError(err.userMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleDetachAudio = async () => {
        if (!selectedClip) return

        setLoading(true)
        try {
            // 1. Extract Audio
            const audioBlob = await extractAudio(
                selectedClip.file,
                selectedClip.trimStart,
                selectedClip.trimEnd,
                (progress, message) => setProcessing(progress, `Extracting audio: ${message}`)
            )

            // 2. Remove Audio (get video only)
            const videoBlob = await removeAudio(
                selectedClip.file,
                selectedClip.trimStart,
                selectedClip.trimEnd,
                (progress, message) => setProcessing(progress, `Extracting video: ${message}`)
            )

            const baseName = sanitizeFilename(selectedClip.name.replace(/\.[^/.]+$/, ''))

            // Download Audio
            const audioUrl = URL.createObjectURL(audioBlob)
            const aAudio = document.createElement('a')
            aAudio.href = audioUrl
            aAudio.download = `${baseName}_audio.mp3`
            document.body.appendChild(aAudio)
            aAudio.click()
            document.body.removeChild(aAudio)
            setTimeout(() => URL.revokeObjectURL(audioUrl), 15000)

            // Download Video
            const videoUrl = URL.createObjectURL(videoBlob)
            const aVideo = document.createElement('a')
            aVideo.href = videoUrl
            aVideo.download = `${baseName}_video_only.mp4`
            document.body.appendChild(aVideo)
            aVideo.click()
            document.body.removeChild(aVideo)
            setTimeout(() => URL.revokeObjectURL(videoUrl), 15000)

            setComplete('')
        } catch (error) {
            console.error('[ActionBar] Failed to detach audio:', error)
            const err = wrapError(error, 'detachAudio', { filename: selectedClip.name })
            setError(err.userMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleFixVisibility = async () => {
        if (!selectedClip) return

        const activeClipId = selectedClip.id
        const activeClipName = selectedClip.name
        try {
            startExport()
            setLoading(true)
            setProcessing(0, 'Initializing transcoder...')

            const blob = await transcodeToH264(selectedClip.file, (progress, message) => {
                setProcessing(progress, message)
            })

            const currentSelected = useEditorStore.getState().selectedClipId
            const clipStillExists = useEditorStore.getState().clips.some((c) => c.id === activeClipId)
            if (!clipStillExists || currentSelected !== activeClipId) {
                setComplete('')
                return
            }

            const fixedFile = new File([blob], activeClipName, { type: 'video/mp4' })
            updateClipFile(activeClipId, fixedFile)

            // Explicitly trigger save to ensure persistence before any other action
            try {
                const currentClips = useEditorStore.getState().clips
                const currentSelectedId = useEditorStore.getState().selectedClipId
                await saveProject(currentClips, currentSelectedId)
            } catch (saveError) {
                console.warn('[ActionBar] Immediate save failed, relying on auto-save:', saveError)
            }

        } catch (error) {
            console.error('[ActionBar] Failed to transcode video:', error)
            setError('Transcoding failed. Please try a different video format.')
        } finally {
            setLoading(false)
        }
    }

    const handleAutoCutSilence = async () => {
        if (!selectedClip) return

        const activeClipId = selectedClip.id
        setLoading(true)
        try {
            const splitPoints = await detectSilenceSplitPoints(selectedClip.file)
            const currentSelected = useEditorStore.getState().selectedClipId
            const clipStillExists = useEditorStore.getState().clips.some((c) => c.id === activeClipId)
            if (!clipStillExists || currentSelected !== activeClipId) {
                console.warn('[ActionBar] Clip switched during silence detection. Discarding.')
                return
            }

            if (splitPoints.length === 0) {
                alert('No significant silence gaps detected.')
                return
            }
            for (const sp of splitPoints) {
                if (sp > selectedClip.trimStart && sp < selectedClip.trimEnd) {
                    addSplitPoint(activeClipId, sp)
                }
            }
        } catch (error) {
            console.error('[ActionBar] Failed to detect silence:', error)
            alert('Silence detection failed. Make sure the video contains an audio track.')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateSubtitles = async () => {
        if (!selectedClip) return

        const activeClipId = selectedClip.id
        const activeClipName = selectedClip.name
        setLoading(true)
        try {
            startExport()
            const cues = await generateSubtitlesWebGPU(selectedClip.file, (progress, message) => {
                setProcessing(progress, message)
            })

            const currentSelected = useEditorStore.getState().selectedClipId
            const clipStillExists = useEditorStore.getState().clips.some((c) => c.id === activeClipId)
            if (!clipStillExists || currentSelected !== activeClipId) {
                setComplete('')
                return
            }

            if (cues.length === 0) {
                setComplete('')
                alert('No speech detected in audio track.')
                return
            }

            const srtContent = formatAsSRT(cues)
            const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const baseName = sanitizeFilename(activeClipName.replace(/\.[^/.]+$/, ''))
            a.download = `${baseName}_subtitles.srt`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 15000)

            setComplete('')
        } catch (error) {
            console.error('[ActionBar] Failed to generate subtitles:', error)
            setError('Failed to generate subtitles with Whisper AI.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.dockContainer}>
            <footer className={styles.actionBar} role="toolbar" aria-label="Video editing actions">
                <div className={styles.leftCluster}>
                    <div className={styles.group}>
                        <button
                            className="btn"
                            onClick={handleTrim}
                            disabled={!selectedClip}
                            title="Trim selected clip (Export range)"
                        >
                            <Scissors size={14} />
                            <span>Export Trim</span>
                        </button>

                        <button
                            className={`btn ${canSplit ? 'btn-warning' : ''}`}
                            onClick={handleSplit}
                            disabled={!canSplit}
                            title={canSplit ? `Export ${selectedClip!.splitPoints.length + 1} segments` : 'Add split points in timeline first'}
                        >
                            <Split size={14} />
                            <span>{canSplit ? `Split (${selectedClip!.splitPoints.length + 1})` : 'Export Split'}</span>
                        </button>

                        <button
                            className="btn"
                            onClick={handleMerge}
                            disabled={!canMerge}
                            title="Merge and export all clips"
                        >
                            <Link size={14} />
                            <span>Export Merge</span>
                        </button>

                        <button
                            className="btn"
                            onClick={() => selectedClip && revertClip(selectedClip.id)}
                            disabled={!selectedClip || !selectedClipHasModifications}
                            title="Revert selected clip to original"
                        >
                            <RotateCcw size={14} />
                            <span>Revert</span>
                        </button>

                        <button
                            className="btn"
                            onClick={handleReverse}
                            disabled={!selectedClip}
                            title="Create a reversed copy of the selected clip"
                        >
                            <Rewind size={14} />
                            <span>Reverse</span>
                        </button>
                    </div>

                    <div className={styles.divider} />

                    {/* AI Studio Superpowers */}
                    <div className={styles.group}>
                        <button
                            className={`btn ${styles.aiBtn}`}
                            onClick={handleAutoCutSilence}
                            disabled={!selectedClip}
                            title="Detect speech pauses and create split markers (AI Silence Detection)"
                        >
                            <Sparkles size={14} className={styles.aiSparkleIcon} />
                            <span>Auto Cut Silences</span>
                        </button>

                        <button
                            className={`btn ${styles.aiBtn}`}
                            onClick={handleGenerateSubtitles}
                            disabled={!selectedClip}
                            title="Transcribe speech & generate .srt subtitles (Whisper WebGPU AI)"
                        >
                            <Captions size={14} className={styles.aiCaptionsIcon} />
                            <span>Auto Subtitles</span>
                        </button>
                    </div>

                    <div className={styles.divider} />

                    {/* Media Extraction & Utility */}
                    <div className={styles.group}>
                        <button
                            className="btn"
                            onClick={() => handleExtractFrame('first')}
                            disabled={!selectedClip}
                            title="Extract first frame as WebP"
                        >
                            <Image size={14} />
                            <span>First Frame</span>
                        </button>

                        <button
                            className="btn"
                            onClick={() => handleExtractFrame('last')}
                            disabled={!selectedClip}
                            title="Extract last frame as WebP"
                        >
                            <Image size={14} />
                            <span>Last Frame</span>
                        </button>

                        <button
                            className="btn"
                            onClick={handleDetachAudio}
                            disabled={!selectedClip}
                            title="Detach and download audio"
                        >
                            <Music size={14} />
                            <span>Detach Audio</span>
                        </button>

                        <button
                            className="btn btn-warning"
                            onClick={handleFixVisibility}
                            disabled={!selectedClip}
                            title="Convert video to browser-compatible format (H.264)"
                        >
                            <Wand2 size={14} />
                            <span>Fix Visibility</span>
                        </button>

                        <button
                            className="btn"
                            onClick={reset}
                            disabled={!hasClips}
                            title="Clear all clips and reset project"
                        >
                            <RotateCcw size={14} />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                <div className={styles.exportGroup}>
                    <button
                        className={`btn btn-primary ${styles.exportBtn}`}
                        onClick={handleExportSelected}
                        disabled={!selectedClip}
                        title="Export selected clip with WebGPU hardware acceleration"
                    >
                        <Download size={15} />
                        <span>Export Selected</span>
                    </button>
                </div>
            </footer>
        </div>
    )
}
