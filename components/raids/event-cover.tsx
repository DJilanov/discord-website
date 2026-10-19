import Image from "next/image";
import { eventArtwork } from "@/lib/raids/event-artwork";
import type { RaidGame } from "@/lib/raids/games";
import type { EventType } from "@/lib/raids/event-types";

export function EventCover({
  game,
  eventType,
  name,
  banner = false,
}: {
  game: RaidGame;
  eventType: EventType;
  name: string;
  banner?: boolean;
}): React.JSX.Element {
  const artwork = eventArtwork(game, eventType, name);
  return (
    <div className={`raid-event-cover${banner ? " raid-event-banner" : ""}`}>
      <Image
        src={artwork.file}
        alt={artwork.alt}
        width={artwork.width}
        height={artwork.height}
        unoptimized
        loading="eager"
      />
    </div>
  );
}
