# Baseline: time and motion without the copilot

Manual. No code. This is the denominator for every claim about reduced agent load, and it is the one artifact that converts copilot usage into minutes.

Fill this in by watching one operator work. Do not help them. Do not explain the copilot.

## Why this exists

Everything else in the synthetic suite measures whether the copilot answers correctly. None of it measures whether the answer was worth having. That requires knowing what the same answer costs today.

## Method

For each scenario, start a timer when the operator understands the question and stop when they have the answer or give up. Record where they went and what they did. If the answer does not exist in the app at all, write "not available" and record how long they spent before concluding that.

One operator, one sitting, roughly 45 minutes. Repeat with a second operator only if the first is unusual.

## Worksheet

| Scenario | Question asked | Pages visited | Filters applied | Rows read | Answer existed? | Minutes |
|---|---|---|---|---|---|---|
| S1 | (panel only, no question) | | | | | |
| S2 | which destinations have the most leads? | | | | | |
| S2 | how many leads want Bali? | | | | | |
| S2 | what is outstanding by customer? | | | | | |
| S3 | is this customer's invoice settled before their flight departs? | | | | | |
| S4 | which of my leads have gone quiet for 7+ days? | | | | | |
| S5 | invoices over 60 days and over EUR 5,000, most overdue first | | | | | |
| S5 | what is my total outstanding? | | | | | |
| S6 | what should I do first today? | | | | | |

## Also record, in the operator's own words

- **Which questions they did not ask.** The ones they have given up on. This is the most valuable column and the easiest to lose.
- **Where they double-checked.** Any answer they verified by hand, and how. A panel that must always be verified has not saved the time it appears to save.
- **Where they got stuck** and what they did about it.
- **What they said out loud** when a screen did not answer them. Verbatim, not paraphrased.

## Turning it into a decision

| Measure | Formula | Reads as |
|---|---|---|
| Minutes saved per day | (sum of scenario minutes) × (times per day each is asked) − copilot time | the raw headcount input |
| Share of the day | minutes saved ÷ hours worked | below 10% is a convenience, above 25% is a capacity change |
| Verification tax | minutes spent double-checking copilot answers | subtract it; an untrusted answer saves nothing |
| Questions recovered | count of "not available" that the copilot now answers | new capability, not saved time |

**The claim is supported only if** minutes saved minus verification tax is a meaningful share of the working day **and** answers are trusted enough that the operator stops checking. Anything less is a better tool, not fewer agents.

## Falsification

The thesis dies if the recorded day is mostly conversation and paperwork rather than searching and assembling. If that is what the worksheet shows, the next investment is the write path (drafting, sending, quoting), not more ranking.
