import { useEffect, useRef } from 'react';

/**
 * Full-viewport WebGL shader backdrop — aurora + cloud/mist flow tuned for a pastoral
 * warm-cream + honey-gold palette. Single fullscreen tri-strip, 2D fragment shader,
 * no Three.js dependency — this is the *menu* background, not the game scene.
 *
 * Animates a slow parallax cloud-mist layer with golden god-rays along the bottom,
 * and picks up a subtle influence from pointer position.
 */
export function ShaderBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vertexSrc = `
      attribute vec2 aPosition;
      void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
    `;

    const fragmentSrc = `
      precision highp float;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;

      // Warm pastoral palette
      const vec3 COLOR_SKY      = vec3(0.961, 0.941, 0.910); // #f5f0e8
      const vec3 COLOR_HORIZON  = vec3(0.910, 0.843, 0.765); // honey cream
      const vec3 COLOR_SUN      = vec3(0.988, 0.796, 0.502); // golden-amber
      const vec3 COLOR_GOLD     = vec3(0.769, 0.655, 0.278); // #c4a747 honey gold
      const vec3 COLOR_SHADOW   = vec3(0.545, 0.435, 0.278); // aged wood
      const vec3 COLOR_MIST     = vec3(0.988, 0.953, 0.871);

      // Hash & noise
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 p = uv;

        // Vertical gradient — warm-cream sky to honey horizon
        vec3 col = mix(COLOR_HORIZON, COLOR_SKY, smoothstep(0.0, 0.7, p.y));

        // Subtle cloud/mist layer drifting right
        vec2 q = vec2(p.x + uTime * 0.012, p.y * 1.6 - uTime * 0.004);
        float mist = fbm(q * 3.0);
        mist *= smoothstep(0.2, 0.9, p.y);
        col = mix(col, COLOR_MIST, mist * 0.35);

        // God-rays from upper-right (sun position)
        vec2 sunPos = vec2(0.78 + uMouse.x * 0.04, 0.82 + uMouse.y * 0.03);
        vec2 toSun = p - sunPos;
        float d = length(toSun);
        float raysAngle = atan(toSun.y, toSun.x);
        float rays =
          fbm(vec2(raysAngle * 6.0, uTime * 0.15)) *
          smoothstep(0.6, 0.0, d);
        col += COLOR_SUN * rays * 0.28;

        // Soft sun disc
        float sun = smoothstep(0.12, 0.0, d);
        col = mix(col, COLOR_SUN, sun * 0.75);

        // Low horizon honey wash
        float wash = smoothstep(0.45, 0.0, p.y);
        col = mix(col, COLOR_GOLD, wash * 0.18);

        // Drifting golden motes (ember layer)
        vec2 motes = p * vec2(uResolution.x / uResolution.y, 1.0) * 4.0;
        motes.y -= uTime * 0.08;
        float m = fbm(motes);
        float glint = smoothstep(0.73, 0.78, m) - smoothstep(0.78, 0.82, m);
        col += COLOR_GOLD * glint * 0.55;

        // Vignette
        float vig = smoothstep(1.2, 0.3, length((uv - 0.5) * vec2(1.4, 1.1)));
        col *= mix(0.82, 1.0, vig);

        // Gentle film grain
        float grain = hash(gl_FragCoord.xy + uTime * 60.0);
        col += (grain - 0.5) * 0.015;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (src: string, type: number) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(vertexSrc, gl.VERTEX_SHADER);
    const fs = compile(fragmentSrc, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1 - (e.clientY - rect.top) / rect.height;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    resize();

    const start = performance.now();
    const loop = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
