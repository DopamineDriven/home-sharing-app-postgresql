# home-sharing-app-postgresql

### to search all versions of a package (node for example)
```bash
npm view node versions --json
```

## Column Types for PostgreSQL
- int, int2, int4, int8, smallint, integer, bigint, decimal, numeric, real, float, float4, float8, double precision, money, character varying, varchar, character, char, text, citext, hstore, bytea, bit, varbit, bit varying, timetz, timestamptz, timestamp, timestamp without time zone, timestamp with time zone, date, time, time without time zone, time with time zone, interval, bool, boolean, enum, point, line, lseg, box, path, polygon, circle, cidr, inet, macaddr, tsvector, tsquery, uuid, xml, json, jsonb, int4range, int8range, numrange, tsrange, tstzrange, daterange, geometry, geography, cube
    - https://github.com/typeorm/typeorm/blob/master/docs/entities.md#column-types

## TypeORM Find options
- https://github.com/typeorm/typeorm/blob/master/docs/find-options.md

## TypeORM Order options
- https://github.com/typeorm/typeorm/blob/master/docs/find-options.md
- TypeORM's Find method
    - takes optional params for order, skip, and take
    - these work similarly to MongoDB's sort, skip, and limit params
- in ./server/src/graphql/resolvers/Listing/types.ts
```ts
export interface Order {
    price: 1 | "ASC" | "DESC" | -1 | undefined;
}
```
- in ./server/src/graphql/resolvers/Listing/index.ts
```ts
export const listingResolvers: IResolvers = {
    Query: {
    // ...
        listings: async (
            _root: undefined,
            { location, filter, limit, page }: ListingsArgs,
            { db }: { db: Database }
        ): Promise<ListingsData> => {
            try {
                const query: ListingsQuery = {};
                const data: ListingsData = {
                    region: null,
                    total: 0,
                    result: []
                };

                if (location) {
                    const { country, admin, city } = await Google.geocode(location);
                    if (city) query.city = city;
                    if (admin) query.admin = admin;
                    if (country) {
                        query.country = country;
                    } else {
                        throw new Error("no country found");
                    }

                    const cityText = city ? `${city}, ` : "";
                    const adminText = admin ? `${admin}, ` : "";
                    data.region = `${cityText}${adminText}${country}`; 
                }

                let order: Order | null = null;

                if (filter && filter === ListingsFilter.PRICE_LOW_TO_HIGH) {
                    order = { price: "ASC" || 1 };
                }

                if (filter && filter === ListingsFilter.PRICE_HIGH_TO_LOW) {
                    order = { price: "DESC" || -1 };
                }

                const count = await db.listings.count(query);
                const listings = await db.listings.find({
                    where: { ...query },
                    order: { ...order },
                    skip: page > 0 ? (page - 1) * limit : 0,
                    take: limit
                });

                data.total = count;
                data.result = listings;

                return data;
            } catch (error) {
                throw new Error(`failed to query listings: ${error}`);
            }
        }
    },
    // ...
};
```
- also utilized TypeORM Count method (above)
    - used to return the total number of listings that match the where query
    - used by react client to compute total number of pages for pagination

### Updating Listing.bookings resolver
- delete custom id method
- use TypeORM's findByIds() method
    - utilize option skip and take params to enable pagination
```ts
export const listingResolvers: IResolvers = {
    // ...
    Listing: {
        // ...
        bookings: async (
            listing: Listing,
            { limit, page }: ListingBookingsArgs,
            { db }: { db: Database }
        ): Promise<ListingBookingsData | null> => {
            try {
                if (!listing.authorized) {
                    return null;
                }

                const data: ListingBookingsData = {
                    total: 0,
                    result: []
                };

                const bookings = await db.bookings.findByIds(listing.bookings, {
                    skip: page > 0 ? (page-1) * limit : 0,
                    take: limit
                });

                data.total = listing.bookings.length;
                data.result = bookings;

                return data;

            } catch (error) {
                throw new Error(`failed to query listing bookings: ${error}`);
            }
        }
    }
};
```

## PostgreSQL's Multicolumn Indexes
- https://www.postgresql.org/docs/12/indexes-multicolumn.html
- Indexes support effecient execution of queries in a table
    - without indexes -> PostgreSQL must scan through every row of data to select records matching the query statement
    - with indexes -> PostgreSQL uses index to limit the number of records to check
- Multicolumn indexes are very similar to MongoDB's compound indexes
```sql
CREATE INDEX location_index ON public.listings (country, admin, city);
```
- the syntax above was executed in pgAdmin

### Booking a listing
- Note: genuine card info cannot be used in test mode
    - instead, use provided test card numbers, any valid future date, and any random CVC number to create a successful payment
    - https://stripe.com/docs/testing
    - for example
        - Number
            - 4242 4242 4242 4242
        - Brand
            - Visa
        - CVC
            - any 3 digits
        - Date
            - any future date
    - likewise
        - Number
            - 3782 822463 10005
        - Brand
            - American Express
        - CVC
            - any 4 digits
        - Date
            - any future date