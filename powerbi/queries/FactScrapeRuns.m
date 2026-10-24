// Power Query (M) — FactScrapeRuns
// Source : vue v_scrape_quality (qualité du scraping, pas le volume brut).
let
    Serveur = "localhost",
    Base = "growshield",
    Source = PostgreSql.Database(Serveur, Base),
    Qualite = Source{[Schema="public", Item="v_scrape_quality"]}[Data]
in
    Qualite
