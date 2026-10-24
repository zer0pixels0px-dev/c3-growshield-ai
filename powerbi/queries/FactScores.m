// Power Query (M) — FactScores
// Source : commercial_scores + score_components. score NULL = non documenté (jamais 0).
let
    Serveur = "localhost",
    Base = "growshield",
    Source = PostgreSql.Database(Serveur, Base),
    Scores = Source{[Schema="public", Item="commercial_scores"]}[Data],
    Composants = Source{[Schema="public", Item="score_components"]}[Data],
    Joint = Table.NestedJoin(Scores, {"id"}, Composants, {"score_id"}, "Composants", JoinKind.LeftOuter),
    Etendu = Table.ExpandTableColumn(Joint, "Composants", {"component", "normalized_value", "weight_percent"}, {"component", "normalized_value", "weight_percent"})
in
    Etendu
