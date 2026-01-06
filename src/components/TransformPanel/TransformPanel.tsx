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
    Gauge
} from 'lucide-react'
import { useEditorStore, type AspectRatioPreset, type TransformState } from '../../store/editorStore'
import styles from './TransformPanel.module.css'

const ASPECT_RATIOS: { value: AspectRatioPreset; label: string; icon: React.ReactNode; width: number; height: number }[] = [
    { value: 'original', label: 'Original', icon: null, width: 16, height: 9 },
    { value: '16:9', label: '16:9', icon: <Monitor size={16} />, width: 16, height: 9 },
    { value: '9:16', label: '9:16', icon: <Smartphone size={16} />, width: 9, height: 16 },
    { value: '1:1', label: '1:1', icon: <Square size={14} />, width: 1, height: 1 },
    { value: '4:5', label: '4:5', icon: <RectangleVertical size={16} />, width: 4, height: 5 },
]

const SPEED_PRESETS: { value: TransformState['speed']; label: string }[] = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
]

export function TransformPanel() {
    const { clips, selectedClipId, cropMode, updateTransform, resetTransform, toggleCropMode } = useEditorStore()
    const selectedClip = clips.find((c) => c.id === selectedClipId)

    if (!selectedClip) {
        return null
    }

    const { transform } = selectedClip
    const hasTransforms =
        transform.aspectRatio !== 'original' ||
        transform.rotation !== 0 ||
        transform.flipH ||
        transform.flipV ||
        transform.speed !== 1 ||
        transform.cropWidth !== 1 ||
        transform.cropHeight !== 1 ||
        transform.cropX !== 0 ||
        transform.cropY !== 0

    const handleAspectRatioChange = (ratio: AspectRatioPreset) => {
        updateTransform(selectedClipId!, { aspectRatio: ratio })
    }

    const handleSpeedChange = (speed: TransformState['speed']) => {
        updateTransform(selectedClipId!, { speed })
    }

    const handleRotateCW = () => {
        const newRotation = ((transform.rotation + 90) % 360) as 0 | 90 | 180 | 270
        updateTransform(selectedClipId!, { rotation: newRotation })
    }

    const handleRotateCCW = () => {
        const newRotation = ((transform.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270
        updateTransform(selectedClipId!, { rotation: newRotation })
    }

    const handleFlipH = () => {
        updateTransform(selectedClipId!, { flipH: !transform.flipH })
    }

    const handleFlipV = () => {
        updateTransform(selectedClipId!, { flipV: !transform.flipV })
    }

    const handleReset = () => {
        resetTransform(selectedClipId!)
        if (cropMode) {
            toggleCropMode()
        }
    }

    return (
        <div className={styles.panel}>
            {/* Aspect Ratio Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Aspect</span>
                {ASPECT_RATIOS.map((ar) => (
                    <button
                        key={ar.value}
                        className={`${styles.aspectBtn} ${transform.aspectRatio === ar.value ? styles.active : ''}`}
                        onClick={() => handleAspectRatioChange(ar.value)}
                        title={ar.value === 'original' ? 'Keep original aspect ratio' : `Change to ${ar.label}`}
                    >
                        {ar.value === 'original' ? (
                            <div
                                className={styles.aspectIcon}
                                style={{ width: 20, height: 12, borderRadius: 2 }}
                            />
                        ) : (
                            <div
                                className={styles.aspectIcon}
                                style={{
                                    width: Math.round(ar.width * 1.5),
                                    height: Math.round(ar.height * 1.5),
                                    borderRadius: 2
                                }}
                            />
                        )}
                        <span className={styles.aspectLabel}>{ar.label}</span>
                    </button>
                ))}
            </div>

            <div className={styles.divider} />

            {/* Rotate Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Rotate</span>
                <button
                    className={styles.transformBtn}
                    onClick={handleRotateCCW}
                    title="Rotate 90° counter-clockwise"
                >
                    <RotateCcw size={18} />
                </button>
                <button
                    className={styles.transformBtn}
                    onClick={handleRotateCW}
                    title="Rotate 90° clockwise"
                >
                    <RotateCw size={18} />
                </button>
                {transform.rotation !== 0 && (
                    <span className={styles.rotationIndicator}>
                        {transform.rotation}°
                    </span>
                )}
            </div>

            <div className={styles.divider} />

            {/* Flip Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>Flip</span>
                <button
                    className={`${styles.transformBtn} ${transform.flipH ? styles.active : ''}`}
                    onClick={handleFlipH}
                    title="Flip horizontal"
                >
                    <FlipHorizontal2 size={18} />
                </button>
                <button
                    className={`${styles.transformBtn} ${transform.flipV ? styles.active : ''}`}
                    onClick={handleFlipV}
                    title="Flip vertical"
                >
                    <FlipVertical2 size={18} />
                </button>
            </div>

            <div className={styles.divider} />

            {/* Crop Section */}
            <div className={styles.section}>
                <button
                    className={`${styles.cropToggle} ${cropMode ? styles.active : ''}`}
                    onClick={toggleCropMode}
                    title={cropMode ? 'Exit crop mode' : 'Enter crop mode'}
                >
                    <Crop size={16} />
                    {cropMode ? 'Done Cropping' : 'Crop'}
                </button>
            </div>

            <div className={styles.divider} />

            {/* Speed Section */}
            <div className={styles.section}>
                <span className={styles.sectionLabel}>
                    <Gauge size={14} />
                </span>
                {SPEED_PRESETS.map((sp) => (
                    <button
                        key={sp.value}
                        className={`${styles.speedBtn} ${transform.speed === sp.value ? styles.active : ''}`}
                        onClick={() => handleSpeedChange(sp.value)}
                        title={`${sp.label} speed`}
                    >
                        {sp.label}
                    </button>
                ))}
            </div>

            {/* Reset */}
            {hasTransforms && (
                <>
                    <div className={styles.divider} />
                    <button
                        className={styles.resetBtn}
                        onClick={handleReset}
                        title="Reset all transforms"
                    >
                        <ResetIcon size={14} />
                        Reset
                    </button>
                </>
            )}
        </div>
    )
}
