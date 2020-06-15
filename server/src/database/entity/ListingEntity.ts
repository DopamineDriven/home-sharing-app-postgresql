import { Entity, BaseEntity, PrimaryColumn, Column } from "typeorm";
import { BookingsIndex, ListingType } from "../../lib/types";

@Entity("listings")
export class ListingEntity extends BaseEntity {
	@PrimaryColumn("text")
	id: string | unknown;

	@Column("varchar", { length: 100 })
	title: string | unknown;

	@Column("varchar", { length: 5000 })
	description: string | unknown;

	@Column("text")
	image: string | unknown;

	@Column("text")
	host: string | unknown;

	@Column({ type: "enum", enum: ListingType })
	type: ListingType | unknown;

	@Column("text")
	address: string | unknown;

	@Column("text")
	country: string | unknown;

	@Column("text")
	admin: string | unknown;

	@Column("text")
	city: string | unknown;

	@Column("simple-array")
	bookings: string[] | unknown;

	@Column("simple-json")
	bookingsIndex: BookingsIndex | unknown;

	@Column("integer")
	price: number | unknown;

	@Column("integer")
	numOfGuests: number | unknown;
}
