import { Entity, BaseEntity, PrimaryColumn, Column } from "typeorm";

@Entity("users")
export class UserEntity extends BaseEntity {
	@PrimaryColumn("text")
	id: string | unknown;

	@Column("text")
	token: string | unknown;

	@Column("varchar", { length: 100 })
	name: string | unknown;

	@Column("text")
	avatar: string | unknown;

	@Column("text")
	contact: string | unknown;

	@Column("text", { nullable: true })
	walletId?: string | null;

    @Column("integer")
	income: number | unknown;

	@Column("simple-array")
    bookings: string[] | unknown;
    
    @Column("simple-array")
	listings: string[] | unknown;
}
