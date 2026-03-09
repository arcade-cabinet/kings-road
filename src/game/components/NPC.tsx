import { Billboard, Float, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import { buildNPCRenderData } from '../factories/npc-factory';
import { useGameStore } from '../stores/gameStore';
import type { Interactable } from '../types';

interface NPCProps {
  interactable: Interactable;
  blueprint?: NPCBlueprint;
}

// Color palettes for NPCs
const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const CLOTH_COLORS: Record<string, string[]> = {
  blacksmith: ['#2a2a2a', '#3a3a3a', '#1a1a1a'],
  innkeeper: ['#2d4c1e', '#3d5c2e', '#1d3c0e'],
  merchant: ['#4a2070', '#5a3080', '#3a1060'],
  wanderer: ['#6b3e2e', '#5b2e1e', '#7b4e3e', '#4a2010', '#3a4050'],
};

// Type-specific accent colors
const TYPE_ACCENTS: Record<string, string> = {
  blacksmith: '#ff8844',
  innkeeper: '#88cc44',
  merchant: '#cc88ff',
  wanderer: '#88aacc',
};

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

export function NPC({ interactable, blueprint }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );
  const playerPosition = useGameStore((state) => state.playerPosition);

  const [highlightIntensity, setHighlightIntensity] = useState(0);

  // Safe defaults for interactable data
  const npcId = interactable?.id ?? '';
  const npcType = interactable?.type ?? 'wanderer';
  const npcPosition = interactable?.position;
  const npcName = interactable?.name ?? 'Stranger';

  // Determine if this NPC is being looked at
  const isHighlighted = currentInteractable?.id === npcId && npcId !== '';
  const accentColor = TYPE_ACCENTS[npcType] || TYPE_ACCENTS.wanderer;

  // Memoized render data: use blueprint factory or fallback to random generation
  const renderData = useMemo(() => {
    if (blueprint) {
      const data = buildNPCRenderData(blueprint);
      return {
        skinColor: data.skinColor,
        clothColor: data.clothPrimary,
        clothSecondary: data.clothSecondary,
        hairColor: '#4a3020', // hair rendered via face texture when blueprint present
        faceTexture: data.faceTexture,
        torsoHeight: data.torsoHeight,
        torsoRadiusTop: data.torsoRadiusTop,
        torsoRadiusBottom: data.torsoRadiusBottom,
        headRadius: data.headRadius,
        legHeight: data.legHeight,
        armLength: data.armLength,
        accessories: data.accessories,
      };
    }

    // Legacy random generation
    const seed = npcId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const skinIdx = seed % SKIN_COLORS.length;
    const clothOptions = CLOTH_COLORS[npcType] || CLOTH_COLORS.wanderer;
    const clothIdx = (seed * 7) % clothOptions.length;

    return {
      skinColor: SKIN_COLORS[skinIdx],
      clothColor: clothOptions[clothIdx],
      clothSecondary: clothOptions[clothIdx],
      hairColor:
        seed % 3 === 0 ? '#1a1a1a' : seed % 3 === 1 ? '#4a3020' : '#8a7060',
      faceTexture: null as THREE.CanvasTexture | null,
      torsoHeight: 0.7,
      torsoRadiusTop: 0.25,
      torsoRadiusBottom: 0.22,
      headRadius: 0.28,
      legHeight: 0.55,
      armLength: 0.45,
      accessories: [] as string[],
    };
  }, [npcId, npcType, blueprint]);

  const {
    skinColor,
    clothColor,
    hairColor,
    faceTexture,
    torsoHeight,
    torsoRadiusTop,
    torsoRadiusBottom,
    headRadius,
    legHeight,
    armLength,
    accessories,
  } = renderData;

  // Derived positions based on body proportions
  const torsoY = legHeight + torsoHeight / 2;
  const neckY = torsoY + torsoHeight / 2 - 0.05;
  const headY = neckY + headRadius + 0.05;
  const armY = torsoY + torsoHeight * 0.15;

  // Whether to use blueprint-based accessories vs legacy type-based
  const useBlueprint = !!blueprint;

  // Animation state
  useFrame((state, delta) => {
    // Safety check inside hook
    if (!groupRef.current || !npcPosition || !playerPosition) return;

    const t = state.clock.elapsedTime;
    const idleOffset = npcId.charCodeAt(0) * 0.1;

    // Smooth highlight transition
    const targetIntensity = isHighlighted ? 1 : 0;
    setHighlightIntensity(
      (prev) => prev + (targetIntensity - prev) * delta * 5,
    );

    // Calculate direction to player for head tracking
    const toPlayer = new THREE.Vector3(
      playerPosition.x - npcPosition.x,
      0,
      playerPosition.z - npcPosition.z,
    );
    const distToPlayer = toPlayer.length();
    const lookAtPlayer = distToPlayer < 8;

    // NPC rotation to face player when close
    if (groupRef.current && lookAtPlayer && distToPlayer > 2) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      const currentAngle = groupRef.current.rotation.y;
      const angleDiff =
        ((targetAngle - currentAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      groupRef.current.rotation.y += angleDiff * delta * 2;
    }

    // Subtle breathing/sway animation
    if (bodyRef.current) {
      const breathe = Math.sin(t * 2 + idleOffset) * 0.02;
      const sway = Math.sin(t * 0.8 + idleOffset) * 0.01;
      bodyRef.current.scale.y = 1 + breathe;
      bodyRef.current.scale.x = 1 - breathe * 0.3;
      bodyRef.current.rotation.z = sway;
    }

    // Head bob and tracking
    if (headRef.current) {
      headRef.current.position.y =
        headY + Math.sin(t * 1.5 + idleOffset) * 0.02;

      // Head looks at player when highlighted
      if (isHighlighted) {
        headRef.current.rotation.y = Math.sin(t * 0.5 + idleOffset) * 0.05;
        headRef.current.rotation.x = -0.1;
      } else {
        headRef.current.rotation.y = Math.sin(t * 0.5 + idleOffset) * 0.15;
        headRef.current.rotation.x = Math.sin(t * 0.7 + idleOffset) * 0.05;
      }
    }

    // Arm animations
    if (leftArmRef.current && rightArmRef.current) {
      const armSwing = Math.sin(t * 1.2 + idleOffset) * 0.08;
      leftArmRef.current.rotation.x = armSwing;
      rightArmRef.current.rotation.x = -armSwing;

      // Gesture when highlighted
      if (isHighlighted) {
        rightArmRef.current.rotation.z = -0.3 - Math.sin(t * 3) * 0.1;
        rightArmRef.current.rotation.x = -0.3;
      } else {
        rightArmRef.current.rotation.z = -0.3;
      }
    }
  });

  // Safety check - if no position data, don't render
  if (!npcPosition) {
    return null;
  }

  return (
    <group ref={groupRef} position={[npcPosition.x, 0, npcPosition.z]}>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.05}>
        {/* Shadow circle on ground */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          receiveShadow
        >
          <circleGeometry args={[0.4, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.3} />
        </mesh>

        {/* Body */}
        <mesh ref={bodyRef} position={[0, torsoY, 0]} castShadow>
          <cylinderGeometry
            args={[torsoRadiusTop, torsoRadiusBottom, torsoHeight, 12]}
          />
          <meshStandardMaterial color={clothColor} roughness={0.8} />
        </mesh>

        {/* Collar/neck detail */}
        <mesh position={[0, neckY, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 0.1, 12]} />
          <meshStandardMaterial color={clothColor} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh ref={headRef} position={[0, headY, 0]} castShadow>
          <sphereGeometry args={[headRadius, 16, 16]} />
          {faceTexture ? (
            <meshStandardMaterial map={faceTexture} roughness={0.6} />
          ) : (
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          )}
        </mesh>

        {/* Eyes (only when no face texture - face texture includes eyes) */}
        {!faceTexture && (
          <group position={[0, headY + 0.03, 0.2]}>
            <mesh position={[-0.08, 0, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.08, 0, 0]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Pupils */}
            <mesh position={[-0.08, 0, 0.03]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.08, 0, 0.03]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
          </group>
        )}

        {/* Hair (only when no face texture - face texture includes hair) */}
        {!faceTexture && (
          <mesh position={[0, headY + 0.15, -0.02]} castShadow>
            <sphereGeometry
              args={[0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        )}

        {/* Arms */}
        <group position={[-0.32, armY, 0]}>
          <mesh ref={leftArmRef} rotation={[0, 0, 0.3]} castShadow>
            <cylinderGeometry args={[0.06, 0.05, armLength, 8]} />
            <meshStandardMaterial color={clothColor} roughness={0.8} />
          </mesh>
          {/* Hand */}
          <mesh position={[0.15, -0.15, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>
        <group position={[0.32, armY, 0]}>
          <mesh ref={rightArmRef} rotation={[0, 0, -0.3]} castShadow>
            <cylinderGeometry args={[0.06, 0.05, armLength, 8]} />
            <meshStandardMaterial color={clothColor} roughness={0.8} />
          </mesh>
          {/* Hand */}
          <mesh position={[-0.15, -0.15, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>

        {/* Legs */}
        <mesh position={[-0.1, legHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, legHeight, 8]} />
          <meshStandardMaterial color="#2a2015" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, legHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, legHeight, 8]} />
          <meshStandardMaterial color="#2a2015" roughness={0.9} />
        </mesh>

        {/* Feet */}
        <mesh position={[-0.1, 0.05, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.15]} />
          <meshStandardMaterial color="#1a1510" roughness={0.9} />
        </mesh>
        <mesh position={[0.1, 0.05, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.15]} />
          <meshStandardMaterial color="#1a1510" roughness={0.9} />
        </mesh>

        {/* Blueprint-driven accessories */}
        {useBlueprint && (
          <>
            {accessories.includes('leather_apron') && (
              <mesh position={[0, torsoY - 0.05, 0.15]} castShadow>
                <boxGeometry args={[0.35, 0.4, 0.05]} />
                <meshStandardMaterial color="#4a3520" roughness={0.9} />
              </mesh>
            )}
            {accessories.includes('hammer') && (
              <group
                position={[0.45, legHeight + 0.15, 0]}
                rotation={[0.3, 0, -0.8]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.08, 0.45, 0.08]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.28, 0]} castShadow>
                  <boxGeometry args={[0.15, 0.12, 0.1]} />
                  <meshStandardMaterial
                    color="#555"
                    metalness={0.8}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
            {accessories.includes('mug') && (
              <mesh position={[-0.4, armY - 0.3, 0.1]} castShadow>
                <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
                <meshStandardMaterial color="#654321" roughness={0.8} />
              </mesh>
            )}
            {accessories.includes('robes') && (
              <mesh position={[0, torsoY, 0]} castShadow>
                <cylinderGeometry
                  args={[
                    torsoRadiusTop + 0.05,
                    torsoRadiusBottom + 0.08,
                    torsoHeight + 0.3,
                    12,
                  ]}
                />
                <meshStandardMaterial
                  color={renderData.clothSecondary}
                  roughness={0.9}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            )}
            {accessories.includes('scroll') && (
              <group position={[-0.35, armY - 0.2, 0.1]} rotation={[0, 0, 0.5]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
                  <meshStandardMaterial color="#f5e6c8" roughness={0.7} />
                </mesh>
              </group>
            )}
            {accessories.includes('herb_basket') && (
              <group position={[-0.4, armY - 0.25, 0.05]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.15, 0.12, 0.15, 8]} />
                  <meshStandardMaterial color="#8B7355" roughness={0.9} />
                </mesh>
                {/* Herbs poking out */}
                <mesh position={[0, 0.1, 0]} castShadow>
                  <sphereGeometry args={[0.1, 6, 6]} />
                  <meshStandardMaterial color="#3a6630" roughness={0.8} />
                </mesh>
              </group>
            )}
            {accessories.includes('shawl') && (
              <mesh position={[0, neckY + 0.05, 0.05]} castShadow>
                <boxGeometry args={[0.5, 0.15, 0.2]} />
                <meshStandardMaterial
                  color={renderData.clothSecondary}
                  roughness={0.8}
                />
              </mesh>
            )}
            {accessories.includes('holy_book') && (
              <group
                position={[0.35, armY - 0.2, 0.1]}
                rotation={[0.2, 0, -0.3]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.15, 0.2, 0.05]} />
                  <meshStandardMaterial color="#3a1a0a" roughness={0.8} />
                </mesh>
                {/* Gold clasp */}
                <mesh position={[0, 0, 0.03]} castShadow>
                  <boxGeometry args={[0.04, 0.12, 0.01]} />
                  <meshStandardMaterial
                    color="#c4a747"
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            )}
            {accessories.includes('walking_stick') && (
              <mesh
                position={[0.5, legHeight * 0.65, 0]}
                rotation={[0.1, 0, -0.1]}
                castShadow
              >
                <cylinderGeometry args={[0.03, 0.04, legHeight * 2.5, 6]} />
                <meshStandardMaterial color="#3a2a15" roughness={0.9} />
              </mesh>
            )}
          </>
        )}

        {/* Legacy type-specific accessories (when no blueprint) */}
        {!useBlueprint && npcType === 'blacksmith' && (
          <>
            {/* Hammer */}
            <group position={[0.45, 0.5, 0]} rotation={[0.3, 0, -0.8]}>
              <mesh castShadow>
                <boxGeometry args={[0.08, 0.45, 0.08]} />
                <meshStandardMaterial color="#4a3020" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.28, 0]} castShadow>
                <boxGeometry args={[0.15, 0.12, 0.1]} />
                <meshStandardMaterial
                  color="#555"
                  metalness={0.8}
                  roughness={0.3}
                />
              </mesh>
            </group>
            {/* Apron */}
            <mesh position={[0, 0.7, 0.15]} castShadow>
              <boxGeometry args={[0.35, 0.4, 0.05]} />
              <meshStandardMaterial color="#4a3520" roughness={0.9} />
            </mesh>
          </>
        )}

        {!useBlueprint && npcType === 'innkeeper' && (
          <>
            {/* Mug */}
            <mesh position={[-0.4, 0.65, 0.1]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
              <meshStandardMaterial color="#654321" roughness={0.8} />
            </mesh>
            {/* Apron */}
            <mesh position={[0, 0.6, 0.13]} castShadow>
              <boxGeometry args={[0.4, 0.5, 0.03]} />
              <meshStandardMaterial color="#f5f5dc" roughness={0.9} />
            </mesh>
          </>
        )}

        {!useBlueprint && npcType === 'merchant' && (
          <>
            {/* Backpack */}
            <mesh position={[0, 0.6, -0.25]} castShadow>
              <boxGeometry args={[0.4, 0.5, 0.25]} />
              <meshStandardMaterial color="#5a4030" roughness={0.9} />
            </mesh>
            {/* Hat */}
            <mesh position={[0, 1.65, 0]} castShadow>
              <coneGeometry args={[0.25, 0.3, 8]} />
              <meshStandardMaterial color="#4a2070" roughness={0.8} />
            </mesh>
          </>
        )}

        {!useBlueprint && npcType === 'wanderer' && (
          <>
            {/* Walking stick */}
            <mesh position={[0.5, 0.7, 0]} rotation={[0.1, 0, -0.1]} castShadow>
              <cylinderGeometry args={[0.03, 0.04, 1.4, 6]} />
              <meshStandardMaterial color="#3a2a15" roughness={0.9} />
            </mesh>
            {/* Hood/cloak */}
            <mesh position={[0, 1.55, -0.08]} castShadow>
              <sphereGeometry
                args={[0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshStandardMaterial color="#3a3535" roughness={0.9} />
            </mesh>
          </>
        )}
      </Float>

      {/* Name tag when highlighted */}
      {highlightIntensity > 0.1 && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <group position={[0, 2.3, 0]}>
            {/* Background with border */}
            <mesh>
              <planeGeometry args={[2.2, 0.5]} />
              <meshBasicMaterial
                color="#0a0805"
                transparent
                opacity={0.9 * highlightIntensity}
              />
            </mesh>
            {/* Accent border */}
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[2.25, 0.55]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.5 * highlightIntensity}
              />
            </mesh>
            {/* Name text */}
            <Text
              position={[0, 0.05, 0.01]}
              fontSize={0.2}
              color="#c4a747"
              anchorX="center"
              anchorY="middle"
              font="/fonts/Lora-Bold.ttf"
              outlineWidth={0.015}
              outlineColor="#000"
            >
              {npcName}
            </Text>
            {/* Type subtitle */}
            <Text
              position={[0, -0.15, 0.01]}
              fontSize={0.1}
              color={accentColor}
              anchorX="center"
              anchorY="middle"
              font="/fonts/Lora-Bold.ttf"
            >
              {DISPLAY_TITLES[npcType] ?? npcType}
            </Text>
          </group>
        </Billboard>
      )}

      {/* Highlight effects */}
      {highlightIntensity > 0.1 && (
        <>
          {/* Ambient glow */}
          <pointLight
            position={[0, 1.2, 0]}
            intensity={0.8 * highlightIntensity}
            distance={4}
            color={accentColor}
          />
          {/* Ground highlight ring */}
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
