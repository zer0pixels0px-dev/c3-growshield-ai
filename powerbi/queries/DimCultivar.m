// Power Query (M) — DimCultivar
// Remplacer Serveur et Base par vos valeurs (par défaut : base locale du docker-compose).
// Source : vues v_cultivar_scores + v_cultivar_catalogue, jointes sur cultivar_id.
let
    Serveur = "localhost",
    Base = "growshield",
    Source = PostgreSql.Database(Serveur, Base),
    Scores = Source{[Schema="public", Item="v_cultivar_scores"]}[Data],
    Catalogue = Source{[Schema="public", Item="v_cultivar_catalogue"]}[Data],
    Joint = Table.NestedJoin(Scores, {"cultivar_id"}, Catalogue, {"cultivar_id"}, "Catalogue", JoinKind.LeftOuter),
    Etendu = Table.ExpandTableColumn(Joint, "Catalogue", {"plant_type", "flowering_type", "thc_min_percent", "thc_max_percent", "flowering_days_min", "flowering_days_max", "yield_indoor_g_m2_min", "yield_indoor_g_m2_max", "difficulty", "verification_status"}, {"plant_type", "flowering_type", "thc_min_percent", "thc_max_percent", "flowering_days_min", "flowering_days_max", "yield_indoor_g_m2_min", "yield_indoor_g_m2_max", "difficulty", "verification_status"})
in
    Etendu
