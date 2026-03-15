ALTER TABLE "Assumption" ALTER COLUMN "dependsOn" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Assumption" ADD COLUMN "moduleKey" text;