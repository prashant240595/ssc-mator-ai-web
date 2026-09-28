# CGL and CHSL timer rules

## Changes
- Keep SSC CGL tests subject-wise, with a separate 15-minute timer for each subject.
- Run SSC CHSL tests with one 60-minute timer for the complete paper.
- Show the matching timing rule on the exam-start screen.

## Technical details
- Detect CGL/CHSL from the selected exam name.
- Continue using the sectional test flow for CGL.
- Use the full-paper test flow for CHSL, preserving strict timing for mocks and pause support for PYQ practice.
