-- CreateTable
CREATE TABLE IF NOT EXISTS "QueuedMessage" (
    "id" TEXT NOT NULL,
    "instanceName" VARCHAR(255) NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "messageType" VARCHAR(50) NOT NULL,
    "messagePayload" JSONB NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "instanceId" VARCHAR(100) NOT NULL,
    CONSTRAINT "QueuedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueuedMessage_instanceId_idx" ON "QueuedMessage"("instanceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueuedMessage_instanceName_idx" ON "QueuedMessage"("instanceName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueuedMessage_queuedAt_idx" ON "QueuedMessage"("queuedAt");

-- AddForeignKey (only if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'QueuedMessage_instanceId_fkey'
    ) THEN
        ALTER TABLE "QueuedMessage" ADD CONSTRAINT "QueuedMessage_instanceId_fkey" 
        FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
