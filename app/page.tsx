import type { Metadata } from "next";
import YutnoriGame from "./yutnori-game";

export const metadata: Metadata = {
  title: "한판 윷놀이",
  description: "두 사람이 마주 앉아 즐기는 전통 3D 윷놀이",
};

export default function Home() {
  return <YutnoriGame />;
}
