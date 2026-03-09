import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Three.js
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
  };
});

// Mock canvas for WebGL
HTMLCanvasElement.prototype.getContext = vi
  .fn()
  .mockImplementation((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: { width: 800, height: 600 },
        getExtension: vi.fn(),
        getParameter: vi.fn(),
        createTexture: vi.fn(),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        texImage2D: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        createProgram: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        getShaderParameter: vi.fn().mockReturnValue(true),
        useProgram: vi.fn(),
        getUniformLocation: vi.fn(),
        getAttribLocation: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        depthFunc: vi.fn(),
        blendFunc: vi.fn(),
        cullFace: vi.fn(),
      };
    }
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        strokeRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: [] })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        roundRect: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      };
    }
    return null;
  });

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(
  (cb) => setTimeout(cb, 16) as unknown as number,
);
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock pointer lock API
Object.defineProperty(document, 'pointerLockElement', {
  value: null,
  writable: true,
});
document.exitPointerLock = vi.fn();
HTMLElement.prototype.requestPointerLock = vi.fn();

// Mock Element.closest for touch events
if (!Element.prototype.closest) {
  Element.prototype.closest = function (selector: string) {
    let el: Element | null = this;
    while (el) {
      if (el.matches?.(selector)) return el;
      el = el.parentElement;
    }
    return null;
  };
}
