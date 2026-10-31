import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode?: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  secondaryColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
}

function resolveColor(colorStr: string, defaultColor: string = '#ef4444'): string {
  if (!colorStr) return defaultColor;
  if (!colorStr.startsWith('var(')) return colorStr;

  // Extract CSS variable name and fallback
  const match = colorStr.match(/var\(\s*([^,\s)]+)(?:\s*,\s*([^)]+))?\)/);
  if (match) {
    const varName = match[1];
    const fallback = match[2]?.trim() || defaultColor;
    if (typeof window !== 'undefined') {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed) return computed;
    }
    return fallback;
  }
  return defaultColor;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  isActive,
  color = '#ef4444',
  secondaryColor = '#f87171',
  height = 42,
  barWidth = 3,
  barGap = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolvedColor = resolveColor(color, '#ef4444');
    const resolvedSecondaryColor = resolveColor(secondaryColor, '#f87171');

    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    let bufferLength = 0;

    if (analyserNode) {
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    }

    let phase = 0;

    const render = () => {
      phase += 0.08;
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const totalBars = Math.floor(width / (barWidth + barGap));
      const midY = h / 2;

      if (isActive && analyserNode && dataArray) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < totalBars; i++) {
        const x = i * (barWidth + barGap);
        let barHeight = 4; // default minimum resting height

        if (isActive) {
          if (analyserNode && dataArray && bufferLength > 0) {
            // Sample from frequency data
            const index = Math.floor((i / totalBars) * (bufferLength / 2));
            const val = dataArray[index] || 0;
            // Add a smooth sine wave ripple across bars for that liquid organic motion
            const waveMod = Math.sin(phase + i * 0.3) * 0.3 + 0.7;
            barHeight = Math.max(4, (val / 255) * (h * 0.85) * waveMod);
          } else {
            // Simulated pleasant organic soundwave if analyser is inactive but active flag is set
            const wave = Math.sin(phase * 1.5 + i * 0.35) * Math.cos(phase * 0.8 + i * 0.2);
            barHeight = Math.max(4, Math.abs(wave) * (h * 0.7) + 6);
          }
        } else {
          // Subtle gentle resting curve
          barHeight = 4;
        }

        const topY = midY - barHeight / 2;

        try {
          const grad = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
          grad.addColorStop(0, resolvedColor);
          grad.addColorStop(1, resolvedSecondaryColor);
          ctx.fillStyle = grad;
        } catch {
          ctx.fillStyle = resolvedColor || '#ef4444';
        }

        ctx.beginPath();
        // Rounded caps on waveform bars
        const radius = barWidth / 2;
        ctx.roundRect(x, topY, barWidth, barHeight, radius);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyserNode, isActive, color, secondaryColor, barWidth, barGap]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={height}
      className="wavy-canvas-visualizer"
    />
  );
};
