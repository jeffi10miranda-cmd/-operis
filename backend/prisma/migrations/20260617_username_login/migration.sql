-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Update existing rows to have a unique username based on their email prefix + short id
UPDATE "users" SET "username" = split_part("email", '@', 1) || '_' || left("id", 4);

-- Make username NOT NULL
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AlterTable (Make email optional)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
