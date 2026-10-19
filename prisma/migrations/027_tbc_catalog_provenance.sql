ALTER TABLE "ForeverRaidCatalog" DROP CONSTRAINT "ForeverRaidCatalog_edition_contract_check";
ALTER TABLE "ForeverRaidCatalog" ADD CONSTRAINT "ForeverRaidCatalog_edition_contract_check" CHECK (
  (("bundle"->>'game') IS NOT DISTINCT FROM 'forever' AND
    ("bundle"->>'schema') IS NOT DISTINCT FROM 'forever-wowhead-loot-candidates.v1') OR
  (("bundle"->>'game') IS NOT DISTINCT FROM 'tbc' AND
    (("bundle"->>'schema') IN ('tbc-wowhead-loot-candidates.v1', 'tbc-atlasloot-loot-candidates.v1')) IS TRUE)
);
