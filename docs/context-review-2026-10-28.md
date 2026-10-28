# English context review — 2026-10-28

## Scope
This review checks the full current vocabulary and sentence datasets for high-confidence context, grammar, time/place phrasing, translation, and topic-label errors. It retains record IDs and array order so existing app progress and cross-links are not intentionally changed.

- Vocabulary records inspected: 3500
- Sentence records inspected: 3750
- Vocabulary examples corrected: 301
- Vocabulary glosses corrected: 8
- Vocabulary topic labels corrected: 8
- Sentence rows updated from corrected examples (count includes repeated rows when the same source sentence appeared more than once): 245
- Sentence rows still missing English or Vietnamese text: 0

## Rules used
1. An example must use the target word in a natural grammatical role and show a plausible situation.
2. Time and place details are included where they make the example clearer; they are not forced into every sentence.
3. Vietnamese translations should reflect the full sentence, not only dictionary senses.
4. Identifiers are preserved. Repeated legacy records are not deleted in this pass because they may be referenced by user progress.
5. This is a targeted editorial pass with rule-based screening, not a claim that every record has been fully native-speaker proofread.

## Source files
- `data/vocabulary.json`
- `data/sentences.json`
- `data/version.json`

## Known remaining work
Some repeated but grammatically possible examples and older translation/IPA/topic issues are outside this correction pass. Further review should proceed in topic-sized batches, with the correction log retained for traceability.
