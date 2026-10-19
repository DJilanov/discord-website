ALTER TABLE "ForeverRaidCatalog" ADD CONSTRAINT "ForeverRaidCatalog_forever_contract_check"
  CHECK (("bundle"->>'game') IS NOT DISTINCT FROM 'forever'
    AND ("bundle"->>'schema') IS NOT DISTINCT FROM 'forever-wowhead-loot-candidates.v1');
