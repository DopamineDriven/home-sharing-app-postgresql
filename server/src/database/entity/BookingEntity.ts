import { Entity, BaseEntity, PrimaryColumn, Column } from "typeorm";

@Entity("bookings")
export class BookingEntity extends BaseEntity {
    @PrimaryColumn("text")
    id: string | unknown;

    @Column("text")
    listing: string | unknown;

    @Column("text")
    tenant: string | unknown;

    @Column("text")
    checkIn: string | unknown;

    @Column("text")
    checkOut: string | unknown;
}

/* eslint-disable @typescript-eslint/explicit-member-accessibility */