// Power Query (M) — FactMarketPrices
// Source : market_prices + market_listings. Prix uniquement avec devise, unité, date.
let
    Serveur = "localhost",
    Base = "growshield",
    Source = PostgreSql.Database(Serveur, Base),
    Prix = Source{[Schema="public", Item="market_prices"]}[Data],
    Listings = Source{[Schema="public", Item="market_listings"]}[Data],
    Joint = Table.NestedJoin(Prix, {"listing_id"}, Listings, {"id"}, "Listing", JoinKind.LeftOuter),
    Etendu = Table.ExpandTableColumn(Joint, "Listing", {"cultivar_id", "source_name", "listing_url"}, {"cultivar_id", "source_name", "listing_url"})
in
    Etendu
