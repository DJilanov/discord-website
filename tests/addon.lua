dofile("addon/ForeverGuard/Core.lua")
local Core = ForeverGuardCore
assert(Core.Key("EU", "Alice", "Test Realm") == "EU:alice:testrealm")
assert(Core.Key("", "Alice", "Realm") == nil)
assert(Core.Clean("|Hbad|h\nhello") == "Hbadh hello")
local index = Core.BuildIndex({ entries = {
  { id = "valid", region = "EU", character = "Alice", realm = "Realm", expiresAt = 200, severity = 3, summary = "Reviewed context" },
  { id = "expired", region = "EU", character = "Alice", realm = "Realm", expiresAt = 50, severity = 4, summary = "Expired" },
  { id = "bad", region = "EU", character = "Alice", realm = "Realm", expiresAt = 200, severity = 99, summary = "Invalid" },
} })
assert(#Core.Lookup(index, "EU", "Alice", "Realm", 100, 3) == 1)
assert(#Core.Lookup(index, "NA", "Alice", "Realm", 100, 3) == 0)
assert(#Core.Lookup(index, "EU", "Alice", "Other", 100, 3) == 0)
assert(#Core.Lookup(index, "EU", "Alice", "Realm", 100, 4) == 0)
assert(#Core.Lookup(index, "EU", "Alice", "Realm", 200, 1) == 0)
local character, realm = Core.ParseIdentity("Alice-Realm", "Other")
assert(character == "Alice" and realm == "Realm")
character, realm = Core.ParseIdentity("Alice", "Other")
assert(character == "Alice" and realm == "Other")
assert(Core.ParseIdentity("", "Realm") == nil)
assert(loadfile("addon/ForeverGuard/ForeverGuard.lua"))
assert(loadfile("addon/ForeverGuard/Data.lua"))
print("Addon core assertions and Lua syntax passed. In-game API behavior remains unverified.")
