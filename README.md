# ExamColor: Exam Timetable Generator (Graph Coloring + Backtracking)

## Run it
No install, no build, no internet needed.
1. Unzip and open the folder in VS Code (File > Open Folder).
2. Right-click `index.html` > **Open with Live Server**, or simply double-click `index.html`.

## Input format
```
Aarav: Mathematics, Physics, Computer Science     <- a student and their subjects
Diya: Mathematics, Chemistry, English
Biology -- Economics                              <- a direct conflict edge
# lines starting with # are ignored
```
You can also upload a .txt/.csv file in the same format.

## Features
- Subjects = vertices, common students = edges (edge thickness = number of common students)
- Backtracking graph coloring finds the minimum number of exam slots (chromatic number)
- Optional room constraint: max subjects per slot
- Animated replay of the search: assign, reject, backtrack, with Pause / Step / Skip / speed
- Conflict matrix, Greedy vs DSATUR vs Backtracking comparison, per-student timetable
- Dated timetable (exams per day, skip weekends), verification banner, CSV export, print, dark mode

## Files
- `js/algorithm.js` graph builder, backtracking solver, greedy + DSATUR, verifier
- `js/app.js` interface logic; `css/style.css` and `index.html` interface

## Algorithm
For k = 1, 2, 3 ... try to color all subjects with k slots: highest-degree subject first, try slots 1..k, skip a slot
used by a neighbor (or full), undo on a dead end. A subject may only open the next unused slot, which removes
symmetric duplicates. The first k that works is the minimum. Above 30 subjects the search starts at a clique
lower bound and falls back to greedy after 4 seconds. Worst case O(k^V), as graph coloring is NP-hard.
