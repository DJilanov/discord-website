import { getMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { RaidAccess } from "@/components/raids/access";
import { CharacterManager } from "@/components/raids/workspace";

export default async function CharactersPage(): Promise<React.JSX.Element> {
  const member = await getMember();
  return member ? (
    <CharacterManager characters={await raids.characters(member)} />
  ) : (
    <RaidAccess returnTo="/account/characters" />
  );
}
