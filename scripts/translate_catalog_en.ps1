$servicesPath = "D:\Mythicprogression.com\data\seed_services.json"
$services = Get-Content -Raw -Encoding utf8 $servicesPath | ConvertFrom-Json

function Set-Bullets($obj, $list) {
    if ($obj.PSObject.Properties['bullets']) {
        $obj.bullets = $list
    } else {
        $obj | Add-Member -NotePropertyName "bullets" -NotePropertyValue $list
    }
}

foreach ($s in $services) {
    switch ($s.id) {
        "mplus-keystone" {
            $s.name = "Mythic+ Keystone Run (+2 to +15)"
            $s.description = "Complete Midnight Mythic+ dungeons on time with our elite pro team. Get loot up to 311 ilvl in end-of-dungeon chest and 318 ilvl (Mythic) in your Weekly Great Vault."
            $s.badge = "Season 2 Active"
            $s.category = "Mythic Plus"
            Set-Bullets $s @(
                "Dungeon completed on time guaranteed",
                "Loot traders of your armor type available",
                "End-of-dungeon loot + Weekly Great Vault reward"
            )
            if ($s.options) {
                if ($s.options.keyLevels) {
                    foreach ($k in $s.options.keyLevels) {
                        $k.track = ($k.track -replace "Campeón", "Champion" -replace "Héroe", "Hero" -replace "Mito", "Myth")
                        $k.crests = ($k.crests -replace "Campeón \(Champion\)", "Champion Crests" -replace "Héroe \(Hero\)", "Hero Crests" -replace "Mítico \(Myth\)", "Myth Crests")
                    }
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.tag -eq "Gratis") { $m.tag = "Free" }
                        if ($m.tag -eq "Incluido") { $m.tag = "Included" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (Pro player with VPN)" }
                    }
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Stream Privado") { $e.label = "Private Discord Stream" }
                    }
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("Up to 311 ilvl Loot", "318 ilvl Great Vault (Mythic)", "Mythic Crests & Portals")
                }
            }
        }

        "the-venomous-abyss" {
            $s.name = "The Venomous Abyss Raid"
            $s.description = "Defeat all 8 bosses of The Venomous Abyss in the Vaults of Atal'Utek including Ula'tek. Guaranteed 292-344 ilvl loot, Ahead of the Curve (AOTC) / Cutting Edge achievement and Season BiS rewards."
            $s.badge = "New Season 2 Raid"
            $s.category = "Raids"
            Set-Bullets $s @(
                "8/8 Bosses Defeated Cleanly",
                "Ahead of the Curve (AOTC) / Cutting Edge",
                "Guaranteed ilvl Loot & Tier Set Tokens"
            )
            if ($s.options) {
                if ($s.options.difficulties) {
                    foreach ($d in $s.options.difficulties) {
                        if ($d.name -match "Heroico \(8/8") { $d.name = "Heroic (8/8 - AOTC Ula'tek) - ilvl 305-315"; $d.tag = "Guaranteed AOTC"; $d.track = "Hero" }
                        elseif ($d.name -match "Solo Ula'tek") { $d.name = "Heroic Last Boss Only (Ula'tek AOTC)"; $d.tag = "Last Boss"; $d.track = "Hero" }
                        elseif ($d.name -match "Mítico \(Primeros") { $d.name = "Mythic (First 4 Bosses) - ilvl 318-324"; $d.tag = "Mythic Progression"; $d.track = "Myth" }
                        elseif ($d.name -match "Mítico Full Clear") { $d.name = "Mythic Full Clear (Cutting Edge Ula'tek) - ilvl 318-344"; $d.tag = "Cutting Edge"; $d.track = "Myth BiS" }
                        elseif ($d.name -match "Normal") { $d.name = "Normal (8/8) - ilvl 292-302"; $d.tag = "Full Clear"; $d.track = "Champion" }
                    }
                }
                if ($s.options.bosses) {
                    for ($i = 0; $i -lt $s.options.bosses.Count; $i++) {
                        if ($s.options.bosses[$i] -match "Ula'tek") { $s.options.bosses[$i] = "8. Ula'tek (Final Boss)" }
                    }
                }
                if ($s.options.lootTypes) {
                    $s.options.lootTypes[0].label = "Group Loot (Standard roll)"
                    $s.options.lootTypes[1].label = "Armor Priority (+2 Armor Traders)"
                    $s.options.lootTypes[2].label = "Full VIP Exclusive (All drops for your spec)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (Play with our guild)"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Garantía de AOTC") { $e.label = "Week 1 AOTC Guarantee" }
                        if ($e.label -match "Stream Privado") { $e.label = "Private Discord Stream (1080p 60fps)" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "Flexible Daily Schedules"
                    $s.options.estimates.execution = "1.5 - 2.5 Hours"
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("292 to 344 ilvl Loot", "Guaranteed Ula'tek AOTC", "Tier Set Tokens")
                }
            }
        }

        "delves-midnight" {
            $s.name = "Bountiful Delves (Tier 8 Gearing)"
            $s.description = "Complete Tier 8 Delves to unlock 298 ilvl loot in Bountiful Coffers and 311 ilvl (Hero) rewards in the Weekly Great Vault. The fastest and easiest way to gear up!"
            $s.badge = "Best Value & Fast Gear"
            $s.category = "Mythic Plus"
            Set-Bullets $s @(
                "Tier 8 Bountiful Runs",
                "298 ilvl Coffer + 311 ilvl Great Vault",
                "Fast completions in 10 min/run"
            )
            if ($s.options) {
                if ($s.options.tiers) {
                    foreach ($t in $s.options.tiers) {
                        if ($t.level -eq 8) { $t.name = "Tier 8 (Gear Sweet Spot)" }
                        if ($t.level -eq 11) { $t.name = "Tier 11 (Max Delve Difficulty)" }
                    }
                }
                if ($s.options.runsCount) {
                    foreach ($rc in $s.options.runsCount) {
                        if ($rc.runs -eq 1) { $rc.label = "1 Bountiful Run" }
                        if ($rc.runs -eq 4) { $rc.label = "4 Runs (Unlocks 2 Vault Slots)" }
                        if ($rc.runs -eq 8) { $rc.label = "8 Runs (Max 3 Vault Slots)" }
                    }
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (Play with our booster)"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (Secure VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Uso de Llave") { $e.label = "Use Restored Coffer Key" }
                        if ($e.label -match "Matar al Jefe") { $e.label = "Kill Nemesis Boss (Achievement & Mount)" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "10 min per Run"
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("298 ilvl Bountiful Coffer", "311 ilvl Great Vault", "Fast & Stress Free")
                }
            }
        }

        "ilvl-gearing" {
            $s.name = "Full ilvl Gearing Bundle"
            $s.description = "Equip your character with your desired average item level. We combine Mythic+, Tier 8 Delves, and Heroic Raid to ensure you reach your goal in record time."
            $s.badge = "ilvl Guarantee"
            $s.category = "Gearing / ilvl"
            Set-Bullets $s @(
                "Target ilvl Reached Guaranteed",
                "Full set of armor, weapons & trinkets",
                "Mythic+, Delves & Raid included"
            )
            if ($s.options) {
                if ($s.options.gearingTiers) {
                    foreach ($gt in $s.options.gearingTiers) {
                        $gt.target = ($gt.target -replace "Full BiS Endgame", "Full BiS Endgame" -replace "Heroic Raid Ready", "Heroic Raid Ready")
                    }
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Recommended" }
                        if ($m.label -match "Self-play") { $m.label = "Self-play (Play your runs)"; $m.tag = "+$25.00" }
                    }
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Optimización") { $e.label = "BiS Stat Optimization (Crafting)" }
                        if ($e.label -match "Abalorios") { $e.label = "2 BiS Season Trinkets" }
                        if ($e.label -match "Prioridad Express") { $e.label = "Express Priority (Starts in 15 min)" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "15-30 min"
                    $s.options.estimates.execution = "1-3 days (depending on tier)"
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("292 to 344 ilvl Guaranteed", "Delves T8 + M+ + Raid", "Optimized BiS Gear")
                }
            }
        }

        "powerleveling-80" {
            $s.name = "Custom WoW Powerleveling (1 - 80 / 90)"
            $s.description = "Level your character from any level to 80/90 in record time. Choose your current and desired level with our real-time interactive calculator. 100% manual and secure."
            $s.badge = "Customizable 1-90"
            $s.category = "Powerleveling"
            Set-Bullets $s @(
                "100% Hand-leveled, No bots or exploits",
                "Keep all gold, gear, and items",
                "VPN matched to your location"
            )
            if ($s.options) {
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("1-80/90 in Hours", "Piloted VPN or Self-Play", "Optional 292+ Gearing")
                }
            }
        }

        "forever-dungeon-bundle" {
            $s.name = "WoW Forever Dungeons & Bundle Boost"
            $s.description = "Complete any classic dungeon level 15-60 or brand new exclusive WoW Forever dungeons with our pro team. Guaranteed direct loot, fast XP leveling, and quest completion."
            $s.badge = "Official Launch"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "35 Dungeons (26 Classic + 9 Exclusive)",
                "Direct loot & XP quests completed",
                "PvE, PvP and RP realms supported"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play \(Juegas") { $m.label = "Self-play (Play in group)"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                        if ($m.label -match "Remote") { $m.label = "Self-play Remote (Remote Access)"; $m.tag = "+30%" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (Start in 15-30 min)"
                    $s.options.speeds[1].label = "Express (High Priority - Start in 10 min)"
                    $s.options.speeds[2].label = "Super Express (Instant VIP Start)"
                }
                if ($s.options.classicDungeons) {
                    foreach ($cd in $s.options.classicDungeons) {
                        $cd.name = ($cd.name -replace "\s*\([^\)]*\)", "").Trim()
                    }
                }
                if ($s.options.foreverExclusiveDungeons) {
                    foreach ($fd in $s.options.foreverExclusiveDungeons) {
                        $fd.name = ($fd.name -replace "\s*\([^\)]*\)", "").Trim()
                        if ($fd.tag -match "Exclusiva") { $fd.tag = "Exclusive Forever" }
                    }
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "misiones") { $e.label = "Complete all dungeon quests (+XP)" }
                        if ($e.label -match "Prioridad de Botín") { $e.label = "Loot Priority / Reserve (All viable drops)" }
                        if ($e.label -match "Transmisión") { $e.label = "Private Live Discord Stream (1080p)" }
                    }
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("All Classic & Brand New Dungeons", "BiS Loot & XP Quests", "PvE, PvP or RP Rulesets")
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "20-40 min per dungeon"
                }
            }
        }

        "forever-shapers-terrace" {
            $s.name = "The Shapers Terrace (Level 58-60 Forever Dungeon)"
            $s.description = "The pinnacle 5-player dungeon in WoW Forever. Defeat titanic keepers in The Shapers Terrace and secure the best pre-raid level 60 gear and raid attunement keys."
            $s.badge = "End-Game BiS Pre-Raid"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "New Endgame Dungeon Lv 58-60",
                "Guaranteed Pre-Raid BiS Gear",
                "Raid keys and attunements included"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play \(Juegas") { $m.label = "Self-play (Play with our team)"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                        if ($m.label -match "Remote") { $m.label = "Self-play Remote (Secure Remote Access)"; $m.tag = "+30%" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (Start 15-30 min)"
                    $s.options.speeds[1].label = "Express (High Priority)"
                    $s.options.speeds[2].label = "Super Express (Instant Start)"
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Loot Priority") { $e.label = "Loot Priority (All viable drops for your class)" }
                        if ($e.label -match "Questline") { $e.label = "Complete Raid Attunement Questline" }
                        if ($e.label -match "Transmisión") { $e.label = "Private Discord Stream" }
                    }
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("Level 58-60 Endgame", "Pre-Raid BiS Gear", "Titanic Secrets")
                }
            }
        }

        "forever-legacy-challenges" {
            $s.name = "Dungeon Legacy Challenges (Forever Legacy Points)"
            $s.description = "Conquer timed dungeon trials with affixes in WoW Forever. Earn up to 3 Legacy Points, unique cosmetics, prestige titles, and exclusive mounts."
            $s.badge = "Prestige Challenges"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "Up to 3 Legacy Points",
                "Prestige titles & cosmetics",
                "100% Ban-free guarantee"
            )
            if ($s.options) {
                if ($s.options.challengeTiers) {
                    $s.options.challengeTiers[0].name = "Experienced Spelunker (1 Legacy Point)"
                    $s.options.challengeTiers[0].tag = "1 Point"
                    $s.options.challengeTiers[1].name = "Silver Challenge Bundle (2 Legacy Points)"
                    $s.options.challengeTiers[1].tag = "2 Points"
                    $s.options.challengeTiers[2].name = "Gold Master Challenge (3 Legacy Points + Title)"
                    $s.options.challengeTiers[2].tag = "3 Points BiS"
                }
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                        if ($m.label -match "Self-play \(Juegas") { $m.label = "Self-play (Play with the team)"; $m.tag = "+$19.99" }
                        if ($m.label -match "Remote") { $m.label = "Self-play Remote (Remote Access)"; $m.tag = "+30%" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (Start in 15-30 min)"
                    $s.options.speeds[1].label = "Express (High Priority)"
                    $s.options.speeds[2].label = "Super Express (Instant Start)"
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("Up to 3 Legacy Points", "Titles & Cosmetics", "100% Risk Free")
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "15-30 min"
                    $s.options.estimates.execution = "1-2 Hours"
                }
            }
        }

        "forever-leveling-mount-bundle" {
            $s.name = "1-60 Leveling + 100% Mount Bundle (WoW Forever)"
            $s.description = "The ultimate 1-60 leveling pack for WoW Forever. Level your character to max level manually with 100% Riding Skill, fast mount, gold for spells, and secondary professions included."
            $s.badge = "Full Pack - 15% OFF"
            $s.category = "WoW Forever Powerleveling"
            Set-Bullets $s @(
                "Level 1 to 60 100% Hand-done",
                "100% Riding Skill + Mount",
                "Gold for spells & skills included"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                        if ($m.label -match "Remote") { $m.label = "Self-play Remote (Remote Access)"; $m.tag = "+30%" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (4-6 days)"
                    $s.options.speeds[1].label = "Express (3-4 days)"
                    $s.options.speeds[2].label = "Super Express (2-3 days non-stop)"
                }
                if ($s.options.extras) {
                    foreach ($e in $s.options.extras) {
                        if ($e.label -match "Montura Rápida") { $e.label = "Fast Mount 100% Speed + Riding Skill"; $e.tag = "Free Included" }
                        if ($e.label -match "Primeros Auxilios") { $e.label = "First Aid 300" }
                        if ($e.label -match "Cocina y Pesca") { $e.label = "Cooking & Fishing 300" }
                        if ($e.label -match "Pack 500G") { $e.label = "500G Starter Gold Pack for Skills" }
                    }
                }
                if ($s.options.heroBadges) {
                    $s.options.heroBadges = @("Manual Level 1 to 60", "100% Fast Mount", "Raid Ready")
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-20 min"
                    $s.options.estimates.execution = "3-5 Days"
                }
            }
        }

        "forever-leveling-starter" {
            $s.name = "Beta Ultimate Starter Bundle (1-30 Leveling + BiS)"
            $s.description = "Fast-track starter pack for WoW Forever. Level from 1 to 30 with blue BiS leveling gear, four 14-slot bags, and gold for all class skills."
            $s.badge = "Popular Pack"
            $s.category = "WoW Forever Powerleveling"
            Set-Bullets $s @(
                "Level 1 to 30 Hand-leveling",
                "BiS Starter Gear + 4 Bags",
                "Gold for Spells & Skills included"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                        if ($m.label -match "Remote") { $m.label = "Self-play Remote (Remote Access)"; $m.tag = "+30%" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (2-3 days)"
                    $s.options.speeds[1].label = "Express (24-48 hours)"
                    $s.options.speeds[2].label = "Super Express (Non-stop VIP)"
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "15-30 min"
                    $s.options.estimates.execution = "2-3 Days"
                }
            }
        }

        "forever-leveling-hero" {
            $s.name = "Hero Bundle (1-60 + Riding 100% + Professions + BiS Gear)"
            $s.description = "The most complete package for WoW Forever. Level 60, 100% Riding Skill, two primary professions maxed at 300, and full pre-raid set ready for immediate raiding."
            $s.badge = "All-In-One"
            $s.category = "WoW Forever Powerleveling"
            Set-Bullets $s @(
                "Level 1 to 60 Guaranteed 100% Hand-done",
                "100% Riding Skill + Mount",
                "2 Professions 300 + Pre-Raid BiS Set"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (4-5 days)"
                    $s.options.speeds[1].label = "Express (3 days)"
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "15-30 min"
                    $s.options.estimates.execution = "3-5 Days"
                }
            }
        }

        "forever-gearing-preraid" {
            $s.name = "Full Pre-Raid BiS Gear Lv 60 (Complete Set)"
            $s.description = "Get the best level 60 pre-raid gear slot by slot: blue and epic armor, weapons, trinkets, and rings fully optimized for your specialization."
            $s.badge = "Full BiS Gear"
            $s.category = "WoW Forever Gearing"
            Set-Bullets $s @(
                "Full Level 60 Pre-Raid Gear",
                "BiS Dungeon Weapons & Trinkets",
                "Ready for Onyxia and Molten Core"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (Play in group)"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN Protection)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.speeds) {
                    $s.options.speeds[0].label = "Normal Speed (3-5 days)"
                    $s.options.speeds[1].label = "Express (2-3 days)"
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "1-2 hours"
                    $s.options.estimates.execution = "3-5 Days"
                }
            }
        }

        "forever-raid-onyxia" {
            $s.name = "Onyxia's Lair Clear & Head of Onyxia"
            $s.description = "Defeat Onyxia in her lair in WoW Forever. Claim the Head of Onyxia for your faction's world buff and Tier 2 helm and weapon drops."
            $s.badge = "40-Player Raid"
            $s.category = "WoW Forever Raids"
            Set-Bullets $s @(
                "Full Onyxia Defeat",
                "Head of Onyxia (World Buff)",
                "Tier 2 Helm & Epic Weapons"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (You play)"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (Secure VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "Raid Schedule"
                    $s.options.estimates.execution = "1-2 Hours"
                }
            }
        }

        "forever-raid-attunements" {
            $s.name = "Raid Attunement Questlines (Onyxia + Molten Core)"
            $s.description = "Complete all long and complex raid attunement questlines for WoW Forever: Drakkisath's Amulet (Onyxia) and Attunement to the Core."
            $s.badge = "Attunement"
            $s.category = "WoW Forever Raids"
            Set-Bullets $s @(
                "Guaranteed Onyxia Access",
                "Molten Core Attunement",
                "Complete Quest Chains"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "30-60 min"
                    $s.options.estimates.execution = "3-6 Hours"
                }
            }
        }

        "forever-prof-primary" {
            $s.name = "Primary Profession 1 to 300 Max Level"
            $s.description = "Level any primary profession (Blacksmithing, Mining, Herbalism, Alchemy, Tailoring, Skinning, Leatherworking, Engineering, or Enchanting) from 1 to 300."
            $s.badge = "1-300 Fast"
            $s.category = "WoW Forever Professions"
            Set-Bullets $s @(
                "Level 1 to 300 Max Level",
                "All Materials Included",
                "Trainer Recipes Learned"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (Secure VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "1-2 hours"
                    $s.options.estimates.execution = "24-48 Hours"
                }
            }
        }

        "forever-gold-pack" {
            $s.name = "WoW Forever Gold Packages (Fast Delivery)"
            $s.description = "Clean, safe gold for WoW Forever. Delivered in 15-30 minutes via in-game mail or face-to-face trade on PvE, PvP, or RP realms."
            $s.badge = "100% Safe"
            $s.category = "WoW Forever Gold"
            Set-Bullets $s @(
                "Fast Delivery in 15-30 min",
                "100% Hand-farmed & Safe",
                "Official PvE, PvP and RP Realms"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "15-30 min"
                }
            }
        }

        "forever-pvp-rank" {
            $s.name = "Honor Rank Boost (Rank 1 to 14 - PvP Forever)"
            $s.description = "Climb the military honor ranks in WoW Forever (from Private/Scout to Grand Marshal/High Warlord). Weekly honor farming and PvP gear unlocks."
            $s.badge = "Honor & Rank"
            $s.category = "WoW Forever PvP"
            Set-Bullets $s @(
                "Weekly Honor Farming",
                "Military Ranks 1 to 14",
                "PvP Weapons & Armor Unlocked"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvP (PvP Realm)"
                    $s.options.rulesets[1].name = "PvE (Normal Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (In premade group)"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "2-4 hours"
                    $s.options.estimates.execution = "1-2 Weeks"
                }
            }
        }

        "forever-rep-classic" {
            $s.name = "Classic Reputations Exalted (Argent Dawn, Thorium...)"
            $s.description = "Achieve Exalted reputation with key WoW Forever factions: Argent Dawn, Thorium Brotherhood, Timbermaw Hold, and Classic+ factions."
            $s.badge = "Exalted"
            $s.category = "WoW Forever Reputations"
            Set-Bullets $s @(
                "Guaranteed Exalted Reputation",
                "Rare Patterns & Recipes",
                "Access to Unique Enchants"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Included" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "2-4 hours"
                    $s.options.estimates.execution = "2-4 Days"
                }
            }
        }

        "forever-mount-epic" {
            $s.name = "Epic Mount 100% Speed + Riding Skill Boost"
            $s.description = "Get your fast 100% epic mount with level 60 Riding Skill included and all mount purchase gold covered."
            $s.badge = "100% Speed"
            $s.category = "WoW Forever Mounts"
            Set-Bullets $s @(
                "100% Riding Skill",
                "Faction Epic Mount",
                "Gold for Purchase Included"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Piloted") { $m.label = "Piloted (Secure VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "30-60 min"
                    $s.options.estimates.execution = "12-24 Hours"
                }
            }
        }

        "forever-dungeon-rfc" {
            $s.name = "Ragefire Chasm Dungeon Run"
            $s.description = "Fast Ragefire Chasm clear (Level 13-18) with all quests and guaranteed dungeon loot."
            $s.badge = "Lv 13-18"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "Guaranteed Full Clear",
                "All XP Quests Completed",
                "All Loot for Your Character"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                    $s.options.rulesets[2].name = "RP (Roleplay Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play (Play in group)"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "20-30 min"
                }
            }
        }

        "forever-dungeon-deadmines" {
            $s.name = "Deadmines Dungeon Run"
            $s.description = "Full Deadmines clear (Level 17-26). Defeat Edwin VanCleef, finish all quests, and claim guaranteed rare loot."
            $s.badge = "Lv 17-26"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "Full Clear + VanCleef",
                "Dungeon Quests + XP",
                "Guaranteed Rare Loot"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "25-35 min"
                }
            }
        }

        "forever-dungeon-wc" {
            $s.name = "Wailing Caverns Dungeon Run"
            $s.description = "Complete Wailing Caverns clear (Level 17-24). All Fang leaders and Mutanus the Devourer defeated."
            $s.badge = "Lv 17-24"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "All Bosses & Mutanus",
                "Embrace of the Viper Quests",
                "Direct Loot to Your Bags"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "30-40 min"
                }
            }
        }

        "forever-dungeon-sfk" {
            $s.name = "Shadowfang Keep Dungeon Run"
            $s.description = "Full run in Shadowfang Keep (Level 22-30). Defeat Archmage Arugal and obtain high-value rare weapons and armor."
            $s.badge = "Lv 22-30"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "Defeat Archmage Arugal",
                "Quests and Rare Loot",
                "Iconic Classic Gear"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "25-35 min"
                }
            }
        }

        "forever-dungeon-bfd" {
            $s.name = "Blackfathom Deeps Dungeon Run"
            $s.description = "Full Blackfathom Deeps clear (Level 24-32). Defeat Aku'mai and all Twilight leaders."
            $s.badge = "Lv 24-32"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "Defeat Aku'mai",
                "Faction Quests Completed",
                "Fast Loot & XP"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Free" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "30-40 min"
                }
            }
        }

        "forever-dungeon-thanes" {
            $s.name = "Hall of Thanes (Exclusive Forever Dungeon)"
            $s.description = "One of the 9 brand new exclusive dungeons in WoW Forever (Level 20-28). Explore the Hall of Thanes and its titanic lore."
            $s.badge = "Forever Exclusive"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "New Exclusive Forever Dungeon",
                "Level 20-28 • Unseen Lore",
                "Brand New Loot & Rare Weapons"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "25-35 min"
                }
            }
        }

        "forever-dungeon-dalaran" {
            $s.name = "City of Dalaran (Exclusive Forever Dungeon)"
            $s.description = "Brand new exclusive dungeon in WoW Forever (Level 40-48). Delve into the magical ruins of classic Dalaran under arcane siege."
            $s.badge = "Forever Exclusive"
            $s.category = "WoW Forever Dungeons"
            Set-Bullets $s @(
                "New Exclusive Forever Dungeon",
                "Level 40-48 • Arcane Bosses",
                "High-Level Pre-Endgame Loot"
            )
            if ($s.options) {
                if ($s.options.rulesets) {
                    $s.options.rulesets[0].name = "PvE (Normal Realm)"
                    $s.options.rulesets[1].name = "PvP (PvP Realm)"
                }
                if ($s.options.completionMethods) {
                    foreach ($m in $s.options.completionMethods) {
                        if ($m.label -match "Self-play") { $m.label = "Self-play"; $m.tag = "Recommended" }
                        if ($m.label -match "Piloted") { $m.label = "Piloted (VPN)"; $m.tag = "Included" }
                    }
                }
                if ($s.options.estimates) {
                    $s.options.estimates.start = "10-15 min"
                    $s.options.estimates.execution = "35-45 min"
                }
            }
        }
    }
}

$updatedJson = $services | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($servicesPath, $updatedJson, [System.Text.Encoding]::UTF8)
Write-Host "Services successfully updated to 100% English!"

