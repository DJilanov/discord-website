ForeverGuardCore = {}
local Core = ForeverGuardCore

function Core.Clean(value)
  if type(value) ~= "string" then return "" end
  return value:gsub("|", ""):gsub("[%c]", " "):sub(1, 500)
end

function Core.Key(region, character, realm)
  if type(region) ~= "string" or type(character) ~= "string" or type(realm) ~= "string" then return nil end
  if region == "" or character == "" or realm == "" then return nil end
  return region:upper() .. ":" .. character:lower() .. ":" .. realm:lower():gsub("%s", "")
end

function Core.BuildIndex(data)
  local index = {}
  if type(data) ~= "table" or type(data.entries) ~= "table" then return index end
  for _, entry in ipairs(data.entries) do
    if type(entry) == "table" and type(entry.id) == "string" and type(entry.expiresAt) == "number"
      and type(entry.severity) == "number" and entry.severity >= 1 and entry.severity <= 4
      and type(entry.summary) == "string" then
      local key = Core.Key(entry.region, entry.character, entry.realm)
      if key then
        index[key] = index[key] or {}
        table.insert(index[key], entry)
      end
    end
  end
  return index
end

function Core.Lookup(index, region, character, realm, now, threshold)
  local results = {}
  local key = Core.Key(region, character, realm)
  if not key then return results end
  for _, entry in ipairs(index[key] or {}) do
    if entry.expiresAt > now and entry.severity >= threshold then table.insert(results, entry) end
  end
  return results
end

function Core.ParseIdentity(value, defaultRealm)
  if type(value) ~= "string" then return nil end
  local character, realm = value:match("^([^%-]+)%-(.+)$")
  if not character then character, realm = value, defaultRealm end
  if not character or character == "" or not realm or realm == "" then return nil end
  return character, realm
end
