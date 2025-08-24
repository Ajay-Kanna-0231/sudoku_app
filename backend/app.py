from flask import Flask, jsonify, request
import random
from copy import deepcopy
from flask_cors import CORS

app = Flask(__name__)
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

def count_solutions(grid):
    """Count solutions (stop if >1)."""
    solutions = [0]

    def backtrack():
        if solutions[0] > 1:   # early exit
            return
        for r in range(GRID_SIZE):
            for c in range(GRID_SIZE):
                if grid[r][c] == 0:
                    for num in range(1, 10):
                        if is_valid(grid, r, c, num):
                            grid[r][c] = num
                            backtrack()
                            grid[r][c] = 0
                    return
        solutions[0] += 1
        if solutions[0] > 1:
            return

    backtrack()
    return solutions[0]


def generate_puzzle(clues=30):
    solution = generate_full_solution()
    puzzle = deepcopy(solution)

    cells = [(r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)]
    random.shuffle(cells)

    for r, c in cells:
        if sum(1 for row in puzzle for val in row if val != 0) <= clues:
            break

        removed = puzzle[r][c]
        puzzle[r][c] = 0
        if count_solutions(deepcopy(puzzle)) != 1:
            puzzle[r][c] = removed  # restore if uniqueness lost

    return puzzle, solution

@app.route("/generate-puzzle", methods=["GET"])
def generate_puzzle_endpoint():
    difficulty = request.args.get("difficulty", "medium").lower()
    clues = {"easy": 36, "medium": 32, "hard": 28}.get(difficulty, 32)
    puzzle, solution = generate_puzzle(clues=clues)
    return jsonify(puzzle=puzzle, solution=solution)

@app.route("/solve-puzzle", methods=["POST"])
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

if __name__ == "__main__":
    app.run(debug=True)
