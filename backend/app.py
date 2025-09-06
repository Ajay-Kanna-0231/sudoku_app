from flask import Flask, jsonify, request
import random, os
from copy import deepcopy
from flask_cors import CORS
from flask import send_from_directory

app = Flask(
    __name__,
    static_folder="../frontend/build",   # serve built React files
    static_url_path=""                  # so root `/` works
)
CORS(app)

GRID_SIZE = 9
SUBGRID_SIZE = 3

def is_valid(grid, row, col, num):
    # Check if num is not in the current row and column
    if num in grid[row] or num in [grid[r][col] for r in range(GRID_SIZE)]:
        return False

    # Check if num is not in the current subgrid
    start_row, start_col = (row // SUBGRID_SIZE) * SUBGRID_SIZE, (col // SUBGRID_SIZE) * SUBGRID_SIZE
    for r in range(start_row, start_row + SUBGRID_SIZE):
        for c in range(start_col, start_col + SUBGRID_SIZE):
            if grid[r][c] == num:
                return False
    return True

def solve(grid):
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if grid[r][c] == 0:
                for num in range(1, GRID_SIZE + 1):
                    if is_valid(grid, r, c, num):
                        grid[r][c] = num
                        if solve(grid):
                            return True
                        grid[r][c] = 0
                return False
    return True

def generate_full_solution():
    """Generate a full valid Sudoku solution via backtracking."""
    grid = [[0] * GRID_SIZE for _ in range(GRID_SIZE)]

    def fill():
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if grid[r][c] == 0:
                    nums = list(range(1, GRID_SIZE + 1))
                    random.shuffle(nums)
                    for num in nums:
                        if is_valid(grid, r, c, num):
                            grid[r][c] = num
                            if fill():
                                return True
                            grid[r][c] = 0
                    return False
        return True

    fill()
    return grid

def count_solutions_limited(grid, limit=2):
    """
    Backtracks to count solutions up to `limit`.
    Returns: number of solutions found (1 or 2 for our use).
    Early-stops once it reaches `limit`.
    """
    count = 0

    def backtrack():
        nonlocal count
        # early exit
        if count >= limit:
            return
        # find next empty
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    for num in range(1, 10):
                        if is_valid(grid, r, c, num):
                            grid[r][c] = num
                            backtrack()
                            if count >= limit:
                                grid[r][c] = 0
                                return
                            grid[r][c] = 0
                    return  # no number fits here => backtrack
        # no empties => one full solution
        count += 1

    backtrack()
    return count

def has_unique_solution(grid):
    """Utility: True if exactly one solution, using early-stop counter."""
    return count_solutions_limited(deepcopy(grid), limit=2) == 1

def generate_puzzle_by_digging(clues=32, symmetric=True):
    """
    Classic dig-and-test:
    - Start from a full solution.
    - Remove entries (optionally in symmetric pairs).
    - Keep removal only if puzzle remains uniquely solvable.
    - Stop when target `clues` reached (or no more safe removals).
    """
    solution = generate_full_solution()
    puzzle = deepcopy(solution)

    # List all cells
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    def current_clues_count(g):
        return sum(1 for row in g for v in row if v != 0)

    if symmetric:
        processed = set()
        for (r, c) in cells:
            if (r, c) in processed:
                continue
            # 180-degree symmetry partner
            sr, sc = 8 - r, 8 - c
            to_try = [(r, c)]
            if (sr, sc) != (r, c):
                to_try.append((sr, sc))

            # stop if removing this pair would go below target
            if current_clues_count(puzzle) - len(to_try) < clues:
                continue

            # remove and test
            removed_vals = []
            for rr, cc in to_try:
                removed_vals.append((rr, cc, puzzle[rr][cc]))
                puzzle[rr][cc] = 0

            if not has_unique_solution(puzzle):
                # restore if uniqueness lost
                for rr, cc, val in removed_vals:
                    puzzle[rr][cc] = val
            else:
                processed.update(to_try)

            if current_clues_count(puzzle) <= clues:
                break
    else:
        for (r, c) in cells:
            if current_clues_count(puzzle) <= clues:
                break
            saved = puzzle[r][c]
            if saved == 0:
                continue
            puzzle[r][c] = 0
            if not has_unique_solution(puzzle):
                puzzle[r][c] = saved

    return puzzle, solution

@app.route("/api/generate-puzzle", methods=["GET"])
def generate_puzzle_endpoint():
    difficulty = request.args.get("difficulty", "medium").lower()
    # tune these as you like
    target_clues = {"easy": 36, "medium": 32, "hard": 28}.get(difficulty, 32)

    puzzle, solution = generate_puzzle_by_digging(clues=target_clues, symmetric=True)
    return jsonify(puzzle=puzzle, solution=solution)

@app.route("/api/solve-puzzle", methods=["POST"])
def solve_puzzle_endpoint():
    data = request.json
    puzzle = data.get("puzzle")
    if not puzzle or len(puzzle) != GRID_SIZE or any(len(row) != GRID_SIZE for row in puzzle):
        return jsonify(error="Invalid puzzle format"), 400

    solution = deepcopy(puzzle)
    if solve(solution):
        return jsonify(solution=solution)
    else:
        return jsonify(error="Puzzle cannot be solved"), 400

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
