import { useFrame } from "@react-three/fiber";
import {
  ConvexHullCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PHYSICS_THROW_TIMEOUT_MS } from "./game-config";

function XMark({ z }: { z: number }) {
  return (
    <group position={[0, 0.304, z]}>
      <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.052, 0.018, 0.32]} />
        <meshStandardMaterial color="#17130f" roughness={0.82} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.052, 0.018, 0.32]} />
        <meshStandardMaterial color="#17130f" roughness={0.82} />
      </mesh>
    </group>
  );
}

function createYutGeometry() {
  const radius = 0.29;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.absarc(0, 0, radius, 0, Math.PI, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2.45,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 18,
  });
  geometry.translate(0, 0, -1.225);
  geometry.computeVertexNormals();
  return geometry;
}

const YUT_GEOMETRY = createYutGeometry();
const YUT_COLLIDER_VERTICES = new Float32Array(YUT_GEOMETRY.attributes.position.array);

function YutImpactBurst({
  id,
  position,
  intensity,
  onComplete,
}: {
  id: number;
  position: [number, number, number];
  intensity: number;
  onComplete: (id: number) => void;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const particles = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2 + Math.random() * 0.28;
    const speed = (0.8 + Math.random() * 0.9) * intensity;
    return {
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 1.2 + Math.random() * 1.7, Math.sin(angle) * speed),
      size: 0.045 + Math.random() * 0.055,
      color: index % 3 === 0 ? "#fff0b8" : index % 2 === 0 ? "#d9ad64" : "#9b7041",
    };
  }), [intensity]);

  useEffect(() => {
    const timeout = window.setTimeout(() => onComplete(id), 850);
    return () => window.clearTimeout(timeout);
  }, [id, onComplete]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const progress = Math.min(1, elapsed.current / 0.82);
    particles.forEach((particle, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      const time = elapsed.current;
      mesh.position.set(
        particle.velocity.x * time,
        particle.velocity.y * time - 3.6 * time * time,
        particle.velocity.z * time,
      );
      const scale = particle.size * (1 - progress) * 1.25;
      mesh.scale.setScalar(Math.max(0.001, scale));
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.9 * (1 - progress));
    });
  });

  return (
    <group position={position}>
      {particles.map((particle, index) => (
        <mesh key={index} ref={(mesh) => { meshes.current[index] = mesh; }}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={particle.color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function FlatBackdoX({ glowing }: { glowing: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!glowing) return;
    const pulse = 0.5 + Math.sin(clock.elapsedTime * 10) * 0.5;
    if (ring.current) {
      ring.current.scale.setScalar(1 + pulse * 0.35);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.42 + pulse * 0.38;
    }
    if (light.current) light.current.intensity = 2.8 + pulse * 3.4;
  });

  return (
    <group position={[0, -0.014, 0]}>
      <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.065, 0.018, 0.42]} />
        <meshStandardMaterial color={glowing ? "#5d130f" : "#17130f"} roughness={0.82} emissive="#ff241c" emissiveIntensity={glowing ? 4.2 : 0} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.065, 0.018, 0.42]} />
        <meshStandardMaterial color={glowing ? "#5d130f" : "#17130f"} roughness={0.82} emissive="#ff241c" emissiveIntensity={glowing ? 4.2 : 0} />
      </mesh>
      {glowing && (
        <>
          <mesh ref={ring} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.32, 40]} />
            <meshBasicMaterial color="#ff3b2f" transparent opacity={0.72} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
          <pointLight ref={light} color="#ff3026" intensity={4} distance={2.3} position={[0, -0.24, 0]} />
        </>
      )}
    </group>
  );
}

export function YutStickMesh({ backdo = false, backdoGlow = false }: { backdo?: boolean; backdoGlow?: boolean }) {
  return (
    <group>
      <mesh geometry={YUT_GEOMETRY} castShadow receiveShadow>
        <meshStandardMaterial color="#d8aa65" roughness={0.6} />
      </mesh>
      <XMark z={-0.66} />
      <XMark z={0} />
      <XMark z={0.66} />
      {backdo && <FlatBackdoX glowing={backdoGlow} />}
    </group>
  );
}

