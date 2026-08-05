// Script to generate favicon.png using canvas
import { createCanvas } from 'canvas';
import fs from 'fs';

const SIZE = 512;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Rounded rect background - dark navy with gradient
const grad = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, SIZE/2);
grad.addColorStop(0, '#1a1a3e');
grad.addColorStop(1, '#0d0d1f');

// Rounded square background
const r = 100;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.lineTo(SIZE - r, 0);
ctx.quadraticCurveTo(SIZE, 0, SIZE, r);
ctx.lineTo(SIZE, SIZE - r);
ctx.quadraticCurveTo(SIZE, SIZE, SIZE - r, SIZE);
ctx.lineTo(r, SIZE);
ctx.quadraticCurveTo(0, SIZE, 0, SIZE - r);
ctx.lineTo(0, r);
ctx.quadraticCurveTo(0, 0, r, 0);
ctx.closePath();
ctx.fillStyle = grad;
ctx.fill();

// Neon border glow
ctx.strokeStyle = '#ff2d78';
ctx.lineWidth = 12;
ctx.stroke();

// Two fighters silhouette shapes
// Fighter Left - cyan
ctx.fillStyle = '#00f5ff';
// Body
ctx.beginPath();
ctx.ellipse(170, 290, 35, 75, -0.2, 0, Math.PI * 2);
ctx.fill();
// Head
ctx.beginPath();
ctx.arc(160, 195, 38, 0, Math.PI * 2);
ctx.fill();
// Punch arm extended right
ctx.save();
ctx.translate(160, 280);
ctx.rotate(0.4);
ctx.beginPath();
ctx.roundRect(10, -15, 120, 28, 14);
ctx.fill();
ctx.restore();
// Legs
ctx.beginPath();
ctx.roundRect(140, 355, 28, 80, 10);
ctx.fill();
ctx.beginPath();
ctx.roundRect(178, 355, 28, 80, 10);
ctx.fill();

// Fighter Right - pink/magenta
ctx.fillStyle = '#ff2d78';
// Body
ctx.beginPath();
ctx.ellipse(342, 290, 35, 75, 0.2, 0, Math.PI * 2);
ctx.fill();
// Head
ctx.beginPath();
ctx.arc(352, 195, 38, 0, Math.PI * 2);
ctx.fill();
// Blocking arms
ctx.save();
ctx.translate(340, 270);
ctx.rotate(-0.4);
ctx.beginPath();
ctx.roundRect(-120, -15, 110, 28, 14);
ctx.fill();
ctx.restore();
// Legs
ctx.beginPath();
ctx.roundRect(312, 355, 28, 80, 10);
ctx.fill();
ctx.beginPath();
ctx.roundRect(350, 355, 28, 80, 10);
ctx.fill();

// VS text in center
ctx.font = 'bold 60px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = '#ffffff';
ctx.shadowColor = '#ff2d78';
ctx.shadowBlur = 20;
ctx.fillText('VS', SIZE / 2, 290);
ctx.shadowBlur = 0;

// "AB" brand text at bottom
ctx.font = 'bold 48px Arial';
ctx.fillStyle = '#ffffff';
ctx.shadowColor = '#00f5ff';
ctx.shadowBlur = 15;
ctx.fillText('AVATAR BRAWL', SIZE / 2, 460);
ctx.shadowBlur = 0;

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/favicon.png', buffer);
console.log('favicon.png generated! Size:', buffer.length, 'bytes');
