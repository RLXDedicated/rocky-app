// Every background, by catalog id. SceneArt (art.tsx) draws them.
import type { ComponentType } from "react";
import type { SceneProps } from "./kit";
import { AirCargoScene } from "./airCargo";
import { BallparkScene, JrStadiumScene } from "./sports";
import { BeachScene, ForestScene, MountainsScene, StarCampScene } from "./nature";
import { CanoCristalesScene, CaribbeanScene, CocoraScene, CoffeeFarmScene } from "./colombia";
import { GraveyardScene, HauntedScene, NorthPoleScene, PumpkinPatchScene, WinterScene } from "./seasonal";
import { OfficeScene } from "./office";
import { RouteScene } from "./route";
import { RailYardScene } from "./railYard";
import { LastMileScene } from "./lastMile";
import { DocksScene } from "./docks";
import { PortScene } from "./port";
import { SortHubScene } from "./sortHub";
import { WarehouseScene } from "./warehouse";

export const SCENES: Record<string, ComponentType<SceneProps>> = {
  "scene-route": (p) => <RouteScene {...p} time="day" />,
  "scene-sunset": (p) => <RouteScene {...p} time="sunset" />,
  "scene-night": (p) => <RouteScene {...p} time="night" />,
  "scene-warehouse": WarehouseScene,
  "scene-office": OfficeScene,
  "scene-ballpark": BallparkScene,
  "scene-jr-stadium": JrStadiumScene,
  "scene-forest": ForestScene,
  "scene-mountains": MountainsScene,
  "scene-beach": BeachScene,
  "scene-star-camp": StarCampScene,
  "scene-coffee-farm": CoffeeFarmScene,
  "scene-caribbean": CaribbeanScene,
  "scene-cocora": CocoraScene,
  "scene-cano-cristales": CanoCristalesScene,
  "scene-haunted": HauntedScene,
  "scene-pumpkin-patch": PumpkinPatchScene,
  "scene-graveyard": GraveyardScene,
  "scene-winter": WinterScene,
  "scene-north-pole": NorthPoleScene,
  "scene-sort-hub": SortHubScene,
  "scene-port": PortScene,
  "scene-docks": DocksScene,
  "scene-air-cargo": AirCargoScene,
  "scene-last-mile": LastMileScene,
  "scene-rail-yard": RailYardScene,
};