function PhysicsYutStick({
  index,
  nonce,
  backdoGlow,
  onSleep,
  onImpact,
}: {
  index: number;
  nonce: number;
  backdoGlow: boolean;
  onSleep: (index: number, body: RapierRigidBody) => void;
  onImpact: (position: [number, number, number], intensity: number) => void;
}) {
  const body = useRef<RapierRigidBody>(null);
  const preparing = useRef(false);
  const prepareElapsed = useRef(0);
  const prepareStart = useRef(new THREE.Vector3());
  const prepareEnd = useRef(new THREE.Vector3());
  const prepareStartRotation = useRef(new THREE.Quaternion());
  const prepareEndRotation = useRef(new THREE.Quaternion());
  const launchVelocity = useRef(new THREE.Vector3());
  const launchAngularVelocity = useRef(new THREE.Vector3());
  const launchAfterPrepare = useRef(false);
  const lastImpactAt = useRef(0);
  const idlePosition = useMemo(
    () => [(index - 1.5) * 0.76, 0.325, 0] as [number, number, number],
    [index],
  );

  useEffect(() => {
    const rigidBody = body.current;
    if (!rigidBody) return;

    const translation = rigidBody.translation();
    const rotation = rigidBody.rotation();
    prepareStart.current.set(translation.x, translation.y, translation.z);
    prepareStartRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w);
    launchAfterPrepare.current = nonce > 0;

    if (nonce === 0) {
      prepareEnd.current.set(...idlePosition);
      prepareEndRotation.current.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      launchVelocity.current.set(0, 0, 0);
      launchAngularVelocity.current.set(0, 0, 0);
    } else {
      const direction = index - 1.5;
      prepareEnd.current.set(direction * 0.95, 1.32 + (index % 2) * 0.22, 1.15);
      prepareEndRotation.current.setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * 0.34,
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.22,
      ));
      launchVelocity.current.set(
        direction * 1.02 + (Math.random() - 0.5) * 0.95,
        9.1 + Math.random() * 1.7,
        -1.75 + (Math.random() - 0.5) * 1.6,
      );
      launchAngularVelocity.current.set(
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 36,
      );
    }

    preparing.current = true;
    prepareElapsed.current = 0;
    rigidBody.setGravityScale(0, true);
    rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.wakeUp();
  }, [idlePosition, index, nonce]);

  useFrame((_, delta) => {
    const rigidBody = body.current;
    if (!rigidBody || !preparing.current) return;

    prepareElapsed.current = Math.min(0.58, prepareElapsed.current + delta);
    const t = prepareElapsed.current / 0.58;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const position = prepareStart.current.clone().lerp(prepareEnd.current, eased);
    position.y += Math.sin(Math.PI * t) * 0.52;
    const rotation = prepareStartRotation.current.clone().slerp(prepareEndRotation.current, eased);
    rigidBody.setTranslation(position, true);
    rigidBody.setRotation(rotation, true);
    rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

    if (t < 1) return;
    preparing.current = false;
    rigidBody.setTranslation(prepareEnd.current, true);
    rigidBody.setRotation(prepareEndRotation.current, true);
    if (launchAfterPrepare.current) {
      rigidBody.setGravityScale(1, true);
      rigidBody.setLinvel(launchVelocity.current, true);
      rigidBody.setAngvel(launchAngularVelocity.current, true);
    } else {
      rigidBody.sleep();
    }
  });

  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={idlePosition}
      rotation={[Math.PI, 0, 0]}
      friction={0.92}
      restitution={0.34}
      linearDamping={0.3}
      angularDamping={0.48}
      ccd
      canSleep
      onSleep={() => !preparing.current && body.current && onSleep(index, body.current)}
      onCollisionEnter={() => {
        const rigidBody = body.current;
        if (!rigidBody || preparing.current || nonce === 0) return;
        const position = rigidBody.translation();
        const velocity = rigidBody.linvel();
        const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
        const now = performance.now();
        if (position.y > 0.85 || speed < 2.25 || now - lastImpactAt.current < 150) return;
        lastImpactAt.current = now;
        onImpact(
          [position.x, Math.max(0.12, position.y - 0.2), position.z],
          Math.min(1.65, Math.max(0.85, speed * 0.13)),
        );
      }}
    >
      <ConvexHullCollider args={[YUT_COLLIDER_VERTICES]} friction={0.92} restitution={0.34} contactSkin={0.028} />
      <YutStickMesh backdo={index === 0} backdoGlow={backdoGlow} />
    </RigidBody>
  );
}

