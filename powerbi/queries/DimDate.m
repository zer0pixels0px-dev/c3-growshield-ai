// Power Query (M) — DimDate (calendrier généré, 2024-01-01 à 2030-12-31)
let
    Debut = #date(2024, 1, 1),
    Fin = #date(2030, 12, 31),
    NombreJours = Duration.Days(Fin - Debut) + 1,
    Dates = List.Dates(Debut, NombreJours, #duration(1, 0, 0, 0)),
    TableDates = Table.FromList(Dates, Splitter.SplitByNothing(), {"date"}),
    Annee = Table.AddColumn(TableDates, "year", each Date.Year([date]), Int64.Type),
    Mois = Table.AddColumn(Annee, "month", each Date.Month([date]), Int64.Type),
    Trimestre = Table.AddColumn(Mois, "quarter", each "T" & Text.From(Date.QuarterOfYear([date])), type text)
in
    Trimestre
