/**
 * Real-time facial landmark detection service.
 * Loads MediaPipe FaceMesh in browser and extracts exact Soukupová & Čech EAR landmark coordinates.
 */

// Key landmark indices in MediaPipe 468 face mesh
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
export const MOUTH_INDICES = [61, 291, 13, 14, 82, 87, 312, 317];
export const NOSE_TIP_INDEX = 1;
export const CHIN_INDEX = 152;

export interface DetectedFaceData {
  faceDetected: boolean;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  ear: number;
  leftEar: number;
  rightEar: number;
  isLeftValid: boolean;
  isRightValid: boolean;
  isTrackingReliable: boolean;
  unreliabilityReason: string | null;
  mar: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  leftEyeLandmarks: Array<{ x: number; y: number }>;
  rightEyeLandmarks: Array<{ x: number; y: number }>;
  mouthLandmarks: Array<{ x: number; y: number }>;
}

export interface FaceMeshResults {
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

export function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate that an EAR measurement falls within physiologically plausible bounds.
 * Extremely high (>0.55) or negative/near-zero (<0.02) readings indicate landmark tracking loss.
 */
export function validateEar(ear: number): boolean {
  return ear >= 0.02 && ear <= 0.55;
}

/**
 * Soukupová & Čech (2016) formula:
 * EAR = (|p2 - p6| + |p3 - p5|) / (2.0 * |p1 - p4|)
 */
export function calculateEyeAspectRatio(points: Array<{ x: number; y: number }>): number {
  if (!points || points.length < 6) return 0;
  const p1 = points[0];
  const p2 = points[1];
  const p3 = points[2];
  const p4 = points[3];
  const p5 = points[4];
  const p6 = points[5];

  const v1 = euclideanDistance(p2, p6);
  const v2 = euclideanDistance(p3, p5);
  const h = euclideanDistance(p1, p4);

  if (h < 1e-5) return 0;
  return (v1 + v2) / (2.0 * h);
}

/**
 * MAR = (|p_top - p_bottom| + ...) / (3.0 * |p_left - p_right|)
 */
export function calculateMouthAspectRatio(
  left: { x: number; y: number },
  right: { x: number; y: number },
  topMid: { x: number; y: number },
  btmMid: { x: number; y: number }
): number {
  const h = euclideanDistance(left, right);
  const v = euclideanDistance(topMid, btmMid);
  if (h < 1e-5) return 0;
  return v / h;
}

/**
 * Adaptive open-eye baseline calibrator.
 * Gathers stable, forward-facing open-eye measurements to establish individual baseline EAR.
 */
export class BaselineCalibrator {
  private samples: number[] = [];
  private targetSamples: number;
  private baseline: number = 0.28;
  private calibrated: boolean = false;

  constructor(targetSamples: number = 60) {
    this.targetSamples = targetSamples;
  }

  public reset(): void {
    this.samples = [];
    this.calibrated = false;
    this.baseline = 0.28;
  }

  public addSample(ear: number, yaw: number, pitch: number): void {
    // Only accept samples when driver is facing forward and eye is clearly open
    if (Math.abs(yaw) <= 15 && Math.abs(pitch) <= 15 && ear >= 0.22 && ear <= 0.45) {
      if (this.samples.length < this.targetSamples) {
        this.samples.push(ear);
        if (this.samples.length >= this.targetSamples) {
          const sorted = [...this.samples].sort((a, b) => a - b);
          // 20% trimmed mean to reject blink outliers
          const trim = Math.floor(sorted.length * 0.2);
          const trimmed = sorted.slice(trim, sorted.length - trim);
          const sum = trimmed.reduce((acc, val) => acc + val, 0);
          this.baseline = Number((sum / trimmed.length).toFixed(3));
          this.calibrated = true;
        }
      }
    }
  }

  public getBaseline(): number {
    return this.baseline;
  }

  public isCalibrated(): boolean {
    return this.calibrated;
  }

  public getProgress(): number {
    return Math.min(100, Math.round((this.samples.length / this.targetSamples) * 100));
  }
}

export class RealFaceMeshDetector {
  private faceMesh: any = null;
  private isInitialized = false;
  private initError: string | null = null;
  private latestResult: DetectedFaceData | null = null;
  private isProcessing = false;

