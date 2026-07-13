import { ContactShadows } from "@react-three/drei";
import { NODE_POSITIONS, type BoardState, type Player } from "../game/rules";
import { PLAYERS } from "../game/config";
import type { ActiveMove, MovePreview } from "../game/types";
import { useI18n } from "../i18n";
import { BoardSurface, boardEdgeKey } from "./board";
import { MoveDestinationPreview, PreviewPathNode } from "./game-scene";
import { Token, tokenPlacement } from "./token";
import { YutPhysics } from "./yut-physics";

export type TutorialSceneProps = {
  pieces: BoardState;
  rolling: boolean;
  nonce: number;
  onSettled: (flats: number, backdo: boolean) => void;
  showSticks: boolean;
  movePreviews: MovePreview[];
  activeMove: ActiveMove;
  onMoveComplete: () => void;
  runId: number;
};

export function TutorialScene({
  pieces,
  rolling,
  nonce,
  onSettled,
  showSticks,
  movePreviews,
  activeMove,
  onMoveComplete,
  runId,
}: TutorialSceneProps) {
  const { t } = useI18n();
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
                key={`${runId}-${player}-${piece}`}
                position={placement.position}
                color={PLAYERS[player as Player].color}
                state={state}
                highlighted={false}
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

      {showSticks && (
        <YutPhysics rolling={rolling} nonce={nonce} onSettled={onSettled} />
      )}

      <ContactShadows
        position={[0, -0.37, 0]}
        opacity={0.48}
        scale={18}
        blur={2.6}
        far={8}
      />
    </>
  );
}
