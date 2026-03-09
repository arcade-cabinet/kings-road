import { Canvas } from '@react-three/fiber/native';
import { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Native game screen — wraps the shared R3F game in an Expo-compatible Canvas.
 *
 * This is the React Native entry point. The web entry is src/main.tsx via Vite.
 * Shared game logic lives in src/game/ and works on both platforms.
 *
 * TODO: Import and render the full Game component once platform abstractions
 * for input (touch/keyboard) and UI (HTML/CSS → RN) are complete.
 * For now, this renders a minimal R3F scene to verify the pipeline works.
 */
export default function GameScreen() {
  return (
    <View style={styles.container}>
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 250, position: [2, 1.6, 24] }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} color={0xffeedd} />
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#c4a747" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#7a9e5a" />
          </mesh>
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
});
