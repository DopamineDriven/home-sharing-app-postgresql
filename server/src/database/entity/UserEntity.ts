import { Entity, BaseEntity, PrimaryColumn, Column } from "typeorm";

@Entity("users")
export class UserEntity extends BaseEntity {
	@PrimaryColumn("text")
	id!: string;

	@Column("text")
	token!: string;

	@Column("varchar", { length: 100 })
	name!: string;

	@Column("text")
	avatar!: string;

	@Column("text")
	contact!: string;

	@Column("text", { nullable: true })
	walletId?: string | null;

    @Column("integer")
	income!: number;

	@Column("simple-array")
    bookings!: string[];
    
    @Column("simple-array")
	listings!: string[];
}
