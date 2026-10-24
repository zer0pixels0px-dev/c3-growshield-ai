// Power Query (M) — FactGrowCycles
// Source : grow_cycles + harvests (poids sec quand mesuré, NULL sinon).
let
    Serveur = "localhost",
    Base = "growshield",
    Source = PostgreSql.Database(Serveur, Base),
    Cycles = Source{[Schema="public", Item="grow_cycles"]}[Data],
    Recoltes = Source{[Schema="public", Item="harvests"]}[Data],
    Joint = Table.NestedJoin(Cycles, {"id"}, Recoltes, {"cycle_id"}, "Recoltes", JoinKind.LeftOuter),
    Etendu = Table.ExpandTableColumn(Joint, "Recoltes", {"dry_weight_g", "harvested_at"}, {"dry_weight_g", "harvested_at"})
in
    Etendu
