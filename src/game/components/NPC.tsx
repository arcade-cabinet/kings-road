import { Billboard, Float, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import type { ChibiConfig } from '../factories/chibi-generator';
import { generateChibiFromSeed } from '../factories/chibi-generator';
import { createChibiFaceTexture } from '../factories/face-texture';
import { blueprintToChibiConfig } from '../factories/npc-factory';
import { useGameStore } from '../stores/gameStore';
import type { Interactable } from '../types';

// Use @fontsource woff2 for drei <Text> (troika-three-text needs a URL)
const FONT_URL = new URL(
  '@fontsource/lora/files/lora-latin-700-normal.woff2',
  import.meta.url,
).href;

interface NPCProps {
  interactable: Interactable;
  blueprint?: NPCBlueprint;
}

// Display titles for all archetypes
const DISPLAY_TITLES: Record<string, string> = {
  blacksmith: 'Master Smith',
  innkeeper: 'Innkeeper',
  merchant: 'Merchant',
  wanderer: 'Wanderer',
  healer: 'Healer',
  knight: 'Knight',
  hermit: 'Hermit',
  farmer: 'Farmer',
  priest: 'Priest',
  noble: 'Noble',
  bandit: 'Bandit',
  scholar: 'Scholar',
  pilgrim: 'Pilgrim',
  captain: 'Guard Captain',
  guard: 'Town Guard',
  herbalist: 'Herbalist',
  lord: 'Lord',
  miller: 'Miller',
  jailer: 'Jailer',
  stablehand: 'Stablehand',
  watchman: 'Watchman',
};

// Type-specific accent colors for highlight ring
const TYPE_ACCENTS: Record<string, string> = {
  blacksmith: '#ff8844',
  innkeeper: '#88cc44',
  merchant: '#cc88ff',
  wanderer: '#88aacc',
  healer: '#44ccaa',
  knight: '#ccaa44',
  guard: '#8888cc',
  priest: '#cccc88',
};

export function NPC({ interactable, blueprint }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);

  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );
  const playerPosition = useGameStore((state) => state.playerPosition);

  const [highlightIntensity, setHighlightIntensity] = useState(0);

  const npcId = interactable?.id ?? '';
  const npcType = interactable?.type ?? 'wanderer';
  const npcPosition = interactable?.position;
  const npcName = interactable?.name ?? 'Stranger';

  const isHighlighted = currentInteractable?.id === npcId && npcId !== '';
  const accentColor = TYPE_ACCENTS[npcType] ?? '#88aacc';

  // Build ChibiConfig from blueprint or generate from seed
  const chibi: ChibiConfig = useMemo(() => {
    if (blueprint) return blueprintToChibiConfig(blueprint);
    return generateChibiFromSeed(npcId || 'default-npc');
  }, [npcId, blueprint]);

  // Generate chibi face texture
  const faceTexture = useMemo(
    () =>
      createChibiFaceTexture({
        skinTone: chibi.skinTone,
        eyeColor: chibi.eyeColor,
        hairColor: chibi.hairColor,
        hairStyle: chibi.hairStyle,
        facialHair: chibi.facialHair,
        expression: chibi.expression,
        race: chibi.race,
      }),
    [chibi],
  );

  // Body proportions from chibi config
  const plump = chibi.bodyPlumpness * (chibi.race === 'dwarf' ? 1.15 : 1);
  const hScale =
    chibi.race === 'dwarf' ? 0.85 : chibi.race === 'halfling' ? 0.75 : 1.0;

  // Blueprint accessories (if blueprint-driven)
  const accessories = blueprint?.accessories ?? [];

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current || !npcPosition || !playerPosition) return;

    const t = state.clock.elapsedTime;
    const idleOffset = npcId.charCodeAt(0) * 0.1;

    // Smooth highlight transition
    const targetIntensity = isHighlighted ? 1 : 0;
    setHighlightIntensity(
      (prev) => prev + (targetIntensity - prev) * delta * 5,
    );

    // Face player when close
    const toPlayer = new THREE.Vector3(
      playerPosition.x - npcPosition.x,
      0,
      playerPosition.z - npcPosition.z,
    );
    const distToPlayer = toPlayer.length();
    if (distToPlayer < 8 && distToPlayer > 2) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      const currentAngle = groupRef.current.rotation.y;
      const angleDiff =
        ((targetAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      groupRef.current.rotation.y += angleDiff * delta * 2;
    }

    // Breathing bob
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 2 + idleOffset) * 0.025;
    }

    // Arm/leg idle sway
    const stride =
      Math.sin(t * 1.8 + idleOffset) * (isHighlighted ? 0.2 : 0.12);
    if (armLRef.current) armLRef.current.rotation.x = stride;
    if (armRRef.current) {
      armRRef.current.rotation.x = -stride;
      // Gesture when highlighted
      if (isHighlighted) {
        armRRef.current.rotation.z = -0.3 - Math.sin(t * 3) * 0.1;
        armRRef.current.rotation.x = -0.3;
      } else {
        armRRef.current.rotation.z = 0;
      }
    }
    if (legLRef.current) legLRef.current.rotation.x = -stride * 0.9;
    if (legRRef.current) legRRef.current.rotation.x = stride * 0.9;

    // Head bob + job-specific idle
    if (headRef.current) {
      headRef.current.rotation.y =
        Math.sin(t * 0.7 + idleOffset) * (chibi.job === 'mage' ? 0.08 : 0.04);
      headRef.current.rotation.x =
        Math.sin(t * 0.5 + idleOffset) * 0.03 + (isHighlighted ? -0.1 : 0);
    }
  });

  if (!npcPosition) return null;

  return (
    <group ref={groupRef} position={[npcPosition.x, 0, npcPosition.z]}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.05}>
        <group ref={rootRef} scale={[hScale, hScale, hScale]}>
          {/* Shadow */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, 0]}
            receiveShadow
          >
            <circleGeometry args={[0.4, 16]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.3} />
          </mesh>

          {/* Torso */}
          <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.37 * plump, 0.43 * plump, 0.95, 24]} />
            <meshStandardMaterial color={chibi.primaryColor} roughness={0.8} />
          </mesh>

          {/* Head Group */}
          <group ref={headRef} position={[0, 1.95, 0]} scale={chibi.headSize}>
            {/* Neck */}
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.12, 0.15, 0.25, 12]} />
              <meshStandardMaterial color={chibi.skinTone} roughness={0.6} />
            </mesh>
            {/* Head sphere */}
            <mesh castShadow>
              <sphereGeometry args={[0.68, 32, 32]} />
              <meshStandardMaterial color={chibi.skinTone} roughness={0.6} />
            </mesh>
            {/* Face decal */}
            <mesh position={[0, 0.12, 0.69]} rotation={[0.02, 0, 0]}>
              <planeGeometry args={[1.32, 1.35]} />
              <meshBasicMaterial
                map={faceTexture}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Hair base */}
            <mesh position={[0, 0.35, -0.05]}>
              <sphereGeometry
                args={[0.73, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.75]}
              />
              <meshStandardMaterial color={chibi.hairColor} roughness={0.9} />
            </mesh>
            {/* Elf ears */}
            {chibi.race === 'elf' && (
              <>
                <mesh
                  position={[-0.72, 0.4, 0]}
                  rotation={[0, 0, -0.8]}
                  castShadow
                >
                  <capsuleGeometry args={[0.08, 0.32, 4, 8]} />
                  <meshStandardMaterial
                    color={chibi.skinTone}
                    roughness={0.6}
                  />
                </mesh>
                <mesh
                  position={[0.72, 0.4, 0]}
                  rotation={[0, 0, 0.8]}
                  castShadow
                >
                  <capsuleGeometry args={[0.08, 0.32, 4, 8]} />
                  <meshStandardMaterial
                    color={chibi.skinTone}
                    roughness={0.6}
                  />
                </mesh>
              </>
            )}
            {/* Orc tusks */}
            {chibi.race === 'orc' && (
              <>
                <mesh position={[-0.2, -0.35, 0.55]} rotation={[0.3, 0, 0.1]}>
                  <coneGeometry args={[0.04, 0.15, 6]} />
                  <meshStandardMaterial color="#f5f0e0" roughness={0.5} />
                </mesh>
                <mesh position={[0.2, -0.35, 0.55]} rotation={[0.3, 0, -0.1]}>
                  <coneGeometry args={[0.04, 0.15, 6]} />
                  <meshStandardMaterial color="#f5f0e0" roughness={0.5} />
                </mesh>
              </>
            )}
          </group>

          {/* Left arm */}
          <group position={[-0.45 * plump, 1.55, 0]} ref={armLRef}>
            <mesh castShadow>
              <capsuleGeometry args={[0.12, 0.48, 4, 8]} />
              <meshStandardMaterial
                color={chibi.primaryColor}
                roughness={0.8}
              />
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.36, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color={chibi.skinTone} roughness={0.6} />
            </mesh>
          </group>

          {/* Right arm */}
          <group position={[0.45 * plump, 1.55, 0]} ref={armRRef}>
            <mesh castShadow>
              <capsuleGeometry args={[0.12, 0.48, 4, 8]} />
              <meshStandardMaterial
                color={chibi.primaryColor}
                roughness={0.8}
              />
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.36, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color={chibi.skinTone} roughness={0.6} />
            </mesh>
            {/* Weapon slot */}
            {chibi.weaponType === 'staff' && (
              <group position={[0.2, -0.65, 0]} rotation={[1.6, 0.3, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.04, 0.04, 2.1, 8]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.2, 0]}>
                  <sphereGeometry args={[0.18, 12, 12]} />
                  <meshStandardMaterial
                    color={chibi.accentColor}
                    metalness={0.6}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
            {chibi.weaponType === 'sword' && (
              <group position={[0.15, -0.5, 0.1]} rotation={[0.3, 0, -0.8]}>
                <mesh>
                  <boxGeometry args={[0.05, 0.8, 0.02]} />
                  <meshStandardMaterial
                    color="#aaaaaa"
                    metalness={0.8}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0, -0.48, 0]}>
                  <boxGeometry args={[0.15, 0.08, 0.04]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.9} />
                </mesh>
              </group>
            )}
            {chibi.weaponType === 'mace' && (
              <group position={[0.2, -0.55, 0]} rotation={[0.3, 0, -0.8]}>
                <mesh>
                  <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.42, 0]}>
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial
                    color="#666"
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
            {chibi.weaponType === 'bow' && (
              <group position={[0.3, -0.3, -0.1]} rotation={[0, 0.3, -0.2]}>
                <mesh>
                  <torusGeometry args={[0.4, 0.025, 8, 16, Math.PI]} />
                  <meshStandardMaterial color="#5a3a20" roughness={0.8} />
                </mesh>
              </group>
            )}
            {chibi.weaponType === 'dagger' && (
              <group position={[0.1, -0.4, 0.1]} rotation={[0.5, 0, -0.5]}>
                <mesh>
                  <boxGeometry args={[0.03, 0.35, 0.01]} />
                  <meshStandardMaterial
                    color="#cccccc"
                    metalness={0.8}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0, -0.22, 0]}>
                  <boxGeometry args={[0.08, 0.06, 0.03]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.9} />
                </mesh>
              </group>
            )}
            {chibi.weaponType === 'holy_book' && (
              <group position={[0.15, -0.3, 0.1]} rotation={[0.2, 0, -0.3]}>
                <mesh>
                  <boxGeometry args={[0.15, 0.2, 0.05]} />
                  <meshStandardMaterial color="#3a1a0a" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0, 0.03]}>
                  <boxGeometry args={[0.04, 0.12, 0.01]} />
                  <meshStandardMaterial
                    color={chibi.accentColor}
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
          </group>

          {/* Left leg */}
          <group position={[-0.22 * plump, 0.55, 0]} ref={legLRef}>
            <mesh castShadow>
              <capsuleGeometry args={[0.14, 0.55, 4, 8]} />
              <meshStandardMaterial
                color={chibi.secondaryColor}
                roughness={0.9}
              />
            </mesh>
            {/* Boot */}
            <mesh position={[0, -0.38, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.2]} />
              <meshStandardMaterial color="#1a1510" roughness={0.9} />
            </mesh>
          </group>

          {/* Right leg */}
          <group position={[0.22 * plump, 0.55, 0]} ref={legRRef}>
            <mesh castShadow>
              <capsuleGeometry args={[0.14, 0.55, 4, 8]} />
              <meshStandardMaterial
                color={chibi.secondaryColor}
                roughness={0.9}
              />
            </mesh>
            {/* Boot */}
            <mesh position={[0, -0.38, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.2]} />
              <meshStandardMaterial color="#1a1510" roughness={0.9} />
            </mesh>
          </group>

          {/* Cloak */}
          {chibi.hasCloak && (
            <mesh
              position={[0, 1.25, -0.35]}
              rotation={[0.55, 0, 0]}
              castShadow
            >
              <planeGeometry args={[1.15, 1.45]} />
              <meshStandardMaterial
                color={chibi.secondaryColor}
                roughness={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Blueprint-specific accessories */}
          {accessories.includes('leather_apron') && (
            <mesh position={[0, 0.95, 0.2]} castShadow>
              <boxGeometry args={[0.45, 0.5, 0.05]} />
              <meshStandardMaterial color="#4a3520" roughness={0.9} />
            </mesh>
          )}
          {accessories.includes('mug') && (
            <mesh position={[-0.55, 1.2, 0.1]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
              <meshStandardMaterial color="#654321" roughness={0.8} />
            </mesh>
          )}
          {accessories.includes('herb_basket') && (
            <group position={[-0.55, 1.15, 0.05]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.15, 0.12, 0.15, 8]} />
                <meshStandardMaterial color="#8B7355" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.1, 0]} castShadow>
                <sphereGeometry args={[0.1, 6, 6]} />
                <meshStandardMaterial color="#3a6630" roughness={0.8} />
              </mesh>
            </group>
          )}
          {accessories.includes('scroll') && (
            <group position={[-0.5, 1.1, 0.1]} rotation={[0, 0, 0.5]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
                <meshStandardMaterial color="#f5e6c8" roughness={0.7} />
              </mesh>
            </group>
          )}
          {accessories.includes('walking_stick') && (
            <mesh position={[0.6, 0.7, 0]} rotation={[0.1, 0, -0.1]} castShadow>
              <cylinderGeometry args={[0.03, 0.04, 2.0, 6]} />
              <meshStandardMaterial color="#3a2a15" roughness={0.9} />
            </mesh>
          )}
        </group>
      </Float>

      {/* Name tag when highlighted */}
      {highlightIntensity > 0.1 && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <group position={[0, 2.3, 0]}>
            <mesh>
              <planeGeometry args={[2.2, 0.5]} />
              <meshBasicMaterial
                color="#0a0805"
                transparent
                opacity={0.9 * highlightIntensity}
              />
            </mesh>
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[2.25, 0.55]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.5 * highlightIntensity}
              />
            </mesh>
            <Text
              position={[0, 0.05, 0.01]}
              fontSize={0.2}
              color="#c4a747"
              anchorX="center"
              anchorY="middle"
              font={FONT_URL}
              outlineWidth={0.015}
              outlineColor="#000"
            >
              {npcName}
            </Text>
            <Text
              position={[0, -0.15, 0.01]}
              fontSize={0.1}
              color={accentColor}
              anchorX="center"
              anchorY="middle"
              font={FONT_URL}
            >
              {DISPLAY_TITLES[npcType] ?? npcType}
            </Text>
          </group>
        </Billboard>
      )}

      {/* Highlight effects */}
      {highlightIntensity > 0.1 && (
        <>
          <pointLight
            position={[0, 1.2, 0]}
            intensity={0.8 * highlightIntensity}
            distance={4}
            color={accentColor}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.6, 0.7, 32]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.4 * highlightIntensity}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
