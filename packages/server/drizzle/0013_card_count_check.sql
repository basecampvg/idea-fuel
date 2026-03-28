ALTER TABLE "User" ADD CONSTRAINT "User_mobile_card_count_check" CHECK (mobile_card_count >= 0);
