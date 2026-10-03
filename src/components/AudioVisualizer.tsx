import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = React.memo(({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = 32;
    const dataArray = new Uint8Array(barCount);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (isPlaying && analyser) {
        try {
          analyser.getByteFrequencyData(dataArray);
        } catch (e) {
          // fallback
        }
      }

      const barWidth = (width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          const val = dataArray[i] || Math.sin((Date.now() / 150) + i) * 60 + 60;
          barHeight = Math.max(4, (val / 255) * height * 0.88);
        } else {
          // Idle gentle pulse
          barHeight = 4 + Math.sin((Date.now() / 800) + i * 0.4) * 2;
        }

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gradient from #6c5ce7 (purple) to #00ff88 (emerald green)
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        if (isPlaying) {
          gradient.addColorStop(0, '#00ff88');
          gradient.addColorStop(0.5, '#a29bfe');
          gradient.addColorStop(1, '#6c5ce7');
        } else {
          gradient.addColorStop(0, '#4b4b68');
          gradient.addColorStop(1, '#2d2d44');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, analyser]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 px-3 bg-[#0f0f1e]/80 rounded-xl border border-[#2d2d44]/70">
      <div className="w-full flex items-center justify-between text-xs text-[#a29bfe] mb-1.5 px-1 font-mono">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00ff88] animate-ping' : 'bg-gray-500'}`} />
          {isPlaying ? 'AUDIO SPECTRUM ACTIVE' : 'SPECTRUM MONITOR'}
        </span>
        <span className="text-[11px] text-gray-400">24kHz • 16-bit Studio</span>
      </div>
      <canvas
        ref={canvasRef}
        width={460}
        height={48}
        className="w-full h-12 rounded"
      />
    </div>
  );
});
