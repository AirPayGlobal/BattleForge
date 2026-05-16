-- CreateEnum
CREATE TYPE "WeaponClass" AS ENUM ('BLADE', 'POLEARM', 'RANGED', 'FORGE_ARTIFACT', 'GAUNTLET');

-- CreateEnum
CREATE TYPE "WeaponRank" AS ENUM ('IRON_I', 'BRONZE_II', 'STEEL_III', 'OBSIDIAN_IV', 'VOID_V', 'INFERNO_VI', 'ETERNAL_VII');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('XP_PACK_PURCHASE', 'WEAPON_CRAFT', 'DUEL_WIN', 'DUEL_LOSS', 'QUEST_REWARD', 'DAILY_QUEST', 'REFERRAL', 'TOURNAMENT', 'FORGE_SHIELD', 'BATTLE_PASS', 'GAUNTLET_WIN', 'PRINT_ORDER', 'CHARACTER_COSMETIC_PURCHASE', 'NPC_BATTLE_WIN');

-- CreateEnum
CREATE TYPE "CosmeticType" AS ENUM ('SKIN', 'ACCESSORY', 'MOD');

-- CreateEnum
CREATE TYPE "NpcTier" AS ENUM ('BEGINNER', 'WARRIOR', 'ELITE');

-- CreateEnum
CREATE TYPE "NpcBattleResult" AS ENUM ('WIN', 'LOSS');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('XP', 'WEAPON_SKIN', 'TITLE', 'BADGE', 'XP_BOOST');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHALLENGE_RECEIVED', 'CHALLENGE_ACCEPTED', 'CHALLENGE_DECLINED', 'DUEL_WON', 'DUEL_LOST', 'WEAPON_WON', 'WEAPON_LOST', 'GAUNTLET_ISSUED', 'GAUNTLET_EARNED', 'QUEST_PROGRESS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PrintOrderStatus" AS ENUM ('QUEUED', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "win_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "character_id" TEXT,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" "WeaponClass" NOT NULL,
    "rank" "WeaponRank" NOT NULL,
    "xp_cost" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "is_staked" BOOLEAN NOT NULL DEFAULT false,
    "is_print_eligible" BOOLEAN NOT NULL DEFAULT false,
    "print_minted" BOOLEAN NOT NULL DEFAULT false,
    "mint_serial_number" TEXT,
    "minted_at" TIMESTAMP(3),
    "mint_xp_paid" INTEGER,
    "serial_number" TEXT NOT NULL,
    "forge_shield" BOOLEAN NOT NULL DEFAULT false,
    "forge_shield_exp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duels" (
    "id" TEXT NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "gauntlet_used" BOOLEAN NOT NULL DEFAULT false,
    "rounds" JSONB,
    "winner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "challenger_id" TEXT NOT NULL,
    "defender_id" TEXT NOT NULL,
    "challenger_weapon_id" TEXT NOT NULL,
    "defender_weapon_id" TEXT NOT NULL,

    CONSTRAINT "duels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gauntlet_quests" (
    "id" TEXT NOT NULL,
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "stage_data" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMP(3),
    "player_id" TEXT NOT NULL,

    CONSTRAINT "gauntlet_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "xp_amount" INTEGER NOT NULL,
    "usd_amount" DOUBLE PRECISION,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gauntlets" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "quest_earned" BOOLEAN NOT NULL DEFAULT false,
    "cooldown_until" TIMESTAMP(3),
    "temp_token" BOOLEAN NOT NULL DEFAULT false,
    "temp_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "gauntlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "quest_chain_name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_pass_tiers" (
    "id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "reward_type" "RewardType" NOT NULL,
    "reward_data" JSONB NOT NULL,
    "xp_required" INTEGER NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "season_id" TEXT NOT NULL,

    CONSTRAINT "battle_pass_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_passes" (
    "id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_tier" INTEGER NOT NULL DEFAULT 0,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "player_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,

    CONSTRAINT "battle_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entry_weapon_rank" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "prize_pool_data" JSONB,
    "bracket" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "placement" INTEGER,
    "player_id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_orders" (
    "id" TEXT NOT NULL,
    "status" "PrintOrderStatus" NOT NULL DEFAULT 'QUEUED',
    "fulfillment_ref" TEXT,
    "shipping_address" JSONB NOT NULL,
    "price_usd" DOUBLE PRECISION NOT NULL,
    "stripe_payment_id" TEXT,
    "tracking_link" TEXT,
    "mint_serial" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "player_id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,

    CONSTRAINT "print_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_run_limits" (
    "id" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "season_id" TEXT,
    "max_prints" INTEGER NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "print_run_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_waitlists" (
    "id" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "season_id" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "player_id" TEXT NOT NULL,

    CONSTRAINT "print_waitlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_cosmetics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CosmeticType" NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "xp_price" INTEGER,
    "usd_price" DOUBLE PRECISION,
    "character_id" TEXT,

    CONSTRAINT "character_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_cosmetics" (
    "id" TEXT NOT NULL,
    "equipped_slot" "CosmeticType",
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT NOT NULL,
    "cosmetic_id" TEXT NOT NULL,

    CONSTRAINT "player_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npcs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "NpcTier" NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "character_id" TEXT NOT NULL,

    CONSTRAINT "npcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_battles" (
    "id" TEXT NOT NULL,
    "result" "NpcBattleResult" NOT NULL,
    "xp_earned" INTEGER NOT NULL,
    "rounds" JSONB,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "player_id" TEXT NOT NULL,
    "npc_id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,

    CONSTRAINT "npc_battles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_username_key" ON "players"("username");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "weapons_mint_serial_number_key" ON "weapons"("mint_serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "weapons_serial_number_key" ON "weapons"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "gauntlet_quests_player_id_key" ON "gauntlet_quests"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "gauntlets_serial_number_key" ON "gauntlets"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "battle_passes_player_id_season_id_key" ON "battle_passes"("player_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_player_id_tournament_id_key" ON "tournament_entries"("player_id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "print_run_limits_rank_season_id_key" ON "print_run_limits"("rank", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "print_waitlists_player_id_rank_season_id_key" ON "print_waitlists"("player_id", "rank", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "player_cosmetics_player_id_cosmetic_id_key" ON "player_cosmetics"("player_id", "cosmetic_id");

-- CreateIndex
CREATE UNIQUE INDEX "npcs_name_key" ON "npcs"("name");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_defender_id_fkey" FOREIGN KEY ("defender_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_challenger_weapon_id_fkey" FOREIGN KEY ("challenger_weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_defender_weapon_id_fkey" FOREIGN KEY ("defender_weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gauntlet_quests" ADD CONSTRAINT "gauntlet_quests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gauntlets" ADD CONSTRAINT "gauntlets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pass_tiers" ADD CONSTRAINT "battle_pass_tiers_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_passes" ADD CONSTRAINT "battle_passes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_passes" ADD CONSTRAINT "battle_passes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_run_limits" ADD CONSTRAINT "print_run_limits_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_waitlists" ADD CONSTRAINT "print_waitlists_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_cosmetics" ADD CONSTRAINT "character_cosmetics_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_cosmetics" ADD CONSTRAINT "player_cosmetics_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_cosmetics" ADD CONSTRAINT "player_cosmetics_cosmetic_id_fkey" FOREIGN KEY ("cosmetic_id") REFERENCES "character_cosmetics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_battles" ADD CONSTRAINT "npc_battles_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_battles" ADD CONSTRAINT "npc_battles_npc_id_fkey" FOREIGN KEY ("npc_id") REFERENCES "npcs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_battles" ADD CONSTRAINT "npc_battles_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
