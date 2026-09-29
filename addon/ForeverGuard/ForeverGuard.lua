local Core = ForeverGuardCore
local index = Core.BuildIndex(ForeverGuardData)
local frame = CreateFrame("Frame")
local lastWarnings = {}
local initialized = false
local scanPending = false

local function Print(message)
  DEFAULT_CHAT_FRAME:AddMessage("|cffdfbf73ForeverGuard:|r " .. message)
end

local function Region()
  if ForeverGuardDB and ForeverGuardDB.region then return ForeverGuardDB.region end
  local current = GetCurrentRegion and GetCurrentRegion() or 0
  return current == 3 and "EU" or current == 1 and "NA" or "UNKNOWN"
end

local function Identity(unit)
  local character, realm = UnitFullName(unit)
  if not character then return nil end
  if not realm or realm == "" then realm = GetRealmName() end
  return character, realm
end

local function ShowCharacter(character, realm, quiet)
  if not initialized then return end
  local key = Core.Key(Region(), character, realm)
  if not key then return end
  local note = ForeverGuardDB.notes[key]
  if note then Print(Core.Clean(character .. "-" .. realm) .. " - your note: " .. Core.Clean(note)) end
  local alerts = ForeverGuardDB.enabled and Core.Lookup(index, Region(), character, realm, GetServerTime(), ForeverGuardDB.threshold) or {}
  for _, alert in ipairs(alerts) do
    Print(Core.Clean(character .. "-" .. realm) .. " - reviewed community alert " .. Core.Clean(alert.id) .. " (level " .. alert.severity .. "): " .. Core.Clean(alert.summary))
    Print("Last reviewed: " .. Core.Clean(alert.lastReviewedAt) .. ". Check current context and appeals on wowforeverdiscord.online.")
  end
  if not quiet and #alerts == 0 then Print("No current matching alert in your local data. This is not a guarantee of conduct.") end
end

local function Scan(manual)
  if not initialized then return end
  local count = IsInRaid() and GetNumGroupMembers() or GetNumSubgroupMembers()
  for i = 1, count do
    local unit = (IsInRaid() and "raid" or "party") .. i
    local character, realm = Identity(unit)
    if character then
      local key = Core.Key(Region(), character, realm)
      if manual or not lastWarnings[key] or GetTime() - lastWarnings[key] > 300 then
        ShowCharacter(character, realm, true)
        lastWarnings[key] = GetTime()
      end
    end
  end
  if manual then Print("Group scan complete. Data version: " .. Core.Clean(ForeverGuardData.version) .. ". Region: " .. Region()) end
end

local exportFrame
local function ShowReportTemplate()
  local character, realm = Identity("target")
  if not exportFrame then
    exportFrame = CreateFrame("Frame", "ForeverGuardReportFrame", UIParent, "BasicFrameTemplateWithInset")
    exportFrame:SetSize(440, 310)
    exportFrame:SetPoint("CENTER")
    exportFrame:SetMovable(true)
    exportFrame:EnableMouse(true)
    exportFrame:RegisterForDrag("LeftButton")
    exportFrame:SetScript("OnDragStart", exportFrame.StartMoving)
    exportFrame:SetScript("OnDragStop", exportFrame.StopMovingOrSizing)
    exportFrame.TitleText:SetText("ForeverGuard - private report template")
    local edit = CreateFrame("EditBox", nil, exportFrame)
    edit:SetMultiLine(true)
    edit:SetFontObject(ChatFontNormal)
    edit:SetSize(390, 240)
    edit:SetPoint("TOPLEFT", 20, -45)
    edit:SetAutoFocus(false)
    edit:SetMaxLetters(3000)
    edit:SetScript("OnEscapePressed", function() exportFrame:Hide() end)
    exportFrame.edit = edit
  end
  exportFrame.edit:SetText("Private report: https://www.wowforeverdiscord.online/reports/new\nCharacter: " .. Core.Clean(character or "") .. "\nRealm: " .. Core.Clean(realm or GetRealmName()) .. "\nRegion: " .. Region() .. "\nTime: " .. date("%Y-%m-%d %H:%M") .. " (local)\nWhat happened:\nAgreed rules:\nEvidence:\n\nDo not post accusations in public chat.")
  exportFrame:Show()
  exportFrame.edit:SetFocus()
  exportFrame.edit:HighlightText()
end

