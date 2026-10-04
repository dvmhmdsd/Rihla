CREATE TABLE "destinations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "destinations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"timezone" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_name_en_not_blank_check" CHECK (length(trim("destinations"."name_en")) > 0),
	CONSTRAINT "destinations_name_ar_not_blank_check" CHECK (length(trim("destinations"."name_ar")) > 0),
	CONSTRAINT "destinations_country_code_format_check" CHECK ("destinations"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tours_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"destination_id" bigint NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"description_en" text,
	"description_ar" text,
	"duration_minutes" integer NOT NULL,
	"price" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tours_title_en_not_blank_check" CHECK (length(trim("tours"."title_en")) > 0),
	CONSTRAINT "tours_title_ar_not_blank_check" CHECK (length(trim("tours"."title_ar")) > 0),
	CONSTRAINT "tours_duration_check" CHECK ("tours"."duration_minutes" > 0),
	CONSTRAINT "tours_price_check" CHECK ("tours"."price" >= 0),
	CONSTRAINT "tours_currency_format_check" CHECK ("tours"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;