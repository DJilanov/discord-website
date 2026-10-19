ALTER TABLE "ForeverCharacter" ADD COLUMN "specialization" TEXT;
ALTER TABLE "ForeverCharacter" ADD CONSTRAINT "ForeverCharacter_specialization_check"
  CHECK ("specialization" IS NULL OR CASE "className"
    WHEN 'Warrior' THEN "specialization" IN ('Arms', 'Fury', 'Protection')
    WHEN 'Paladin' THEN "specialization" IN ('Holy', 'Protection', 'Retribution')
    WHEN 'Hunter' THEN "specialization" IN ('Beast Mastery', 'Marksmanship', 'Survival')
    WHEN 'Rogue' THEN "specialization" IN ('Assassination', 'Combat', 'Subtlety')
    WHEN 'Priest' THEN "specialization" IN ('Discipline', 'Holy', 'Shadow')
    WHEN 'Shaman' THEN "specialization" IN ('Elemental', 'Enhancement', 'Restoration')
    WHEN 'Mage' THEN "specialization" IN ('Arcane', 'Fire', 'Frost')
    WHEN 'Warlock' THEN "specialization" IN ('Affliction', 'Demonology', 'Destruction')
    WHEN 'Druid' THEN "specialization" IN ('Balance', 'Feral', 'Restoration')
    ELSE FALSE
  END);
