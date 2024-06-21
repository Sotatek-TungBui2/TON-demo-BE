-- CreateTable
CREATE TABLE "earnings" (
    "id" SERIAL NOT NULL,
    "teleid" BIGINT NOT NULL,
    "tap_points" BIGINT NOT NULL DEFAULT 0,
    "ref_points" BIGINT NOT NULL DEFAULT 0,
    "checkin_points" BIGINT NOT NULL DEFAULT 0,
    "task" TEXT,
    "task_points" BIGINT NOT NULL DEFAULT 0,
    "game_deducted_points" BIGINT NOT NULL DEFAULT 0,
    "game_played_time" BIGINT NOT NULL DEFAULT 0,
    "game_level" TEXT,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "restore_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remaining_energy" INTEGER NOT NULL DEFAULT 2000,
    "recent_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "miner_level" INTEGER NOT NULL DEFAULT 0,
    "last_mine_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tg_users" (
    "id" SERIAL NOT NULL,
    "userid" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "language_code" TEXT,
    "referral_code" TEXT,
    "referral_by" TEXT,
    "ref_claim" TEXT NOT NULL DEFAULT 'N',
    "tg_premium_user" TEXT NOT NULL DEFAULT 'N',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tg_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "earnings_teleid_idx" ON "earnings"("teleid");

-- CreateIndex
CREATE UNIQUE INDEX "tg_users_userid_key" ON "tg_users"("userid");

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_teleid_fkey" FOREIGN KEY ("teleid") REFERENCES "tg_users"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;
