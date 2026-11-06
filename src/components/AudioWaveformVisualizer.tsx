import React, { useEffect, useRef } from 'react';

interface AudioWaveformVisualizerProps {
  stream?: MediaStream | null;
  isActive: boolean;
  height?: number;
  barCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  stream,
  isActive,
  height = 28,
  barCount = 20,
  primaryColor = '#ff3377',
  secondaryColor = '#80f3ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    if (stream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const renderFrame = () => {
          if (!canvasRef.current || !analyserRef.current) return;
          const canvas = canvasRef.current;
          const canvasCtx = canvas.getContext('2d');
          if (!canvasCtx) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          const w = canvas.width;
          const h = canvas.height;
          canvasCtx.clearRect(0, 0, w, h);

          const step = w / barCount;
          const barWidth = Math.max(2, step * 0.55);

          const gradient = canvasCtx.createLinearGradient(0, 0, w, 0);
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(0.5, '#c084fc');
          gradient.addColorStop(1, secondaryColor);

          canvasCtx.fillStyle = gradient;
          canvasCtx.shadowBlur = 8;
          canvasCtx.shadowColor = primaryColor;

          for (let i = 0; i < barCount; i++) {
            const dataIdx = Math.floor((i / barCount) * (dataArray.length * 0.7));
            const rawVal = dataArray[dataIdx] || 0;
            const normalized = Math.max(0.12, rawVal / 255);
            const barHeight = Math.max(3, normalized * (h - 4));
            const x = i * step + (step - barWidth) / 2;
            const y = (h - barHeight) / 2;

            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
              canvasCtx.roundRect(x, y, barWidth, barHeight, 2);
            } else {
              canvasCtx.rect(x, y, barWidth, barHeight);
            }
            canvasCtx.fill();
          }

          animationFrameRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (err) {
        console.warn('Web Audio Visualizer fallback:', err);
      }
    } else {
      // 动态波形模拟（播放态）
      let phase = 0;
      const renderSimulated = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const w = canvas.width;
        const h = canvas.height;
        canvasCtx.clearRect(0, 0, w, h);

        const step = w / barCount;
        const barWidth = Math.max(2, step * 0.55);
        const gradient = canvasCtx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, '#c084fc');
        gradient.addColorStop(1, secondaryColor);
        canvasCtx.fillStyle = gradient;
        canvasCtx.shadowBlur = 6;
        canvasCtx.shadowColor = primaryColor;

        phase += 0.12;

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(phase + i * 0.4) * 0.38 + 0.55;
          const barHeight = Math.max(3, wave * (h - 6));
          const x = i * step + (step - barWidth) / 2;
          const y = (h - barHeight) / 2;

          canvasCtx.beginPath();
          if (canvasCtx.roundRect) {
            canvasCtx.roundRect(x, y, barWidth, barHeight, 2);
          } else {
            canvasCtx.rect(x, y, barWidth, barHeight);
          }
          canvasCtx.fill();
        }

        animationFrameRef.current = requestAnimationFrame(renderSimulated);
      };

      renderSimulated();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isActive, stream, barCount, primaryColor, secondaryColor]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={height}
      style={{
        height,
        width: '100%',
        maxWidth: '140px',
        borderRadius: 6,
        background: 'transparent',
        display: 'block',
      }}
    />
  );
};
