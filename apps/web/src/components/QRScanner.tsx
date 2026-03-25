import { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const animFrameRef = useRef<number>();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (_err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const scanFrame = useCallback(() => {
    if (!scanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      setScanning(false);
      // Parse QR data (remove protocol prefixes)
      let address = code.data;
      if (address.startsWith('bitcoin:')) address = address.replace('bitcoin:', '').split('?')[0];
      if (address.startsWith('ethereum:')) address = address.replace('ethereum:', '').split('?')[0];
      if (address.startsWith('solana:')) address = address.replace('solana:', '').split('?')[0];
      onScan(address);

      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [scanning, onScan]);

  useEffect(() => {
    startCamera();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (scanning) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [scanning, scanFrame]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="relative max-w-md w-full mx-4">
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-light text-white">Scan QR Code</h3>
            <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">&times;</button>
          </div>

          {error ? (
            <div className="text-red-400 text-sm text-center py-8">{error}</div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-purple-500/50 rounded-xl">
                <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-2 border-purple-400 rounded-lg animate-pulse" />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60">
                Point camera at a wallet QR code
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
