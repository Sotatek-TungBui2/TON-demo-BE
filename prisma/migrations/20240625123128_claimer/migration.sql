-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "merkleProof" TEXT NOT NULL,
    "treeIndex" INTEGER NOT NULL DEFAULT 0,
    "claimMaster" TEXT NOT NULL,
    "teleid" BIGINT NOT NULL,
    "isClaimed" INTEGER NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_teleid_fkey" FOREIGN KEY ("teleid") REFERENCES "tg_users"("userid") ON DELETE RESTRICT ON UPDATE CASCADE;