local function Command(message)
  if not initialized then return end
  local command, rest = (message or ""):match("^(%S*)%s*(.-)%s*$")
  command = command:lower()
  if command == "check" then
    local character, realm = Core.ParseIdentity(rest, GetRealmName())
    if not character then Print("Use /fg check Character-Realm"); return end
    ShowCharacter(character, realm, false)
  elseif command == "note" then
    local target, note = rest:match("^(%S+)%s+(.+)$")
    local character, realm = Core.ParseIdentity(target, GetRealmName())
    if not character or not note then Print("Use /fg note Character-Realm Your private note"); return end
    ForeverGuardDB.notes[Core.Key(Region(), character, realm)] = Core.Clean(note)
    Print("Private note saved locally.")
  elseif command == "forget" then
    local character, realm = Core.ParseIdentity(rest, GetRealmName())
    if not character then Print("Use /fg forget Character-Realm"); return end
    ForeverGuardDB.notes[Core.Key(Region(), character, realm)] = nil
    Print("Private note removed.")
  elseif command == "scan" then Scan(true)
  elseif command == "report" then ShowReportTemplate()
  elseif command == "region" then
    local region = rest:upper()
    if region ~= "EU" and region ~= "NA" and region ~= "OCE" then Print("Use /fg region EU, NA, or OCE"); return end
    ForeverGuardDB.region = region; Print("Region set to " .. region)
  elseif command == "threshold" then
    local level = tonumber(rest)
    if not level or level < 1 or level > 4 or level ~= math.floor(level) then Print("Use /fg threshold 1, 2, 3, or 4"); return end
    ForeverGuardDB.threshold = level; Print("Minimum alert level set to " .. level)
  elseif command == "alerts" then
    if rest ~= "on" and rest ~= "off" then Print("Use /fg alerts on or /fg alerts off"); return end
    ForeverGuardDB.enabled = rest == "on"; Print("Community alerts " .. rest .. ". Private notes are unchanged.")
  elseif command == "version" then
    Print("Alpha 0.1.0. Data: " .. Core.Clean(ForeverGuardData.version) .. " generated " .. Core.Clean(ForeverGuardData.generatedAt) .. ". Region: " .. Region())
  else
    Print("/fg check Name-Realm; /fg note Name-Realm text; /fg forget Name-Realm; /fg scan; /fg report")
    Print("/fg region EU|NA|OCE; /fg threshold 1-4; /fg alerts on|off; /fg version")
    Print("Update Data.lua from wowforeverdiscord.online/addons/foreverguard and reload. No live internet access.")
  end
end

frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("GROUP_ROSTER_UPDATE")
frame:SetScript("OnEvent", function(_, event, name)
  if event == "ADDON_LOADED" and name == "ForeverGuard" then
    ForeverGuardDB = type(ForeverGuardDB) == "table" and ForeverGuardDB or {}
    ForeverGuardDB.notes = type(ForeverGuardDB.notes) == "table" and ForeverGuardDB.notes or {}
    ForeverGuardDB.threshold = math.max(1, math.min(4, math.floor(tonumber(ForeverGuardDB.threshold) or 3)))
    if ForeverGuardDB.enabled == nil then ForeverGuardDB.enabled = true end
    initialized = true
    SLASH_FOREVERGUARD1 = "/fg"
    SLASH_FOREVERGUARD2 = "/foreverguard"
    SlashCmdList.FOREVERGUARD = Command
    if GameTooltip and GameTooltip.HasScript and GameTooltip:HasScript("OnTooltipSetUnit") then
      GameTooltip:HookScript("OnTooltipSetUnit", function(tooltip)
        local _, unit = tooltip:GetUnit()
        if not unit then return end
        local character, realm = Identity(unit)
        if not character then return end
        local note = ForeverGuardDB.notes[Core.Key(Region(), character, realm)]
        if note then tooltip:AddLine("Your note: " .. Core.Clean(note), 0.85, 0.8, 0.6, true) end
        if ForeverGuardDB.enabled then
          local alerts = Core.Lookup(index, Region(), character, realm, GetServerTime(), ForeverGuardDB.threshold)
          for _, alert in ipairs(alerts) do tooltip:AddLine("Community alert " .. Core.Clean(alert.id) .. " - " .. Core.Clean(alert.category) .. " (" .. alert.severity .. ")", 0.95, 0.7, 0.5, true) end
        end
      end)
    end
    Print("Alpha loaded. Local notes and reviewed context only. /fg for commands.")
  elseif event == "GROUP_ROSTER_UPDATE" and initialized and not scanPending then
    scanPending = true
    C_Timer.After(1, function() scanPending = false; Scan(false) end)
  end
end)
