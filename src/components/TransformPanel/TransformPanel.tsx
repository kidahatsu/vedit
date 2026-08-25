import { useState } from 'react'
import {
    RotateCw,
    RotateCcw,
    FlipHorizontal2,
    FlipVertical2,
    Crop,
    RotateCcw as ResetIcon,
    Square,
    Smartphone,
    Monitor,
    RectangleVertical,
    Volume2,
    VolumeX
} from 'lucide-react'
import { useEditorStore, type AspectRatioPreset, type TransformState } from '../../store/editorStore'
import { useSelectedClip } from '../../store/selectors'
import { hasTransformsApplied, calculateAspectRatioCrop } from '../../utils/videoTransforms'
import styles from './TransformPanel.module.css'

const ASPECT_RATIOS: { value: AspectRatioPreset; label: string; icon: React.ReactNode; width: number; height: number }[] = [
    { value: 'original', label: 'Original', icon: null, width: 16, height: 9 },
    { value: '16:9', label: '16:9', icon: <Monitor size={14} />, width: 16, height: 9 },
    { value: '9:16', label: '9:16', icon: <Smartphone size={14} />, width: 9, height: 16 },
    { value: '1:1', label: '1:1', icon: <Square size={12} />, width: 1, height: 1 },
    { value: '4:5', label: '4:5', icon: <RectangleVertical size={14} />, width: 4, height: 5 },
]

const SPEED_PRESETS: { value: TransformState['speed']; label: string }[] = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
]

export function TransformPanel() {
    const [localVolume, setLocalVolume] = useState<number | null>(null)
    const cropMode = useEditorStore((state) => state.cropMode)
    const updateTransform = useEditorStore((state) => state.updateTransform)
    const resetTransform = useEditorStore((state) => state.resetTransform)
    const toggleCropMode = useEditorStore((state) => state.toggleCropMode)
    const selectedClip = useSelectedClip()

    if (!selectedClip) {
        return null
    }

    const { id: clipId, transform } = selectedClip
    const hasTransforms = hasTransformsApplied(transform)
    const currentVolume = localVolume !== null ? localVolume : transform.volume

    const handleAspectRatioChange = (ratio: AspectRatioPreset) => {
        const videoEl = document.querySelector('video')
        const width = videoEl?.videoWidth || 1920
        const height = videoEl?.videoHeight || 1080
        const crop = calculateAspectRatioCrop(width, height, ratio)

        updateTransform(clipId, {
            aspectRatio: ratio,
            cropX: crop.cropX,
            cropY: crop.cropY,
            cropWidth: crop.cropWidth,
            cropHeight: crop.cropHeight,
        })
    }

    const handleSpeedChange = (speed: TransformState['speed']) => {
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

    const handleFlipH = () => {
        updateTransform(clipId, { flipH: !transform.flipH })
    }

    const handleFlipV = () => {
        updateTransform(clipId, { flipV: !transform.flipV })
    }

    const handleReset = () => {
        resetTransform(clipId)
        if (cropMode) {
            toggleCropMode()
        }
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalVolume(Number(e.target.value))
    }

    const handleVolumeCommit = () => {
        if (localVolume !== null) {
            updateTransform(clipId, { volume: localVolume })
            setLocalVolume(null)
        }
    }

    const handleMuteToggle = () => {
        updateTransform(clipId, { muted: !transform.muted })
    }

    return (
        <div className={styles.panel} role="toolbar" aria-label="Transform and inspector toolbar">
            {/* Aspect Ratio Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Aspect</span>
                <div className={styles.segmentedGroup}>
                    {ASPECT_RATIOS.map((ar) => (
                        <button
                            key={ar.value}
                            className={`${styles.aspectBtn} ${transform.aspectRatio === ar.value ? styles.active : ''}`}
                            onClick={() => handleAspectRatioChange(ar.value)}
                            title={ar.value === 'original' ? 'Original Aspect' : `Aspect ${ar.label}`}
                        >
                            {ar.value === 'original' ? (
                                <div
                                    className={styles.aspectIcon}
                                    style={{ width: 16, height: 10, borderRadius: 1.5 }}
                                />
                            ) : (
                                <div
                                    className={styles.aspectIcon}
                                    style={{
                                        width: Math.round(ar.width * 1.2),
                                        height: Math.round(ar.height * 1.2),
                                        borderRadius: 1.5
                                    }}
                                />
                            )}
                            <span className={styles.aspectLabel}>{ar.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.divider} />

            {/* Transform Controls */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Framing</span>
                <button
                    className={styles.transformBtn}
                    onClick={handleRotateCCW}
                    title="Rotate 90° Counter-Clockwise"
                    aria-label="Rotate CCW"
                >
                    <RotateCcw size={13} />
                    <span>-90°</span>
                </button>
                <button
                    className={styles.transformBtn}
                    onClick={handleRotateCW}
                    title="Rotate 90° Clockwise"
                    aria-label="Rotate CW"
                >
                    <RotateCw size={13} />
                    <span>+90°</span>
                </button>
                <button
                    className={`${styles.transformBtn} ${transform.flipH ? styles.active : ''}`}
                    onClick={handleFlipH}
                    title="Flip Horizontal"
                    aria-label="Flip horizontal"
                >
                    <FlipHorizontal2 size={13} />
                </button>
                <button
                    className={`${styles.transformBtn} ${transform.flipV ? styles.active : ''}`}
                    onClick={handleFlipV}
                    title="Flip Vertical"
                    aria-label="Flip vertical"
                >
                    <FlipVertical2 size={13} />
                </button>
                <button
                    className={`${styles.transformBtn} ${cropMode ? styles.active : ''}`}
                    onClick={toggleCropMode}
                    title="Toggle Interactive Crop Box"
                    aria-label="Crop mode"
                >
                    <Crop size={13} />
                    <span>Crop</span>
                </button>
            </div>

            <div className={styles.divider} />

            {/* Speed Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Speed</span>
                <div className={styles.segmentedGroup}>
                    {SPEED_PRESETS.map((sp) => (
                        <button
                            key={sp.value}
                            className={`${styles.speedBtn} ${transform.speed === sp.value ? styles.active : ''}`}
                            onClick={() => handleSpeedChange(sp.value)}
                            title={`Playback Speed ${sp.label}`}
                        >
                            {sp.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.divider} />

            {/* Audio Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Audio</span>
                <div className={styles.audioGroup}>
                    <button
                        className={styles.transformBtn}
                        onClick={handleMuteToggle}
                        title={transform.muted ? 'Unmute Clip Audio' : 'Mute Clip Audio'}
                        aria-label="Mute audio"
                    >
                        {transform.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                    <div className={styles.sliderWrapper}>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            step="5"
                            value={currentVolume}
                            onChange={handleVolumeChange}
                            onMouseUp={handleVolumeCommit}
                            onTouchEnd={handleVolumeCommit}
                            className={styles.slider}
                            title={`Clip Volume: ${Math.round(currentVolume)}%`}
                            aria-label="Volume slider"
                        />
                        <span className={styles.valueBadge}>{Math.round(currentVolume)}%</span>
                    </div>
                </div>
            </div>

            {/* Reset Button */}
            <button
                className={styles.resetBtn}
                onClick={handleReset}
                disabled={!hasTransforms && !cropMode}
                title="Reset all transforms to default"
            >
                <ResetIcon size={12} />
                <span>Reset</span>
            </button>
        </div>
    )
}
