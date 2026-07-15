import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  NODE_POSITIONS,
  sameStack,
  type BoardState,
  type Player,
} from "../game/rules";
import { PLAYERS } from "../game/config";
import type { ActiveMove, HoveredToken, MovePreview } from "../game/types";
import { BoardSurface, boardEdgeKey } from "./board";
import { Token, tokenPlacement } from "./token";
import { YutPhysics } from "./yut-physics";
import { useI18n } from "../i18n";

function PreviewPathNode({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const scale = 1 + Math.sin(clock.elapsedTime * 7.5) * 0.1;
    ref.current.scale.setScalar(scale);
  });

  return (
    <group ref={ref} position={[position[0], 0.115, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 36]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight
        color={color}
        intensity={1.3}
        distance={1.8}
        position={[0, 0.32, 0]}
      />
    </group>
  );
}

function MoveDestinationPreview({ preview }: { preview: MovePreview }) {
  const { t } = useI18n();
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 5.2) * 0.09;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group
      ref={ref}
      position={[preview.position[0], 0.13, preview.position[2]]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.61, 40]} />
        <meshBasicMaterial
          color={preview.color}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.44, 40]} />
        <meshBasicMaterial
          color={preview.color}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        color={preview.color}
        intensity={1.8}
        distance={2.1}
        position={[0, 0.42, 0]}
      />
      <Html
        center
        position={[0, 0.72, 0]}
        distanceFactor={8.5}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="block rounded-full border-[1.5px] border-parchment-bright/60 bg-night/95 px-3.5 py-2 text-[clamp(16px,1.35vw,20px)] leading-[1.1] font-extrabold tracking-snug whitespace-nowrap text-parchment-bright shadow-[0_8px_24px] shadow-black/45 backdrop-blur-[5px]">
            {preview.label}
          </span>
          {preview.action && (
            <span
              className={`block rounded-full border-[1.5px] border-current px-3 py-1.5 text-[clamp(15px,1.2vw,18px)] leading-none font-black tracking-snug whitespace-nowrap text-parchment-bright shadow-[0_7px_20px] shadow-black/40 ${preview.action === "capture" ? "bg-team-red/95" : "bg-gold-deep/95"}`}
            >
              {preview.action === "capture"
                ? t.preview.capture
                : t.preview.stack}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export function Scene({
  pieces,
  rolling,
  nonce,
  onSettled,
  hoveredToken,
  movePreviews,
  activeMove,
  onMoveComplete,
}: {
  pieces: BoardState;
  rolling: boolean;
  nonce: number;
  onSettled: (flats: number, backdo: boolean) => void;
  hoveredToken: HoveredToken;
  movePreviews: MovePreview[];
  activeMove: ActiveMove;
  onMoveComplete: () => void;
}) {
  const { t } = useI18n();
  const { camera, size } = useThree();
  const isMobileViewport = size.width < 760;
  const viewportOrientation =
    size.width > size.height ? "landscape" : "portrait";

  useLayoutEffect(() => {
    if (!isMobileViewport || !(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    const aspect = size.width / size.height;
    const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const boardHalfWidthWithSafeArea = 8;
    const distanceToFitBoard =
      boardHalfWidthWithSafeArea / (Math.tan(halfVerticalFov) * aspect);
    const distance = THREE.MathUtils.clamp(distanceToFitBoard, 26, 48);
    const initialDistance = Math.hypot(10.8, 11.8);

    camera.position.set(
      0,
      distance * (10.8 / initialDistance),
      distance * (11.8 / initialDistance),
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, isMobileViewport, viewportOrientation]);

  const previewEdgeColors = new Map<string, string>();
  movePreviews.forEach((preview) => {
    preview.pathNodes.slice(1).forEach((node, index) => {
      previewEdgeColors.set(
        boardEdgeKey(preview.pathNodes[index], node),
        preview.color,
      );
    });
  });

  return (
    <>
      <color attach="background" args={["#0d1713"]} />
      <ambientLight intensity={1.4} />
      <directionalLight
        position={[5, 10, 7]}
        intensity={2.6}
        color="#ffe8bb"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight
        position={[-6, 4, -4]}
        intensity={16}
        color="#87512d"
        distance={14}
      />

      <group>
        <BoardSurface previewEdgeColors={previewEdgeColors} />

        {movePreviews.flatMap((preview) =>
          preview.pathNodes.map((node, index) => (
            <PreviewPathNode
              key={`preview-node-${preview.key}-${index}-${node}`}
              position={NODE_POSITIONS[node]}
              color={preview.color}
            />
          )),
        )}

        {movePreviews.map((preview) => (
          <MoveDestinationPreview key={preview.key} preview={preview} />
        ))}

        {pieces.map((playerPieces, player) =>
          playerPieces.map((state, piece) => {
            const placement = tokenPlacement(pieces, player, piece);
            const hoveredState =
              hoveredToken?.player === player
                ? pieces[player][hoveredToken.piece]
                : null;
            const highlighted =
              hoveredToken?.player === player &&
              (hoveredToken.piece === piece ||
                (hoveredState ? sameStack(state, hoveredState) : false));
            const isMovingPiece =
              activeMove?.player === player &&
              activeMove.pieces.includes(piece);
            const movingStackSlot = isMovingPiece
              ? activeMove.pieces.indexOf(piece)
              : 0;
            const hasMovePreviewAtPosition = movePreviews.some(
              (preview) =>
                Math.abs(preview.position[0] - placement.position[0]) < 0.1 &&
                Math.abs(preview.position[2] - placement.position[2]) < 0.1,
            );
            const stackLabel =
              !hasMovePreviewAtPosition &&
              placement.count > 1 &&
              placement.slot === placement.count - 1
                ? placement.members
                    .map((member) => t.tokenTag(player as Player, member))
                    .join(" + ")
                : null;
            return (
              <Token
                key={`${player}-${piece}`}
                position={placement.position}
                color={PLAYERS[player as Player].color}
                state={state}
                highlighted={highlighted}
                stackLabel={stackLabel}
                activeMoveId={isMovingPiece ? activeMove.id : null}
                moveWaypoints={isMovingPiece ? activeMove.waypoints : null}
                moveWaypointClearances={
                  isMovingPiece ? activeMove.waypointClearances : null
                }
                movingStackSlot={movingStackSlot}
                notifyOnMoveComplete={
                  isMovingPiece && activeMove.leader === piece
                }
                onMoveComplete={onMoveComplete}
              />
            );
          }),
        )}
      </group>

      <YutPhysics rolling={rolling} nonce={nonce} onSettled={onSettled} />

      <ContactShadows
        position={[0, -0.37, 0]}
        opacity={0.48}
        scale={18}
        blur={2.6}
        far={8}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.85}
        minDistance={8.5}
        maxDistance={isMobileViewport ? 52 : 30}
        minPolarAngle={0.72}
        maxPolarAngle={1.08}
        minAzimuthAngle={-0.25}
        maxAzimuthAngle={0.25}
        target={[0, 0, 0]}
      />
    </>
  );
}