  private async loadScript(): Promise<void> {
    if ((window as any).FaceMesh) return;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="face_mesh.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load FaceMesh script')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load FaceMesh script from CDN'));
      document.head.appendChild(script);
    });
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized && this.faceMesh) return true;

    try {
      if (!(window as any).FaceMesh) {
        await this.loadScript();
      }

      const FaceMeshCtor = (window as any).FaceMesh;
      if (!FaceMeshCtor) {
        throw new Error('FaceMesh is not available on window object');
      }

      this.faceMesh = new FaceMeshCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMesh.onResults((results: FaceMeshResults) => {
        this.latestResult = this.parseResults(results);
      });

      this.isInitialized = true;
      this.initError = null;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize MediaPipe FaceMesh';
      this.initError = msg;
      return false;
    }
  }

  public getInitError(): string | null {
    return this.initError;
  }

  public isReady(): boolean {
    return this.isInitialized && this.faceMesh !== null;
  }

  public async processFrame(videoElement: HTMLVideoElement): Promise<DetectedFaceData | null> {
    if (!this.faceMesh || !this.isInitialized) {
      const ok = await this.initialize();
      if (!ok) return null;
    }

    if (this.isProcessing) {
      return this.latestResult;
    }

    if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      return null;
    }

    this.isProcessing = true;
    try {
      await this.faceMesh.send({ image: videoElement });
      return this.latestResult;
    } catch (err: unknown) {
      console.warn('FaceMesh frame processing error:', err);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  private parseResults(results: FaceMeshResults): DetectedFaceData {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return {
        faceDetected: false,
        landmarks: null,
        ear: 0,
        leftEar: 0,
        rightEar: 0,
        isLeftValid: false,
        isRightValid: false,
        isTrackingReliable: false,
        unreliabilityReason: 'No face detected in video frame',
        mar: 0,
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        leftEyeLandmarks: [],
        rightEyeLandmarks: [],
        mouthLandmarks: [],
      };
    }

    const landmarks = results.multiFaceLandmarks[0];

    // Extract Left Eye points
    const leftEyePoints = LEFT_EYE_INDICES.map((idx) => ({
      x: landmarks[idx].x,
      y: landmarks[idx].y,
    }));

    // Extract Right Eye points
    const rightEyePoints = RIGHT_EYE_INDICES.map((idx) => ({
      x: landmarks[idx].x,
      y: landmarks[idx].y,
    }));

    // Calculate actual EAR for left and right eyes independently
    const leftEar = calculateEyeAspectRatio(leftEyePoints);
    const rightEar = calculateEyeAspectRatio(rightEyePoints);

    // Validate physiological EAR bounds
    const isLeftValid = validateEar(leftEar);
    const isRightValid = validateEar(rightEar);

    let avgEar = 0;
    if (isLeftValid && isRightValid) {
      avgEar = (leftEar + rightEar) / 2.0;
    } else if (isLeftValid) {
      avgEar = leftEar;
    } else if (isRightValid) {
      avgEar = rightEar;
    } else {
      avgEar = (leftEar + rightEar) / 2.0;
    }

    // Mouth points
    const leftMouth = { x: landmarks[61].x, y: landmarks[61].y };
    const rightMouth = { x: landmarks[291].x, y: landmarks[291].y };
    const topLip = { x: landmarks[13].x, y: landmarks[13].y };
    const btmLip = { x: landmarks[14].x, y: landmarks[14].y };
    const mar = calculateMouthAspectRatio(leftMouth, rightMouth, topLip, btmLip);

    // Head orientation estimation
    const nose = landmarks[NOSE_TIP_INDEX];
    const chin = landmarks[CHIN_INDEX];
    const leftOuter = landmarks[33];
    const rightOuter = landmarks[263];

    // Roll
    const dx = rightOuter.x - leftOuter.x;
    const dy = rightOuter.y - leftOuter.y;
    const headRoll = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Yaw
    const eyeMidX = (leftOuter.x + rightOuter.x) / 2.0;
    const eyeSpan = Math.max(1e-5, Math.abs(dx));
    const yawOffset = (nose.x - eyeMidX) / eyeSpan;
    const headYaw = Math.max(-90, Math.min(90, yawOffset * 180));

    // Pitch
    const eyeMidY = (leftOuter.y + rightOuter.y) / 2.0;
    const distEyeNose = nose.y - eyeMidY;
    const distNoseChin = chin.y - nose.y;
    let headPitch = 0;
    if (distEyeNose > 1e-5) {
      const ratio = distNoseChin / distEyeNose;
      headPitch = (ratio - 1.25) * 45;
      headPitch = Math.max(-60, Math.min(60, headPitch));
    }

    // Assess tracking reliability
    let isTrackingReliable = true;
    let unreliabilityReason: string | null = null;

    if (Math.abs(headYaw) > 30) {
      isTrackingReliable = false;
      unreliabilityReason = `Severe head rotation (yaw: ${Math.round(headYaw)}°) occluding eye line`;
    } else if (!isLeftValid && !isRightValid) {
      isTrackingReliable = false;
      unreliabilityReason = 'Invalid eye geometry (glasses reflection or obstruction)';
    }

    return {
      faceDetected: true,
      landmarks: landmarks,
      ear: Number(avgEar.toFixed(3)),
      leftEar: Number(leftEar.toFixed(3)),
      rightEar: Number(rightEar.toFixed(3)),
      isLeftValid,
      isRightValid,
      isTrackingReliable,
      unreliabilityReason,
      mar: Number(mar.toFixed(3)),
      headPitch: Math.round(headPitch),
      headYaw: Math.round(headYaw),
      headRoll: Math.round(headRoll),
      leftEyeLandmarks: leftEyePoints,
      rightEyeLandmarks: rightEyePoints,
      mouthLandmarks: [leftMouth, rightMouth, topLip, btmLip],
    };
  }

  public close() {
    if (this.faceMesh) {
      try {
        this.faceMesh.close();
      } catch {
        // ignore
      }
      this.faceMesh = null;
      this.isInitialized = false;
    }
  }
}

export const faceMeshDetector = new RealFaceMeshDetector();
