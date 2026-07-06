# Course Material Map

This note captures the current reconciliation between the class calendar, presentations, and IPDJ course manuals.

## Calendar Themes

The calendar is the source of truth for exam weighting.

| Course theme | Calendar hours | Approx. share | 80-question target |
| --- | ---: | ---: | ---: |
| PDD | 15 | 41.7% | 33 |
| TMTD | 12 | 33.3% | 27 |
| FCH | 3 | 8.3% | 7 |
| FCH - Doping | 2 | 5.6% | 5 |
| ED | 2 | 5.6% | 4 |
| DA | 2 | 5.6% | 4 |

The app should calculate the 80-question targets with deterministic largest-remainder rounding and guarantee every taught theme at least four questions. If multiple themes tie for the final remainder slot, the tie should be resolved by first occurrence in the calendar; this gives the extra two-hour-theme question to FCH - Doping for the current calendar.

## Current Material Mapping

| Calendar theme | Presentations | Course manuals | Confidence |
| --- | --- | --- | --- |
| PDD | `CG1 - Federac?a?o Portuguesa Padel_Pedagogia e Dida?tica do Desporto (completo).pdf` | `PEDAGOGIA DIDATICA DESPORTO_GI.pdf` | High |
| TMTD | `Teoria_Metodologia_TD1_26.pdf`, `Teoria_Metodologia_TD2_26.pdf`, `CG1 - Federac?a?o Portuguesa Padel - MT (2026).pdf` | `TEORIA METODOLOGIA DO TREINO_GI.pdf` | High |
| FCH | `CG1 - Federac?a?o Portuguesa Padel - FCH.pdf` | `FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf` | High, but manual also includes antidoping |
| FCH - Doping | `FORMAC?A?O ADoP - PADEL 2025.pdf` | `FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf` | High |
| ED | `CG1 - Federac?a?o Portuguesa Padel - E?tica.pdf` | `ETICA NO DESPORTO_GI.pdf` | High |
| DA | `CURSO_TRE_NIVEL_1_PA_007.pdf` | `DESPORTO ADAPTADO_GI.pdf` | High |

## Implementation Notes

Questions should be tagged with one calendar theme, one source scope, and any source references used for explanation. When a manual spans multiple calendar themes, such as FCH and antidoping, ingestion should split or tag extracted chunks by subtopic rather than assigning the whole manual to a single theme.
