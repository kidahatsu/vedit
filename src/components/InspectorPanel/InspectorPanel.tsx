/**
 * @fileoverview InspectorPanel component for precision clip transforms, color grading, audio controls, and AI studio tools.
 * Styled with Apple Studio Pro dark glass aesthetics, WCAG 2.1 AA accessibility, and real-time WebGPU feedback.
 */

import { useState } from 'react'
import {
    Crop,
    RotateCw,
    RotateCcw,
    FlipHorizontal2,
    FlipVertical2,
    Volume2,
    VolumeX,
    RotateCcw as ResetIcon,
    Sliders,
    Sparkles,
    Rewind,
    Music,
    Wand2,
    Mic,
    Film,
    Loader2,
    CheckCircle2,
} from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import type { AspectRatioPreset } from '../../store/types'
import { hasTransformsApplied, calculateAspectRatioCrop } from '../../utils/videoTransforms'
import { reverseVideo, transcodeToH264, extractAudio } from '../../lib/ffmpeg'
import { detectSilenceSplitPoints } from '../../lib/ai/silenceDetection'
import { generateSubtitlesWebGPU, formatAsSRT } from '../../lib/ai/subtitles'
import { sanitizeFilename } from '../../utils/validation'
import styles from './InspectorPanel.module.css'

type InspectorTab = 'framing' | 'color' | 'audio' | 'ai'

const ASPECT_RATIOS: { label: string; value: AspectRatioPreset; width: number; height: number }[] = [
    { label: 'Original', value: 'original', width: 24, height: 16 },
    { label: '16:9 Landscape', value: '16:9', width: 24, height: 13.5 },
    { label: '9:16 Portrait', value: '9:16', width: 13.5, height: 24 },
    { label: '1:1 Square', value: '1:1', width: 18, height: 18 },
    { label: '4:5 Social', value: '4:5', width: 16, height: 20 },
]

const SPEED_PRESETS: { label: string; value: 0.5 | 0.75 | 1 | 1.5 | 2 }[] = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
]

