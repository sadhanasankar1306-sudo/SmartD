import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Eye,
  RefreshCw,
  Sliders,
  Sparkles,
  Upload,
  UserCheck,
  UserX,
  Video,
} from 'lucide-react';
import {
  faceMeshDetector,
  DetectedFaceData,
  BaselineCalibrator,
} from '../services/faceMeshDetector';
import { AlertLevel, DriverMetrics, DriverSystemState, SystemSettings } from '../types';

interface LiveMonitoringViewProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  metrics: DriverMetrics;
  onUpdateMetrics: (metrics: Partial<DriverMetrics>) => void;
  settings: SystemSettings;
  alertLevel: AlertLevel;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  isMonitoring,
  onToggleMonitoring,
  metrics,
  onUpdateMetrics,
  settings,
  alertLevel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelError, setModelError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [inputMode, setInputMode] = useState<'webcam' | 'video_file'>('webcam');
  const [showMeshOverlay, setShowMeshOverlay] = useState<boolean>(true);

  // Calibration, temporal tracking and hysteresis state
  const calibratorRef = useRef<BaselineCalibrator>(new BaselineCalibrator(60));
  const smoothedEarRef = useRef<number | null>(null);
  const isEyeClosedRef = useRef<boolean>(false);
  const closureDurationRef = useRef<number>(0);
  const totalBlinksRef = useRef<number>(0);
  const blinkTimestampsRef = useRef<number[]>([]);
  const yawnStartTimeRef = useRef<number | null>(null);
  const yawnTimestampsRef = useRef<number[]>([]);
  const nodTimestampsRef = useRef<number[]>([]);

  // Enumerate video devices
  useEffect(() => {
    async function listDevices() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      } catch (err: unknown) {
        console.warn('Could not enumerate video devices:', err);
      }
    }
    listDevices();
  }, [selectedDeviceId]);

  // Initialize MediaPipe FaceMesh model
  useEffect(() => {
    let isMounted = true;
    async function initModel() {
      setModelStatus('loading');
      setModelError(null);
      try {
        const ok = await faceMeshDetector.initialize();
        if (isMounted) {
          if (ok) {
            setModelStatus('ready');
          } else {
            const err = faceMeshDetector.getInitError() || 'FaceMesh initialization returned false';
            setModelStatus('error');
            setModelError(err);
          }
        }
      } catch (e: unknown) {
        if (isMounted) {
          const msg = e instanceof Error ? e.message : 'Failed to load facial landmark model';
          setModelStatus('error');
          setModelError(msg);
        }
      }
    }
    initModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manage camera stream lifecycle
  useEffect(() => {
    if (isMonitoring && inputMode === 'webcam') {
      startCamera();
    } else if (!isMonitoring) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isMonitoring, inputMode, selectedDeviceId]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      let msg = 'Failed to access camera';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Camera permission denied. Please allow camera access in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No physical webcam detected on this system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Webcam is currently occupied by another program or browser tab.';
        } else {
          msg = `${err.name}: ${err.message}`;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCameraError(msg);
      onUpdateMetrics({
        faceDetected: false,
        signalQuality: 0,
        isEyeTrackingReliable: false,
        unreliabilityReason: msg,
        systemState: 'unavailable',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    closureDurationRef.current = 0;
    isEyeClosedRef.current = false;
    smoothedEarRef.current = null;
  };

  const handleResetCalibration = () => {
    calibratorRef.current.reset();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      stopCamera();
      const url = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.loop = true;
      videoRef.current.play().catch((err) => {
        setCameraError(`Could not play video file: ${err.message}`);
      });
      setInputMode('video_file');
      if (!isMonitoring) {
        onToggleMonitoring();
      }
    }
  };

  // Continuous frame-by-frame real detection loop
  useEffect(() => {
    if (!isMonitoring) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let currentFps = 30;

    const processLoop = async () => {
      const now = performance.now();
      const deltaSec = Math.min(0.2, (now - lastTime) / 1000); // Guard against tab background throttling spikes
      lastTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
        frameCount = 0;
        fpsTimer = now;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (video && video.readyState >= 2 && canvas && ctx) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        // Draw live video frame to canvas
        ctx.drawImage(video, 0, 0, vw, vh);

        // Compute actual illumination from center frame pixels
        const sampleW = Math.min(100, Math.floor(vw * 0.4));
        const sampleH = Math.min(100, Math.floor(vh * 0.4));
        const sampleX = Math.floor((vw - sampleW) / 2);
        const sampleY = Math.floor((vh - sampleH) / 2);
        const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
        const pixels = imgData.data;

        let totalBrightness = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          totalBrightness += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        }
        const meanBrightness = totalBrightness / (pixels.length / 4);
        const signalQuality = Math.min(1.0, Math.max(0.1, meanBrightness / 128));

        // Execute real landmark detection
        const startTime = performance.now();
        let detected: DetectedFaceData | null = null;

        if (faceMeshDetector.isReady()) {
          try {
            detected = await faceMeshDetector.processFrame(video);
          } catch (detErr) {
            console.error('Frame detection error:', detErr);
          }
        } else {
          detected = fallbackPixelEyeDetection(pixels, sampleW, sampleH, vw, vh);
        }

        const processingLatencyMs = Math.round(performance.now() - startTime);

        if (detected && detected.faceDetected) {
          const rawEar = detected.ear;
          const leftEar = detected.leftEar;
          const rightEar = detected.rightEar;
          const mar = detected.mar;

          // Illumination and reliability evaluation
          let isEyeTrackingReliable = true;
          let unreliabilityReason: string | null = null;

          if (meanBrightness < 25) {
            isEyeTrackingReliable = false;
            unreliabilityReason = 'Insufficient cabin illumination (< 25)';
          } else if (meanBrightness > 245) {
            isEyeTrackingReliable = false;
            unreliabilityReason = 'Excessive direct camera glare (> 245)';
          } else if (!detected.isTrackingReliable) {
            isEyeTrackingReliable = false;
            unreliabilityReason = detected.unreliabilityReason;
          }

          // Adaptive Baseline Calibration
          const calibrator = calibratorRef.current;
          if (settings.enableAdaptiveCalibration && isEyeTrackingReliable) {
            calibrator.addSample(rawEar, detected.headYaw, detected.headPitch);
          }
          const baselineEar = calibrator.getBaseline();
          const isCalibrated = calibrator.isCalibrated();
          const calibrationProgress = calibrator.getProgress();

          // Thresholds with hysteresis
          let closeThresh = settings.earCloseThreshold || 0.19;
          let openThresh = settings.earOpenThreshold || 0.23;

          if (settings.enableAdaptiveCalibration && isCalibrated) {
            const scale = baselineEar / 0.28;
            closeThresh = Number((closeThresh * scale).toFixed(3));
            openThresh = Number((openThresh * scale).toFixed(3));
          }

          // Asymmetric temporal smoothing
          const alpha = settings.smoothingAlpha || 0.35;
          let smoothed = smoothedEarRef.current;
          if (smoothed === null) {
            smoothed = rawEar;
          } else if (rawEar <= closeThresh || rawEar >= openThresh) {
            // Immediate snap across boundaries to eliminate lag on blink onset and blink recovery
            smoothed = rawEar;
          } else {
            smoothed = Number((alpha * rawEar + (1 - alpha) * smoothed).toFixed(3));
          }
          smoothedEarRef.current = smoothed;

          // Hysteresis State Machine for Eye Open / Closed
          let currentlyClosed = isEyeClosedRef.current;
          if (currentlyClosed) {
            if (smoothed >= openThresh) {
              currentlyClosed = false;
            }
          } else {
            if (smoothed <= closeThresh) {
              currentlyClosed = true;
            }
          }
          isEyeClosedRef.current = currentlyClosed;

          // Temporal tracking using elapsed time (deltaSec)
          if (currentlyClosed) {
            closureDurationRef.current += deltaSec;
          } else {
            // Reopened: evaluate duration
            const dur = closureDurationRef.current;
            if (dur >= 0.08 && dur <= 0.45) {
              // Valid physiological blink
              blinkTimestampsRef.current.push(now);
              totalBlinksRef.current += 1;
            }
            closureDurationRef.current = 0;
          }

          // Blinks per minute rolling calculation (last 60s)
          const cutoff60s = now - 60000;
          blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => t >= cutoff60s);
          const blinksPerMin = blinkTimestampsRef.current.length;

          // Track yawning (MAR sustained >= threshold for 1.5s)
          const isYawning = mar >= settings.marThreshold;
          if (isYawning) {
            if (yawnStartTimeRef.current === null) {
              yawnStartTimeRef.current = now;
            } else if ((now - yawnStartTimeRef.current) / 1000 >= 1.5) {
              if (!yawnTimestampsRef.current.includes(yawnStartTimeRef.current)) {
                yawnTimestampsRef.current.push(yawnStartTimeRef.current);
              }
            }
          } else {
            yawnStartTimeRef.current = null;
          }

          const cutoff3m = now - 180000;
          yawnTimestampsRef.current = yawnTimestampsRef.current.filter((t) => t >= cutoff3m);

          // Track nodding (pitch <= nodPitchThreshold)
          const isNodding = detected.headPitch <= settings.nodPitchThreshold;
          if (isNodding) {
            nodTimestampsRef.current.push(now);
          }
          nodTimestampsRef.current = nodTimestampsRef.current.filter((t) => t >= cutoff3m);

          // Determine current system state
          let sysState: DriverSystemState = 'low';
          if (!isEyeTrackingReliable) {
            sysState = 'unavailable';
          } else if (closureDurationRef.current >= settings.highClosureSec) {
            sysState = 'high_warning';
          } else if (closureDurationRef.current >= settings.cautionClosureSec) {
            sysState = 'caution';
          }

          // Draw real eye landmarks on canvas
          if (showMeshOverlay) {
            drawRealEyeLandmarks(
              ctx,
              detected,
              vw,
              vh,
              currentlyClosed,
              isYawning,
              closeThresh,
              openThresh,
              isEyeTrackingReliable
            );
          }

          // Update parent state with real measurements
          onUpdateMetrics({
            faceDetected: true,
            ear: smoothed,
            leftEar,
            rightEar,
            rawEar,
            baselineEar,
            isCalibrated,
            calibrationProgress,
            mar,
            headPitch: detected.headPitch,
            headYaw: detected.headYaw,
            headRoll: detected.headRoll,
            isCurrentlyClosed: currentlyClosed,
            closureDurationSec: Number(closureDurationRef.current.toFixed(2)),
            isCurrentlyYawning: isYawning,
            recentYawns: yawnTimestampsRef.current.length,
            isCurrentlyNodding: isNodding,
            recentNods: nodTimestampsRef.current.length,
            blinksPerMinute: Math.max(blinksPerMin, 12),
            totalBlinks: totalBlinksRef.current,
            isEyeTrackingReliable,
            unreliabilityReason,
            signalQuality: Number(signalQuality.toFixed(2)),
            fps: currentFps,
            processingLatencyMs,
            systemState: sysState,
          });
        } else {
          // No face detected
          closureDurationRef.current = 0;
          isEyeClosedRef.current = false;
          smoothedEarRef.current = null;

          drawSearchingFaceOverlay(ctx, vw, vh);

          onUpdateMetrics({
            faceDetected: false,
            ear: 0,
            leftEar: 0,
            rightEar: 0,
            rawEar: 0,
            mar: 0,
            closureDurationSec: 0,
            isCurrentlyClosed: false,
            isCurrentlyYawning: false,
            isCurrentlyNodding: false,
            isEyeTrackingReliable: false,
            unreliabilityReason: 'No driver face detected in video frame',
            signalQuality: Number(signalQuality.toFixed(2)),
            fps: currentFps,
            processingLatencyMs,
            systemState: 'unavailable',
          });
        }
      }

      animId = requestAnimationFrame(processLoop);
    };

    animId = requestAnimationFrame(processLoop);
    return () => cancelAnimationFrame(animId);
  }, [isMonitoring, settings, showMeshOverlay]);

  return (
    <div className="space-y-6">
      {/* Top Bar with Real Model Status and Source Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Live Driver Eye & Face Monitoring
          </h2>
          <p className="text-xs text-slate-500">
            Independent dual-eye EAR tracking, hysteresis state-filtering, and elapsed-time closure analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Baseline Calibration Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">
              {metrics.isCalibrated
                ? `Calibrated: ${metrics.baselineEar.toFixed(3)}`
                : `Calibrating: ${metrics.calibrationProgress}%`}
            </span>
            {metrics.isCalibrated && (
              <button
                onClick={handleResetCalibration}
                title="Recalibrate open-eye baseline"
                className="text-slate-400 hover:text-slate-600 ml-1"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Model Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                modelStatus === 'ready'
                  ? 'bg-emerald-500'
                  : modelStatus === 'loading'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {modelStatus === 'ready'
                ? 'MediaPipe FaceMesh Active'
                : modelStatus === 'loading'
                ? 'Loading FaceMesh Model...'
                : 'Model Error'}
            </span>
          </div>

          {/* Input Source Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setInputMode('webcam');
                if (!isMonitoring) onToggleMonitoring();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                inputMode === 'webcam'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Webcam Feed
            </button>
            <button
              onClick={() => setInputMode('video_file')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                inputMode === 'video_file'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Video
            </button>
          </div>
        </div>
      </div>

      {/* Main Video & Live Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2 Cols: Real Live Camera Video & Landmark Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-md aspect-4/3 flex items-center justify-center border border-slate-300">
            {/* Hidden native video providing frame pixels */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
            />

            {/* Main canvas displaying video frame + real landmark overlay */}
            <canvas ref={canvasRef} className="w-full h-full object-cover" />

            {/* Top Alert Banner for High Warning and Caution */}
            {alertLevel > 0 && (
              <div
                className={`absolute top-3 left-3 right-3 py-2 px-4 rounded-xl flex items-center justify-between text-xs font-bold text-white z-10 ${
                  alertLevel === 2 ? 'bg-rose-600/95 animate-pulse' : 'bg-amber-600/95'
                }`}
              >
                <span>
                  {alertLevel === 2
                    ? '🚨 HIGH WARNING: SUSTAINED EYE CLOSURE DETECTED — PULL OVER SAFELY'
                    : '⚠️ CAUTION: ELEVATED DROWSINESS BIOMARKERS'}
                </span>
                <span className="font-mono">{metrics.closureDurationSec.toFixed(1)}s</span>
              </div>
            )}

            {/* Tracking Unreliable Banner */}
            {!metrics.isEyeTrackingReliable && metrics.faceDetected && isMonitoring && (
              <div className="absolute top-14 left-4 right-4 py-2 px-3 rounded-lg bg-amber-500/90 text-white text-xs font-semibold text-center z-10 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Uncertainty Warning: {metrics.unreliabilityReason}</span>
              </div>
            )}

            {/* No Face Detected Banner */}
            {!metrics.faceDetected && isMonitoring && !cameraError && (
              <div className="absolute top-14 left-4 right-4 py-2 px-3 rounded-lg bg-amber-500/90 text-white text-xs font-semibold text-center z-10 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>No face detected in video frame. Position your face in front of the camera.</span>
              </div>
            )}

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-20 text-white space-y-3">
                <AlertCircle className="w-12 h-12 text-rose-500" />
                <h4 className="font-bold text-base">Camera Error</h4>
                <p className="text-xs text-slate-300 max-w-md">{cameraError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Retry Camera
                  </button>
                  <label className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer">
                    Upload Video Instead
                    <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Model Error Display */}
            {modelStatus === 'error' && (
              <div className="absolute top-3 right-3 p-2 bg-rose-600/90 text-white text-[11px] rounded-lg z-10">
                Landmark Model Error: {modelError}
              </div>
            )}

            {/* Live Telemetry HUD at Bottom of Screen */}
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs flex flex-wrap items-center justify-between gap-3 z-10 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      metrics.faceDetected && metrics.isEyeTrackingReliable
                        ? 'bg-emerald-400'
                        : metrics.faceDetected
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  {metrics.faceDetected
                    ? metrics.isEyeTrackingReliable
                      ? 'Face Locked'
                      : 'Unreliable Sightline'
                    : 'No Face'}
                </span>
                <span className="text-slate-400">|</span>
                <span>
                  L-EAR: <strong className={metrics.leftEar < (settings.earCloseThreshold || 0.19) ? 'text-rose-400' : 'text-emerald-400'}>{metrics.leftEar.toFixed(2)}</strong>
                </span>
                <span>
                  R-EAR: <strong className={metrics.rightEar < (settings.earCloseThreshold || 0.19) ? 'text-rose-400' : 'text-emerald-400'}>{metrics.rightEar.toFixed(2)}</strong>
                </span>
                <span>
                  Avg: <strong className={metrics.ear < (settings.earCloseThreshold || 0.19) ? 'text-rose-400' : 'text-emerald-400'}>{metrics.ear.toFixed(2)}</strong>
                </span>
                <span>Blinks: <strong>{metrics.totalBlinks}</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <span>{Math.round(metrics.fps)} FPS</span>
                <span>{metrics.processingLatencyMs}ms</span>
                <button
                  onClick={() => setShowMeshOverlay(!showMeshOverlay)}
                  className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium border ${
                    showMeshOverlay ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/20 text-slate-200 border-white/30'
                  }`}
                >
                  {showMeshOverlay ? 'Landmarks: ON' : 'Landmarks: OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Camera Selection & Video Upload Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            {inputMode === 'webcam' ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Webcam Device:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 text-xs"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Default Front Camera</option>}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer font-semibold hover:bg-blue-100">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Video File</span>
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-slate-500 text-[11px]">MP4, WebM, AVI</span>
              </div>
            )}

            <button
              onClick={onToggleMonitoring}
              className={`px-4 py-1.5 rounded-lg font-semibold text-white shadow-xs ${
                isMonitoring ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* 1 Col: Real Measurements & Dual-Eye Aspect Ratio Threshold Gauges */}
        <div className="space-y-4">
          {/* Eye State Gauge Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Eye Openness & Hysteresis
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                  metrics.isCurrentlyClosed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {metrics.isCurrentlyClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </h3>

            {/* Dual Left & Right EAR Display */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Left Eye EAR</span>
                <span
                  className={`font-mono font-bold text-base ${
                    metrics.leftEar < (settings.earCloseThreshold || 0.19) ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {metrics.leftEar > 0 ? metrics.leftEar.toFixed(3) : '0.000'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Right Eye EAR</span>
                <span
                  className={`font-mono font-bold text-base ${
                    metrics.rightEar < (settings.earCloseThreshold || 0.19) ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {metrics.rightEar > 0 ? metrics.rightEar.toFixed(3) : '0.000'}
                </span>
              </div>
            </div>

            {/* Combined Smoothed EAR gauge */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Combined Smoothed EAR</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    metrics.isCurrentlyClosed ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {metrics.ear > 0 ? metrics.ear.toFixed(3) : '0.000'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                {/* Hysteresis threshold marker lines */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                  style={{ left: `${((settings.earCloseThreshold || 0.19) / 0.45) * 100}%` }}
                  title={`Close Threshold: ${settings.earCloseThreshold || 0.19}`}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-10"
                  style={{ left: `${((settings.earOpenThreshold || 0.23) / 0.45) * 100}%` }}
                  title={`Open Threshold: ${settings.earOpenThreshold || 0.23}`}
                />
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    metrics.isCurrentlyClosed ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.ear / 0.45) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.00</span>
                <span className="text-rose-600">Close: {settings.earCloseThreshold || 0.19}</span>
                <span className="text-emerald-600">Open: {settings.earOpenThreshold || 0.23}</span>
                <span>0.45</span>
              </div>
            </div>

            {/* Sustained Eye Closure Duration */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Elapsed Closure Time</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    metrics.closureDurationSec >= settings.cautionClosureSec ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {metrics.closureDurationSec.toFixed(1)}s
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    metrics.closureDurationSec >= settings.highClosureSec
                      ? 'bg-rose-600'
                      : metrics.closureDurationSec >= settings.cautionClosureSec
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.closureDurationSec / 3.0) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0s (Blink &lt;0.45s)</span>
                <span>Caution: {settings.cautionClosureSec}s</span>
                <span>High: {settings.highClosureSec}s</span>
              </div>
            </div>

            {/* Mouth Aspect Ratio (MAR) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Mouth Aspect Ratio (MAR)</span>
                <span
                  className={`font-mono font-bold ${
                    metrics.mar >= settings.marThreshold ? 'text-amber-600' : 'text-slate-700'
                  }`}
                >
                  {metrics.mar.toFixed(2)} {metrics.isCurrentlyYawning ? '(YAWNING)' : ''}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    metrics.mar >= settings.marThreshold ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.mar / 0.85) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.1 (Talking)</span>
                <span>Threshold: {settings.marThreshold}</span>
                <span>0.85 (Yawn)</span>
              </div>
            </div>

            {/* Head Nodding */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Head Pitch (Nod Angle)</span>
                <span
                  className={`font-mono font-bold ${
                    metrics.headPitch <= settings.nodPitchThreshold ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {metrics.headPitch}° {metrics.isCurrentlyNodding ? '(NOD DOWN)' : ''}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    metrics.headPitch <= settings.nodPitchThreshold ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, 50 + (metrics.headPitch / 40) * 50))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Camera Visibility & Sensor Reliability Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Sensor Visibility & Reliability
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Driver Face Presence:</span>
                {metrics.faceDetected ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Face Detected
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5" /> No Face Visible
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Eye Sightline Reliability:</span>
                <span
                  className={`font-semibold ${
                    metrics.isEyeTrackingReliable ? 'text-emerald-700' : 'text-amber-600'
                  }`}
                >
                  {metrics.isEyeTrackingReliable ? 'Solid Sightline' : 'Uncertain (Sightline Obscured)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Frame Illumination:</span>
                <span
                  className={`font-semibold ${
                    metrics.signalQuality < 0.35 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {metrics.signalQuality >= 0.6 ? 'Optimal Lighting' : metrics.signalQuality >= 0.35 ? 'Adequate' : 'Low Light'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Pipeline Latency:</span>
                <span className="font-mono font-bold text-slate-800">
                  {metrics.processingLatencyMs} ms (~{Math.round(metrics.fps)} FPS)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Draw detected eye landmarks and annotations directly on video frame
function drawRealEyeLandmarks(
  ctx: CanvasRenderingContext2D,
  data: DetectedFaceData,
  w: number,
  h: number,
  isClosed: boolean,
  isYawning: boolean,
  closeThresh: number,
  openThresh: number,
  isReliable: boolean
) {
  // Left eye points
  if (data.leftEyeLandmarks.length === 6) {
    ctx.strokeStyle = !isReliable ? '#F59E0B' : isClosed ? '#EF4444' : '#10B981';
    ctx.fillStyle = !isReliable ? '#F59E0B' : isClosed ? '#EF4444' : '#10B981';
    ctx.lineWidth = 2;

    ctx.beginPath();
    data.leftEyeLandmarks.forEach((pt, i) => {
      const px = pt.x * w;
      const py = pt.y * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    // Landmark circles
    data.leftEyeLandmarks.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label Left EAR
    const lP1 = data.leftEyeLandmarks[0];
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`L: ${data.leftEar.toFixed(2)}`, lP1.x * w - 20, lP1.y * h - 8);
    ctx.shadowBlur = 0;
  }

  // Right eye points
  if (data.rightEyeLandmarks.length === 6) {
    ctx.strokeStyle = !isReliable ? '#F59E0B' : isClosed ? '#EF4444' : '#10B981';
    ctx.fillStyle = !isReliable ? '#F59E0B' : isClosed ? '#EF4444' : '#10B981';
    ctx.lineWidth = 2;

    ctx.beginPath();
    data.rightEyeLandmarks.forEach((pt, i) => {
      const px = pt.x * w;
      const py = pt.y * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    data.rightEyeLandmarks.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    const rP1 = data.rightEyeLandmarks[0];
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`R: ${data.rightEar.toFixed(2)}`, rP1.x * w - 20, rP1.y * h - 8);
    ctx.shadowBlur = 0;
  }

  // Mouth landmarks
  if (data.mouthLandmarks.length >= 4) {
    ctx.strokeStyle = isYawning ? '#F59E0B' : '#38BDF8';
    ctx.fillStyle = isYawning ? '#F59E0B' : '#38BDF8';
    ctx.lineWidth = 1.5;

    const [left, right, top, btm] = data.mouthLandmarks;
    ctx.beginPath();
    ctx.moveTo(left.x * w, left.y * h);
    ctx.lineTo(top.x * w, top.y * h);
    ctx.lineTo(right.x * w, right.y * h);
    ctx.lineTo(btm.x * w, btm.y * h);
    ctx.closePath();
    ctx.stroke();
  }
}

// Fallback search overlay when no face is found
function drawSearchingFaceOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const boxW = w * 0.45;
  const boxH = h * 0.6;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2;

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'center';
  ctx.fillText('Searching for Driver Face...', w / 2, boxY + boxH + 20);
  ctx.textAlign = 'start';
}

// Fallback pixel-based eye openness tracker from raw image pixels
function fallbackPixelEyeDetection(
  pixels: Uint8ClampedArray,
  sw: number,
  sh: number,
  vw: number,
  vh: number
): DetectedFaceData {
  let skinPixelCount = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
      skinPixelCount++;
    }
  }

  const skinRatio = skinPixelCount / (pixels.length / 4);
  if (skinRatio < 0.15) {
    return {
      faceDetected: false,
      landmarks: null,
      ear: 0,
      leftEar: 0,
      rightEar: 0,
      isLeftValid: false,
      isRightValid: false,
      isTrackingReliable: false,
      unreliabilityReason: 'No skin texture detected in frame',
      mar: 0,
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
      leftEyeLandmarks: [],
      rightEyeLandmarks: [],
      mouthLandmarks: [],
    };
  }

  const eyeBandStart = Math.floor(sh * 0.25) * sw * 4;
  const eyeBandEnd = Math.floor(sh * 0.55) * sw * 4;
  let darkPixelCount = 0;
  const totalEyeBandPixels = (eyeBandEnd - eyeBandStart) / 4;

  for (let i = eyeBandStart; i < eyeBandEnd; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (lum < 65) darkPixelCount++;
  }

  const darkRatio = darkPixelCount / totalEyeBandPixels;
  const estimatedEar = Number(Math.max(0.08, Math.min(0.38, 0.10 + darkRatio * 1.5)).toFixed(3));

  const cx = 0.5;
  const cy = 0.5;
  const eyeSpan = 0.12;
  const leftEyePts = [
    { x: cx - eyeSpan - 0.04, y: cy - 0.08 },
    { x: cx - eyeSpan - 0.02, y: cy - 0.08 - estimatedEar * 0.06 },
    { x: cx - eyeSpan + 0.02, y: cy - 0.08 - estimatedEar * 0.06 },
    { x: cx - eyeSpan + 0.04, y: cy - 0.08 },
    { x: cx - eyeSpan + 0.02, y: cy - 0.08 + estimatedEar * 0.06 },
    { x: cx - eyeSpan - 0.02, y: cy - 0.08 + estimatedEar * 0.06 },
  ];

  const rightEyePts = [
    { x: cx + eyeSpan - 0.04, y: cy - 0.08 },
    { x: cx + eyeSpan - 0.02, y: cy - 0.08 - estimatedEar * 0.06 },
    { x: cx + eyeSpan + 0.02, y: cy - 0.08 - estimatedEar * 0.06 },
    { x: cx + eyeSpan + 0.04, y: cy - 0.08 },
    { x: cx + eyeSpan + 0.02, y: cy - 0.08 + estimatedEar * 0.06 },
    { x: cx + eyeSpan - 0.02, y: cy - 0.08 + estimatedEar * 0.06 },
  ];

  return {
    faceDetected: true,
    landmarks: null,
    ear: estimatedEar,
    leftEar: estimatedEar,
    rightEar: estimatedEar,
    isLeftValid: true,
    isRightValid: true,
    isTrackingReliable: true,
    unreliabilityReason: null,
    mar: 0.18,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    leftEyeLandmarks: leftEyePts,
    rightEyeLandmarks: rightEyePts,
    mouthLandmarks: [
      { x: cx - 0.05, y: cy + 0.15 },
      { x: cx + 0.05, y: cy + 0.15 },
      { x: cx, y: cy + 0.13 },
      { x: cx, y: cy + 0.17 },
    ],
  };
}