export function YutPhysics({
  rolling,
  nonce,
  onSettled,
  onTimeout,
}: {
  rolling: boolean;
  nonce: number;
  onSettled: (flats: number, backdo: boolean) => void;
  onTimeout: () => void;
}) {
  const outcomes = useRef<(boolean | null)[]>([null, null, null, null]);
  const retries = useRef([0, 0, 0, 0]);
  const completed = useRef(false);
  const burstId = useRef(0);
  const [impactBursts, setImpactBursts] = useState<{ id: number; position: [number, number, number]; intensity: number }[]>([]);
  const [backdoGlow, setBackdoGlow] = useState(false);

  useEffect(() => {
    outcomes.current = [null, null, null, null];
    retries.current = [0, 0, 0, 0];
    completed.current = false;
    setImpactBursts([]);
    setBackdoGlow(false);
  }, [nonce]);

  useEffect(() => {
    if (!backdoGlow) return;
    const timeout = window.setTimeout(() => setBackdoGlow(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [backdoGlow]);

  useEffect(() => {
    if (!rolling || nonce === 0) return;
    const timeout = window.setTimeout(() => {
      if (!completed.current) onTimeout();
    }, PHYSICS_THROW_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [nonce, onTimeout, rolling]);

  const handleImpact = useCallback((position: [number, number, number], intensity: number) => {
    burstId.current += 1;
    const burst = { id: burstId.current, position, intensity };
    setImpactBursts((bursts) => [...bursts.slice(-7), burst]);
  }, []);

  const removeImpactBurst = useCallback((id: number) => {
    setImpactBursts((bursts) => bursts.filter((burst) => burst.id !== id));
  }, []);

  const handleSleep = useCallback((index: number, body: RapierRigidBody) => {
    if (!rolling || completed.current) return;
    const rotation = body.rotation();
    const flatNormal = new THREE.Vector3(0, -1, 0).applyQuaternion(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
    );

    if (Math.abs(flatNormal.y) < 0.42 && retries.current[index] < 2) {
      retries.current[index] += 1;
      body.wakeUp();
      body.applyTorqueImpulse({ x: 0.18 * (index % 2 ? 1 : -1), y: 0.03, z: 0.14 }, true);
      return;
    }

    outcomes.current[index] = flatNormal.y > 0;
    if (outcomes.current.every((value) => value !== null)) {
      completed.current = true;
      const flats = outcomes.current.filter(Boolean).length;
      const isBackdo = flats === 1 && outcomes.current[0] === true;
      setBackdoGlow(isBackdo);
      onSettled(flats, isBackdo);
    }
  }, [onSettled, rolling]);

  return (
    <Physics key="world-y0-v2" gravity={[0, -12.8, 0]} timeStep={1 / 60} paused={!rolling && nonce === 0}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.74, 0.13, 5.54]} position={[0, -0.13, 0]} friction={0.95} restitution={0.2} />
        <CuboidCollider args={[0.28, 5.5, 5.9]} position={[-5.72, 5.5, 0]} friction={0.72} restitution={0.2} />
        <CuboidCollider args={[0.28, 5.5, 5.9]} position={[5.72, 5.5, 0]} friction={0.72} restitution={0.2} />
        <CuboidCollider args={[5.95, 5.5, 0.28]} position={[0, 5.5, -5.52]} friction={0.72} restitution={0.2} />
        <CuboidCollider args={[5.95, 5.5, 0.28]} position={[0, 5.5, 5.52]} friction={0.72} restitution={0.2} />
      </RigidBody>
      {[0, 1, 2, 3].map((index) => (
        <PhysicsYutStick
          key={index}
          index={index}
          nonce={nonce}
          backdoGlow={backdoGlow && index === 0}
          onSleep={handleSleep}
          onImpact={handleImpact}
        />
      ))}
      {impactBursts.map((burst) => (
        <YutImpactBurst key={burst.id} {...burst} onComplete={removeImpactBurst} />
      ))}
    </Physics>
  );
}