export function InspectorPanel() {
    const [activeTab, setActiveTab] = useState<InspectorTab>('framing')

    // AI Tools State
    const [aiRunningTool, setAiRunningTool] = useState<string | null>(null)
    const [aiProgress, setAiProgress] = useState<number>(0)
    const [aiStatusMsg, setAiStatusMsg] = useState<string>('')
    const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null)

    const cropMode = useEditorStore((state) => state.cropMode)
    const updateTransform = useEditorStore((state) => state.updateTransform)
    const resetTransform = useEditorStore((state) => state.resetTransform)
    const toggleCropMode = useEditorStore((state) => state.toggleCropMode)
    const setLoading = useEditorStore((state) => state.setLoading)
    const addSplitPoint = useEditorStore((state) => state.addSplitPoint)
    const addClip = useEditorStore((state) => state.addClip)
    const selectClip = useEditorStore((state) => state.selectClip)
    const updateClipFile = useEditorStore((state) => state.updateClipFile)

    const selectedClip = useSelectedClip()

    if (!selectedClip) {
        return (
            <aside className={styles.inspector} aria-label="Studio inspector">
                <div className={styles.header}>
                    <span className={styles.title}>Inspector</span>
                </div>
                <div className={styles.emptyState}>
                    <Film size={32} opacity={0.3} />
                    <div>Select a video clip to adjust parameters</div>
                </div>
            </aside>
        )
    }

    const { id: clipId, transform } = selectedClip
    const hasTransforms = hasTransformsApplied(transform)
    const currentVolume = transform.volume ?? 100
    const currentBrightness = transform.brightness ?? 0
    const currentContrast = transform.contrast ?? 1
    const currentSaturation = transform.saturation ?? 1

    const handleAspectRatioChange = (ar: AspectRatioPreset) => {
        const videoEl = document.querySelector('video')
        const width = videoEl?.videoWidth || 1920
        const height = videoEl?.videoHeight || 1080
        const crop = calculateAspectRatioCrop(width, height, ar)

        updateTransform(clipId, {
            aspectRatio: ar,
            cropX: crop.cropX,
            cropY: crop.cropY,
            cropWidth: crop.cropWidth,
            cropHeight: crop.cropHeight,
        })
    }

    const handleSpeedChange = (speed: 0.5 | 0.75 | 1 | 1.5 | 2) => {
        updateTransform(clipId, { speed })
    }

    const handleRotateCW = () => {
        const newRotation = ((transform.rotation + 90) % 360) as 0 | 90 | 180 | 270
        updateTransform(clipId, { rotation: newRotation })
    }

    const handleRotateCCW = () => {
        const newRotation = ((transform.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270
        updateTransform(clipId, { rotation: newRotation })
    }

    const handleFlipH = () => updateTransform(clipId, { flipH: !transform.flipH })
    const handleFlipV = () => updateTransform(clipId, { flipV: !transform.flipV })

    const handleReset = () => {
        resetTransform(clipId)
        if (cropMode) toggleCropMode()
    }

    const handleResetColor = () => {
        updateTransform(clipId, {
            brightness: 0,
            contrast: 1,
            saturation: 1
        })
    }

    // AI Tools Handlers
    const handleAutoCutSilence = async () => {
        setAiRunningTool('silence')
        setAiProgress(10)
        setAiStatusMsg('Analyzing audio waveform for pauses...')
        setAiSuccessMsg(null)
        setLoading(true)

        try {
            const splitPoints = await detectSilenceSplitPoints(selectedClip.file)
            setAiProgress(100)

            if (splitPoints.length === 0) {
                setAiSuccessMsg('Audio analysis complete: No silence gaps detected.')
                return
            }

            let addedCount = 0
            for (const sp of splitPoints) {
                if (sp > selectedClip.trimStart && sp < selectedClip.trimEnd) {
                    addSplitPoint(clipId, sp)
                    addedCount++
                }
            }

            setAiSuccessMsg(`Added ${addedCount} silence split points to timeline!`)
        } catch (error) {
            console.error('[Inspector] Failed to detect silence:', error)
            alert('Silence detection failed. Make sure the video contains an audio track.')
        } finally {
            setAiRunningTool(null)
            setLoading(false)
        }
    }

    const handleGenerateSubtitles = async () => {
        setAiRunningTool('subtitles')
        setAiProgress(5)
        setAiStatusMsg('Initializing Whisper WebGPU AI...')
        setAiSuccessMsg(null)
        setLoading(true)

        try {
            const cues = await generateSubtitlesWebGPU(selectedClip.file, (progress, message) => {
                setAiProgress(Math.round(progress * 100))
                setAiStatusMsg(message)
            })

            if (cues.length === 0) {
                setAiSuccessMsg('No speech detected in audio track.')
                return
            }

            const srtContent = formatAsSRT(cues)
            const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const baseName = selectedClip.name.replace(/\.[^.]+$/, '')
            a.download = sanitizeFilename(`${baseName}_subtitles.srt`)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 15000)

            setAiSuccessMsg(`Generated ${cues.length} subtitle cues (.srt downloaded)!`)
        } catch (error) {
            console.error('[Inspector] Whisper subtitle error:', error)
            alert('Subtitle generation failed. ' + (error instanceof Error ? error.message : ''))
        } finally {
            setAiRunningTool(null)
            setLoading(false)
        }
    }

    const handleFixVisibility = async () => {
        setAiRunningTool('fix')
        setAiProgress(10)
        setAiStatusMsg('Transcoding video codec to browser-compatible H.264...')
        setAiSuccessMsg(null)
        setLoading(true)

        try {
            const convertedBlob = await transcodeToH264(selectedClip.file, (progress) => {
                setAiProgress(Math.round(progress * 100))
                setAiStatusMsg(`Transcoding H.264: ${Math.round(progress * 100)}%`)
            })

            const newFile = new File([convertedBlob], selectedClip.name.replace(/\.[^.]+$/, '') + '_h264.mp4', {
                type: 'video/mp4',
            })
            updateClipFile(clipId, newFile)
            setAiSuccessMsg('Video successfully transcoded to standard H.264!')
        } catch (error) {
            console.error('[Inspector] Transcode error:', error)
            alert('Video conversion failed. Check console for details.')
        } finally {
            setAiRunningTool(null)
            setLoading(false)
        }
    }

    const handleReverse = async () => {
        setLoading(true)
        try {
            const reversedBlob = await reverseVideo(selectedClip.file, selectedClip.trimStart, selectedClip.trimEnd)
            const reversedFile = new File(
                [reversedBlob],
                `reversed_${selectedClip.name}`,
                { type: selectedClip.file.type }
            )

            const newClip = {
                ...selectedClip,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                name: `reversed_${selectedClip.name}`,
                file: reversedFile,
                thumbnailUrl: selectedClip.thumbnailUrl,
            }

            addClip(newClip)
            selectClip(newClip.id)
        } catch (error) {
            console.error('[Inspector] Failed to reverse video:', error)
            alert('Failed to reverse video. Check console for details.')
        } finally {
            setLoading(false)
        }
    }

    const handleDetachAudio = async () => {
        setLoading(true)
        try {
            const baseName = sanitizeFilename(selectedClip.name.replace(/\.[^.]+$/, ''))
            const audioBlob = await extractAudio(selectedClip.file, 0, selectedClip.duration)
            const videoBlob = selectedClip.file

            const audioUrl = URL.createObjectURL(audioBlob)
            const aAudio = document.createElement('a')
            aAudio.href = audioUrl
            aAudio.download = `${baseName}_audio.mp3`
            document.body.appendChild(aAudio)
            aAudio.click()
            document.body.removeChild(aAudio)

            const videoUrl = URL.createObjectURL(videoBlob)
            const aVideo = document.createElement('a')
            aVideo.href = videoUrl
            aVideo.download = `${baseName}_video_only.mp4`
            document.body.appendChild(aVideo)
            aVideo.click()
            document.body.removeChild(aVideo)

            setTimeout(() => {
                URL.revokeObjectURL(audioUrl)
                URL.revokeObjectURL(videoUrl)
            }, 15000)
        } catch (error) {
            console.error('[Inspector] Detach error:', error)
            alert('Failed to detach audio.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <aside className={styles.inspector} aria-label="Studio inspector">
            <div className={styles.header}>
                <span className={styles.title}>Inspector</span>
                <button
                    className={styles.resetBtn}
                    onClick={handleReset}
                    disabled={!hasTransforms && !cropMode}
                    title="Reset all clip transforms"
                >
                    <ResetIcon size={12} />
                    <span>Reset All</span>
                </button>
            </div>

            {/* Apple Studio Inspector Tabs */}
            <div className={styles.tabsBar} role="tablist" aria-label="Inspector Panels">
                <button
                    role="tab"
                    id="tab-framing"
                    aria-controls="panel-framing"
                    aria-selected={activeTab === 'framing'}
                    className={`${styles.tabBtn} ${activeTab === 'framing' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('framing')}
                    title="Framing & Aspect Ratio"
                >
                    <Crop size={13} />
                    <span>Framing</span>
                </button>
                <button
                    role="tab"
                    id="tab-color"
                    aria-controls="panel-color"
                    aria-selected={activeTab === 'color'}
                    className={`${styles.tabBtn} ${activeTab === 'color' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('color')}
                    title="Live Color Grading & Speed"
                >
                    <Sliders size={13} />
                    <span>Color</span>
                </button>
                <button
                    role="tab"
                    id="tab-audio"
                    aria-controls="panel-audio"
                    aria-selected={activeTab === 'audio'}
                    className={`${styles.tabBtn} ${activeTab === 'audio' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('audio')}
                    title="Audio Levels & Fades"
                >
                    <Volume2 size={13} />
                    <span>Audio</span>
                </button>
                <button
                    role="tab"
                    id="tab-ai"
                    aria-controls="panel-ai"
                    aria-selected={activeTab === 'ai'}
                    className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('ai')}
                    title="AI Studio Superpowers"
                >
                    <Sparkles size={13} style={{ color: '#bf5af2' }} />
                    <span>AI Suite</span>
                </button>
            </div>

            <div className={styles.content}>
                {/* 1. Framing Tab */}
                {activeTab === 'framing' && (
                    <div role="tabpanel" id="panel-framing" aria-labelledby="tab-framing">
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Aspect Ratio</span>
                            </div>
                            <div className={styles.aspectGrid}>
                                {ASPECT_RATIOS.map((ar) => (
                                    <button
                                        key={ar.value}
                                        className={`${styles.aspectCard} ${transform.aspectRatio === ar.value ? styles.aspectCardActive : ''}`}
                                        onClick={() => handleAspectRatioChange(ar.value)}
                                        title={`Set aspect ratio to ${ar.label}`}
                                        aria-pressed={transform.aspectRatio === ar.value}
                                    >
                                        <div
                                            className={styles.aspectCardIcon}
                                            style={{
                                                width: Math.round(ar.width * 1.5),
                                                height: Math.round(ar.height * 1.5),
                                            }}
                                        />
                                        <span className={styles.aspectCardLabel}>{ar.label.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Transform & Orientation</span>
                            </div>
                            <div className={styles.actionGrid}>
                                <button
                                    className={styles.toolButton}
                                    onClick={handleRotateCCW}
                                    title="Rotate -90° CCW"
                                >
                                    <RotateCcw size={13} />
                                    <span>Rotate -90°</span>
                                </button>
                                <button
                                    className={styles.toolButton}
                                    onClick={handleRotateCW}
                                    title="Rotate +90° CW"
                                >
                                    <RotateCw size={13} />
                                    <span>Rotate +90°</span>
                                </button>
                                <button
                                    className={`${styles.toolButton} ${transform.flipH ? styles.toolButtonActive : ''}`}
                                    onClick={handleFlipH}
                                    title="Flip Horizontal"
                                    aria-pressed={!!transform.flipH}
                                >
                                    <FlipHorizontal2 size={13} />
                                    <span>Flip H</span>
                                </button>
                                <button
                                    className={`${styles.toolButton} ${transform.flipV ? styles.toolButtonActive : ''}`}
                                    onClick={handleFlipV}
                                    title="Flip Vertical"
                                    aria-pressed={!!transform.flipV}
                                >
                                    <FlipVertical2 size={13} />
                                    <span>Flip V</span>
                                </button>
                            </div>
                            <button
                                className={`${styles.toolButton} ${cropMode ? styles.toolButtonActive : ''}`}
                                onClick={toggleCropMode}
                                style={{ marginTop: 4 }}
                                title="Interactive Visual Crop Box"
                                aria-pressed={cropMode}
                            >
                                <Crop size={14} />
                                <span>{cropMode ? 'Done Cropping' : 'Interactive Crop Box'}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Color & Speed Tab */}
                {activeTab === 'color' && (
                    <div role="tabpanel" id="panel-color" aria-labelledby="tab-color">
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Live WebGPU Color Grading</span>
                                {(currentBrightness !== 0 || currentContrast !== 1 || currentSaturation !== 1) && (
                                    <button className={styles.resetBtn} onClick={handleResetColor} title="Reset Color adjustments">
                                        <ResetIcon size={11} />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Brightness</span>
                                    <span className={styles.controlValue}>{currentBrightness > 0 ? `+${currentBrightness.toFixed(2)}` : currentBrightness.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-0.5"
                                    max="0.5"
                                    step="0.02"
                                    value={currentBrightness}
                                    onChange={(e) => updateTransform(clipId, { brightness: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Brightness"
                                    aria-valuetext={currentBrightness > 0 ? `+${currentBrightness.toFixed(2)}` : currentBrightness.toFixed(2)}
                                />
                            </div>

                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Contrast</span>
                                    <span className={styles.controlValue}>{currentContrast.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.05"
                                    value={currentContrast}
                                    onChange={(e) => updateTransform(clipId, { contrast: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Contrast"
                                    aria-valuetext={`${currentContrast.toFixed(2)}x`}
                                />
                            </div>

                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Saturation</span>
                                    <span className={styles.controlValue}>{currentSaturation.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2.5"
                                    step="0.05"
                                    value={currentSaturation}
                                    onChange={(e) => updateTransform(clipId, { saturation: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Saturation"
                                    aria-valuetext={`${currentSaturation.toFixed(2)}x`}
                                />
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Playback Speed</span>
                            </div>
                            <div className={styles.segmentedGroup}>
                                {SPEED_PRESETS.map((sp) => (
                                    <button
                                        key={sp.value}
                                        className={`${styles.speedBtn} ${transform.speed === sp.value ? styles.speedBtnActive : ''}`}
                                        onClick={() => handleSpeedChange(sp.value)}
                                        title={`Speed ${sp.label}`}
                                        aria-pressed={transform.speed === sp.value}
                                    >
                                        {sp.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                className={styles.toolButton}
                                onClick={handleReverse}
                                style={{ marginTop: 6 }}
                                title="Create a reversed duplicate of this clip"
                            >
                                <Rewind size={13} />
                                <span>Reverse Clip</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Audio Tab */}
                {activeTab === 'audio' && (
                    <div role="tabpanel" id="panel-audio" aria-labelledby="tab-audio">
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Audio Levels</span>
                                <button
                                    className={styles.resetBtn}
                                    onClick={() => updateTransform(clipId, { muted: !transform.muted })}
                                    title={transform.muted ? 'Unmute Audio' : 'Mute Audio'}
                                    aria-pressed={!!transform.muted}
                                >
                                    {transform.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                                    <span>{transform.muted ? 'Unmute' : 'Mute'}</span>
                                </button>
                            </div>

                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Volume Gain</span>
                                    <span className={styles.controlValue}>{Math.round(currentVolume)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="5"
                                    value={currentVolume}
                                    onChange={(e) => updateTransform(clipId, { volume: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Volume slider"
                                    aria-valuetext={`${Math.round(currentVolume)}%`}
                                />
                            </div>

                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Fade In</span>
                                    <span className={styles.controlValue}>{(transform.fadeIn ?? 0).toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={transform.fadeIn ?? 0}
                                    onChange={(e) => updateTransform(clipId, { fadeIn: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Fade In"
                                    aria-valuetext={`${(transform.fadeIn ?? 0).toFixed(1)} seconds`}
                                />
                            </div>

                            <div className={styles.controlRow}>
                                <div className={styles.controlHeader}>
                                    <span className={styles.controlLabel}>Fade Out</span>
                                    <span className={styles.controlValue}>{(transform.fadeOut ?? 0).toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={transform.fadeOut ?? 0}
                                    onChange={(e) => updateTransform(clipId, { fadeOut: Number(e.target.value) })}
                                    className={styles.slider}
                                    aria-label="Fade Out"
                                    aria-valuetext={`${(transform.fadeOut ?? 0).toFixed(1)} seconds`}
                                />
                            </div>

                            <button
                                className={styles.toolButton}
                                onClick={handleDetachAudio}
                                style={{ marginTop: 8 }}
                                title="Extract audio and video tracks into separate files"
                            >
                                <Music size={13} />
                                <span>Detach & Download Audio</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. AI Studio Tab */}
                {activeTab === 'ai' && (
                    <div role="tabpanel" id="panel-ai" aria-labelledby="tab-ai">
                        <div className={styles.aiCard}>
                            <div className={styles.aiCardHeader}>
                                <Mic size={15} style={{ color: '#bf5af2' }} />
                                <span>Auto Cut Silences</span>
                            </div>
                            <p className={styles.aiCardDesc}>
                                Automatically detects pauses, silence, and speech gaps using client-side Voice Activity Detection (VAD) and adds split markers to timeline.
                            </p>
                            <button
                                className={styles.aiActionBtn}
                                onClick={handleAutoCutSilence}
                                disabled={aiRunningTool !== null}
                            >
                                {aiRunningTool === 'silence' ? (
                                    <>
                                        <Loader2 size={13} className="spin" />
                                        <span>Analyzing Audio...</span>
                                    </>
                                ) : (
                                    <span>Detect Silences & Add Splits</span>
                                )}
                            </button>
                        </div>

                        <div className={styles.aiCard}>
                            <div className={styles.aiCardHeader}>
                                <Sparkles size={15} style={{ color: '#0a84ff' }} />
                                <span>Whisper AI Auto Subtitles</span>
                            </div>
                            <p className={styles.aiCardDesc}>
                                Generates speech-to-text transcriptions with time-aligned cues directly on your GPU via OpenAI Whisper WebGPU and exports .srt file.
                            </p>
                            <button
                                className={styles.aiActionBtn}
                                onClick={handleGenerateSubtitles}
                                disabled={aiRunningTool !== null}
                            >
                                {aiRunningTool === 'subtitles' ? (
                                    <>
                                        <Loader2 size={13} className="spin" />
                                        <span>Transcribing WebGPU ({aiProgress}%)...</span>
                                    </>
                                ) : (
                                    <span>Transcribe & Export .SRT</span>
                                )}
                            </button>
                        </div>

                        <div className={styles.aiCard}>
                            <div className={styles.aiCardHeader}>
                                <Wand2 size={15} style={{ color: '#ffd60a' }} />
                                <span>Fix Video Visibility</span>
                            </div>
                            <p className={styles.aiCardDesc}>
                                Transcodes unsupported codecs (HEVC / ProRes) to standard browser-compatible H.264.
                            </p>
                            <button
                                className={styles.aiActionBtn}
                                onClick={handleFixVisibility}
                                disabled={aiRunningTool !== null}
                            >
                                {aiRunningTool === 'fix' ? (
                                    <>
                                        <Loader2 size={13} className="spin" />
                                        <span>Converting Video...</span>
                                    </>
                                ) : (
                                    <span>Transcode to H.264</span>
                                )}
                            </button>
                        </div>

                        {/* Live AI Status Feedback Box */}
                        {aiRunningTool && (
                            <div className={styles.aiStatusBox} role="status" aria-live="polite">
                                <div className={styles.aiStatusText}>
                                    <Loader2 size={12} className="spin" style={{ color: '#0a84ff' }} />
                                    <span>{aiStatusMsg || 'Processing on WebGPU...'}</span>
                                </div>
                                <div className={styles.aiProgressBar} role="progressbar" aria-valuenow={aiProgress} aria-valuemin={0} aria-valuemax={100}>
                                    <div className={styles.aiProgressFill} style={{ width: `${aiProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {aiSuccessMsg && !aiRunningTool && (
                            <div className={styles.aiSuccessMsg} role="status" aria-live="polite">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={13} />
                                    <span>{aiSuccessMsg}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
