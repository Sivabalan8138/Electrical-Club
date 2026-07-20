'use client';

import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Line {
  points: Point[];
  progress: number;
  speed: number;
  width: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export default function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initCircuits();
    };

    window.addEventListener('resize', handleResize);

    // Track circuits and particles
    let lines: Line[] = [];
    let particles: Particle[] = [];

    // Helper to generate a random path that mimics PCB tracks (horizontal, vertical, 45-degree angles)
    const generatePCBPath = (startX: number, startY: number): Point[] => {
      const points: Point[] = [{ x: startX, y: startY }];
      let currentX = startX;
      let currentY = startY;
      const segmentsCount = 3 + Math.floor(Math.random() * 4);

      for (let i = 0; i < segmentsCount; i++) {
        const direction = Math.floor(Math.random() * 3); // 0: X, 1: Y, 2: Diagonal (45 deg)
        const length = 50 + Math.floor(Math.random() * 150);

        if (direction === 0) {
          currentX += Math.random() > 0.5 ? length : -length;
        } else if (direction === 1) {
          currentY += Math.random() > 0.5 ? length : -length;
        } else {
          const diag = length / Math.sqrt(2);
          const signX = Math.random() > 0.5 ? 1 : -1;
          const signY = Math.random() > 0.5 ? 1 : -1;
          currentX += diag * signX;
          currentY += diag * signY;
        }

        // Clamp to screen bounds with padding
        currentX = Math.max(50, Math.min(width - 50, currentX));
        currentY = Math.max(50, Math.min(height - 50, currentY));

        points.push({ x: currentX, y: currentY });
      }

      return points;
    };

    const initCircuits = () => {
      lines = [];
      particles = [];

      // Create static/dynamic circuit tracks
      const tracksCount = Math.min(15, Math.floor(width / 100));
      for (let i = 0; i < tracksCount; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        lines.push({
          points: generatePCBPath(startX, startY),
          progress: Math.random(),
          speed: 0.001 + Math.random() * 0.002,
          width: 1 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#00D4FF' : '#00FFFF',
        });
      }

      // Create floating energy particles
      const particlesCount = Math.min(40, Math.floor(width / 30));
      for (let i = 0; i < particlesCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 1 + Math.random() * 2.5,
          alpha: 0.1 + Math.random() * 0.5,
        });
      }
    };

    initCircuits();

    // Animation Loop
    const draw = () => {
      ctx.fillStyle = '#081B33';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw static background PCB track lines (faint)
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
      ctx.lineWidth = 1;
      lines.forEach((line) => {
        if (line.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.stroke();

        // Draw node circles at ends
        ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
        line.points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // 2. Draw flowing electric current pulses
      lines.forEach((line) => {
        if (line.points.length < 2) return;

        line.progress += line.speed;
        if (line.progress >= 1) {
          line.progress = 0;
          // Re-generate track to keep layout fresh
          line.points = generatePCBPath(Math.random() * width, Math.random() * height);
        }

        // Calculate current position along the multi-segment line
        const totalSegments = line.points.length - 1;
        const segmentProgress = line.progress * totalSegments;
        const currentSegmentIdx = Math.floor(segmentProgress);
        const segmentT = segmentProgress - currentSegmentIdx;

        if (currentSegmentIdx >= totalSegments) return;

        const p1 = line.points[currentSegmentIdx];
        const p2 = line.points[currentSegmentIdx + 1];

        const pulseX = p1.x + (p2.x - p1.x) * segmentT;
        const pulseY = p1.y + (p2.y - p1.y) * segmentT;

        // Draw glowing pulse dot
        ctx.shadowBlur = 12;
        ctx.shadowColor = line.color;
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, line.width + 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw trailing glow effect
        ctx.shadowBlur = 0; // Reset shadow for efficiency
        const trailLength = 5;
        for (let i = 1; i <= trailLength; i++) {
          const t = Math.max(0, segmentT - i * 0.05);
          const trailX = p1.x + (p2.x - p1.x) * t;
          const trailY = p1.y + (p2.y - p1.y) * t;
          ctx.fillStyle = line.color;
          ctx.globalAlpha = 0.5 * (1 - i / trailLength);
          ctx.beginPath();
          ctx.arc(trailX, trailY, line.width, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0; // Reset alpha
      });

      // 3. Draw and update floating electrical/neon particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(0, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 bg-[#081B33]"
    />
  );
}
